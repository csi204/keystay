import { Client } from '@upstash/qstash';
import { type Env } from '../types';

/**
 * Publishes events to Upstash QStash topic and tracks status in outbox_events.
 * Gracefully marks status as 'failed' if QStash is unreachable or unconfigured locally.
 */
export async function publishToQStash(
  env: Env,
  topic: string,
  payload: any,
  outboxId?: string
): Promise<boolean> {
  const token = env.QSTASH_TOKEN;
  const baseUrl = env.QSTASH_URL;

  if (!token) {
    console.warn(`[QStash] QSTASH_TOKEN is not configured. Event skipped for topic '${topic}'.`);
    if (outboxId) {
      await updateOutboxStatus(env, outboxId, 'failed');
    }
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
