// Kitsu client — primary metadata source

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

async function kitsuRequest<T>(path: string): Promise<T> {
  const url = `${KITSU_BASE_URL}${path}`;
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

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 404) {
        throw new KitsuError(`Not found: ${path}`, 404, false);
      }

      if (response.status !== 429 && response.status < 500) {
        const text = await response.text().catch(() => "");
        throw new KitsuError(
          `HTTP ${response.status}: ${text.slice(0, 200)}`,
          response.status,
          false
        );
      }

      lastError = new KitsuError(
        response.status === 429
          ? "Rate limited (429)"
          : `Server error ${response.status}`,
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

// Fetch full anime data by Kitsu ID (with genres + categories)
export async function fetchAnimeByKitsuId(
  kitsuId: number
): Promise<KitsuAnimeResponse | null> {
  try {
    const response = await kitsuRequest<KitsuAnimeResponse>(
      `/anime/${kitsuId}?include=genres,categories`
    );
    return response;
  } catch (err) {
    if (err instanceof KitsuError && err.status === 404) return null;
    throw err;
  }
}

// Banner fallback: coverImage from Kitsu
export async function fetchKitsuCoverUrl(
  kitsuId: number
): Promise<string | null> {
  try {
    const response = await kitsuRequest<KitsuAnimeResponse>(
      `/anime/${kitsuId}`
    );
    const cover = response.data?.attributes?.coverImage;
    return cover?.original ?? cover?.large ?? cover?.medium ?? null;
  } catch (err) {
    if (err instanceof KitsuError && err.status === 404) return null;
    throw err;
  }
}
