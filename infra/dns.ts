import { isPermanentStage } from './stage'

const ROOT_DOMAIN = 'theblondingroom.ca'

const stageDomains: Record<string, string> = {
  production: ROOT_DOMAIN,
  dev: `dev.${ROOT_DOMAIN}`,
}

export const domain =
  stageDomains[$app.stage] ?? `${$app.stage}.dev.${ROOT_DOMAIN}`

// Production owns the hosted zone (retained). Other stages find it by name
// through `sst.aws.dns()`, so they never need a reference to it.
export const zone = isPermanentStage
  ? new aws.route53.Zone('Zone', { name: ROOT_DOMAIN })
  : undefined

export const outputs = {
  nameServers: zone?.nameServers,
}
