// AniList GraphQL API response types

export interface AniListTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface AniListCoverImage {
  extraLarge: string | null;
  large: string | null;
  medium: string | null;
  color: string | null;
}

export interface AniListTrailer {
  id: string;
  site: string;
}

export interface AniListStudio {
  id: number;
  name: string;
  isAnimationStudio: boolean;
}

export interface AniListStudioEdge {
  isMain: boolean;
  node: AniListStudio;
}

export interface AniListStudios {
  edges: AniListStudioEdge[];
}

export interface AniListNextAiringEpisode {
  episode: number;
  timeUntilAiring: number; // seconds
}

export interface AniListMedia {
  id: number;
  idMal: number | null;
  title: AniListTitle;
  synonyms: string[] | null;
  description: string | null;
  format: string | null;         // TV, MOVIE, OVA, ONA, TV_SHORT, SPECIAL, MUSIC
  status: string | null;         // FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS
  season: string | null;         // WINTER, SPRING, SUMMER, FALL
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;       // minutes
  coverImage: AniListCoverImage | null;
  bannerImage: string | null;
  trailer: AniListTrailer | null;
  genres: string[] | null;
  averageScore: number | null;   // 0-100
  popularity: number | null;
  favourites: number | null;
  trending: number | null;
  isAdult: boolean;
  studios: AniListStudios | null;
  nextAiringEpisode: AniListNextAiringEpisode | null;
  startDate: { year: number | null; month: number | null; day: number | null } | null;
}

export interface AniListResponse {
  data: {
    Media: AniListMedia | null;
  };
  errors?: Array<{ message: string; status?: number }>;
}

// Transformed shape ready for DB
export interface TransformedAnime {
  anilist_id: number;
  mal_id: number | null;
  slug: string;
  title: string;
  english_title: string | null;
  romaji_title: string | null;
  synonyms: string[] | null;
  description: string | null;
  status: string | null;
  season: string | null;
  year: number | null;
  score: number | null;
  popularity: number | null;
  trending_score: number | null;
  poster_image: string | null;
  banner_image: string | null;
  cover_color: string | null;
  source: string;
  episodes_count: number | null;
  duration: string | null;
  rating: string | null;
  is_movie: boolean;
  is_adult: boolean;
  trailer_embed_url: string | null;
  next_airing_episode: number | null;
  next_airing_at: string | null;
  genres: string[];
  studios: { id: number; name: string; is_main: boolean }[];
}
