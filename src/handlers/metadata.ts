// W2 Metadata Handler
// Process a MetadataJob: fetch Kitsu metadata, save to DB, push stream job

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchAnimeBulkByKitsuIds,
  fetchAnimeByKitsuId,
} from "../services/kitsu";
import {
  transformKitsuAnime,
  extractGenresFromIncluded,
  type TransformedAnime,
} from "../utils/transformer";
import type { MetadataJob, StreamJob } from "../types/queue";
import type { KitsuResource } from "../types/kitsu";

export interface HandlerDeps {
  supabase: SupabaseClient;
  streamQueue: Queue<StreamJob>;
}

export interface HandlerResult {
  animeId: string;
  slug: string;
  malId: number;
  episodeCount: number;
  isNew: boolean;
}

// ============================================================
// BULK PROCESSING — called once per batch
// ============================================================

export async function processMetadataBatch(
  jobs: MetadataJob[],
  deps: HandlerDeps
): Promise<HandlerResult[]> {
  if (jobs.length === 0) return [];

  const kitsuIds = jobs.map((j) => j.kitsu_id);
  const kitsuMap = await fetchAnimeBulkByKitsuIds(kitsuIds);

  const results: HandlerResult[] = [];

  for (const job of jobs) {
    const resource = kitsuMap.get(job.kitsu_id);
    if (!resource) {
      console.warn(
        `[W2] Kitsu resource missing for kitsu_id=${job.kitsu_id}, attempting individual fetch`
      );
      // Fallback — try individual fetch
      try {
        const single = await fetchAnimeByKitsuId(job.kitsu_id);
        if (!single) {
          throw new Error(
            `Kitsu returned null for kitsu_id=${job.kitsu_id}`
          );
        }
        const result = await processOne(job, single, deps);
        results.push(result);
      } catch (err) {
        throw err;
      }
      continue;
    }

    const result = await processOne(job, resource, deps);
    results.push(result);
  }

  return results;
}

// ============================================================
// SINGLE JOB PROCESSING
// ============================================================

async function processOne(
  job: MetadataJob,
  resource: KitsuResource,
  deps: HandlerDeps
): Promise<HandlerResult> {
  const { supabase, streamQueue } = deps;

  // 1. Transform Kitsu response -> DB shape
  const transformed = transformKitsuAnime(
    resource,
    job.mal_id,
    job.anilist_id,
    job.tmdb_id,
    job.banner_image
  );

  // 2. Resolve unique slug
  transformed.slug = await resolveUniqueSlug(supabase, transformed);

  // 3. Upsert anime
  const { animeId, isNew } = await upsertAnime(supabase, transformed);

  // 4. Upsert episodes (1..N)
  const episodeRecords = await upsertEpisodes(
    supabase,
    animeId,
    transformed
  );

  // 5. Genres (bulk response may not include them — that's OK)
  // For now skip genres; can add future via /anime?include=genres

  // 6. Push stream job
  if (episodeRecords.length > 0) {
    const streamJob: StreamJob = {
      anime_id: animeId,
      mal_id: transformed.mal_id,
      anilist_id: transformed.anilist_id,
      // ✅ NEW — titles for W3 to search Tatakai sources
      title: transformed.title,
      english_title: transformed.english_title,
      romaji_title: transformed.romaji_title,
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
    malId: transformed.mal_id,
    episodeCount: episodeRecords.length,
    isNew,
  };
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
        kitsu_id: data.kitsu_id,
        tmdb_id: data.tmdb_id,
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
      kitsu_id: data.kitsu_id,
      tmdb_id: data.tmdb_id,
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
