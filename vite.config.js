import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// Build estático puro — gera a pasta `dist/` pronta para hosts como Netlify.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: "./",
  build: {
    outDir: "dist",
  },
});
