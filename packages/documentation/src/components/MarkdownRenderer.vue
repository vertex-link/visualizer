<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Failed to load content.</div>
  <div v-else class="markdown-content" v-html="renderedMarkdown"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import type { FeatureRouteMeta } from "@/types/features.ts";
import {useFeatures} from "@/composables/features.ts";

const route = useRoute();
const renderedMarkdown = ref("");
const loading = ref(false);
const error = ref(false);
const features = useFeatures();

// const getMarkdownModule = (category: string, feature: string) => {
//   return import(`../features/${category}/${feature}.md?raw`);
// };

const renderMarkdown = async () => {
  const { category, featureId, content } = route.meta as unknown as FeatureRouteMeta;
  console.log(category);

  if (content) {
    loading.value = true;
    error.value = false;
    
    try {
      // const module = await getMarkdownModule(category as string, featureId);
      console.log(features.categories.value);
      renderedMarkdown.value = await marked(content);
    } catch (e) {
      console.error("Error loading markdown file:", e);
      error.value = true;
    } finally {
      loading.value = false;
    }
  }
};

watch(() => route.params, renderMarkdown);
onMounted(renderMarkdown);
</script>

<style>
.markdown-content {
  padding: 2rem;
}
</style>
