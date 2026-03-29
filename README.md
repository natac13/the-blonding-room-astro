# The Blonding Room

Website for [The Blonding Room](https://theblondingroom.ca), a hair salon in Arva, near London, Ontario specializing in blonding, balayage, colouring and styling services.

## Tech Stack

- [Astro](https://astro.build) (static output)
- [React](https://react.dev) (interactive components)
- [Tailwind CSS](https://tailwindcss.com) v4
- [PhotoSwipe](https://photoswipe.com) (image lightbox)
- [Vercel](https://vercel.com) (hosting via `@astrojs/vercel`)

## Getting Started

```bash
npm install
npm run dev
```

## Commands

| Command             | Action                                     |
| :------------------ | :----------------------------------------- |
| `npm run dev`       | Start local dev server at `localhost:4321` |
| `npm run build`     | Build production site to `./dist/`         |
| `npm run preview`   | Preview the build locally                  |
| `npm run validate`  | Run formatting, linting, and type checks   |
| `npm run format`    | Format code with Oxfmt                     |
| `npm run lint`      | Lint code with Oxlint                      |
| `npm run typecheck` | Run TypeScript type checking               |

## Project Structure

```
src/
  assets/          # Images (optimized at build time)
  components/      # Astro & React components
  content/staff/   # Staff profile content collection
  data/            # Static data (services, about, client profile)
  layouts/         # Page layouts with SEO meta tags & schema
  pages/           # Routes (homepage + staff pages)
  styles/          # Global CSS
public/            # Static assets (favicon, robots.txt)
```
