import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

/** 三端共享语义规则；格式由独立 format:check 负责。 */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/types/import/**',
      '**/shime*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: [
      'server/src/**/*.ts',
      'packages/shared-types/src/**/*.ts',
      'admin/src/**/*.{ts,vue}',
      'uni-app/src/**/*.{ts,vue}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        uni: 'readonly',
        getCurrentPages: 'readonly',
        getApp: 'readonly',
        plus: 'readonly',
        wx: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] } },
  },
  {
    files: [
      'server/src/runtime/**/*.ts',
      'server/src/common/jwt/**/*.ts',
      'server/src/config/**/*.ts',
      'server/src/redis/**/*.ts',
      'server/src/modules/job/**/*.ts',
      'server/src/database/tools/**/*.ts',
      'admin/src/api/request.ts',
      'uni-app/src/utils/request.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
];
