import { defineConfig } from "vite";
import checker from "vite-plugin-checker";

export default defineConfig({
  plugins: [checker({ typescript: true })],
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
});
