import { isPermanentStage } from './stage'

const GH_ORG = 'natac13'
const GH_REPO = 'the-blonding-room-astro'

// Stages that deploy from GitHub Actions. The OIDC provider is an
// account-level singleton owned by production (removal: 'retain');
// dev looks it up by ARN — same pattern as the Route 53 zone.
const CI_STAGES = ['production', 'dev']

if (CI_STAGES.includes($app.stage)) {
  const github = isPermanentStage
    ? new aws.iam.OpenIdConnectProvider('Github', {
        url: 'https://token.actions.githubusercontent.com',
        clientIdLists: ['sts.amazonaws.com'],
        // see https://github.blog/changelog/2023-06-27-github-actions-update-on-oidc-integration-with-aws/
        thumbprintLists: [
          '6938fd4d98bab03faadb97b34396831e3780aea1',
          '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
        ],
      })
    : aws.iam.OpenIdConnectProvider.get(
        'Github',
        'arn:aws:iam::771992926532:oidc-provider/token.actions.githubusercontent.com',
      )

  // dev deploys on pushes to main; production only from v-prefixed
  // release tags (created by `gh release create` / the /release skill)
  const allowedSub =
    $app.stage === 'production'
      ? `repo:${GH_ORG}/${GH_REPO}:ref:refs/tags/v*`
      : `repo:${GH_ORG}/${GH_REPO}:ref:refs/heads/main`

  const githubRole = new aws.iam.Role('GithubRole', {
    name: [$app.name, $app.stage, 'github'].join('-'),
    assumeRolePolicy: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Federated: github.arn,
          },
          Action: 'sts:AssumeRoleWithWebIdentity',
          Condition: {
            StringEquals: {
              'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            },
            StringLike: {
              'token.actions.githubusercontent.com:sub': allowedSub,
            },
          },
        },
      ],
    },
    maxSessionDuration: 3600,
  })

  new aws.iam.RolePolicyAttachment('GithubRolePolicy', {
    policyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
    role: githubRole.name,
  })
}
