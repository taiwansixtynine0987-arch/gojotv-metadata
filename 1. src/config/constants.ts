// Constants for W2 Metadata Worker (Jikan + TMDB + Kitsu)

// ============================================================
// JIKAN (MyAnimeList) — Primary metadata source
// ============================================================
export const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
export const JIKAN_USER_AGENT = "GojoTV-Metadata/2.0 (+https://gojotv.pages.dev)";
export const JIKAN_RETRY_MAX_ATTEMPTS = 3;
export const JIKAN_RETRY_BASE_DELAY_MS = 1000;
export const JIKAN_RETRY_MAX_DELAY_MS = 15000;
export const JIKAN_FETCH_TIMEOUT_MS = 15000;

// Jikan rate limit: 3 req/sec, 60 req/min. Stay conservative.
export const JIKAN_MIN_INTERVAL_MS = 400; // ~2.5 req/sec

// ============================================================
// TMDB (The Movie DB) — Banner/backdrop source (primary)
// ============================================================
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";
export const TMDB_RETRY_MAX_ATTEMPTS = 3;
export const TMDB_RETRY_BASE_DELAY_MS = 1000;
export const TMDB_RETRY_MAX_DELAY_MS = 10000;
export const TMDB_FETCH_TIMEOUT_MS = 10000;

// ============================================================
// KITSU — Banner/cover source (fallback)
// ============================================================
export const KITSU_BASE_URL = "https://kitsu.io/api/edge";
export const KITSU_USER_AGENT = "GojoTV-Metadata/2.0 (+https://gojotv.pages.dev)";
export const KITSU_RETRY_MAX_ATTEMPTS = 2;
export const KITSU_RETRY_BASE_DELAY_MS = 1000;
export const KITSU_RETRY_MAX_DELAY_MS = 8000;
export const KITSU_FETCH_TIMEOUT_MS = 10000;

// ============================================================
// Status / Season / Type Mapping (Jikan -> DB enum)
// ============================================================

// Jikan status -> anime_status enum
export const JIKAN_STATUS_MAP: Record<string, string> = {
  "Finished Airing": "completed",
  "Currently Airing": "airing",
  "Not yet aired": "upcoming",
};

// Jikan season (lowercase) -> anime_season enum
export const JIKAN_SEASON_MAP: Record<string, string> = {
  winter: "winter",
  spring: "spring",
  summer: "summer",
  fall: "fall",
};

// Jikan type -> is_movie
export const JIKAN_MOVIE_TYPES = new Set(["Movie"]);

// ============================================================
// Worker / Queue
// ============================================================
export const WORKER_NAME = "gojotv-metadata";
export const QUEUE_MAX_BATCH_SIZE = 10;
export const QUEUE_MAX_CONCURRENCY = 3;
