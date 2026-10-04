// TMDB API response types (for banner/backdrop)

export interface TmdbTvShow {
  id: number;
  name: string;
  original_name: string | null;
  overview: string | null;
  backdrop_path: string | null;
  poster_path: string | null;
  first_air_date: string | null;
  vote_average: number | null;
  popularity: number | null;
}

export interface TmdbErrorResponse {
  status_code: number;
  status_message: string;
  success: boolean;
}
