// Kitsu client — fallback banner/cover source (no API key needed)

import {
  KITSU_BASE_URL,
  KITSU_USER_AGENT,
  KITSU_RETRY_MAX_ATTEMPTS,
  KITSU_RETRY_BASE_DELAY_MS,
  KITSU_RETRY_MAX_DELAY_MS,
  KITSU_FETCH_TIMEOUT_MS,
} from "../config/constants";
import type { KitsuAnimeResponse } from "../types/kitsu";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoff(attempt: number): number {
  const exponential = KITSU_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, KITSU_RETRY_MAX_DELAY_MS);
  const jitter = Math.random() * 0.3 * capped;
  return Math.floor(capped * 0.7 + jitter);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Returns cover image URL (fallback for banner) or null
export async function fetchKitsuCoverUrl(
  kitsuId: number
): Promise<string | null> {
  const url = `${KITSU_BASE_URL}/anime/${kitsuId}`;
  let lastError: KitsuError | null = null;

  for (let attempt = 0; attempt < KITSU_RETRY_MAX_ATTEMPTS; attempt++) {
    const isLast = attempt === KITSU_RETRY_MAX_ATTEMPTS - 1;

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: {
            Accept: "application/vnd.api+json",
            "User-Agent": KITSU_USER_AGENT,
          },
        },
        KITSU_FETCH_TIMEOUT_MS
      );

      if (response.status === 404) return null;

      if (!response.ok) {
        if (response.status !== 429 && response.status < 500) {
          throw new KitsuError(
            `HTTP ${response.status}`,
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
        continue;
      }

      const json = (await response.json()) as KitsuAnimeResponse;
      const cover = json.data?.attributes?.coverImage;
      return cover?.original ?? cover?.large ?? cover?.medium ?? null;
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
