import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import PrimeVue from "primevue/config";
import "./styles/theme.css";
import { useFeatures } from "./composables/features";

const app = createApp(App);

useFeatures();

app.use(router);
app.use(PrimeVue);

app.mount("#app");
