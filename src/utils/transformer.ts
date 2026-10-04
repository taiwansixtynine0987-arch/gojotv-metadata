// Transform Kitsu response -> DB rows

import {
  KITSU_STATUS_MAP,
  KITSU_MOVIE_SUBTYPES,
} from "../config/constants";
import type {
  KitsuAnimeResponse,
  KitsuIncludedResource,
  KitsuResource,
} from "../types/kitsu";
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

function pickTitle(attrs: KitsuResource["attributes"]): string {
  return (
    attrs.titles?.en ??
    attrs.canonicalTitle ??
    attrs.titles?.en_jp ??
    attrs.titles?.ja_jp ??
    `kitsu-${attrs.slug ?? "unknown"}`
  );
}

function pickEnglishTitle(attrs: KitsuResource["attributes"]): string | null {
  return attrs.titles?.en ?? null;
}

function pickRomajiTitle(attrs: KitsuResource["attributes"]): string | null {
  return attrs.titles?.en_jp ?? attrs.canonicalTitle ?? null;
}

function pickPoster(attrs: KitsuResource["attributes"]): string | null {
  const p = attrs.posterImage;
  if (!p) return null;
  return p.original ?? p.large ?? p.medium ?? null;
}

function mapStatus(status: string | null): AnimeStatus | null {
  if (!status) return null;
  const mapped = KITSU_STATUS_MAP[status.toLowerCase()];
  return mapped ? (mapped as AnimeStatus) : null;
}

function isMovieSubtype(subtype: string | null): boolean {
  return subtype ? KITSU_MOVIE_SUBTYPES.has(subtype.toLowerCase()) : false;
}

function buildRating(ageRating: string | null): string | null {
  if (!ageRating) return null;
  // Kitsu: "G", "PG", "R", "R18"
  const map: Record<string, string> = {
    G: "G",
    PG: "PG",
    R: "R",
    R18: "R+",
  };
  return map[ageRating] ?? null;
}

function parseAverageRating(avg: string | null): number | null {
  if (!avg) return null;
  const n = Number.parseFloat(avg);
  return Number.isFinite(n) ? n : null;
}

function extractYear(startDate: string | null): number | null {
  if (!startDate) return null;
  const match = startDate.match(/^(\d{4})/);
  if (!match) return null;
  const y = Number.parseInt(match[1], 10);
  return Number.isFinite(y) ? y : null;
}

function extractSeasonFromDate(
  startDate: string | null
): AnimeSeason | null {
  if (!startDate) return null;
  const monthMatch = startDate.match(/^\d{4}-(\d{2})/);
  if (!monthMatch) return null;
  const month = Number.parseInt(monthMatch[1], 10);
  if (month >= 1 && month <= 3) return "winter";
  if (month >= 4 && month <= 6) return "spring";
  if (month >= 7 && month <= 9) return "summer";
  if (month >= 10 && month <= 12) return "fall";
  return null;
}

// ============================================================
// Main transformer
// ============================================================

export function transformKitsuAnime(
  response: KitsuAnimeResponse,
  malId: number,
  anilistId: number | null,
  bannerImage: string | null
): TransformedAnime {
  const resource = response.data;
  const attrs = resource.attributes;
  const title = pickTitle(attrs);
  const slug = slugify(title);

  return {
    mal_id: malId,
    anilist_id: anilistId,
    slug,
    title,
    english_title: pickEnglishTitle(attrs),
    romaji_title: pickRomajiTitle(attrs),
    synonyms: attrs.abbreviatedTitles ?? null,
    description: cleanText(attrs.synopsis),
    status: mapStatus(attrs.status),
    season: extractSeasonFromDate(attrs.startDate),
    year: extractYear(attrs.startDate),
    score: parseAverageRating(attrs.averageRating),
    popularity: attrs.userCount ?? null,
    poster_image: pickPoster(attrs),
    banner_image: bannerImage,
    cover_color: null,
    source: attrs.showType ?? null,
    episodes_count: attrs.episodeCount ?? null,
    duration: attrs.episodeLength ? `${attrs.episodeLength} min` : null,
    rating: buildRating(attrs.ageRating),
    is_movie: isMovieSubtype(attrs.subtype),
    is_adult: attrs.nsfw ?? false,
    trailer_embed_url: attrs.youtubeVideoId
      ? `https://www.youtube.com/embed/${attrs.youtubeVideoId}`
      : null,
  };
}

// Extract genres + categories + studios from `included` array
export function extractGenres(response: KitsuAnimeResponse): string[] {
  const names: string[] = [];
  const included = response.included ?? [];
  for (const item of included) {
    if (item.type === "genres" || item.type === "categories") {
      const name = item.attributes?.name ?? item.attributes?.title;
      if (name) names.push(name);
    }
  }
  return Array.from(new Set(names)).filter(Boolean);
}

export function extractStudios(
  response: KitsuAnimeResponse
): TransformedStudio[] {
  const names: string[] = [];
  const included = response.included ?? [];
  for (const item of included) {
    if (item.type === "studios") {
      const name = item.attributes?.name ?? item.attributes?.title;
      if (name) names.push(name);
    }
  }
  return Array.from(new Set(names))
    .filter(Boolean)
    .map((name) => ({ name }));
}
