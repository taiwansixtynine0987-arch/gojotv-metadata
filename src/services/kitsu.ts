// Kitsu API client with retry + rate limit
// Supports bulk fetch (max 20 IDs) and individual fallback

import {
  KITSU_BASE_URL,
  KITSU_USER_AGENT,
  KITSU_RETRY_MAX_ATTEMPTS,
  KITSU_RETRY_BASE_DELAY_MS,
  KITSU_RETRY_MAX_DELAY_MS,
  KITSU_FETCH_TIMEOUT_MS,
  KITSU_MIN_INTERVAL_MS,
  KITSU_BULK_MAX_IDS,
} from "../config/constants";
import type {
  KitsuAnimeListResponse,
  KitsuAnimeResponse,
  KitsuResource,
} from "../types/kitsu";

export class KitsuError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "KitsuError";
    this.status = status;
    this.retryable = retryable;
  }
}

// Module-level rate limiter (per worker instance)
let lastCallTime = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < KITSU_MIN_INTERVAL_MS) {
    await sleep(KITSU_MIN_INTERVAL_MS - elapsed);
  }
  lastCallTime = Date.now();
}

function computeBackoff(attempt: number): number {
  const exponential = KITSU_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, KITSU_RETRY_MAX_DELAY_MS);
  const jitter = Math.random() * 0.3 * capped;
  return Math.floor(capped * 0.7 + jitter);
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.api+json",
        "User-Agent": KITSU_USER_AGENT,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function kitsuRequest<T>(path: string): Promise<T> {
  const url = `${KITSU_BASE_URL}${path}`;
  let lastError: KitsuError | null = null;

  for (let attempt = 0; attempt < KITSU_RETRY_MAX_ATTEMPTS; attempt++) {
    const isLast = attempt === KITSU_RETRY_MAX_ATTEMPTS - 1;

    try {
      await enforceRateLimit();

      const response = await fetchWithTimeout(url, KITSU_FETCH_TIMEOUT_MS);

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 404) {
        throw new KitsuError(`Not found: ${path}`, 404, false);
      }

      if (response.status === 429) {
        lastError = new KitsuError("Rate limited (429)", 429, true);
        if (isLast) break;
        await sleep(computeBackoff(attempt) + 5000);
        continue;
      }

      if (response.status < 500) {
        const text = await response.text().catch(() => "");
        throw new KitsuError(
          `HTTP ${response.status}: ${text.slice(0, 200)}`,
          response.status,
          false
        );
      }

      lastError = new KitsuError(
        `Server error ${response.status}`,
        response.status,
        true
      );

      if (isLast) break;
      await sleep(computeBackoff(attempt));
    } catch (err) {
      if (err instanceof KitsuError && !err.retryable) throw err;
      lastError =
        err instanceof KitsuError
          ? err
          : new KitsuError(
              err instanceof Error ? err.message : "Network error",
              0,
              true
            );
      if (isLast) break;
      await sleep(computeBackoff(attempt));
    }
  }

  throw lastError ?? new KitsuError("Kitsu request failed", 0, false);
}

// ============================================================
// Public API
// ============================================================

// Bulk fetch (max 20 IDs in one call)
// Returns a Map keyed by kitsu_id for easy lookup
export async function fetchAnimeBulkByKitsuIds(
  kitsuIds: number[]
): Promise<Map<number, KitsuResource>> {
  const result = new Map<number, KitsuResource>();
  if (kitsuIds.length === 0) return result;

  // Chunk into groups of 20 (Kitsu's limit)
  const chunks: number[][] = [];
  for (let i = 0; i < kitsuIds.length; i += KITSU_BULK_MAX_IDS) {
    chunks.push(kitsuIds.slice(i, i + KITSU_BULK_MAX_IDS));
  }

  for (const chunk of chunks) {
    const idList = chunk.join(",");
    const path = `/anime?filter[id]=${idList}&page[limit]=${KITSU_BULK_MAX_IDS}`;

    try {
      const response = await kitsuRequest<KitsuAnimeListResponse>(path);
      for (const resource of response.data ?? []) {
        const idNum = Number.parseInt(resource.id, 10);
        if (Number.isFinite(idNum)) {
          result.set(idNum, resource);
        }
      }
    } catch (err) {
      // Bulk failed — fall back to individual fetches for this chunk
      console.warn(
        `[W2] Kitsu bulk failed for ${chunk.length} ids, falling back to individual:`,
        err instanceof Error ? err.message : err
      );

      for (const id of chunk) {
        try {
          const single = await fetchAnimeByKitsuId(id);
          if (single) result.set(id, single);
        } catch (innerErr) {
          console.warn(
            `[W2] Kitsu individual fetch failed for id=${id}:`,
            innerErr instanceof Error ? innerErr.message : innerErr
          );
        }
      }
    }
  }

  return result;
}

// Individual fetch (fallback)
export async function fetchAnimeByKitsuId(
  kitsuId: number
): Promise<KitsuResource | null> {
  try {
    const response = await kitsuRequest<KitsuAnimeResponse>(
      `/anime/${kitsuId}`
    );
    return response.data ?? null;
  } catch (err) {
    if (err instanceof KitsuError && err.status === 404) return null;
    throw err;
  }
}
