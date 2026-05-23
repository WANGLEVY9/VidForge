module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-prettier'],
  rules: {
    'selector-class-pattern': null,
    'no-descending-specificity': null,
    'import-notation': null,
  },
  ignoreFiles: ['node_modules', 'dist', 'build'],
};
