export default [
  {
    files: ['src/**/*.js', 'scripts/**/*.mjs'],
    ignores: ['src/assets/**'],
    rules: {
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
    },
  },
];
