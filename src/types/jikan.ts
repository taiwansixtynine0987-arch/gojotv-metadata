// Jikan v4 API response types

export interface JikanImage {
  image_url: string | null;
  small_image_url: string | null;
  large_image_url: string | null;
}

export interface JikanImages {
  jpg: JikanImage;
  webp: JikanImage;
}

export interface JikanTrailer {
  youtube_id: string | null;
  url: string | null;
  embed_url: string | null;
}

export interface JikanNamedEntity {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanAiredPropDate {
  day: number | null;
  month: number | null;
  year: number | null;
}

export interface JikanAired {
  from: string | null;
  to: string | null;
  prop?: {
    from: JikanAiredPropDate;
    to: JikanAiredPropDate;
  };
  string: string | null;
}

export interface JikanTitle {
  type: string;
  title: string;
}

export interface JikanAnime {
  mal_id: number;
  url: string | null;
  images: JikanImages;
  trailer: JikanTrailer | null;
  approved: boolean;
  titles: JikanTitle[] | null;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  title_synonyms: string[] | null;
  type: string | null;
  source: string | null;
  episodes: number | null;
  status: string | null;
  airing: boolean;
  aired: JikanAired | null;
  duration: string | null;
  rating: string | null;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;
  synopsis: string | null;
  background: string | null;
  season: string | null;
  year: number | null;
  studios: JikanNamedEntity[] | null;
  producers: JikanNamedEntity[] | null;
  licensors: JikanNamedEntity[] | null;
  genres: JikanNamedEntity[] | null;
  explicit_genres: JikanNamedEntity[] | null;
  themes: JikanNamedEntity[] | null;
  demographics: JikanNamedEntity[] | null;
}

export interface JikanAnimeResponse {
  data: JikanAnime;
}

export interface JikanErrorResponse {
  status: number;
  type: string;
  message: string;
  error?: string;
}
