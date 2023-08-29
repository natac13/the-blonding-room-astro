import { defineConfig, sharpImageService } from 'astro/config';
import tailwind from '@astrojs/tailwind';

/** @type import('astro').defineConfig */
import react from '@astrojs/react';

import vercel from "@astrojs/vercel/static";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), react()],
  experimental: {
    assets: true
  },
  image: {
    service: sharpImageService(),
  },
  vite: {
    ssr: {
      noExternal: ['usehooks-ts']
    }
  },
  // output: "server",
  adapter: vercel()
});
