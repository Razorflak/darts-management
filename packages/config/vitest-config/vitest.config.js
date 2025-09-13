import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // ... autres configurations de test
    tsconfig: "./tsconfig.json", // Tentative de forcer le tsconfig local
  },
});
