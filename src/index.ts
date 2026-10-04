// W2 — Metadata Worker
// Queue consumer: reads metadata-sync-queue, processes each job,
// pushes stream-sync-queue for W3.

import { createSupabaseClient } from "./services/supabase";
import { processMetadataJob } from "./handlers/metadata";
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
  TMDB_API_KEY: string;
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

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ mal_id: number; message: string }> = [];

    for (const message of batch.messages) {
      let job: MetadataJob;
      try {
        job =
          typeof message.body === "string"
            ? (JSON.parse(message.body) as MetadataJob)
            : (message.body as MetadataJob);
      } catch (parseErr) {
        console.error("[W2] Failed to parse message body:", parseErr);
        message.ack();
        continue;
      }

      const malId = job?.mal_id ?? 0;
      const startedMs = Date.now();

      logJobStart(job.category, malId, job.priority);

      try {
        const result = await processMetadataJob(job, {
          supabase,
          streamQueue: env.STREAM_QUEUE,
          tmdbApiKey: env.TMDB_API_KEY,
        });

        const elapsed = Date.now() - startedMs;
        logJobSuccess(malId, result.slug, result.episodeCount, elapsed);

        successCount++;
        message.ack();
      } catch (err) {
        const elapsed = Date.now() - startedMs;
        logJobFailure(malId, err, elapsed);

        failureCount++;
        errors.push({
          mal_id: malId,
          message: err instanceof Error ? err.message : String(err),
        });

        message.retry();
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
