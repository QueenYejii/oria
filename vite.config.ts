import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const normalizedId = id.replace(/\\/g, "/");
          if (normalizedId.includes("/node_modules/@aptos-labs/")) return "aptos";
          if (normalizedId.includes("/node_modules/@shelby-protocol/")) return "shelby";
          if (normalizedId.includes("/node_modules/@tanstack/")) return "query";
          if (normalizedId.includes("/node_modules/gsap/")) return "motion";
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/react-router-dom/")
          ) {
            return "react";
          }

          return undefined;
        },
      },
    },
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
