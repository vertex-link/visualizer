
import { ref } from "vue";
import { discoverFeatures } from "@/utils/feature-discovery";
import type { Category } from "@/types/features";

const categories = ref<Category[]>([]);

export function useFeatures() {
  if (categories.value.length === 0) {
    categories.value = discoverFeatures();
  }

  return { categories };
}
