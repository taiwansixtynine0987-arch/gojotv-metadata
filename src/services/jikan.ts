// Jikan v4 client — fetch full anime metadata by MAL ID

import {
  JIKAN_BASE_URL,
  JIKAN_USER_AGENT,
  JIKAN_RETRY_MAX_ATTEMPTS,
  JIKAN_RETRY_BASE_DELAY_MS,
  JIKAN_RETRY_MAX_DELAY_MS,
  JIKAN_FETCH_TIMEOUT_MS,
} from "../config/constants";
import type {
  JikanAnime,
  JikanAnimeResponse,
  JikanErrorResponse,
} from "../types/jikan";

export class JikanError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "JikanError";
    this.status = status;
    this.retryable = retryable;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoff(attempt: number): number {
  const exponential = JIKAN_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, JIKAN_RETRY_MAX_DELAY_MS);
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

async function jikanRequest<T>(path: string): Promise<T> {
  const url = `${JIKAN_BASE_URL}${path}`;
  let lastError: JikanError | null = null;

  for (let attempt = 0; attempt < JIKAN_RETRY_MAX_ATTEMPTS; attempt++) {
    const isLast = attempt === JIKAN_RETRY_MAX_ATTEMPTS - 1;

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": JIKAN_USER_AGENT,
          },
        },
        JIKAN_FETCH_TIMEOUT_MS
      );

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 404) {
        throw new JikanError(`Not found: ${path}`, 404, false);
      }

      if (response.status !== 429 && response.status < 500) {
        let body = "";
        try {
          const err = (await response.json()) as JikanErrorResponse;
          body = err.message ?? "";
        } catch {
          body = await response.text().catch(() => "");
        }
        throw new JikanError(
          `HTTP ${response.status}: ${body.slice(0, 200)}`,
          response.status,
          false
        );
      }

      const waitMs =
        response.status === 429
          ? computeBackoff(attempt) + 2000
          : computeBackoff(attempt);

      lastError = new JikanError(
        response.status === 429
          ? "Rate limited (429)"
          : `Server error ${response.status}`,
        response.status,
        true
      );

      if (isLast) break;
      await sleep(waitMs);
    } catch (err) {
      if (err instanceof JikanError && !err.retryable) throw err;
      lastError =
        err instanceof JikanError
          ? err
          : new JikanError(
              err instanceof Error ? err.message : "Network error",
              0,
              true
            );
      if (isLast) break;
      await sleep(computeBackoff(attempt));
    }
  }

  throw lastError ?? new JikanError("Jikan request failed", 0, false);
}

export async function fetchAnimeByMalId(
  malId: number
): Promise<JikanAnime | null> {
  try {
    const response = await jikanRequest<JikanAnimeResponse>(
      `/anime/${malId}/full`
    );
    return response.data ?? null;
  } catch (err) {
    if (err instanceof JikanError && err.status === 404) return null;
    throw err;
  }
}
