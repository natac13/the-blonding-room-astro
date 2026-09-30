# Plan: Move theblondingroom.ca from Vercel to AWS (SST)

Status: **Phase 0 done, Phase 1 in review** (`chore/sst-aws`). Researched 2026-09-25.

## TL;DR

The site is 100% static (Astro `output: 'static'`, 8 HTML pages, no API routes, no
env vars, no Vercel analytics). The only Vercel-specific code was the adapter line.
The migration is mostly **a DNS move, not a code move**.

The one thing that forces the shape of this plan: **DNS is hosted at DigitalOcean**,
which cannot point a bare apex (`theblondingroom.ca`) at CloudFront (no ALIAS/ANAME
records). So DNS moves to **Route 53** first, _while still pointing at Vercel_, then we
flip two records to CloudFront. Each step is independently reversible and there is
no moment when the site is down.

```
            Phase 1-2               Phase 3                 Phase 4                Phase 5
Registrar   Grape.ca ──NS──▶ DO     Grape.ca ──NS──▶ R53    Grape.ca ──NS──▶ R53   same
DNS says    apex/www → Vercel       apex/www → Vercel       apex/www → CloudFront  same
Serving     Vercel                  Vercel                  AWS  (Vercel idle)     AWS only
AWS         stages on               dev. + personal         production domain      —
            *.cloudfront.net        domains go live         attached
Rollback    n/a                     flip NS back to DO      flip records back      —
```

## Current state (verified 2026-09-25)

| Thing           | Value                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registrar       | Grape Inc. (grape.ca). Expires 2027-01-27. Status `clientTransferProhibited`, `clientUpdateProhibited`                                            |
| DNS host        | DigitalOcean (`ns1-3.digitalocean.com`). NS TTL at `.ca` registry: **86400s (24h)**                                                               |
| Records seen    | `@ A 76.76.21.21` (TTL 3600), `www CNAME cname.vercel-dns.com` (TTL 43200). **No MX, TXT, CAA** found on common names                             |
| Vercel behavior | `www` → 308 → apex. `http` → 308 → `https`. `HSTS max-age=63072000`. `/staff/x` and `/staff/x/` both 200. Unknown path → 404                      |
| Site            | Astro 6, pnpm 10, Node 24. Canonicals/sitemap use trailing slash. Search Console verified via `<meta>` tag (survives the move)                    |
| AWS             | Org `o-v5kqsss8gp` (management `838376023699`). Project account **The Blonding Room `771992926532`**. Access via Admin Team → AdministratorAccess |

## Decisions

1. **Component: `sst.aws.StaticSite`**, not `sst.aws.Astro`. `Astro` needs the
   `astro-sst` adapter (last published May 2025, before Astro 6) and returns 200 for
   404s. If a backend is needed later, add an `sst.aws.Function` beside the site.
2. **DNS: Route 53**, owned by the `production` stage (created fresh, `retain`). ~$0.50/mo.
3. **Stages: Tranquil Woods pattern.** `production` deploys from `v*` GitHub releases.
   `dev` deploys on push to `main` at `dev.theblondingroom.ca`. Personal stages are
   `<stage>.dev.theblondingroom.ca`.
4. **Certificates: SST creates one per stage domain** (`sst.aws.dns()`). No imported
   cert and no `AWS_CERT_ARN`.
5. **Headers: match Vercel today** (HSTS 2y, no `includeSubDomains`/`preload`) plus
   `nosniff` and `referrer-policy`. Don't widen HSTS as a side effect of a migration.

## SST 4.17.1 facts this relies on (source at tag `v4.17.1`, verified on the `natac` stage)

- **URL resolution:** a CloudFront Function + KeyValueStore router serves
  `/staff/tayler` and `/staff/tayler/` from `/staff/tayler/index.html`, matching Vercel.
