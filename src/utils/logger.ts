// Worker execution logging to worker_execution_logs table

import type { SupabaseClient } from "@supabase/supabase-js";
import { WORKER_NAME } from "../config/constants";

export interface LogContext {
  logId: string;
  startedAt: string;
  workerName: string;
}

export async function startExecutionLog(
  supabase: SupabaseClient
): Promise<LogContext | null> {
  const startedAt = new Date().toISOString();
  try {
    const { data, error } = await supabase
      .from("worker_execution_logs")
      .insert({
        worker_name: WORKER_NAME,
        status: "running",
        records_processed: 0,
        started_at: startedAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[W2] Failed to start execution log:", error);
      return null;
    }

    return {
      logId: data.id as string,
      startedAt,
      workerName: WORKER_NAME,
    };
  } catch (err) {
    console.error("[W2] startExecutionLog error:", err);
    return null;
  }
}

export async function completeExecutionLog(
  supabase: SupabaseClient,
  ctx: LogContext | null,
  status: "success" | "partial" | "failed",
  recordsProcessed: number,
  errorDetails?: unknown
): Promise<void> {
  if (!ctx) return;
  try {
    await supabase
      .from("worker_execution_logs")
      .update({
        status,
        records_processed: recordsProcessed,
        error_details: errorDetails ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", ctx.logId);
  } catch (err) {
    console.error("[W2] completeExecutionLog error:", err);
  }
}

// Per-message lightweight logging
export function logJobStart(
  category: string,
  malId: number,
  priority: string
): void {
  console.log(
    `[W2] START job: category=${category} mal_id=${malId} priority=${priority}`
  );
}

export function logJobSuccess(
  malId: number,
  slug: string,
  episodeCount: number,
  elapsedMs: number
): void {
  console.log(
    `[W2] SUCCESS mal_id=${malId} slug=${slug} episodes=${episodeCount} elapsed=${elapsedMs}ms`
  );
}

export function logJobFailure(
  malId: number,
  error: unknown,
  elapsedMs: number
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[W2] FAILED mal_id=${malId} elapsed=${elapsedMs}ms error=${message}`
  );
}
