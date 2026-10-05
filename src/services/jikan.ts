// Jikan v4 client using stealth-fetch to bypass cf-* header injection
// Includes in-memory rate limiter (per worker instance)

import { request as stealthRequest, toWebResponse } from "stealth-fetch";
import {
  JIKAN_BASE_URL,
  JIKAN_USER_AGENT,
  JIKAN_RETRY_MAX_ATTEMPTS,
  JIKAN_RETRY_BASE_DELAY_MS,
  JIKAN_RETRY_MAX_DELAY_MS,
  JIKAN_FETCH_TIMEOUT_MS,
  JIKAN_MIN_INTERVAL_MS,
} from "../config/constants";
import type { JikanAnime, JikanAnimeResponse } from "../types/jikan";

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

// Module-level rate limiter — persists within a single worker invocation
let lastCallTime = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < JIKAN_MIN_INTERVAL_MS) {
    await sleep(JIKAN_MIN_INTERVAL_MS - elapsed);
  }
  lastCallTime = Date.now();
}

function computeBackoff(attempt: number): number {
  const exponential = JIKAN_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, JIKAN_RETRY_MAX_DELAY_MS);
  const jitter = Math.random() * 0.3 * capped;
  return Math.floor(capped * 0.7 + jitter);
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Jikan request timeout")), timeoutMs);
  });

  const httpResponse = await Promise.race([
    stealthRequest(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": JIKAN_USER_AGENT,
      },
      redirect: "follow",
      timeout: timeoutMs,
    }),
    timeoutPromise,
  ]);

  // Convert custom HttpResponse to standard Web Response
  return toWebResponse(httpResponse);
}

async function jikanRequest<T>(path: string): Promise<T> {
  const url = `${JIKAN_BASE_URL}${path}`;
  let lastError: JikanError | null = null;

  for (let attempt = 0; attempt < JIKAN_RETRY_MAX_ATTEMPTS; attempt++) {
    const isLast = attempt === JIKAN_RETRY_MAX_ATTEMPTS - 1;

    try {
      await enforceRateLimit();

      const response = await fetchWithTimeout(url, JIKAN_FETCH_TIMEOUT_MS);

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 404) {
        throw new JikanError(`Not found: ${path}`, 404, false);
      }

      if (response.status === 403) {
        throw new JikanError(
          `Forbidden (403) — Jikan blocking`,
          403,
          false
        );
      }

      if (response.status === 429) {
        lastError = new JikanError("Rate limited (429)", 429, true);
        if (isLast) break;
        await sleep(computeBackoff(attempt) + 3000);
        continue;
      }

      if (response.status < 500) {
        const text = await response.text().catch(() => "");
        throw new JikanError(
          `HTTP ${response.status}: ${text.slice(0, 200)}`,
          response.status,
          false
        );
      }

      lastError = new JikanError(
        `Server error ${response.status}`,
        response.status,
        true
      );

      if (isLast) break;
      await sleep(computeBackoff(attempt));
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
