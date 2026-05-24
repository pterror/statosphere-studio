export default {
  extends: ['stylelint-config-standard', 'stylelint-config-recommended-vue'],
  overrides: [
    { files: ['**/*.vue'], customSyntax: 'postcss-html' },
  ],
  rules: {
    // Tailwind directives (@tailwind, @apply, @layer) are not standard CSS at-rules.
    'at-rule-no-unknown': [true, { ignoreAtRules: ['tailwind', 'apply', 'layer', 'variants', 'responsive', 'screen'] }],

    // The entire codebase uses rgba()/rgb() with numeric alpha — the alias notation
    // (rgba → rgb with slash) is a style preference; project idiom is legacy rgba().
    'color-function-notation': 'legacy',
    'color-function-alias-notation': null,

    // All color values use CSS custom properties for actual colors; hex appears only
    // in :root variable definitions (the canonical source-of-truth). Too strict here.
    'color-no-hex': null,

    // Project uses numeric alpha throughout (0, 0.5, 0.72…) — percentage notation
    // is a future migration, not the current idiom.
    'alpha-value-notation': 'number',

    // BEM modifier pattern (.class--modifier) uses double-dash which is flagged by
    // the default kebab-case regex. Allow BEM.
    'selector-class-pattern': [
      '^([a-z][a-z0-9]*)(-[a-z0-9]+)*(--([a-z][a-z0-9]*)(-[a-z0-9]+)*)?$',
      { message: 'Expected class selector to be kebab-case or BEM (block--modifier)' },
    ],

    // Vendor-prefixed -webkit-backdrop-filter is used intentionally alongside the
    // standard property for Safari compatibility.
    'property-no-vendor-prefix': [true, { ignoreProperties: ['-webkit-backdrop-filter'] }],

    // Project uses @import './file.css' string notation (not url()); this is valid
    // CSS and consistent throughout.
    'import-notation': 'string',

    // Media queries use classic max-width: 600px syntax throughout, not range notation.
    'media-feature-range-notation': null,

    // Tailwind generates its own selectors; no-descending-specificity fires on the
    // [data-theme] override pattern used in main.css. Disable to avoid noise.
    'no-descending-specificity': null,

    // Inline shorthand inset is equivalent; longhand is explicit and readable here.
    'declaration-block-no-redundant-longhand-properties': null,

    // Inline style="" attributes parsed by postcss-html are single-line; requiring
    // empty lines before custom properties is impractical there.
    'custom-property-empty-line-before': null,
  },
}
