// Constants for W2 Metadata Worker (Kitsu-based)

// ============================================================
// KITSU — Metadata source
// ============================================================
export const KITSU_BASE_URL = "https://kitsu.io/api/edge";
export const KITSU_USER_AGENT = "GojoTV-Metadata/3.0";
export const KITSU_RETRY_MAX_ATTEMPTS = 3;
export const KITSU_RETRY_BASE_DELAY_MS = 1000;
export const KITSU_RETRY_MAX_DELAY_MS = 10000;
export const KITSU_FETCH_TIMEOUT_MS = 15000;

// Kitsu bulk: max 20 IDs per request (API limit)
export const KITSU_BULK_MAX_IDS = 20;

// Rate limiting: 1 Kitsu call per 1 second (safe well under 1000/hour)
export const KITSU_MIN_INTERVAL_MS = 1000;

// Kitsu status -> anime_status enum
export const KITSU_STATUS_MAP: Record<string, string> = {
  current: "airing",
  finished: "completed",
  tba: "upcoming",
  unreleased: "upcoming",
  upcoming: "upcoming",
};

// Kitsu subtype -> is_movie
export const KITSU_MOVIE_SUBTYPES = new Set(["movie"]);

// Kitsu ageRating -> normalized rating
export const KITSU_AGE_RATING_MAP: Record<string, string> = {
  G: "G",
  PG: "PG",
  R: "R",
  R18: "R+",
};

// ============================================================
// Worker / Queue
// ============================================================
export const WORKER_NAME = "gojotv-metadata";
export const QUEUE_MAX_BATCH_SIZE = 20;
