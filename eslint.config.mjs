import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";


export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      quotes: ["error", "double"],
    },
  },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.node } },
  tseslint.configs.recommended,
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/commonmark", extends: ["markdown/recommended"] },
]);
