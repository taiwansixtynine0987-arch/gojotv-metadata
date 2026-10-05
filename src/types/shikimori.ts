// Shikimori API types

export interface ShikimoriImage {
  original: string;
  preview: string;
  x96: string;
  x48: string;
}

export interface ShikimoriGenre {
  id: number;
  name: string;
  russian: string;
  kind: string;
  entry_type: string;
}

export interface ShikimoriStudio {
  id: number;
  name: string;
  filtered_name: string;
  real: boolean;
  image: string | null;
}

export interface ShikimoriVideo {
  id: number;
  url: string;
  name: string;
  kind: string;
  hosting: string;
}

export interface ShikimoriAnime {
  id: number;
  name: string;
  russian: string;
  image: ShikimoriImage;
  url: string;
  kind: string;
  score: string;
  status: string;
  episodes: number;
  episodes_aired: number;
  aired_on: string | null;
  released_on: string | null;
  rating: string | null;
  english: string[] | null;
  japanese: string[] | null;
  synonyms: string[] | null;
  duration: number;
  description: string | null;
  description_html: string | null;
  franchise: string | null;
  myanimelist_id: number | null;
  updated_at: string;
  next_episode_at: string | null;
  genres: ShikimoriGenre[] | null;
  studios: ShikimoriStudio[] | null;
  videos: ShikimoriVideo[] | null;
}

export interface ShikimoriError {
  message: string;
  errors?: Record<string, string[]>;
}
