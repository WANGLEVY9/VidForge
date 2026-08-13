module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    'selector-class-pattern': null,
    'no-descending-specificity': null,
    'import-notation': null,
    'property-no-vendor-prefix': null,
    'keyframes-name-pattern': null,
    'declaration-block-single-line-max-declarations': null,
    // Prettier intentionally compacts adjacent keyframe and utility rules.
    'rule-empty-line-before': null,
  },
  ignoreFiles: ['**/node_modules/**', '**/dist/**', '**/build/**'],
};
