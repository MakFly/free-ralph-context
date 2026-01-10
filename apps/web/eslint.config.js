// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import importPlugin from 'eslint-plugin-import'

export default [
  ...tanstackConfig,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Modules Node.js (fs, path...)
            'external', // Bibliothèques (react, lucide-react...)
            'internal', // Tes alias (@/...)
            ['parent', 'sibling'], // Chemins relatifs (../, ./)
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
]
