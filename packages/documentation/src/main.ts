import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import Aura from "@primevue/themes/aura";
// PrimeVue setup with Aura theme
import PrimeVue from "primevue/config";
import "primeicons/primeicons.css";

// Custom theme styles
import "./styles/theme.css";
import "./styles/variables.css";

const app = createApp(App);

app.use(
  PrimeVue as any,
  {
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: ".dark",
        cssLayer: {
          name: "primevue",
          order: "reset, primevue, utilities",
        },
      },
    },
  } as any,
);

app.use(router as any);
app.mount("#app");
