import Aura from "@primeuix/themes/aura";
import PrimeVue from "primevue/config";
import { createApp } from "vue";
import App from "./App.vue";

import "./styles/theme.css";

import { createDocumentationRouter } from "@/router";
import { useFeatures } from "./composables/features";
import { useTheme } from "./composables/useTheme";

// Initialize theme before mounting app
const { initTheme } = useTheme();
initTheme();

const app = createApp(App);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
});

useFeatures();

const router = createDocumentationRouter();

app.use(router);

app.mount("#app");
