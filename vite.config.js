import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ["@huggingface/transformers"] },
  server: {
    watch: {
      ignored: [
        "**/.voice-test-profile",
        "**/.voice-test-profile/**",
        "**/test-results/**",
        "**/screenshots/**",
      ],
    },
  },
  test: { include: ["tests/**/*.test.js"] },
});
