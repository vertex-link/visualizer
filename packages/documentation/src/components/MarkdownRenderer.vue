<template>
  <div class="markdown-container" v-html="renderedMarkdown"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Accept content as a prop
const props = defineProps<{
  content: string;
}>();

marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  gfm: true,
});

// Render the prop content
const renderedMarkdown = computed(() => {
  return marked.parse(props.content || '');
});
</script>

<style scoped>
.markdown-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}
/* You can add more markdown-specific styles here */
</style>