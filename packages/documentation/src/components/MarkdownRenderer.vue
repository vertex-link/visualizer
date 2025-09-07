<template>
  <div class="markdown-body" v-html="markodown"></div>
</template>
<style scoped>
.markdown-body {
    padding-bottom: 3rem;
}
</style>

<script setup lang="ts">
import { marked } from "marked";
import prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markup";
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const props = defineProps<{
  content: string;
}>();

const markodown = ref<string>("");

const aliasMap: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "tsx",
  sh: "bash",
  shell: "bash",
  console: "bash",
  html: "markup",
  xml: "markup",
  vue: "markup",
  json5: "json",
  txt: "plain",
  text: "plain",
  plaintext: "plain",
};

const normalizeLang = (lang?: string) => {
  const l = (lang || "").trim().toLowerCase();
  return aliasMap[l] || l || "plain";
};

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Simple post-processing approach: parse with default marked, then enhance the HTML
const updateMakrdown = async () => {
  console.log("Updating markdown, content length:", props.content?.length);
  markodown.value = "";

  if (props.content) {
    try {
      // Parse with default marked (no custom renderer complications)
      let html = await marked.parse(props.content, {
        breaks: false,
        gfm: true,
      });

      // Post-process: find code blocks and add language classes + highlighting
      html = html.replace(
        /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
        (match, language, code) => {
          console.log("Post-processing code block with language:", language);

          // Decode HTML entities in the code first
          const decodedCode = code
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          const normalizedLang = normalizeLang(language);
          const grammar = prism.languages[normalizedLang];

          let highlightedCode: string;
          if (grammar) {
            try {
              highlightedCode = prism.highlight(decodedCode, grammar, normalizedLang);
              console.log("Applied Prism highlighting for:", normalizedLang);
            } catch (e) {
              console.warn("Prism highlighting failed for", normalizedLang, e);
              highlightedCode = escapeHtml(decodedCode);
            }
          } else {
            highlightedCode = escapeHtml(decodedCode);
            console.log("No grammar, escaped code for:", normalizedLang);
          }

          // Return with language class on BOTH pre and code elements
          return `<pre class="language-${language}"><code class="language-${language}">${highlightedCode}</code></pre>`;
        },
      );

      markodown.value = html;
      console.log(
        'Final HTML contains <pre class="language-":',
        html.includes('<pre class="language-'),
      );
    } catch (error) {
      console.error("Error parsing markdown:", error);
      markodown.value = `<p>Error parsing markdown: ${error}</p>`;
    }
  }
};

// Watch for changes
watch(
  () => [route.fullPath, props.content],
  () => {
    updateMakrdown();
  },
  { immediate: true },
);

onMounted(updateMakrdown);
</script>
