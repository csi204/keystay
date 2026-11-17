import { type Env } from '../types';

export interface PublishResult {
  published: boolean;
  fallbackDispatched?: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Resolves direct webhook URLs for each QStash topic when QStash is unconfigured or fails.
 */
function getFallbackWebhookUrls(env: Env, topic: string, reqUrl?: string): string[] {
  const isLocal = reqUrl ? (reqUrl.includes('127.0.0.1') || reqUrl.includes('localhost')) : true;
  const roomInventoryBase = (
    env.ROOM_INVENTORY_URL ||
    (isLocal ? 'http://127.0.0.1:8789' : 'https://keystay-room-inventory.khetsophon-ain.workers.dev')
  ).replace(/\/+$/, '');
  const housekeepingBase = (
    env.HOUSEKEEPING_URL ||
    (isLocal ? 'http://127.0.0.1:8791' : 'https://keystay-housekeeping.khetsophon-ain.workers.dev')
  ).replace(/\/+$/, '');
  const billingBase = (
    isLocal ? 'http://127.0.0.1:8792' : 'https://keystay-billing.khetsophon-ain.workers.dev'
  );
  const reportBase = (
    env.REPORT_ANALYTICS_URL ||
    (isLocal ? 'http://127.0.0.1:8793' : 'https://keystay-report-analytics.khetsophon-ain.workers.dev')
  ).replace(/\/+$/, '');

  switch (topic) {
    case 'hotel.reservation.checkin':
      return [`${roomInventoryBase}/webhooks/checkin`];
    case 'hotel.reservation.checkout':
      return [
        `${roomInventoryBase}/webhooks/checkout`,
        `${housekeepingBase}/webhooks/checkout`,
        `${billingBase}/webhooks/checkout`,
        `${reportBase}/webhooks/checkout`,
      ];
    case 'hotel.reservation.cancel':
      return [`${roomInventoryBase}/webhooks/cancel`];
    default:
      return [];
  }
}

/**
 * Dispatches direct HTTP POST webhooks to subscriber URLs as a fallback.
 * Awaits all requests with Promise.allSettled so Cloudflare Workers never cancels subrequests
 * before delivery completes, while preventing subscriber errors from crashing the primary request.
 */
export async function dispatchWebhookFallback(
  env: Env,
  topic: string,
  payload: any,
  reqUrl?: string
): Promise<boolean> {
  const urls = getFallbackWebhookUrls(env, topic, reqUrl);
  if (urls.length === 0) return false;

  await Promise.allSettled(
    urls.map((url) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn(`[Webhook Fallback] Failed to notify ${url} for topic '${topic}':`, err?.message || err);
      })
    )
  );
  return true;
}

/**
 * Publishes an event to Upstash QStash Topic.
 * Following Outbox Pattern: failures are captured and do not crash the calling request,
 * while updating the status in outbox_events and falling back to direct subscriber URLs.
 */
export async function publishToQStash(
  env: Env,
  topic: string,
  payload: any,
  outboxEventId?: string,
  reqUrl?: string
): Promise<PublishResult> {
  const qstashUrl = env.QSTASH_URL;
  const qstashToken = env.QSTASH_TOKEN;

  if (!qstashUrl || !qstashToken) {
    console.warn(`[QStash] Skipping publish to topic '${topic}': QSTASH_URL or QSTASH_TOKEN not configured`);
    const fallbackDispatched = await dispatchWebhookFallback(env, topic, payload, reqUrl);
    return { published: false, fallbackDispatched, error: 'QSTASH_NOT_CONFIGURED' };
  }

  try {
    // Upstash QStash topic publish endpoint: /v2/publish/{topic}
    const endpoint = `${qstashUrl.replace(/\/+$/, '')}/v2/publish/${encodeURIComponent(topic)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${qstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[QStash] Error publishing to topic '${topic}': ${response.status} ${errText}`);

      if (outboxEventId && env.DB) {
        try {
          await env.DB.prepare(
            'UPDATE outbox_events SET status = ? WHERE id = ?'
          )
            .bind('failed', outboxEventId)
            .run();
        } catch (dbErr) {
          console.error('[QStash] Failed to update outbox event status:', dbErr);
        }
      }

      const fallbackDispatched = await dispatchWebhookFallback(env, topic, payload, reqUrl);
      return { published: false, fallbackDispatched, error: `HTTP ${response.status}: ${errText}` };
    }

    const resData = (await response.json()) as any;
    const messageId = resData?.messageId || resData?.id;

    if (outboxEventId && env.DB) {
      try {
        await env.DB.prepare(
          'UPDATE outbox_events SET status = ?, published_at = ? WHERE id = ?'
        )
          .bind('published', new Date().toISOString(), outboxEventId)
          .run();
      } catch (dbErr) {
        console.error('[QStash] Failed to mark outbox event as published:', dbErr);
      }
    }

    return { published: true, messageId };
  } catch (err: any) {
    console.error(`[QStash] Network/runtime error publishing to topic '${topic}':`, err);

    if (outboxEventId && env.DB) {
      try {
        await env.DB.prepare(
          'UPDATE outbox_events SET status = ? WHERE id = ?'
        )
          .bind('failed', outboxEventId)
          .run();
      } catch (dbErr) {
        console.error('[QStash] Failed to update outbox event to failed:', dbErr);
      }
    }

    const fallbackDispatched = await dispatchWebhookFallback(env, topic, payload, reqUrl);
    return { published: false, fallbackDispatched, error: err.message || 'Unknown error' };
  }
}
