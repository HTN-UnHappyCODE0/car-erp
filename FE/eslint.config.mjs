import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        {
          type: "app",
          pattern: "app/**",
        },
        {
          type: "widgets",
          pattern: "widgets/*",
        },
        {
          type: "features",
          pattern: "features/*",
        },
        {
          type: "entities",
          pattern: "entities/*",
        },
        {
          type: "shared",
          pattern: "shared/**",
        },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: [
                { to: { element: { type: "widgets" } } },
                { to: { element: { type: "features" } } },
                { to: { element: { type: "entities" } } },
                { to: { element: { type: "shared" } } },
                { to: { element: { type: "app" } } },
              ],
            },
            {
              from: { element: { type: "widgets" } },
              allow: [
                { to: { element: { type: "features" } } },
                { to: { element: { type: "entities" } } },
                { to: { element: { type: "shared" } } },
                { to: { element: { type: "widgets" } } },
              ],
            },
            {
              from: { element: { type: "features" } },
              allow: [
                { to: { element: { type: "entities" } } },
                { to: { element: { type: "shared" } } },
              ],
            },
            {
              from: { element: { type: "entities" } },
              allow: [
                { to: { element: { type: "shared" } } },
                { to: { element: { type: "entities" } } },
              ],
            },
            {
              from: { element: { type: "shared" } },
              allow: [{ to: { element: { type: "shared" } } }],
            },
          ],
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
