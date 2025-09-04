export interface DocItem {
  id: string;
  title: string;
  path: string; // file system path
  route: string; // router path
  type: "simple" | "complex";
  content: string;
  isInteractive?: boolean;
  entryUrl?: string;
  description?: string;
  complexity?: string;
  parameters?: any[];
  children?: DocItem[];
}

export interface DocItemAttributes<T = undefined> {
  title: string;
  entry: string;
  description: string;
  parameters?: T;
  interactive?: boolean;
  complexity?: string;
}

// Keep backward compatibility
export interface Feature extends DocItem {
  category: string; // for backward compatibility
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
