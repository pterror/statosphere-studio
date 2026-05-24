import pluginVue from "eslint-plugin-vue";
import vueA11y from "eslint-plugin-vuejs-accessibility";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";

export default defineConfigWithVueTs(
  // Vue 3 recommended rules (flat config key has no vue3- prefix in eslint-plugin-vue v10)
  pluginVue.configs["flat/recommended"],

  // TypeScript rules for Vue
  vueTsConfigs.recommended,

  // Accessibility rules
  ...vueA11y.configs["flat/recommended"],

  {
    files: ["src/**/*.{ts,vue}", "scripts/**/*.ts"],
    rules: {
      // Single-word component names are intentional for primitives like Popover, Toast, etc.
      "vue/multi-word-component-names": "off",

      // The project uses v-html deliberately for rendering markdown; sanitization is handled at the call site
      "vue/no-v-html": "off",

      // Form components intentionally mutate item props in-place (editor pattern, not a reactive state violation)
      "vue/no-mutating-props": "off",

      // Accessibility: no-static-element-interactions fires too broadly on reka-ui headless components
      // that provide their own ARIA semantics via the library
      "vuejs-accessibility/no-static-element-interactions": "off",

      // form-control-has-label and label-has-for: the project uses a consistent visual labeling
      // pattern (label + input in same flex container) rather than programmatic for/id associations.
      // Custom widget components (EnumChoice, ExpressionField) now accept aria-label as a prop
      // for screen-reader users, but the inline form layouts rely on visual proximity.
      "vuejs-accessibility/form-control-has-label": "off",
      "vuejs-accessibility/label-has-for": "off",

      // Variables prefixed with _ are intentionally unused (destructuring to omit, catch placeholders)
      "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],

      // any is pervasive at JSON/API boundaries throughout; enforcing unknown would require extensive type guards
      "@typescript-eslint/no-explicit-any": "off",

      // HTML formatting — project does not enforce opinionated HTML whitespace style via ESLint
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/multiline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "vue/html-indent": "off",
      "vue/attributes-order": "off",
      "vue/html-closing-bracket-spacing": "off",
      "vue/attribute-hyphenation": "off",
    },
  },

  {
    ignores: ["node_modules/**", "dist/**", "**/*.d.ts"],
  },
);
