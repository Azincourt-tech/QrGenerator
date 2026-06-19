import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Build estático puro — gera a pasta `dist/` pronta para hosts como Netlify.
export default defineConfig({
  plugins: [vue()],
  base: "./",
  build: {
    outDir: "dist",
  },
});
