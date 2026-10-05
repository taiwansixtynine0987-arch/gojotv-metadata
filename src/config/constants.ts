// Constants for W2 Metadata Worker (Jikan primary + Kitsu fallback + TMDB banner)

// ============================================================
// JIKAN (MyAnimeList) — Primary metadata source (via stealth-fetch)
// ============================================================
export const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
export const JIKAN_USER_AGENT =
  "GojoTV-Metadata/2.1 (+https://gojotv.pages.dev)";
export const JIKAN_RETRY_MAX_ATTEMPTS = 2;
export const JIKAN_RETRY_BASE_DELAY_MS = 2000;
export const JIKAN_RETRY_MAX_DELAY_MS = 10000;
export const JIKAN_FETCH_TIMEOUT_MS = 12000;

// Rate limiting: Jikan allows 3 req/sec burst, 60 req/min sustained
// We stay conservative: 1 req per 1.5 sec = ~40 req/min
export const JIKAN_MIN_INTERVAL_MS = 1500;

// ============================================================
// KITSU — Fallback metadata source
// ============================================================
export const KITSU_BASE_URL = "https://kitsu.io/api/edge";
export const KITSU_USER_AGENT =
  "GojoTV-Metadata/2.1 (+https://gojotv.pages.dev)";
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
// Status / Season Mapping — Jikan
// ============================================================
export const JIKAN_STATUS_MAP: Record<string, string> = {
  "Finished Airing": "completed",
  "Currently Airing": "airing",
  "Not yet aired": "upcoming",
};

export const JIKAN_SEASON_MAP: Record<string, string> = {
  winter: "winter",
  spring: "spring",
  summer: "summer",
  fall: "fall",
};

export const JIKAN_MOVIE_TYPES = new Set(["Movie"]);

// ============================================================
// Status / Type Mapping — Kitsu (fallback)
// ============================================================
export const KITSU_STATUS_MAP: Record<string, string> = {
  current: "airing",
  finished: "completed",
  tba: "upcoming",
  unreleased: "upcoming",
  upcoming: "upcoming",
};

export const KITSU_MOVIE_SUBTYPES = new Set(["movie"]);

// ============================================================
// Worker / Queue
// ============================================================
export const WORKER_NAME = "gojotv-metadata";
export const QUEUE_MAX_BATCH_SIZE = 10;
export const QUEUE_MAX_CONCURRENCY = 3;
