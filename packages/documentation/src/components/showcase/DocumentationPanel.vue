<template>
  <div class="documentation-panel">
    <div class="documentation-content" v-html="renderedMarkdown"></div>
  </div>
</template>

<script setup lang="ts">
import { marked } from "marked";
import prism from "prismjs";
import { computed } from "vue";

interface Props {
  content: string;
}

const props = defineProps<Props>();

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: (code, language) => {
    const validLanguage = prism.getLanguage(language) ? language : "plaintext";
    return prism.highlight(code, { language: validLanguage }).value;
  },
  breaks: false,
  gfm: true,
});

const renderedMarkdown = computed(() => {
  return marked.parse(props.content);
});
</script>

<style scoped>
.documentation-panel {
  height: 100%;
  overflow-y: auto;
}

.documentation-content {
  line-height: 1.6;
  color: var(--p-primary-700);
}

/* Markdown styling */
.documentation-content :deep(h1),
.documentation-content :deep(h2),
.documentation-content :deep(h3) {
  color: var(--p-primary-800);
  margin: 1.5rem 0 0.75rem;
  font-weight: 600;
}

.documentation-content :deep(h1) {
  font-size: 1.5rem;
}

.documentation-content :deep(h2) {
  font-size: 1.25rem;
}

.documentation-content :deep(h3) {
  font-size: 1.125rem;
}

.documentation-content :deep(p) {
  margin-bottom: 1rem;
}

.documentation-content :deep(ul),
.documentation-content :deep(ol) {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.documentation-content :deep(li) {
  margin-bottom: 0.5rem;
}

.documentation-content :deep(pre) {
  background-color: var(--p-surface-100);
  border: var(--p-border-width) solid var(--p-surface-200);
  border-radius: var(--p-border-radius);
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
}

.documentation-content :deep(code) {
  font-family: var(--p-font-family-mono);
}

.documentation-content :deep(blockquote) {
  border-left: 4px solid var(--p-accent-500);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--p-primary-600);
  font-style: italic;
}
</style>
