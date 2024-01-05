import tailwind from '@astrojs/tailwind'
import { defineConfig } from 'astro/config'

/** @type import('astro').defineConfig */
import react from '@astrojs/react'

import vercel from '@astrojs/vercel/static'

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), react()],
  vite: {
    ssr: {
      noExternal: ['usehooks-ts'],
    },
  },
  site: 'https://theblondingroom.com',
  // site: 'https://the-blonding-room-astro.vercel.app',
  output: 'static',
  adapter: vercel({}),
})
