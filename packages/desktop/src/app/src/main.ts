// src/renderer/src/main.ts
import { createApp } from 'vue'
import App from './App.vue'

// Type declaration for electronAPI
declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void
      close: () => void
      startDrag: () => void
    }
  }
}

createApp(App).mount('#app')
