import { domain, zone } from './dns'
import { isPermanentStage } from './stage'

// Workaround for SST bug anomalyco/sst#6848 (open as of 4.17.1): StaticSite's
// distribution origin is a placeholder that its viewer-request function
// swaps for S3, but CloudFront fetches `errorPage` without running viewer
// functions, so every 404 became a 502. We own the bucket so the default
// origin can point at it directly. Drop this once the SST fix ships.
const assets = new sst.aws.Bucket('SiteBucket', { access: 'cloudfront' })
const assetsAccess = new aws.cloudfront.OriginAccessControl(
  'SiteBucketAccess',
  {
    originAccessControlOriginType: 's3',
    signingBehavior: 'always',
    signingProtocol: 'sigv4',
  },
)

// Keep dev and personal stages out of search results.
const noIndex = isPermanentStage
  ? ''
  : `
        h['x-robots-tag'] = { value: 'noindex, nofollow' };`

export const site = new sst.aws.StaticSite('Site', {
  build: { command: 'pnpm build', output: 'dist' },
  // Real 404 status for unknown URLs. Without it SST serves index.html with a
  // 200 (SPA fallback), which search engines treat as a soft 404.
  errorPage: '404.html',
  domain: {
    name: domain,
    redirects: isPermanentStage ? [`www.${domain}`] : undefined,
    dns: sst.aws.dns({ zone: zone?.zoneId }),
  },
  assets: {
    bucket: assets.name,
    // Replaces SST's defaults, which cache every non-HTML file (robots.txt,
    // sitemaps, favicon) as immutable for a year. Later entries win.
    fileOptions: [
      { files: '**', cacheControl: 'public,max-age=3600' },
      { files: '_astro/**', cacheControl: 'public,max-age=31536000,immutable' },
      { files: '**/*.html', cacheControl: 'public,max-age=0,must-revalidate' },
    ],
  },
  edge: {
    viewerResponse: {
      // HSTS matches what Vercel sends today; don't widen it in a migration.
      injection: `
        const h = event.response.headers;
        h['strict-transport-security'] = { value: 'max-age=63072000' };
        h['x-content-type-options'] = { value: 'nosniff' };
        h['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };${noIndex}`,
    },
  },
  transform: {
    cdn: (args) => {
      args.origins = [
        {
          originId: 'default',
          domainName: assets.nodes.bucket.bucketRegionalDomainName,
          originAccessControlId: assetsAccess.id,
        },
      ]
    },
  },
  // `pnpm dev` is `sst dev`, so the site needs its own command (the default
  // `npm run dev` would loop back into sst).
  dev: { command: 'pnpm astro dev', url: 'http://localhost:4321' },
})

export const outputs = {
  url: site.url,
}
