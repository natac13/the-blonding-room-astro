# The Blonding Room

Website for [The Blonding Room](https://theblondingroom.ca), a hair salon in Arva, near London, Ontario specializing in blonding, balayage, colouring and styling services.

## Tech Stack

- [Astro](https://astro.build) (static output)
- [React](https://react.dev) (interactive components)
- [Tailwind CSS](https://tailwindcss.com) v4
- [PhotoSwipe](https://photoswipe.com) (image lightbox)
- [SST](https://sst.dev) `StaticSite` on AWS (S3 + CloudFront, Route 53 DNS)

## AWS Credentials

Put the following into your `~/.aws/config` file:

```ini
[sso-session the-blonding-room]
sso_start_url = https://d-9067e128a2.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access

[profile the-blonding-room-admin]
sso_session = the-blonding-room
sso_account_id = 771992926532
sso_role_name = AdministratorAccess
region = us-east-1
```

Then log in with `pnpm aws:sso`.

## Getting Started

```bash
pnpm install
pnpm aws:sso
pnpm dev        # sst dev: runs astro dev at localhost:4321 under your personal stage
```

`pnpm start` runs plain `astro dev` without AWS.

## Stages & Deploys

| Stage        | Domain                           | Deployed by                      |
| :----------- | :------------------------------- | :------------------------------- |
| `production` | `theblondingroom.ca` (+ `www`)   | Publishing a `v*` GitHub release |
| `dev`        | `dev.theblondingroom.ca`         | Every push to `main`             |
| personal     | `<stage>.dev.theblondingroom.ca` | `pnpm deploy --stage <stage>`    |

Infrastructure lives in `infra/` and is loaded by `sst.config.ts`. Production
is retained on removal and owns the Route 53 zone and GitHub OIDC provider.

## Commands

| Command                       | Action                                   |
| :---------------------------- | :--------------------------------------- |
| `pnpm dev`                    | `sst dev` + Astro dev server             |
| `pnpm build`                  | Build production site to `./dist/`       |
| `pnpm preview`                | Preview the build locally                |
| `pnpm deploy --stage <stage>` | Deploy a stage to AWS                    |
| `pnpm remove --stage <stage>` | Remove a non-production stage            |
| `pnpm validate`               | Run formatting, linting, and type checks |
| `pnpm test`                   | SEO checks against `dist/` (build first) |
| `pnpm format`                 | Format code with Oxfmt                   |
| `pnpm lint`                   | Lint code with Oxlint                    |
| `pnpm typecheck`              | Run TypeScript type checking             |

### Troubleshooting

- `Locked - A concurrent update was detected`: an interrupted deploy. Run `pnpm sst unlock --stage <stage>`.
- `b.Va is not a function`: duplicated Pulumi deps. Run `npm dedupe` in `.sst/platform`.

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
infra/             # SST infrastructure (site, DNS, GitHub OIDC)
```
