// Transform Jikan + TMDB/Kitsu responses -> DB rows

import {
  JIKAN_STATUS_MAP,
  JIKAN_SEASON_MAP,
  JIKAN_MOVIE_TYPES,
} from "../config/constants";
import type { JikanAnime } from "../types/jikan";
import type { AnimeSeason, AnimeStatus } from "../types/database";

export interface TransformedAnime {
  mal_id: number;
  anilist_id: number | null;
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
  poster_image: string | null;
  banner_image: string | null;
  cover_color: string | null;
  source: string | null;
  episodes_count: number | null;
  duration: string | null;
  rating: string | null;
  is_movie: boolean;
  is_adult: boolean;
  trailer_embed_url: string | null;
}

export interface TransformedStudio {
  name: string;
}

// ============================================================
// Helpers
// ============================================================

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}

function cleanText(text: string | null): string | null {
  if (!text) return null;
  return text
    .replace(/\[Written by MAL Rewrite\]/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || null;
}

function pickTitle(anime: JikanAnime): string {
  return (
    anime.title_english ??
    anime.title ??
    anime.title_japanese ??
    `mal-${anime.mal_id}`
  );
}

function pickPoster(anime: JikanAnime): string | null {
  return (
    anime.images?.jpg?.large_image_url ??
    anime.images?.jpg?.image_url ??
    anime.images?.webp?.large_image_url ??
    null
  );
}

function mapStatus(status: string | null): AnimeStatus | null {
  if (!status) return null;
  const mapped = JIKAN_STATUS_MAP[status];
  return mapped ? (mapped as AnimeStatus) : null;
}

function mapSeason(season: string | null): AnimeSeason | null {
  if (!season) return null;
  const mapped = JIKAN_SEASON_MAP[season.toLowerCase()];
  return mapped ? (mapped as AnimeSeason) : null;
}

function isMovieType(type: string | null): boolean {
  return type ? JIKAN_MOVIE_TYPES.has(type) : false;
}

function buildRating(anime: JikanAnime): string | null {
  // Jikan "rating" is like "PG-13 - Teens 13 or older". Extract the code.
  const raw = anime.rating;
  if (!raw) return null;
  const match = raw.match(/^(G|PG|PG-13|R|R\+|Rx)\b/);
  return match ? match[1] : null;
}

// ============================================================
// Main transformer
// ============================================================

export function transformJikanAnime(
  anime: JikanAnime,
  anilistId: number | null,
  bannerImage: string | null
): TransformedAnime {
  const title = pickTitle(anime);
  const slug = slugify(title);

  return {
    mal_id: anime.mal_id,
    anilist_id: anilistId,
    slug,
    title,
    english_title: anime.title_english,
    romaji_title: anime.title,
    synonyms: anime.title_synonyms ?? null,
    description: cleanText(anime.synopsis),
    status: mapStatus(anime.status),
    season: mapSeason(anime.season),
    year: anime.year ?? null,
    score: anime.score ?? null,
    popularity: anime.popularity ?? null,
    poster_image: pickPoster(anime),
    banner_image: bannerImage,
    cover_color: null,
    source: anime.source ?? null,
    episodes_count: anime.episodes ?? null,
    duration: anime.duration ?? null,
    rating: buildRating(anime),
    is_movie: isMovieType(anime.type),
    is_adult: isAdultRating(anime.rating),
    trailer_embed_url: anime.trailer?.embed_url ?? null,
  };
}

function isAdultRating(rating: string | null): boolean {
  if (!rating) return false;
  return /^(R\+|Rx)\b/.test(rating);
}

export function extractGenres(anime: JikanAnime): string[] {
  const names: string[] = [];
  for (const g of anime.genres ?? []) names.push(g.name);
  for (const g of anime.themes ?? []) names.push(g.name);
  for (const g of anime.demographics ?? []) names.push(g.name);
  return Array.from(new Set(names)).filter(Boolean);
}

export function extractStudios(anime: JikanAnime): TransformedStudio[] {
  const names: string[] = [];
  for (const s of anime.studios ?? []) names.push(s.name);
  return Array.from(new Set(names))
    .filter(Boolean)
    .map((name) => ({ name }));
}
