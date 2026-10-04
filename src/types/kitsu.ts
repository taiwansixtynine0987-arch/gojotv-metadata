// Kitsu API types — primary metadata source

export interface KitsuImageSet {
  tiny: string | null;
  small: string | null;
  medium: string | null;
  large: string | null;
  original: string | null;
}

export interface KitsuTitles {
  en: string | null;
  en_jp: string | null;
  ja_jp: string | null;
}

export interface KitsuAttributes {
  createdAt: string;
  updatedAt: string;
  slug: string | null;
  synopsis: string | null;
  coverImageTopOffset: number | null;
  titles: KitsuTitles | null;
  canonicalTitle: string | null;
  abbreviatedTitles: string[] | null;
  averageRating: string | null;
  userCount: number | null;
  favoritesCount: number | null;
  startDate: string | null;
  endDate: string | null;
  nextRelease: string | null;
  popularityRank: number | null;
  ratingRank: number | null;
  ageRating: string | null;
  ageRatingGuide: string | null;
  subtype: string | null;
  status: string | null;
  tba: string | null;
  posterImage: KitsuImageSet | null;
  coverImage: KitsuImageSet | null;
  episodeCount: number | null;
  episodeLength: number | null;
  totalLength: number | null;
  youtubeVideoId: string | null;
  showType: string | null;
  nsfw: boolean;
}

export interface KitsuRelationshipData {
  id: string;
  type: string;
}

export interface KitsuRelationships {
  genres?: { data: KitsuRelationshipData[] };
  categories?: { data: KitsuRelationshipData[] };
  studios?: { data: KitsuRelationshipData[] };
}

export interface KitsuResource {
  id: string;
  type: string;
  attributes: KitsuAttributes;
  relationships?: KitsuRelationships;
}

export interface KitsuIncludedResource {
  id: string;
  type: string;
  attributes: {
    name?: string;
    title?: string;
    slug?: string;
  };
}

export interface KitsuAnimeResponse {
  data: KitsuResource;
  included?: KitsuIncludedResource[];
}
