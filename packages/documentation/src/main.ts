import Aura from "@primeuix/themes/aura";
import PrimeVue from "primevue/config";
import { createApp } from "vue";
import App from "./App.vue";

import "./styles/theme.css";

import { createDocumentationRouter } from "@/router";
import { useFeatures } from "./composables/features";

const app = createApp(App);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});

useFeatures();

const router = createDocumentationRouter();

app.use(router);

app.mount("#app");
