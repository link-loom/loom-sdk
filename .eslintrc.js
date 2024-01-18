module.exports = {
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'script',
  },
  extends: ['plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
};
