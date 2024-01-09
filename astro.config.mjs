import tailwind from '@astrojs/tailwind'
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel/static'

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap(), tailwind(), react()],
  vite: {
    ssr: {
      noExternal: ['usehooks-ts'],
    },
  },
  site: 'https://theblondingroom.ca',
  output: 'static',
  adapter: vercel({}),
})
