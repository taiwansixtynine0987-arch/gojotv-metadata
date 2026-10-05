// Constants for W2 Metadata Worker
// Primary: Shikimori | Fallback: Kitsu | Banner: TMDB

// ============================================================
// SHIKIMORI — Primary metadata source
// ============================================================
export const SHIKIMORI_BASE_URL = "https://shikimori.one/api";
export const SHIKIMORI_IMAGE_BASE = "https://shikimori.one";
export const SHIKIMORI_USER_AGENT = "GojoTV-Metadata/2.0";
export const SHIKIMORI_RETRY_MAX_ATTEMPTS = 2;
export const SHIKIMORI_RETRY_BASE_DELAY_MS = 2000;
export const SHIKIMORI_RETRY_MAX_DELAY_MS = 10000;
export const SHIKIMORI_FETCH_TIMEOUT_MS = 12000;
export const SHIKIMORI_MIN_INTERVAL_MS = 1500;

// Shikimori status -> anime_status enum
export const SHIKIMORI_STATUS_MAP: Record<string, string> = {
  released: "completed",
  ongoing: "airing",
  anons: "upcoming",
  latest: "airing",
};

// Shikimori kind -> is_movie
export const SHIKIMORI_MOVIE_KINDS = new Set(["movie"]);

// Shikimori rating -> normalized rating
export const SHIKIMORI_RATING_MAP: Record<string, string> = {
  g: "G",
  pg: "PG",
  pg_13: "PG-13",
  r: "R",
  "r_plus": "R+",
  rx: "R+",
};

// ============================================================
// KITSU — Fallback metadata source
// ============================================================
export const KITSU_BASE_URL = "https://kitsu.io/api/edge";
export const KITSU_USER_AGENT = "GojoTV-Metadata/2.0";
export const KITSU_RETRY_MAX_ATTEMPTS = 3;
export const KITSU_RETRY_BASE_DELAY_MS = 1000;
export const KITSU_RETRY_MAX_DELAY_MS = 10000;
export const KITSU_FETCH_TIMEOUT_MS = 10000;

export const KITSU_STATUS_MAP: Record<string, string> = {
  current: "airing",
  finished: "completed",
  tba: "upcoming",
  unreleased: "upcoming",
  upcoming: "upcoming",
};

export const KITSU_MOVIE_SUBTYPES = new Set(["movie"]);

// ============================================================
// TMDB — Banner source
// ============================================================
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";
export const TMDB_RETRY_MAX_ATTEMPTS = 3;
export const TMDB_RETRY_BASE_DELAY_MS = 1000;
export const TMDB_RETRY_MAX_DELAY_MS = 10000;
export const TMDB_FETCH_TIMEOUT_MS = 10000;

// ============================================================
// Worker / Queue
// ============================================================
export const WORKER_NAME = "gojotv-metadata";
export const QUEUE_MAX_BATCH_SIZE = 10;
export const QUEUE_MAX_CONCURRENCY = 3;
