// Transform Jikan or Kitsu response -> DB rows

import {
  JIKAN_STATUS_MAP,
  JIKAN_SEASON_MAP,
  JIKAN_MOVIE_TYPES,
  KITSU_STATUS_MAP,
  KITSU_MOVIE_SUBTYPES,
} from "../config/constants";
import type { JikanAnime } from "../types/jikan";
import type { KitsuAnimeResponse, KitsuResource } from "../types/kitsu";
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
// Shared helpers
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
  return (
    text
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
      .trim() || null
  );
}

// ============================================================
// JIKAN transformer
// ============================================================

function jikanPickTitle(anime: JikanAnime): string {
  return (
    anime.title_english ??
    anime.title ??
    anime.title_japanese ??
    `mal-${anime.mal_id}`
  );
}

function jikanPickPoster(anime: JikanAnime): string | null {
  return (
    anime.images?.jpg?.large_image_url ??
    anime.images?.jpg?.image_url ??
    anime.images?.webp?.large_image_url ??
    null
  );
}

function jikanMapStatus(status: string | null): AnimeStatus | null {
  if (!status) return null;
  const mapped = JIKAN_STATUS_MAP[status];
  return mapped ? (mapped as AnimeStatus) : null;
}

function jikanMapSeason(season: string | null): AnimeSeason | null {
  if (!season) return null;
  const mapped = JIKAN_SEASON_MAP[season.toLowerCase()];
  return mapped ? (mapped as AnimeSeason) : null;
}

function jikanBuildRating(rating: string | null): string | null {
  if (!rating) return null;
  const match = rating.match(/^(G|PG|PG-13|R|R\+|Rx)\b/);
  return match ? match[1] : null;
}

function jikanParseDurationMinutes(duration: string | null): number | null {
  if (!duration) return null;
  const match = duration.match(/(\d+)/);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

export function transformJikanAnime(
  anime: JikanAnime,
  anilistId: number | null,
  bannerImage: string | null
): TransformedAnime {
  const title = jikanPickTitle(anime);
  const slug = slugify(title);
  const durationMin = jikanParseDurationMinutes(anime.duration);

  return {
    mal_id: anime.mal_id,
    anilist_id: anilistId,
    slug,
    title,
    english_title: anime.title_english,
    romaji_title: anime.title,
    synonyms: anime.title_synonyms ?? null,
    description: cleanText(anime.synopsis),
    status: jikanMapStatus(anime.status),
    season: jikanMapSeason(anime.season),
    year: anime.year ?? null,
    score: anime.score ?? null,
    popularity: anime.popularity ?? null,
    poster_image: jikanPickPoster(anime),
    banner_image: bannerImage,
    cover_color: null,
    source: anime.source ?? null,
    episodes_count: anime.episodes ?? null,
    duration: durationMin !== null ? String(durationMin) : null,
    rating: jikanBuildRating(anime.rating),
    is_movie: anime.type ? JIKAN_MOVIE_TYPES.has(anime.type) : false,
    is_adult: /^(R\+|Rx)\b/.test(anime.rating ?? ""),
    trailer_embed_url: anime.trailer?.embed_url ?? null,
  };
}

export function extractJikanGenres(anime: JikanAnime): string[] {
  const names: string[] = [];
  for (const g of anime.genres ?? []) names.push(g.name);
  for (const g of anime.themes ?? []) names.push(g.name);
  for (const g of anime.demographics ?? []) names.push(g.name);
  return Array.from(new Set(names)).filter(Boolean);
}

export function extractJikanStudios(anime: JikanAnime): TransformedStudio[] {
  const names: string[] = [];
  for (const s of anime.studios ?? []) names.push(s.name);
  return Array.from(new Set(names))
    .filter(Boolean)
    .map((name) => ({ name }));
}

// ============================================================
// KITSU transformer (fallback)
// ============================================================

function kitsuPickTitle(attrs: KitsuResource["attributes"]): string {
  return (
    attrs.titles?.en ??
    attrs.canonicalTitle ??
    attrs.titles?.en_jp ??
    attrs.titles?.ja_jp ??
    `kitsu-${attrs.slug ?? "unknown"}`
  );
}

function kitsuPickPoster(attrs: KitsuResource["attributes"]): string | null {
  const p = attrs.posterImage;
  if (!p) return null;
  return p.original ?? p.large ?? p.medium ?? null;
}

function kitsuMapStatus(status: string | null): AnimeStatus | null {
  if (!status) return null;
  const mapped = KITSU_STATUS_MAP[status.toLowerCase()];
  return mapped ? (mapped as AnimeStatus) : null;
}

function kitsuBuildRating(ageRating: string | null): string | null {
  if (!ageRating) return null;
  const map: Record<string, string> = {
    G: "G",
    PG: "PG",
    R: "R",
    R18: "R+",
  };
  return map[ageRating] ?? null;
}

function kitsuParseAverageRating(avg: string | null): number | null {
  if (!avg) return null;
  const n = Number.parseFloat(avg);
  if (!Number.isFinite(n)) return null;
  return Math.round((n / 10) * 100) / 100;
}

function kitsuExtractYear(startDate: string | null): number | null {
  if (!startDate) return null;
  const match = startDate.match(/^(\d{4})/);
  if (!match) return null;
  const y = Number.parseInt(match[1], 10);
  return Number.isFinite(y) ? y : null;
}

function kitsuExtractSeason(startDate: string | null): AnimeSeason | null {
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

export function transformKitsuAnime(
  response: KitsuAnimeResponse,
  malId: number,
  anilistId: number | null,
  bannerImage: string | null
): TransformedAnime {
  const resource = response.data;
  const attrs = resource.attributes;
  const title = kitsuPickTitle(attrs);
  const slug = slugify(title);

  return {
    mal_id: malId,
    anilist_id: anilistId,
    slug,
    title,
    english_title: attrs.titles?.en ?? null,
    romaji_title: attrs.titles?.en_jp ?? attrs.canonicalTitle ?? null,
    synonyms: attrs.abbreviatedTitles ?? null,
    description: cleanText(attrs.synopsis),
    status: kitsuMapStatus(attrs.status),
    season: kitsuExtractSeason(attrs.startDate),
    year: kitsuExtractYear(attrs.startDate),
    score: kitsuParseAverageRating(attrs.averageRating),
    popularity: attrs.userCount ?? null,
    poster_image: kitsuPickPoster(attrs),
    banner_image: bannerImage,
    cover_color: null,
    source: attrs.showType ?? null,
    episodes_count: attrs.episodeCount ?? null,
    duration: attrs.episodeLength ? String(attrs.episodeLength) : null,
    rating: kitsuBuildRating(attrs.ageRating),
    is_movie: attrs.subtype
      ? KITSU_MOVIE_SUBTYPES.has(attrs.subtype.toLowerCase())
      : false,
    is_adult: attrs.nsfw ?? false,
    trailer_embed_url: attrs.youtubeVideoId
      ? `https://www.youtube.com/embed/${attrs.youtubeVideoId}`
      : null,
  };
}

export function extractKitsuGenres(response: KitsuAnimeResponse): string[] {
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

export function extractKitsuStudios(
  _response: KitsuAnimeResponse
): TransformedStudio[] {
  return [];
}
