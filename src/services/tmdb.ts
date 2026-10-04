// TMDB client — fetch backdrop image URL for banner

import {
  TMDB_BASE_URL,
  TMDB_IMAGE_BASE_URL,
  TMDB_RETRY_MAX_ATTEMPTS,
  TMDB_RETRY_BASE_DELAY_MS,
  TMDB_RETRY_MAX_DELAY_MS,
  TMDB_FETCH_TIMEOUT_MS,
} from "../config/constants";
import type { TmdbTvShow } from "../types/tmdb";

export class TmdbError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
    this.retryable = retryable;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoff(attempt: number): number {
  const exponential = TMDB_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, TMDB_RETRY_MAX_DELAY_MS);
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

async function tmdbRequest<T>(path: string, apiKey: string): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE_URL}${path}${separator}api_key=${apiKey}`;
  let lastError: TmdbError | null = null;

  for (let attempt = 0; attempt < TMDB_RETRY_MAX_ATTEMPTS; attempt++) {
    const isLast = attempt === TMDB_RETRY_MAX_ATTEMPTS - 1;

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
        TMDB_FETCH_TIMEOUT_MS
      );

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 404) {
        throw new TmdbError(`Not found: ${path}`, 404, false);
      }

      if (response.status !== 429 && response.status < 500) {
        const text = await response.text().catch(() => "");
        throw new TmdbError(
          `HTTP ${response.status}: ${text.slice(0, 200)}`,
          response.status,
          false
        );
      }

      lastError = new TmdbError(
        `Server error ${response.status}`,
        response.status,
        true
      );

      if (isLast) break;
      await sleep(computeBackoff(attempt));
    } catch (err) {
      if (err instanceof TmdbError && !err.retryable) throw err;
      lastError =
        err instanceof TmdbError
          ? err
          : new TmdbError(
              err instanceof Error ? err.message : "Network error",
              0,
              true
            );
      if (isLast) break;
      await sleep(computeBackoff(attempt));
    }
  }

  throw lastError ?? new TmdbError("TMDB request failed", 0, false);
}

// Returns full backdrop URL or null if not available
export async function fetchBannerUrl(
  tmdbId: number,
  apiKey: string
): Promise<string | null> {
  try {
    const data = await tmdbRequest<TmdbTvShow>(
      `/tv/${tmdbId}?language=en-US`,
      apiKey
    );
    if (!data.backdrop_path) return null;
    return `${TMDB_IMAGE_BASE_URL}${data.backdrop_path}`;
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) return null;
    throw err;
  }
}
