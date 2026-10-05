// W2 Metadata Handler
// Process a single MetadataJob:
//   1. Try Jikan (via stealth-fetch) → primary metadata
//   2. Fallback to Kitsu → if Jikan fails
//   3. TMDB banner → primary; Kitsu cover → fallback
//   4. Save to DB → push stream-sync-queue

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAnimeByMalId } from "../services/jikan";
import { fetchAnimeByKitsuId, fetchKitsuCoverUrl } from "../services/kitsu";
import { fetchBannerUrl } from "../services/tmdb";
import {
  transformJikanAnime,
  transformKitsuAnime,
  extractJikanGenres,
  extractJikanStudios,
  extractKitsuGenres,
  extractKitsuStudios,
  type TransformedAnime,
  type TransformedStudio,
} from "../utils/transformer";
import type { MetadataJob, StreamJob } from "../types/queue";

export interface HandlerDeps {
  supabase: SupabaseClient;
  streamQueue: Queue<StreamJob>;
  tmdbApiKey: string;
}

export interface HandlerResult {
  animeId: string;
  slug: string;
  episodeCount: number;
  isNew: boolean;
  source: "jikan" | "kitsu";
}

export async function processMetadataJob(
  job: MetadataJob,
  deps: HandlerDeps
): Promise<HandlerResult> {
  const { supabase, streamQueue, tmdbApiKey } = deps;
  const malId = job.mal_id;

  let transformed: TransformedAnime | null = null;
  let genres: string[] = [];
  let studios: TransformedStudio[] = [];
  let source: "jikan" | "kitsu" = "jikan";

  // -------- Step 1: Try Jikan (primary) --------
  if (malId) {
    try {
      const jikanAnime = await fetchAnimeByMalId(malId);
      if (jikanAnime) {
        const banner = await resolveBanner(
          job.tmdb_id,
          job.kitsu_id,
          tmdbApiKey
        );
        transformed = transformJikanAnime(jikanAnime, job.anilist_id, banner);
        genres = extractJikanGenres(jikanAnime);
        studios = extractJikanStudios(jikanAnime);
        source = "jikan";
      }
    } catch (err) {
      console.warn(
        `[W2] Jikan failed for mal_id=${malId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // -------- Step 2: Fallback to Kitsu --------
  if (!transformed && job.kitsu_id) {
    try {
      const kitsuResponse = await fetchAnimeByKitsuId(job.kitsu_id);
      if (kitsuResponse) {
        const banner = await resolveBanner(
          job.tmdb_id,
          job.kitsu_id,
          tmdbApiKey
        );
        transformed = transformKitsuAnime(
          kitsuResponse,
          job.mal_id,
          job.anilist_id,
          banner
        );
        genres = extractKitsuGenres(kitsuResponse);
        studios = extractKitsuStudios(kitsuResponse);
        source = "kitsu";
      }
    } catch (err) {
      console.warn(
        `[W2] Kitsu failed for kitsu_id=${job.kitsu_id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (!transformed) {
    throw new Error(
      `Both Jikan and Kitsu failed for mal_id=${malId}, kitsu_id=${job.kitsu_id}`
    );
  }

  // -------- Step 3: Ensure slug uniqueness --------
  transformed.slug = await resolveUniqueSlug(supabase, transformed);

  // -------- Step 4: Upsert anime --------
  const { animeId, isNew } = await upsertAnime(supabase, transformed);

  // -------- Step 5: Episodes --------
  const episodeRecords = await upsertEpisodes(supabase, animeId, transformed);

  // -------- Step 6: Genres --------
  await upsertGenres(supabase, animeId, genres);

  // -------- Step 7: Studios --------
  await upsertStudios(supabase, animeId, studios);

  // -------- Step 8: Push stream job --------
  if (episodeRecords.length > 0) {
    const streamJob: StreamJob = {
      anime_id: animeId,
      mal_id: transformed.mal_id,
      anilist_id: transformed.anilist_id,
      episodes: episodeRecords.map((e) => e.episode_number),
      priority: job.priority,
      category: job.category,
      requested_at: new Date().toISOString(),
    };
    await streamQueue.send(streamJob);
  }

  return {
    animeId,
    slug: transformed.slug,
    episodeCount: episodeRecords.length,
    isNew,
    source,
  };
}

// ============================================================
// Banner resolver: TMDB primary → Kitsu cover fallback
// ============================================================

async function resolveBanner(
  tmdbId: number | null,
  kitsuId: number | null,
  tmdbApiKey: string
): Promise<string | null> {
  if (tmdbId) {
    try {
      const url = await fetchBannerUrl(tmdbId, tmdbApiKey);
      if (url) return url;
    } catch (err) {
      console.warn(
        `[W2] TMDB banner failed for tmdb_id=${tmdbId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (kitsuId) {
    try {
      const url = await fetchKitsuCoverUrl(kitsuId);
      if (url) return url;
    } catch (err) {
      console.warn(
        `[W2] Kitsu banner failed for kitsu_id=${kitsuId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return null;
}

// ============================================================
// HELPERS
// ============================================================

async function resolveUniqueSlug(
  supabase: SupabaseClient,
  transformed: TransformedAnime
): Promise<string> {
  const { data } = await supabase
    .from("anime")
    .select("id, mal_id")
    .eq("slug", transformed.slug)
    .maybeSingle();

  if (!data) return transformed.slug;
  if (data.mal_id === transformed.mal_id) return transformed.slug;
  return `${transformed.slug}-${transformed.mal_id}`;
}

async function upsertAnime(
  supabase: SupabaseClient,
  data: TransformedAnime
): Promise<{ animeId: string; isNew: boolean }> {
  const { data: existing, error: findErr } = await supabase
    .from("anime")
    .select("id")
    .eq("mal_id", data.mal_id)
    .maybeSingle();

  if (findErr) throw new Error(`anime lookup failed: ${findErr.message}`);

  if (existing) {
    const { error } = await supabase
      .from("anime")
      .update({
        slug: data.slug,
        title: data.title,
        english_title: data.english_title,
        romaji_title: data.romaji_title,
        synonyms: data.synonyms,
        description: data.description,
        status: data.status,
        season: data.season,
        year: data.year,
        score: data.score,
        popularity: data.popularity,
        poster_image: data.poster_image,
        banner_image: data.banner_image,
        cover_color: data.cover_color,
        source: data.source,
        episodes_count: data.episodes_count,
        duration: data.duration,
        rating: data.rating,
        is_movie: data.is_movie,
        is_adult: data.is_adult,
        trailer_embed_url: data.trailer_embed_url,
        anilist_id: data.anilist_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw new Error(`anime update failed: ${error.message}`);
    return { animeId: existing.id as string, isNew: false };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("anime")
    .insert({
      slug: data.slug,
      title: data.title,
      english_title: data.english_title,
      romaji_title: data.romaji_title,
      synonyms: data.synonyms,
      description: data.description,
      status: data.status,
      season: data.season,
      year: data.year,
      score: data.score,
      popularity: data.popularity,
      poster_image: data.poster_image,
      banner_image: data.banner_image,
      cover_color: data.cover_color,
      source: data.source,
      episodes_count: data.episodes_count,
      duration: data.duration,
      rating: data.rating,
      is_movie: data.is_movie,
      is_adult: data.is_adult,
      trailer_embed_url: data.trailer_embed_url,
      mal_id: data.mal_id,
      anilist_id: data.anilist_id,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    throw new Error(`anime insert failed: ${insertErr?.message ?? "no data"}`);
  }
  return { animeId: inserted.id as string, isNew: true };
}

interface EpisodeRecord {
  id: string;
  episode_number: number;
}

async function upsertEpisodes(
  supabase: SupabaseClient,
  animeId: string,
  data: TransformedAnime
): Promise<EpisodeRecord[]> {
  const total = data.episodes_count ?? 0;

  const { data: existing, error: findErr } = await supabase
    .from("episodes")
    .select("id, episode_number")
    .eq("anime_id", animeId)
    .is("deleted_at", null);

  if (findErr) throw new Error(`episodes lookup failed: ${findErr.message}`);

  const existingMap = new Map<number, string>();
  for (const row of (existing ?? []) as EpisodeRecord[]) {
    existingMap.set(row.episode_number, row.id);
  }

  if (total > 0) {
    const toInsert: Array<{
      anime_id: string;
      episode_number: number;
      title: string;
      is_filler: boolean;
      duration: number | null;
    }> = [];

    const durationMinutes = data.duration
      ? Number.parseInt(data.duration, 10)
      : null;

    for (let n = 1; n <= total; n++) {
      if (!existingMap.has(n)) {
        toInsert.push({
          anime_id: animeId,
          episode_number: n,
          title: `Episode ${n}`,
          is_filler: false,
          duration:
            durationMinutes !== null && Number.isFinite(durationMinutes)
              ? durationMinutes
              : null,
        });
      }
    }

    if (toInsert.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("episodes")
        .insert(toInsert)
        .select("id, episode_number");

      if (insertErr) {
        throw new Error(`episodes insert failed: ${insertErr.message}`);
      }

      for (const row of (inserted ?? []) as EpisodeRecord[]) {
        existingMap.set(row.episode_number, row.id);
      }
    }
  }

  return Array.from(existingMap.entries())
    .map(([episode_number, id]) => ({ id, episode_number }))
    .sort((a, b) => a.episode_number - b.episode_number);
}

async function upsertGenres(
  supabase: SupabaseClient,
  animeId: string,
  genreNames: string[]
): Promise<void> {
  if (genreNames.length === 0) return;

  const unique = Array.from(
    new Set(genreNames.map((g) => g.trim()).filter(Boolean))
  );
  if (unique.length === 0) return;

  const { data: existing, error: findErr } = await supabase
    .from("genres")
    .select("id, name")
    .in("name", unique);

  if (findErr) throw new Error(`genres lookup failed: ${findErr.message}`);

  const idByName = new Map<string, string>();
  for (const row of (existing ?? []) as Array<{ id: string; name: string }>) {
    idByName.set(row.name, row.id);
  }

  const missing = unique.filter((name) => !idByName.has(name));
  if (missing.length > 0) {
    const { data: inserted, error: insertErr } = await supabase
      .from("genres")
      .insert(missing.map((name) => ({ name })))
      .select("id, name");

    if (insertErr) throw new Error(`genres insert failed: ${insertErr.message}`);

    for (const row of (inserted ?? []) as Array<{ id: string; name: string }>) {
      idByName.set(row.name, row.id);
    }
  }

  const genreIds = unique
    .map((name) => idByName.get(name))
    .filter((id): id is string => typeof id === "string");

  if (genreIds.length === 0) return;

  await supabase.from("anime_genres").delete().eq("anime_id", animeId);
  const { error: junctionErr } = await supabase
    .from("anime_genres")
    .insert(genreIds.map((genre_id) => ({ anime_id: animeId, genre_id })));

  if (junctionErr) {
    throw new Error(`anime_genres insert failed: ${junctionErr.message}`);
  }
}

async function upsertStudios(
  supabase: SupabaseClient,
  animeId: string,
  studios: TransformedStudio[]
): Promise<void> {
  if (studios.length === 0) return;

  const unique = Array.from(
    new Set(studios.map((s) => s.name.trim()).filter(Boolean))
  );
  if (unique.length === 0) return;

  const { data: existing, error: findErr } = await supabase
    .from("studios")
    .select("id, name")
    .in("name", unique);

  if (findErr) throw new Error(`studios lookup failed: ${findErr.message}`);

  const idByName = new Map<string, string>();
  for (const row of (existing ?? []) as Array<{ id: string; name: string }>) {
    idByName.set(row.name, row.id);
  }

  const missing = unique.filter((name) => !idByName.has(name));
  if (missing.length > 0) {
    const { data: inserted, error: insertErr } = await supabase
      .from("studios")
      .insert(missing.map((name) => ({ name })))
      .select("id, name");

    if (insertErr) throw new Error(`studios insert failed: ${insertErr.message}`);

    for (const row of (inserted ?? []) as Array<{ id: string; name: string }>) {
      idByName.set(row.name, row.id);
    }
  }

  const studioIds = unique
    .map((name) => idByName.get(name))
    .filter((id): id is string => typeof id === "string");

  if (studioIds.length === 0) return;

  await supabase.from("anime_studios").delete().eq("anime_id", animeId);
  const { error: junctionErr } = await supabase
    .from("anime_studios")
    .insert(studioIds.map((studio_id) => ({ anime_id: animeId, studio_id })));

  if (junctionErr) {
    throw new Error(`anime_studios insert failed: ${junctionErr.message}`);
  }
}
