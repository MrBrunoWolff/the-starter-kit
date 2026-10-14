export function qualityConfig(packageManager, isVinext) {
  const run = (script) => [packageManager, "run", script];
  return {
    tier: "rich",
    bun: "1.4.2",
    node: "24.x",
    stages: {
      code: [
        run("check"),
        run("doctor:ci"),
        ...(isVinext ? [run("check:compat")] : []),
        run("deploy:check"),
      ],
      security: [run("audit")],
    },
  };
}

export function qualityWorkflow(packageManager) {
  const install = packageManager === "bun" ? "bun install --frozen-lockfile" : "npm ci";
  const setup = `      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020
        with:
          node-version: '24.x'
          package-manager-cache: false
      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6
        with:
          bun-version: '1.4.2'
      - run: ${install}
`;
  return `name: Quality
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
  schedule:
    - cron: '17 7 * * 1-5'
permissions:
  contents: read
concurrency:
  group: \${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: \${{ github.event_name == 'pull_request' }}
jobs:
  release-policy:
    name: Dependency release policy
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          fetch-depth: 0
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
        with:
          node-version: '24.x'
          package-manager-cache: false
      - env:
          DEPENDENCY_POLICY_BASE: \${{ github.event.pull_request.base.sha || github.event.before || 'HEAD' }}
          DEPENDENCY_SECURITY_UPDATE: \${{ github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'security') }}
        run: node .github/scripts/check-dependency-releases.mjs
  code:
    needs: release-policy
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
${setup}      - run: node scripts/quality.mjs code
  security:
    needs: release-policy
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
${setup}      - run: node scripts/quality.mjs security
  quality:
    name: Quality Gates
    if: always() && github.event_name != 'schedule'
    needs: [release-policy, code, security]
    runs-on: ubuntu-latest
    steps:
      - env:
          POLICY: \${{ needs.release-policy.result }}
          CODE: \${{ needs.code.result }}
          SECURITY: \${{ needs.security.result }}
        run: test "$POLICY" = success && test "$CODE" = success && test "$SECURITY" = success
`;
}
