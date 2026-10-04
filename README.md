# gojotv-metadata (W2)

Metadata Worker — consumes metadata-sync-queue, fetches full anime
metadata from Jikan (MAL) + TMDB (banner) + Kitsu (fallback), saves
to Supabase, pushes stream-sync-queue for W3.

## Trigger
Cloudflare Queue: metadata-sync-queue (consumer)

## Produces
Cloudflare Queue: stream-sync-queue (for W3 Stream Worker)

## Secrets Required
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- TMDB_API_KEY
