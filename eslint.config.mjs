import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const clientFiles = ["client/**/*.{js,jsx,mjs,cjs,ts,tsx}"];

const nextConfigs = compat
  .extends("next/core-web-vitals", "next/typescript")
  .map((config) => ({ ...config, files: clientFiles }));

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/uploads/**",
      "server/prisma/migrations/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  ...nextConfigs,
  {
    files: clientFiles,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": ["error", "client/src/app"],
    },
  },
  {
    files: ["**/*.cjs", "**/*.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },
  prettier,
);
