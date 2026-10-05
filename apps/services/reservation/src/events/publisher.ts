import { type Env } from '../types';

export interface PublishResult {
  published: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Publishes an event to Upstash QStash Topic.
 * Following Outbox Pattern: failures are captured and do not crash the calling request,
 * while updating the status in outbox_events.
 */
export async function publishToQStash(
  env: Env,
  topic: string,
  payload: any,
  outboxEventId?: string
): Promise<PublishResult> {
  const qstashUrl = env.QSTASH_URL;
  const qstashToken = env.QSTASH_TOKEN;

  if (!qstashUrl || !qstashToken) {
    console.warn(`[QStash] Skipping publish to topic '${topic}': QSTASH_URL or QSTASH_TOKEN not configured`);
    return { published: false, error: 'QSTASH_NOT_CONFIGURED' };
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

      return { published: false, error: `HTTP ${response.status}: ${errText}` };
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

    return { published: false, error: err.message || 'Unknown error' };
  }
}
