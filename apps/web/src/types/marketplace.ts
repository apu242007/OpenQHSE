/**
 * TypeScript types for the Marketplace module.
 */

export interface MarketplaceTemplateList {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  category: string;
  industry: string;
  standards: string[];
  tags: string[];
  language: string;
  version: string;
  question_count: number;
  section_count: number;
  estimated_duration_minutes: number;
  download_count: number;
  import_count: number;
  rating_average: number;
  rating_count: number;
  is_featured: boolean;
  contributor_name: string;
  preview_image_url: string | null;
  created_at: string;
}

export interface MarketplaceQuestion {
  id: string;
  text: string;
  type: 'yes_no' | 'multiple_choice' | 'text' | 'number' | 'photo' | 'rating';
  required: boolean;
  options?: string[];
  weight: number;
  conditional_logic?: {
    show_if: { question_id: string; answer: string };
  } | null;
}

export interface MarketplaceSection {
  title: string;
  order: number;
  questions: MarketplaceQuestion[];
}

export interface MarketplaceSchemaJson {
  sections: MarketplaceSection[];
}

export interface MarketplaceScoringConfig {
  method: string;
  max_score: number;
  pass_threshold: number;
  weights?: Record<string, number>;
}

export interface MarketplaceTemplateRead extends MarketplaceTemplateList {
  description: string;
  schema_json: MarketplaceSchemaJson;
  scoring_config: MarketplaceScoringConfig | null;
  contributor_org: string | null;
  updated_at: string;
}

export interface CategoryInfo {
  value: string;
  label: string;
  template_count: number;
  icon: string;
}

export interface RatingCreate {
  score: number;
  review?: string;
}

export interface RatingRead {
  id: string;
  template_id: string;
  user_id: string;
  score: number;
  review: string | null;
  created_at: string;
}

export interface MarketplaceImportResult {
  form_template_id: string;
  marketplace_template_id: string;
  name: string;
  message: string;
}

export interface MarketplaceSearchParams {
  q?: string;
  category?: string;
  industry?: string;
  standard?: string;
  language?: string;
  min_rating?: number;
  sort_by?: 'popular' | 'recent' | 'rating' | 'name';
  page?: number;
  page_size?: number;
}
