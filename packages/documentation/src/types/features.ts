import type { Component } from "vue";

export interface ParameterDefinition {
  key: string;
  type: "slider" | "toggle" | "select" | "color";
  label: string;
  defaultValue: any;
  description?: string;

  // Slider specific
  min?: number;
  max?: number;
  step?: number;

  // Select specific
  options?: Array<{ value: any; label: string }>;
}

export interface FeatureDefinition {
  id: string;
  title: string;
  description: string;
  category: "acs" | "engine" | "examples";
  complexity: "basic" | "intermediate" | "advanced";

  // Route path
  route: string;

  // Interactive parameters
  parameters: ParameterDefinition[];

  // Related features
  relatedFeatures?: string[];

  // Tags for filtering
  tags: string[];

  // Vue component for the demo
  component: () => Promise<Component>;

  // Documentation content (markdown file path)
  documentation: string;
}

export interface FeatureCategory {
  id: "acs" | "engine" | "examples";
  title: string;
  description: string;
  icon: string;
  features: FeatureDefinition[];
}
