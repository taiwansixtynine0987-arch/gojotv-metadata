# gojotv-metadata (W2)

Metadata Worker. Consumes metadata-sync-queue, fetches full anime
metadata from Kitsu, saves to Supabase, pushes to stream-sync-queue.

## Trigger
Cloudflare Queue: metadata-sync-queue (consumer)

## Produces
Cloudflare Queue: stream-sync-queue (for W3)

## Input Queue Payload
{
  "source": "kitsu",
  "kitsu_id": 11,
  "mal_id": 20,
  "anilist_id": 20,
  "tvdb_id": 78857,
  "tmdb_id": 46260,
  "banner_image": "https://image.tmdb.org/t/p/original/...",
  "category": "trending",
  "priority": "high"
}

## Output Queue Payload
{
  "anime_id": "uuid",
  "mal_id": 20,
  "anilist_id": 20,
  "episodes": [1, 2, ..., 220],
  "priority": "high",
  "category": "trending"
}

## Secrets Required
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
