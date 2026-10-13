import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

process.env.TZ = "Asia/Kolkata";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
