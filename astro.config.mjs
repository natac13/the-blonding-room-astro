import { defineConfig, fontProviders } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel'
import icon from 'astro-icon'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap(), react(), icon()],
  vite: {
    plugins: [tailwindcss()],
  },
  site: 'https://theblondingroom.ca',
  output: 'static',
  adapter: vercel({}),
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Montserrat',
      cssVariable: '--font-montserrat',
      weights: [200, 300, 400, 500, 600, 700],
      styles: ['normal', 'italic'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Parisienne',
      cssVariable: '--font-parisienne',
      weights: [400],
      styles: ['normal'],
    },
  ],
})
