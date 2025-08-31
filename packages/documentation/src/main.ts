import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

// PrimeVue setup
import PrimeVue from 'primevue/config'
import 'primeicons/primeicons.css'
// PrimeVue uses unstyled by default in this setup; you can add @primevue/themes later.

const app = createApp(App)

app.use(router as any)
app.use(PrimeVue)
app.mount('#app')