- **404s: SST bug [anomalyco/sst#6848](https://github.com/anomalyco/sst/issues/6848)**
  (open, no release fix). The distribution's origin is `placeholder.sst.dev`, and the
  router function swaps in S3 per request. CloudFront fetches `errorPage` **without**
  running viewer functions, so unknown URLs return **502**. They only work when `/404.html`
  happens to be cached at that edge location. **Workaround in `infra/site.ts`:** we own the
  assets bucket (`assets.bucket`) and use `transform.cdn` to make it the default origin,
  with an Origin Access Control. Verified: cold unknown URLs return **404** + the styled page.
  Remove the workaround once SST ships the fix.
- **Cache defaults:** SST marks all non-HTML files immutable for a year (robots, sitemaps,
  favicon included). `assets.fileOptions` **replaces** the defaults, and later entries win.
- **`domain.redirects: ['www…']`** builds a separate CloudFront + S3 redirect → 301 to apex,
  path preserved.
- **`sst.aws.dns({ override: true })`** upserts over existing records (the Vercel mirror).
- **ACM** validates through Route 53, so domains only work once Route 53 is authoritative.
- **Deploys are not atomic:** upload → KV update → `/*` invalidation. Rollback means
  redeploying an earlier commit. A bucket swap (like this migration's) has a brief window
  of stale routing. Normal deploys don't swap buckets.

---

## Phase 0: AWS account & local access ✅ done 2026-09-29

- Created account **The Blonding Room** `771992926532`
  (`sean.campbell13+theblondingroom@gmail.com`) at the org root.
- Assigned Admin Team → AdministratorAccess (same as Tranquil Woods).
- Added the `the-blonding-room` sso-session and the `the-blonding-room-admin` profile to
  `~/.aws/config` (see README). Verified with `sts get-caller-identity`.
- No budget alert, by choice.

## Phase 1: Code changes (branch `chore/sst-aws`, PR, **no merge until Sean reviews**)

Vercel keeps deploying `main` the whole time. PR pushes only create Vercel **previews**.

| File                                   | Change                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `astro.config.mjs`                     | Removed the `@astrojs/vercel` adapter (static output needs none)                             |
| `package.json`                         | `-@astrojs/vercel`, `+sst@4.17.1`. Scripts: `aws:sso`, `dev` = `sst dev`, `deploy`, `remove` |
| `sst.config.ts`                        | Tranquil layout: loads every file in `infra/`, merges `outputs`                              |
| `infra/stage.ts`                       | `isPermanentStage`                                                                           |
| `infra/dns.ts`                         | Stage → domain map, production-owned zone, Vercel mirror records, **migration gates**        |
| `infra/site.ts`                        | StaticSite + 404 workaround + fileOptions + headers + `dev` command                          |
| `infra/github.ts`                      | OIDC provider (production) + roles for `production` (tags `v*`) and `dev` (`main`)           |
| `.github/workflows/ci.yml`             | + `deploy-dev` job on push to `main`                                                         |
| `.github/workflows/release.yml`        | New: published release → `sst deploy --stage production`                                     |
| tsconfig / oxlint / oxfmt / .gitignore | Exclude `.sst`, `infra`, `sst.config.ts`, `sst-env.d.ts` where needed                        |
| `README.md`                            | Hosting, AWS creds, stages, commands, troubleshooting                                        |

**Migration gates** (`infra/dns.ts`). These are two constants, deleted after Phase 4:

- `route53Live = false`: flip after Phase 3. Then `dev` gets `dev.theblondingroom.ca`.
- `productionCutover = false`: flip in Phase 4. Then production takes apex + www, and the
  Vercel mirror records are replaced.

**Review checklist:**

- [ ] `pnpm dev` (sst dev) → Astro at `localhost:4321` works. `pnpm start` works without AWS
- [ ] `pnpm build && pnpm preview` looks right
- [x] A deployed test stage passed the checks below (deployed to `natac`, since replaced by
      `sst dev`, which removes a deployed StaticSite from the stage it runs on)
- [ ] The Vercel **preview** check on the PR is green and the preview URL works. That preview is
      exactly what `main` will build once the adapter is removed. If it's broken, fall back to
      `adapter: process.env.VERCEL ? vercel() : undefined` until Phase 6

**Acceptance checks (any stage):**

- [x] `/`, `/services/`, all `/staff/<slug>` with and without trailing slash → 200
- [x] Unknown URLs (top-level and nested) → **404** + styled page (after the workaround)
- [x] `/sitemap-index.xml`, `/robots.txt`, `/favicon.png` → 200, `max-age=3600`
- [x] `/_astro/*` → `immutable`. HTML → `max-age=0,must-revalidate`
- [x] HSTS, nosniff, referrer-policy present. `http` → 301 `https`
- [ ] Gallery/PhotoSwipe, carousel, View Transitions, fonts (click through by hand)

## Phase 2: Bootstrap production + dev (before merging the Phase 1 PR)

CI can't deploy until the OIDC roles exist, and production creates them. From the branch:

```bash
pnpm aws:sso
pnpm sst deploy --stage production   # zone + Vercel mirror records, OIDC provider + role, site on *.cloudfront.net
pnpm sst deploy --stage dev          # dev role + site on *.cloudfront.net
```

Nobody queries the new zone yet, so there is **no traffic change**. Run the acceptance checks
against both cloudfront URLs. Also check the zone:
`dig @<one R53 NS> theblondingroom.ca A` → `76.76.21.21`, `www` → `cname.vercel-dns.com`.
The NS list is in the production deploy output (`nameServers`).

Then merge the PR (Sean's call). Merging triggers the Vercel production build and CI `deploy-dev`.
Confirm both are green.

## Phase 3: Move nameservers to Route 53 (5 min of work, 24-48h of waiting)

Prep (a day before, optional): at DigitalOcean, drop the `www` CNAME TTL 43200 → 300 and the apex 3600 → 300.

1. ✅ **Zone contents confirmed without DigitalOcean access** (2026-09-30). Sean has no DO
   account with this zone; it's someone's legacy account, and DO access isn't needed since the
   switch happens at Grape.ca. Querying `ns1.digitalocean.com` directly for 25 common names
   found nothing, and the apex has no MX/TXT/CAA/SRV/AAAA. crt.sh shows 86 certs, all for the
   apex and `www` only. So the two mirrored records **are** the full zone. (Skip the TTL-lowering
   prep above; it needs DO access, and the only cost is up to 12h of the old `www` answer, which
   is identical anyway.)
2. **Grape.ca** → nameservers → replace DO's 3 with Route 53's 4. `clientUpdateProhibited`
   may need unlocking at Grape first.
3. Wait up to **48h**. Both providers give identical answers (Vercel), so visitors notice nothing.
4. Verify:
   ```bash
   dig NS theblondingroom.ca +short              # awsdns-*
   dig NS theblondingroom.ca @8.8.8.8 +short
   dig NS theblondingroom.ca @1.1.1.1 +short
   dig theblondingroom.ca NS @d.ca-servers.ca +norecurse
   ```
5. Set `route53Live = true` (PR → merge → CI deploys `dev` at `dev.theblondingroom.ca`).
   This is the dress rehearsal: a real domain, a real ACM cert, and the real redirect path,
   with no production risk.
6. **Keep the DigitalOcean zone.** It is the rollback (set Grape back to DO NS).

## Phase 4: Cutover (~30 min, quiet evening, no content merges during it)

Pre-flight: Route 53 is authoritative everywhere, `dev.theblondingroom.ca` works, and Vercel is green.

1. Branch, then set `productionCutover = true`.
2. `pnpm sst diff --stage production`. Expect: an ACM cert + validation records, the domain on the
   distribution, a www redirect distribution + bucket, alias records for apex + www, and the
   Vercel mirror records replaced. **Nothing else.**
3. `pnpm sst deploy --stage production` (15-25 min). Resolvers holding the old answer keep hitting
   Vercel (still up) until the ≤300s TTL expires.
   > If the deploy fails with "record already exists", or the diff shows delete-then-create
   > for apex/www, keep the mirror records for this deploy (change the mirror condition to
   > `zone && true`) and remove them in a follow-up.
4. Verify:
   ```bash
   curl -sI https://theblondingroom.ca | grep -iE "server|x-cache|strict"   # CloudFront
   curl -sI https://www.theblondingroom.ca/staff/tayler/ | grep -i location  # 301 → apex same path
   curl -sI http://theblondingroom.ca | head -3                              # 301 → https
   curl -s -o /dev/null -w "%{http_code}\n" https://theblondingroom.ca/nope  # 404
   ```
   Re-run the acceptance checks on the real domain, and on a phone off Wi-Fi.
5. PR → merge. Cut the first release (`/release`, tag `v1.0.0`) so production and CI agree.
6. Follow-up PR: delete both gates and the Vercel mirror block from `infra/dns.ts`.

**Rollback (first 2 weeks):** Route 53 console → apex A `76.76.21.21`, `www` CNAME
`cname.vercel-dns.com`. Vercel still holds the domain and cert.

## Phase 5: CI ✅ built in Phase 1

- Push to `main` → lint/build/typecheck → `deploy-dev`.
- Publish a `v*` release → validate → `deploy-production`.
- Deploys are never cancelled mid-run (stage lock). Unlock with `pnpm sst unlock --stage <s>`.

## Phase 6: Decommission Vercel (after ~2 weeks stable)

1. Vercel project → Settings → Git → **Disconnect**.
2. Vercel project → Domains → remove `theblondingroom.ca` and `www`.
3. Delete the Vercel project. Then delete the account/team if nothing else is on it.
4. Nothing to do at DigitalOcean (no access). The zone is ignored once Grape points at Route 53.
5. Remove `.vercel/` locally and `.vercel` from ignore lists.

## Risks & gotchas

| Risk                                                 | Mitigation                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Hidden DO records lost                               | Checked externally (step 1 of Phase 3): only apex + www exist            |
| Grape.ca `clientUpdateProhibited`                    | Unlock in the Grape UI or via support, before cutover day                |
| ACM validation hangs                                 | Only if Route 53 isn't authoritative. The `route53Live` gate prevents it |
| 404s return 502 (SST #6848)                          | Own-bucket default-origin workaround in `infra/site.ts`                  |
| Stale robots/sitemap                                 | Custom `fileOptions`                                                     |
| Stage locked                                         | `pnpm sst unlock --stage <stage>`. CI never cancels deploys              |
| `b.Va is not a function`                             | `npm dedupe` in `.sst/platform` (CI does it)                             |
| AWS and Vercel drift apart between merge and cutover | The Phase 4 deploy builds current `main`                                 |

**Cost:** about $1/month (Route 53 zone plus pennies of CloudFront/S3/KVS).

## After migration: "update the site" backlog

Dependencies were already bumped (Astro 6, React 19, Tailwind 4). Updates are content
and design work. Do them once hosting is stable.
