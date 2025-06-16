// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  {
    // global ignores need to be in their own block otherwise they don't seem to work
    ignores: [
      '.github/**',
      '.vscode/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'playwright/**',
      'src/public/**',
      '**/*.config.{mjs,ts}'
    ]
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      'line-comment-position': 'off',
      'no-warning-comments': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
]);
