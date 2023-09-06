module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // 'plugin:react/recommended',
    'plugin:astro/recommended',
    'prettier',
  ],
  overrides: [
    {
      // Define the configuration for `.astro` file.
      files: ['*.astro'],
      // Allows Astro components to be parsed.
      parser: 'astro-eslint-parser',
      // Parse the script in `.astro` as TypeScript by adding the following configuration.
      // It's the setting you need when using TypeScript.
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
      rules: {
        // 'react/react-in-jsx-scope': 'off',
        // 'react/classname-in-styles': 'off',
        // 'react/no-unknown-property': ['error', { ignore: ['class'] }],
      },
    },
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
    {
      extends: ['plugin:react/recommended'],
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
      rules: {
        'no-console': 'warn',
        '@typescript-eslint/triple-slash-reference': 'off',
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
    },
  ],
  // settings: {
  //   react: {
  //     version: 'detect',
  //   },
  // },
  // parser: '@typescript-eslint/parser',
  // parserOptions: {
  //   ecmaVersion: 'latest',
  //   sourceType: 'module',
  // },
  // plugins: ['@typescript-eslint', 'react'],
  // rules: {
  //   'no-console': 'warn',
  //   '@typescript-eslint/triple-slash-reference': 'off',
  // },
}
