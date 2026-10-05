// Cloudflare Queue message types

export type MetadataSource = "kitsu";

export type MetadataCategory =
  | "trending"
  | "popular"
  | "seasonal"
  | "movies"
  | "latest"
  | "update"
  | "new"
  | "missing_search"
  | "home_discovery";

export type JobPriority = "high" | "normal" | "low";

// metadata-sync-queue message (W1 → W2)
export interface MetadataJob {
  source: MetadataSource;
  kitsu_id: number;
  mal_id: number;
  anilist_id: number | null;
  tvdb_id: number | null;
  tmdb_id: number | null;
  banner_image: string | null;
  category: MetadataCategory;
  priority: JobPriority;
  requested_at?: string;
}

// stream-sync-queue message (W2 → W3)
export interface StreamJob {
  anime_id: string;
  mal_id: number | null;
  anilist_id: number | null;
  episodes: number[];
  priority: JobPriority;
  category: MetadataCategory;
  requested_at?: string;
}
