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
      // Search-facing descriptor used in the page title, e.g. "Blonde Specialist".
      headline: z.string().optional(),
      specialties: z.array(z.string()).optional(),
      // Portfolio photos for the "Recent work" grid; the grid is hidden when absent.
      work: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
            // Marks stand-in photos so the page labels them until real work is added.
            placeholder: z.boolean().default(false),
          }),
        )
        .optional(),
    }),
})

export const collections = {
  staff: staffCollection,
}
