export interface Feature {
  id: string;
  title: string;
  category: string;
  route: string;
  complexity?: string;
  content: string;
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