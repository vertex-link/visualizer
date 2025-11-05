<template>
  <div class="markdown-body" v-html="markodown"></div>
</template>
<style scoped>
.markdown-body {
  padding: 1.5rem;
  max-width: 100%;
  overflow-x: hidden;
}

/* Mobile-friendly markdown content */
.markdown-body :deep(h1) {
  font-size: 1.75rem;
  line-height: 1.3;
  margin-top: 0;
  margin-bottom: 1rem;
}

.markdown-body :deep(h2) {
  font-size: 1.5rem;
  line-height: 1.3;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.markdown-body :deep(h3) {
  font-size: 1.25rem;
  line-height: 1.3;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.markdown-body :deep(p) {
  line-height: 1.6;
  margin-bottom: 1rem;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 0.375rem;
  margin: 1rem 0;
  max-width: 100%;
}

.markdown-body :deep(code) {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.markdown-body :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.markdown-body :deep(li) {
  line-height: 1.6;
  margin-bottom: 0.25rem;
}

/* Mobile responsive */
@media (max-width: 767px) {
  .markdown-body {
    padding: 1rem;
  }

  .markdown-body :deep(h1) {
    font-size: 1.5rem;
  }

  .markdown-body :deep(h2) {
    font-size: 1.25rem;
  }

  .markdown-body :deep(h3) {
    font-size: 1.125rem;
  }

  .markdown-body :deep(pre) {
    font-size: 0.875rem;
    margin: 0.75rem 0;
  }
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
