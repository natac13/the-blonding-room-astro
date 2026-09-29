// SST loads its global types ($config, $app, sst, aws) this way.
// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'the-blonding-room',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: {
          region: 'us-east-1',
          profile: process.env.GITHUB_ACTIONS
            ? undefined
            : 'the-blonding-room-admin',
        },
      },
    }
  },
  async run() {
    // SST 3.11+ forbids top-level imports in this file; import lazily instead.
    const { readdirSync } = await import('node:fs')
    const outputs = {}
    for (const value of readdirSync('./infra/')) {
      const result = await import(`./infra/${value}`)
      if (result.outputs) {
        Object.assign(outputs, result.outputs)
      }
    }
    return outputs
  },
})
