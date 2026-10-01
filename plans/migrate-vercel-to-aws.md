# Plan: Move theblondingroom.ca from Vercel to AWS (SST)

Status: **Cut over 2026-09-30 19:26 EDT (`v1.0.0`). theblondingroom.ca is served by AWS. Phase 6 (decommission Vercel) due ~2026-10-14.** Researched 2026-09-25.

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

**Migration gates** (`infra/dns.ts`). These were two constants, removed after Phase 4 (PR #62):

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

**✅ Done 2026-09-30 (from `chore/sst-aws`):**

| Stage        | URL                                  | Acceptance checks |
| ------------ | ------------------------------------ | ----------------- |
| `production` | https://drbjbuw91uuet.cloudfront.net | all pass          |
| `dev`        | https://dh12ilww8bl7y.cloudfront.net | all pass          |

Route 53 nameservers (for Grape.ca in Phase 3):
`ns-224.awsdns-28.com`, `ns-1011.awsdns-62.net`, `ns-1286.awsdns-32.org`, `ns-1968.awsdns-54.co.uk`.
All 4 answer A, CNAME, both TXT, MX (none) and AAAA (none) **identically** to `ns1.digitalocean.com`.

## Phase 3: Move nameservers to Route 53 (5 min of work, 24-48h of waiting)

**✅ 2026-09-30:** the nameservers were saved at Grape at 16:04 UTC (WHOIS updated; the lock didn't block it).
The `.ca` registry published them at 16:39 UTC. Google, Cloudflare, Quad9 and OpenDNS resolved via Route 53
within minutes, still answering Vercel `76.76.21.21`. `sst diff` for `route53Live = true` showed dev-only
changes (cert, validation, `dev.` A/AAAA). Production had no changes.

1. ✅ **Zone contents confirmed** (2026-09-30, from Sean's DigitalOcean account `sean.campbell13`).
   The records are: apex `A 76.76.21.21`, `www CNAME cname.vercel-dns.com`, and two leftover Let's Encrypt
   TXT tokens (`_acme-challenge` and `_acme-challenge.www`). No MX, so there's no email to break. All four
   are mirrored in `infra/dns.ts`. No TTL-lowering prep is needed: by the Phase 4 cutover, Route 53
   (TTL 300) is authoritative and the DigitalOcean TTLs no longer apply.
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

## Phase 4: Cutover ✅ 2026-09-30, 7:26pm Eastern

**Why it's sequenced like this** (found while preparing the cutover):

- `www` is a CNAME, and DNS doesn't allow a CNAME and an A record on the same name. SST's
  `override` only upserts the _same_ type, so the cutover deploy would fail on `www`.
- Removing the mirror records from code makes Pulumi delete them **after** SST creates the new
  records. Route 53 deletes by name + type, so this could remove SST's new apex record, causing an outage.

**Prep (earlier the same day, no visitor impact):**

1. PR #60: `retainOnDelete` on the mirror records, plus `noindex` on non-production. Merge, then
   publish release `v0.1.0`. This deploys production (routine rebuild only) and records the
   option in state. It's also a dry run of the release pipeline.
2. Verify `retainOnDelete` is in production state (`sst state export --stage production`).
3. Atomically change `www` from `CNAME cname.vercel-dns.com` to `A 76.76.21.21` (Vercel's apex IP,
   verified to serve `www` identically: 308 → apex, valid cert), using one Route 53 change batch:
   DELETE CNAME + CREATE A. There is no gap because the batch is atomic. From here the `www`
   record is outside IaC until cutover.

**Cutover (7pm):**

1. PR: `productionCutover = true`. The mirror block leaves the code and Pulumi forgets the records.
   `sst diff --stage production` should show only: ACM cert + validation, aliases on the
   distribution, a `www` redirect distribution + bucket, and apex/`www` A (upsert over Vercel)
   - AAAA (new) alias records. Pulumi should show **no deletes** of the mirror records.
2. Merge, then publish release `v1.0.0`. The production deploy takes about 15-25 min. Vercel serves until the
   A records flip. They are upserted in place, so there's no NXDOMAIN window.
3. Verify:
   ```bash
   curl -sI https://theblondingroom.ca | grep -iE "server|x-cache|strict"   # CloudFront
   curl -sI https://www.theblondingroom.ca/staff/tayler/ | grep -i location  # 301 → apex same path
   curl -sI http://theblondingroom.ca | head -3                              # 301 → https
   curl -s -o /dev/null -w "%{http_code}\n" https://theblondingroom.ca/nope  # 404
   curl -sI https://theblondingroom.ca | grep -i x-robots                    # must be absent
   ```
   Re-run the acceptance checks on the real domain, and check on a phone off Wi-Fi.
4. Leftovers in Route 53 (unmanaged, harmless): the two `_acme-challenge` TXT records. Deleted in Phase 6.
5. ✅ Follow-up PR #62: deleted both gates and the mirror block from `infra/dns.ts`. `sst diff` showed no
   AWS changes on either stage.

**What actually happened (2026-09-30):**

- Prep: `v0.1.0` released at 18:54 and `retainOnDelete` was verified in state. The `www` CNAME → A swap was atomic.
- `v1.0.0` deploy: 19:24 → 19:26 (about 3 min; the certs validated in seconds). Apex records upserted in place,
  with no gap. The mirror records were dropped from state only (Route 53 untouched), as designed.
- **`www` didn't resolve for ~2 min (19:26:28 → 19:28:34).** SST upserted `www` onto the **brand-new**
  redirect distribution, and a new `*.cloudfront.net` hostname doesn't resolve until its first deployment
  propagates. Route 53 aliases to it answered empty (NODATA), and some resolvers cached that for up
  to 15 min (SOA negative TTL 900s). The apex wasn't affected because its distribution already existed. The
  `dev` rehearsal couldn't catch this because it has no `www` redirect. **Lesson:** when a deploy creates a
  new distribution _and_ moves live traffic onto it, create the distribution first and switch DNS in a
  second deploy, after `Status = Deployed`.
- Verified after cutover: all pages 200, unknown URLs 404 with the styled page, Amazon certs on apex and `www`,
  `www` 301 → apex with path kept, `http` → `https`, HSTS/nosniff/referrer-policy present, no `x-robots-tag`
  on production. Sean checked on mobile data.

**Rollback (until Phase 6):** Route 53 console → apex A `76.76.21.21`, `www` A `76.76.21.21` (Vercel serves `www` on that IP).
Vercel still holds the domain and cert.

## Phase 5: CI ✅ built in Phase 1

- Push to `main` → lint/build/typecheck → `deploy-dev`.
- Publish a `v*` release → validate → `deploy-production`.
- Deploys are never cancelled mid-run (stage lock). Unlock with `pnpm sst unlock --stage <s>`.

## Phase 6: Decommission Vercel (after ~2 weeks stable)

1. Vercel project → Settings → Git → **Disconnect**.
2. Vercel project → Domains → remove `theblondingroom.ca` and `www`.
3. Delete the Vercel project. Then delete the account/team if nothing else is on it.
4. Delete the `theblondingroom.ca` zone in DigitalOcean (account `sean.campbell13`). It's ignored once Grape points at Route 53, and keeping it until now is the Phase 3 rollback.
5. Remove `.vercel/` locally and `.vercel` from ignore lists.
6. Delete the two orphaned `_acme-challenge` TXT records in Route 53 (unmanaged since cutover, harmless).

## Risks & gotchas

| Risk                                                 | Mitigation                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Hidden DO records lost                               | Zone checked in the DO dashboard; all 4 records mirrored (Phase 3 step 1) |
| Grape.ca `clientUpdateProhibited`                    | Unlock in the Grape UI or via support, before cutover day                 |
| ACM validation hangs                                 | Only if Route 53 isn't authoritative. The `route53Live` gate prevents it  |
| 404s return 502 (SST #6848)                          | Own-bucket default-origin workaround in `infra/site.ts`                   |
| Stale robots/sitemap                                 | Custom `fileOptions`                                                      |
| Stage locked                                         | `pnpm sst unlock --stage <stage>`. CI never cancels deploys               |
| `b.Va is not a function`                             | `npm dedupe` in `.sst/platform` (CI does it)                              |
| AWS and Vercel drift apart between merge and cutover | The Phase 4 deploy builds current `main`                                  |

**Cost:** about $1/month (Route 53 zone plus pennies of CloudFront/S3/KVS).

## After migration: "update the site" backlog

Dependencies were already bumped (Astro 6, React 19, Tailwind 4). Updates are content
and design work. Do them once hosting is stable.
