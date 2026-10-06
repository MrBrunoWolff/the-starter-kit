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
  code:
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
${setup}      - run: node scripts/quality.mjs code
  security:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
${setup}      - run: node scripts/quality.mjs security
  quality:
    name: Quality Gates
    if: always() && github.event_name != 'schedule'
    needs: [code, security]
    runs-on: ubuntu-latest
    steps:
      - env:
          CODE: \${{ needs.code.result }}
          SECURITY: \${{ needs.security.result }}
        run: test "$CODE" = success && test "$SECURITY" = success
`;
}
