<template>
  <div v-html="markodown"></div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
// We'll use a modern, dark theme for code that complements the Aura theme.
import 'highlight.js/styles/atom-one-dark.css';

const props = defineProps<{
  content: string;
}>();

const markodown = ref<string>('')

marked.use(markedHighlight({
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

onMounted(async () => {
  markodown.value = await marked.parse(props.content || '');
})
</script>
