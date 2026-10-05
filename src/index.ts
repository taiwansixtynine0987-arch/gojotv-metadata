// W2 — Metadata Worker
// Queue consumer: reads metadata-sync-queue, processes jobs via Kitsu,
// saves to Supabase, pushes stream-sync-queue for W3.

import { createSupabaseClient } from "./services/supabase";
import { processMetadataBatch } from "./handlers/metadata";
import {
  startExecutionLog,
  completeExecutionLog,
  logJobStart,
  logJobSuccess,
  logJobFailure,
} from "./utils/logger";
import { QUEUE_MAX_BATCH_SIZE } from "./config/constants";
import type { MetadataJob, StreamJob } from "./types/queue";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STREAM_QUEUE: Queue<StreamJob>;
}

export default {
  async queue(
    batch: MessageBatch<MetadataJob>,
    env: Env
  ): Promise<void> {
    const total = batch.messages.length;
    console.log(`[W2] Received batch of ${total} messages`);

    if (total > QUEUE_MAX_BATCH_SIZE) {
      console.warn(
        `[W2] Batch size ${total} exceeds configured ${QUEUE_MAX_BATCH_SIZE}`
      );
    }

    const supabase = createSupabaseClient(env);
    const logCtx = await startExecutionLog(supabase);

    // Parse all messages first (string vs object)
    const validJobs: Array<{ job: MetadataJob; messageId: string }> = [];
    for (const message of batch.messages) {
      try {
        const job =
          typeof message.body === "string"
            ? (JSON.parse(message.body) as MetadataJob)
            : (message.body as MetadataJob);
        validJobs.push({ job, messageId: message.id });
      } catch (parseErr) {
        console.error("[W2] Failed to parse message body:", parseErr);
        message.ack();
      }
    }

    if (validJobs.length === 0) {
      await completeExecutionLog(supabase, logCtx, "success", 0);
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ kitsu_id: number; message: string }> = [];

    const startMs = Date.now();
    try {
      // Bulk process
      for (const { job } of validJobs) {
        logJobStart(job.kitsu_id, job.category, job.priority);
      }

      const results = await processMetadataBatch(
        validJobs.map((v) => v.job),
        { supabase, streamQueue: env.STREAM_QUEUE }
      );

      // Map results back to messages and ack/retry
      for (let i = 0; i < validJobs.length; i++) {
        const { job, messageId } = validJobs[i];
        const result = results[i];
        const message = batch.messages.find((m) => m.id === messageId);

        if (result && message) {
          const elapsed = Date.now() - startMs;
          logJobSuccess(
            job.kitsu_id,
            result.malId,
            result.slug,
            result.episodeCount,
            elapsed
          );
          successCount++;
          message.ack();
        }
      }
    } catch (err) {
      console.error("[W2] Batch processing failed:", err);
      // Retry all unprocessed messages
      for (const { job, messageId } of validJobs) {
        const message = batch.messages.find((m) => m.id === messageId);
        if (message) {
          logJobFailure(job.kitsu_id, err, Date.now() - startMs);
          failureCount++;
          errors.push({
            kitsu_id: job.kitsu_id,
            message: err instanceof Error ? err.message : String(err),
          });
          message.retry();
        }
      }
    }

    const status =
      failureCount === 0
        ? "success"
        : successCount === 0
        ? "failed"
        : "partial";

    await completeExecutionLog(
      supabase,
      logCtx,
      status,
      successCount,
      errors.length > 0 ? errors : undefined
    );

    console.log(
      `[W2] Batch done: success=${successCount} failed=${failureCount} status=${status}`
    );
  },
} satisfies ExportedHandler<Env>;
