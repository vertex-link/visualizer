// Parameter management utilities (placeholder for future extensions)
export type ParameterValue = string | number | boolean | any;

export function coerceValue<T = any>(value: any): T {
  return value as T;
}

export function serializeParameters(values: Record<string, any>): string {
  return encodeURIComponent(JSON.stringify(values));
}

export function deserializeParameters(query: string): Record<string, any> {
  try {
    return JSON.parse(decodeURIComponent(query));
  } catch {
    return {};
  }
}
