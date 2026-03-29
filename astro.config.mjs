import { defineConfig } from 'astro/config'
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
    ssr: {
      noExternal: ['usehooks-ts'],
    },
  },
  site: 'https://theblondingroom.ca',
  output: 'static',
  adapter: vercel({}),
})
