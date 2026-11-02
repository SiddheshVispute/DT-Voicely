import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleApiMiddleware } from "./src/server/vapiMiddleware.js";

function voicelyApiPlugin() {
  return {
    name: "voicely-api-server",
    configureServer(server) {
      server.middlewares.use(handleApiMiddleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), voicelyApiPlugin()],
  optimizeDeps: { include: ["@huggingface/transformers", "@vapi-ai/web"] },
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

