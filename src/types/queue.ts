// Cloudflare Queue message types

export type MetadataSource = "jikan";

export type MetadataCategory =
  | "trending"
  | "popular"
  | "seasonal"
  | "movies"
  | "latest"
  | "missing_search"
  | "backfill";

export type JobPriority = "high" | "normal" | "low";

// metadata-sync-queue message (consumed by W2)
// W1 produces this — includes all IDs pre-mapped
export interface MetadataJob {
  source: MetadataSource;
  mal_id: number;
  anilist_id: number | null;
  tmdb_id: number | null;
  kitsu_id: number | null;
  category: MetadataCategory;
  priority: JobPriority;
  requested_at?: string;
}

// stream-sync-queue message (produced by W2, consumed by W3)
export interface StreamJob {
  anime_id: string;
  mal_id: number | null;
  anilist_id: number | null;
  episodes: number[];
  priority: JobPriority;
  category: MetadataCategory;
  requested_at?: string;
}
