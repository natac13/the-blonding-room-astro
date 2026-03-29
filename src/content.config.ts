import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const staffCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/staff' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      socials: z.object({
        instagram: z.string(),
      }),
      businessRole: z.string().optional(),
      role: z.string(),
      order: z.number(),
      image: z.object({
        src: image(),
        alt: z.string(),
      }),
    }),
})

export const collections = {
  staff: staffCollection,
}
