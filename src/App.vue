<script setup>
import QrStudio from "./components/QrStudio.vue";
</script>

<template>
  <div class="app">
    <header class="app__header">
      <div class="logo-badge" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
          <rect x="14.5" y="14.5" width="2.4" height="2.4" />
          <rect x="19" y="14.5" width="2" height="2.4" />
          <rect x="14.5" y="19" width="2.4" height="2" />
          <rect x="18.5" y="18.5" width="2.5" height="2.5" />
        </svg>
      </div>
      <div>
        <h1 class="app__title">QR Studio</h1>
        <p class="app__subtitle">
          Gere QR Codes personalizados — tudo roda localmente no seu navegador.
        </p>
      </div>
    </header>

    <QrStudio initial-text="https://github.com/azincourt-tech/qrgenerator" />

    <footer class="app__footer">
      Aplicação 100% estática · sem servidor, sem login · seus dados nunca saem do navegador.
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.app__header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 32px;
}

.logo-badge {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: linear-gradient(135deg, #4f46e5, #7c6cf0);
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
}

.app__title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
}

.app__subtitle {
  margin: 2px 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.app__footer {
  text-align: center;
  color: #6b7280;
  font-size: 0.78rem;
  margin-top: 40px;
}
</style>
