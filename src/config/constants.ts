// Constants for W2 Metadata Worker (Kitsu + TMDB)

// ============================================================
// KITSU — Primary metadata source
// ============================================================
export const KITSU_BASE_URL = "https://kitsu.io/api/edge";
export const KITSU_USER_AGENT =
  "GojoTV-Metadata/2.0 (+https://gojotv.pages.dev)";
export const KITSU_RETRY_MAX_ATTEMPTS = 3;
export const KITSU_RETRY_BASE_DELAY_MS = 1000;
export const KITSU_RETRY_MAX_DELAY_MS = 10000;
export const KITSU_FETCH_TIMEOUT_MS = 10000;

// ============================================================
// TMDB — Banner source (primary for hero slider)
// ============================================================
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";
export const TMDB_RETRY_MAX_ATTEMPTS = 3;
export const TMDB_RETRY_BASE_DELAY_MS = 1000;
export const TMDB_RETRY_MAX_DELAY_MS = 10000;
export const TMDB_FETCH_TIMEOUT_MS = 10000;

// ============================================================
// Kitsu status -> anime_status enum
// ============================================================
export const KITSU_STATUS_MAP: Record<string, string> = {
  current: "airing",
  finished: "completed",
  tba: "upcoming",
  unreleased: "upcoming",
  upcoming: "upcoming",
};

// Kitsu subtype -> is_movie
export const KITSU_MOVIE_SUBTYPES = new Set(["movie"]);

// ============================================================
// Worker / Queue
// ============================================================
export const WORKER_NAME = "gojotv-metadata";
export const QUEUE_MAX_BATCH_SIZE = 10;
export const QUEUE_MAX_CONCURRENCY = 3;
