export interface Feature {
  id: string;
  title: string;
  category: string;
  route: string;
  content: string;
  type: 'example' | 'doc';

  complexity?: string;
  description?: string;
  parameters?: any[];
  entryUrl?: string;
}

export interface Category {
  id: string;
  title: string;
  features: Feature[];
}

export interface FeatureRouteMeta {
  title: string;
  category: string;
  featureId: string;
  content: string;
}