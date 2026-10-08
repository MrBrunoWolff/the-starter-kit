# the-starter-kit

A CLI for creating Cloudflare Workers apps with vinext or TanStack Start, using a shared React interface, theme controls and development tools.

[![npm](https://img.shields.io/npm/v/the-starter-kit?style=flat-square)](https://www.npmjs.com/package/the-starter-kit)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

## Quick start

Use Node.js 22.19 or later. The generated app can use Bun or npm.

```sh
npx the-starter-kit my-app
# Or with Bun:
bunx the-starter-kit my-app
```

Choose the framework, sample navigation and package manager at the prompt, then follow the printed commands to start the app. For an unattended setup:

```sh
npx the-starter-kit my-app --framework tanstack-start --navigation --package-manager npm
bunx the-starter-kit my-app --framework vinext --no-navigation
```

The CLI refuses existing non-empty folders. `--no-install` skips dependency installation; `--offline` uses the bundled dependency snapshot. If Bun’s minimum release age blocks a new CLI release, wait three days or use npm.

## Features

- React, TypeScript, Tailwind CSS and local Space Grotesk fonts.
- Responsive navigation and light, dark and system themes.
- Worker configuration, type generation and deployment scripts.
- PWA assets, a production service worker and an offline page.
- Linting, formatting, unused-code checks, tests and browser validation.
- Agent guidance for web development, Cloudflare, accessibility and performance.

Generation does not provision Cloudflare resources or deploy an app. Configure the generated app’s bindings and credentials before deployment.

## Scripts

For development, clone the repository and run `bun install --frozen-lockfile`. These commands run from the kit checkout:

| Command              | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `npm run check`      | Run the fast code and unit-test checks                  |
| `npm run test`       | Run CLI unit tests                                      |
| `npm run test:smoke` | Build framework and navigation fixtures                 |
| `npm run test:e2e`   | Run browser checks against prepared fixtures            |
| `npm run check:ci`   | Run the complete validation contract and package checks |

## Development

See the [maintenance guide](docs/maintenance.md) for dependency policies, fresh-fixture validation and releases, and [validation notes](docs/validation.md) for recorded browser/performance checks. Run `npm run check:ci` before every commit or push. It validates all four framework/navigation combinations; the fast check does not replace it.

## License

MIT — see [LICENSE](LICENSE).
