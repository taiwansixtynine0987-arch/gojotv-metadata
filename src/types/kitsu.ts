// Kitsu API response types (fallback banner)

export interface KitsuImageSet {
  tiny: string | null;
  small: string | null;
  medium: string | null;
  large: string | null;
  original: string | null;
}

export interface KitsuAttributes {
  slug: string | null;
  canonicalTitle: string | null;
  posterImage: KitsuImageSet | null;
  coverImage: KitsuImageSet | null;
  coverImageTopOffset: number | null;
}

export interface KitsuResource {
  id: string;
  type: string;
  attributes: KitsuAttributes;
}

export interface KitsuAnimeResponse {
  data: KitsuResource;
}
