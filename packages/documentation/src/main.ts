import { createApp } from "vue";
import App from "./App.vue";
import PrimeVue from "primevue/config";
import "./styles/theme.css";
import { useFeatures } from "./composables/features";
import {createDocumentationRouter} from "@/router";

const app = createApp(App);

useFeatures();

const router = createDocumentationRouter()

app.use(router);
app.use(PrimeVue);

app.mount("#app");
