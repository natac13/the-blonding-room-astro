import { defineConfig, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import icon from 'astro-icon'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap(), icon()],
  vite: {
    plugins: [tailwindcss()],
  },
  site: 'https://theblondingroom.ca',
  output: 'static',
  // PROTOTYPE: the dev toolbar sits on top of the bottom booking CTAs being judged.
  devToolbar: { enabled: false },
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
