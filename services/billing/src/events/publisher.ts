import { Client } from '@upstash/qstash';
import { type Env } from '../types';

async function dispatchBillingWebhookFallback(env: Env, topic: string, payload: any, reqUrl?: string) {
  const isLocal = reqUrl ? (reqUrl.includes('127.0.0.1') || reqUrl.includes('localhost')) : true;
  const reportBase = isLocal
    ? 'http://127.0.0.1:8793'
    : 'https://keystay-report-analytics.khetsophon-ain.workers.dev';

  if (topic === 'hotel.billing.paid') {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };
    const reqPromise = !isLocal && env.REPORT_ANALYTICS_SERVICE
      ? env.REPORT_ANALYTICS_SERVICE.fetch('http://internal/webhooks/bill-paid', init)
      : fetch(`${reportBase}/webhooks/bill-paid`, init);
    await Promise.allSettled([
      reqPromise.catch((err) => {
        console.warn(`[Webhook Fallback] Failed to notify ${reportBase}/webhooks/bill-paid:`, err?.message || err);
      }),
    ]);
  }
}

/**
 * Publishes events to Upstash QStash topic and tracks status in outbox_events.
 * Falls back to direct subscriber URLs if QStash is unreachable or unconfigured.
 */
export async function publishToQStash(
  env: Env,
  topic: string,
  payload: any,
  outboxId?: string,
  reqUrl?: string
): Promise<boolean> {
  const token = env.QSTASH_TOKEN;
  const baseUrl = env.QSTASH_URL;

  if (!token) {
    console.warn(`[QStash] QSTASH_TOKEN is not configured. Falling back to direct URL for topic '${topic}'.`);
    if (outboxId) {
      await updateOutboxStatus(env, outboxId, 'failed');
    }
    await dispatchBillingWebhookFallback(env, topic, payload, reqUrl);
    return false;
  }

  try {
    const client = new Client({
      token,
      baseUrl: baseUrl || undefined,
    });

    await client.publishJSON({
      topic,
      body: payload,
    });

    console.log(`[QStash] Successfully published event to topic '${topic}'`);
    if (outboxId) {
      await updateOutboxStatus(env, outboxId, 'published');
    }
    return true;
  } catch (error: any) {
    console.error(`[QStash] Error publishing to topic '${topic}':`, error.message || error);
    if (outboxId) {
      await updateOutboxStatus(env, outboxId, 'failed');
    }
    await dispatchBillingWebhookFallback(env, topic, payload, reqUrl);
    return false;
  }
}

async function updateOutboxStatus(env: Env, outboxId: string, status: 'published' | 'failed') {
  try {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE outbox_events 
       SET status = ?, published_at = CASE WHEN ? = 'published' THEN ? ELSE published_at END
       WHERE id = ?`
    )
      .bind(status, status, now, outboxId)
      .run();
  } catch (err: any) {
    console.error(`[Outbox] Failed to update outbox event ${outboxId} status:`, err.message);
  }
}
