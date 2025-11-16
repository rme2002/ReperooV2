import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig } from "eslint/config";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: fileURLToPath(new URL(".", import.meta.url)),
});

export default defineConfig([
  ...compat.config({
    extends: ["next/core-web-vitals", "plugin:prettier/recommended"],
  }),
  {
    ignores: ["dist/*", "lib/gen/**"],
  },
]);
