import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // next/core-web-vitals already registers the jsx-a11y plugin itself
  // (with only a subset of rules enabled) - re-declaring the plugin via
  // jsxA11y.flatConfigs.recommended directly would conflict ("Cannot
  // redefine plugin"). Only the rule set is merged in here, onto the
  // already-registered plugin, to get the full recommended set.
  {
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // This project's own additions:
    "coverage/**",
    ".review/**",
  ]),
]);

export default eslintConfig;
