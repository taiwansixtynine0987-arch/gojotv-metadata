// Supabase database row types for W2

export type AnimeStatus =
  | "airing"
  | "completed"
  | "upcoming"
  | "cancelled"
  | "paused";

export type AnimeSeason = "spring" | "summer" | "fall" | "winter";

export type RelationType =
  | "prequel"
  | "sequel"
  | "side_story"
  | "alternative"
  | "spin_off"
  | "summary"
  | "character"
  | "other";

export interface AnimeRow {
  id: string;
  slug: string;
  title: string;
  english_title: string | null;
  romaji_title: string | null;
  synonyms: string[] | null;
  description: string | null;
  status: AnimeStatus | null;
  season: AnimeSeason | null;
  year: number | null;
  score: number | null;
  popularity: number | null;
  trending_score: number | null;
  poster_image: string | null;
  banner_image: string | null;
  cover_color: string | null;
  source: string | null;
  episodes_count: number | null;
  duration: string | null;
  rating: string | null;
  is_movie: boolean;
  is_adult: boolean;
  search_vector: unknown | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  anilist_id: number | null;
  mal_id: number | null;
  trailer_embed_url: string | null;
}

export interface EpisodeRow {
  id: string;
  anime_id: string;
  episode_number: number;
  title: string;
  description: string | null;
  thumbnail_image: string | null;
  is_filler: boolean;
  air_date: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  season_id: string | null;
}

export interface GenreRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface StudioRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WorkerExecutionLogRow {
  id: string;
  worker_name: string;
  status: string;
  records_processed: number | null;
  error_details: unknown | null;
  started_at: string;
  completed_at: string | null;
}
