<script setup>
import { ref, onMounted } from "vue";
import QrStudio from "./components/QrStudio.vue";

const THEME_KEY = "qrstudio.theme";
const theme = ref("light");

function applyTheme(t) {
  theme.value = t;
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
}
function toggleTheme() {
  applyTheme(theme.value === "dark" ? "light" : "dark");
}

onMounted(() => {
  let saved = "light";
  try {
    saved = localStorage.getItem(THEME_KEY) || "light";
  } catch {
    /* ignore */
  }
  applyTheme(saved);
});
</script>

<template>
  <div class="min-h-screen bg-base-200 text-base-content">
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header class="mb-8 flex items-center gap-4">
        <div class="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-content shadow-md">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
            <rect x="14.5" y="14.5" width="2.4" height="2.4" />
            <rect x="19" y="14.5" width="2" height="2.4" />
            <rect x="14.5" y="19" width="2.4" height="2" />
            <rect x="18.5" y="18.5" width="2.5" height="2.5" />
          </svg>
        </div>
        <div class="flex-1">
          <h1 class="text-2xl font-bold tracking-tight">QR Studio</h1>
          <p class="text-sm opacity-60">
            Gere QR Codes personalizados — tudo roda localmente no seu navegador.
          </p>
        </div>

        <!-- Alternância de tema claro/escuro (controlada por JS) -->
        <button
          class="btn btn-ghost btn-circle"
          :title="theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" class="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M5.64 17l-.71.71a1 1 0 0 0 1.41 1.41l.71-.71A1 1 0 0 0 5.64 17zM5 12a1 1 0 0 0-1-1H3a1 1 0 0 0 0 2h1a1 1 0 0 0 1-1zm7-7a1 1 0 0 0 1-1V3a1 1 0 0 0-2 0v1a1 1 0 0 0 1 1zM5.64 7.05a1 1 0 0 0 .7.29 1 1 0 0 0 .71-.29 1 1 0 0 0 0-1.41l-.71-.71a1 1 0 0 0-1.41 1.41zM17 5.64a1 1 0 0 0 .7-.29l.71-.71a1 1 0 1 0-1.41-1.41l-.71.71A1 1 0 0 0 17 5.64zM21 11h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2zm-2.36 6a1 1 0 0 0-1.41 1.41l.71.71a1 1 0 0 0 1.41-1.41zM12 19a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1zm0-14a7 7 0 1 0 7 7 7 7 0 0 0-7-7z" /></svg>
          <svg v-else class="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M21.64 13a1 1 0 0 0-1.05-.14 8.05 8.05 0 0 1-3.37.73 8.15 8.15 0 0 1-8.14-8.1 8.59 8.59 0 0 1 .25-2A1 1 0 0 0 8 2.36a10.14 10.14 0 1 0 14 11.69 1 1 0 0 0-.36-1.05z" /></svg>
        </button>
      </header>

      <QrStudio />

      <footer class="mt-10 text-center text-xs opacity-50">
        Aplicação 100% estática · sem servidor, sem login · seus dados nunca saem do navegador.
      </footer>
    </div>
  </div>
</template>
