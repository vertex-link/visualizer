import { ref, watch, onMounted } from 'vue';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'vertex-link-theme';
const currentTheme = ref<Theme>('light');

export function useTheme() {
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme;

    // Update document class for PrimeVue
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('app-dark');
      html.classList.remove('no-dark-mode');
    } else {
      html.classList.remove('app-dark');
      html.classList.add('no-dark-mode');
    }

    // Store preference in localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  };

  const toggleTheme = () => {
    const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const initTheme = () => {
    // Check for stored preference
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;

    // Check for system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Priority: stored preference > system preference > default (light)
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  };

  return {
    currentTheme,
    setTheme,
    toggleTheme,
    initTheme,
  };
}
