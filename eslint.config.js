import js from '@eslint/js';
import { importX } from 'eslint-plugin-import-x';

export default [
  // Base recommended ESLint rules
  js.configs.recommended,
  
  // Import-X recommended configuration for import/export validation
  importX.flatConfigs.recommended,
  
  // Ignore dist folder
  {
    name: 'ignore-dist',
    ignores: ['dist/**']
  },
  
  // Project-specific configuration
 {
    name: 'project-config',
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        prompt: 'readonly',
        confirm: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        navigator: 'readonly',
        // Node.js globals (for build tools)
        process: 'readonly'
      }
    },
    rules: {
      // Import/Export validation rules to prevent runtime errors
      'import-x/no-unresolved': 'error',           // Ensure imports resolve to actual files
      'import-x/named': 'error',                   // Ensure named imports exist in source modules
      'import-x/default': 'error',                 // Ensure default imports exist in source modules
      'import-x/namespace': 'error',               // Ensure imported namespaces exist
      'import-x/export': 'error',                  // Report exports not found in referenced modules
      'import-x/no-duplicates': 'error',          // Prevent duplicate imports
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index'
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],
      
      // Core JavaScript rules to prevent undefined variables
      'no-undef': 'off',                           // Disable since we're using globals
      'no-unused-vars': 'warn',                    // Warn about unused variables
      
      // Additional helpful rules
      'no-console': 'warn',                        // Warn about console usage (except in logger.js)
      'no-var': 'error',                          // Prefer const/let over var
      'prefer-const': 'error',                    // Prefer const when possible
      'eqeqeq': ['error', 'always'],              // Require strict equality
      'semi': ['error', 'always'],                // Require semicolons
      'quotes': ['error', 'single']               // Prefer single quotes
    }
  },
  
  // Logger configuration - allow console usage (overrides project config)
  {
    name: 'logger-config',
    files: ['js/logger.js'],
    rules: {
      'no-console': 'off'  // Allow console usage in logger file
    }
  }
];
