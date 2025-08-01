const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      // Basic JavaScript/TypeScript rules (relaxed for existing code)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off', // Too many existing unused vars
      'no-console': 'off', // Allow console in desktop app
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-undef': 'off', // TypeScript handles this better
      
      // TypeScript specific (relaxed)
      '@typescript-eslint/no-explicit-any': 'off', // Too many existing any types
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      
      // Code quality (only major issues)
      'eqeqeq': 'off', // Too strict for existing code
      'curly': 'off', // Too many single-line ifs
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-useless-escape': 'warn',
      
      // Style (very relaxed)
      'semi': 'off',
      'quotes': 'off', 
      'indent': 'off',
      'comma-dangle': 'off'
    }
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.config.js',
      '*.config.ts'
    ]
  }
];