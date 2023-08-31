import { defineCollection, z } from 'astro:content'

const staffCollection = defineCollection({
  type: 'content',
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
// 3. Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
  staff: staffCollection,
}
