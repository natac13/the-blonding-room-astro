import { isPermanentStage } from './stage'

const ROOT_DOMAIN = 'theblondingroom.ca'

// Vercel → AWS migration gates (plans/migrate-vercel-to-aws.md). Delete both
// once production is cut over; every stage then always has its domain.
// - route53Live: Grape.ca nameservers point at Route 53 (Phase 3 done), so
//   ACM can validate certs and non-production stages can take their domains.
// - productionCutover: apex + www point at CloudFront instead of Vercel (Phase 4).
const route53Live = true
const productionCutover = true

const stageDomains: Record<string, string> = {
  production: ROOT_DOMAIN,
  dev: `dev.${ROOT_DOMAIN}`,
}

export const domain =
  stageDomains[$app.stage] ?? `${$app.stage}.dev.${ROOT_DOMAIN}`

export const hasDomain = isPermanentStage ? productionCutover : route53Live

// Production owns the hosted zone (retained). Other stages find it by name
// through `sst.aws.dns()`, so they never need a reference to it.
export const zone = isPermanentStage
  ? new aws.route53.Zone('Zone', { name: ROOT_DOMAIN })
  : undefined

// Copies of the DigitalOcean records, so moving nameservers to Route 53
// changes nothing for visitors. retainOnDelete: at cutover these leave the
// code but stay in Route 53, so SST overwrites apex/www in place
// (override: true). Deleting them instead could remove SST's new records,
// since Route 53 deletes by name + type.
if (zone && !productionCutover) {
  new aws.route53.Record(
    'VercelApex',
    {
      zoneId: zone.zoneId,
      name: ROOT_DOMAIN,
      type: 'A',
      ttl: 300,
      records: ['76.76.21.21'],
    },
    { retainOnDelete: true },
  )
  new aws.route53.Record(
    'VercelWww',
    {
      zoneId: zone.zoneId,
      name: `www.${ROOT_DOMAIN}`,
      type: 'CNAME',
      ttl: 300,
      records: ['cname.vercel-dns.com'],
    },
    { retainOnDelete: true },
  )
  // Leftover Let's Encrypt DNS-01 tokens (likely stale), mirrored so the
  // zone matches DigitalOcean exactly.
  new aws.route53.Record(
    'AcmeChallengeApex',
    {
      zoneId: zone.zoneId,
      name: `_acme-challenge.${ROOT_DOMAIN}`,
      type: 'TXT',
      ttl: 1200,
      records: ['ZWaFvRrsjbA8QP-YqZkv23dk8ah51ir0jXqNrv7e728'],
    },
    { retainOnDelete: true },
  )
  new aws.route53.Record(
    'AcmeChallengeWww',
    {
      zoneId: zone.zoneId,
      name: `_acme-challenge.www.${ROOT_DOMAIN}`,
      type: 'TXT',
      ttl: 1200,
      records: ['ntUZvjE08RtwGChgJmy9K-RavdHepN8NSsMIqREFFjg'],
    },
    { retainOnDelete: true },
  )
}

export const outputs = {
  nameServers: zone?.nameServers,
}
