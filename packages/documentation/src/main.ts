import { createApp } from "vue";
import App from "./App.vue";
import PrimeVue from "primevue/config";
import Aura from '@primeuix/themes/aura';

import "./styles/theme.css";
import { useFeatures } from "./composables/features";
import {createDocumentationRouter} from "@/router";

const app = createApp(App);
app.use(PrimeVue, {
  theme: {
          preset: Aura
      }
});

useFeatures();

const router = createDocumentationRouter()

app.use(router);

app.mount("#app");
