interface BaseParameterDefinition {
  key: string;
  label: string;
  description?: string;
}

export interface SliderParameter extends BaseParameterDefinition {
  type: 'slider';
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

export interface ToggleParameter extends BaseParameterDefinition {
  type: 'toggle';
  defaultValue: boolean;
}

export interface SelectParameter extends BaseParameterDefinition {
  type: 'select';
  defaultValue: any;
  options: { label: string; value: any }[];
}

export interface ColorParameter extends BaseParameterDefinition {
  type: 'color';
  defaultValue: string;
}

export interface TextParameter extends BaseParameterDefinition {
  type: 'text';
  defaultValue: string;
}

export interface NumberParameter extends BaseParameterDefinition {
  type: 'number';
  defaultValue: number;
}

export type ParameterDefinition =
  | SliderParameter
  | ToggleParameter
  | SelectParameter
  | ColorParameter
  | TextParameter
  | NumberParameter;


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
  parameters?: ParameterDefinition[];
  children?: DocItem[];
}

export interface DocItemAttributes {
  title: string;
  entry: string;
  description: string;
  parameters?: ParameterDefinition[];
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
