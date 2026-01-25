import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ["**/__tests__/**"],
    rules: {
      "import/no-unresolved": "off",
    },
  },
  {
    ignores: ["dist/*", "lib/gen/**", "**/__tests__/**"],
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
        },
      },
    },
  },
]);
