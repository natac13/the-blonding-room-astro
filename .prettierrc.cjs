/** @type {import('prettier').Config} */
module.exports = {
  trailingComma: 'all',
  singleQuote: true,
  tabWidth: 2,
  semi: false,
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
}
