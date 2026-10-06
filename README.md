# the-starter-kit

[![npm](https://img.shields.io/npm/v/the-starter-kit?style=flat-square)](https://www.npmjs.com/package/the-starter-kit)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

A Cloudflare Workers app generator for the Wolff fleet. Choose vinext or TanStack Start; both receive the same components, fonts, tokens, theme controls, and responsive layout.

```sh
bunx the-starter-kit my-app
npx the-starter-kit my-app
```

If Bun rejects a newly published version because of `minimum-release-age`, use `npx` or wait three days. To explicitly trust this CLI immediately, add `"the-starter-kit"` to the existing `install.minimumReleaseAgeExcludes` array in your applicable `bunfig.toml`, preserving any other exclusions and the three-day baseline.

Alternatively, bypass the age rule for a global install, then run the installed CLI:

```sh
bun add --global the-starter-kit --minimum-release-age 0
the-starter-kit my-app
```

Omitting a version resolves the npm `latest` tag. Repeat the global install command to update the installed CLI.

The interactive CLI asks for the framework, sample navigation, and package manager. Bun is the default when installed; npm is always selectable. Sample navigation uses Page 1 (`/`), Page 2 (`/page-2`), and Page 3 (`/page-3`) and follows the-system-one: desktop navigation, background-matched mobile bottom bar, measured gradient underline, animated page changes, swipe gestures, and reduced-motion support.

```sh
npx the-starter-kit my-app --framework tanstack-start --navigation --package-manager npm
bunx the-starter-kit my-app --framework vinext --no-navigation
```

To try a local checkout, run `node bin/the-starter-kit.mjs my-app` or install its `npm pack` tarball.

## Included in every app

- React, strict TypeScript, Tailwind CSS, local Space Grotesk fonts, light/dark/system themes.
- Cloudflare Vite integration, runtime configuration, type generation, deployment and dry-run scripts.
- Oxlint, Oxfmt, Knip, React Doctor, dependency auditing, and GitHub Actions checks.
- Modern web guidance, accessibility/design guidance, React composition, Cloudflare, quality, web performance, Lighthouse, and PWA skills for Codex and Claude.
- Chrome DevTools MCP configuration for Codex, Claude, and VS Code. Restart your agent and verify the connection after generation; configuration alone does not connect this running session.
- PWA manifest, ordinary and maskable icons, Apple touch icon, production-only service worker, and an offline page. The worker caches only public fallback assets, never API responses or page HTML.
- Three-run mobile and desktop Lighthouse scripts enforcing 100 in Performance, Accessibility, Best Practices, and SEO. Reports remain local under `lighthouse/`.

No Cloudflare account, secrets, resource bindings, deployment, or npm publication is performed by generation. Add your bindings to `cloudflare.config.ts` (vinext) or `wrangler.jsonc` (TanStack), authenticate with the appropriate CLI, and run `deploy:check` before deploying.

## Dependency policy

Generation resolves the selected framework's latest npm release and pins exact versions. The framework and its companion packages have scoped Bun age exceptions; other dependencies resolve the newest releases satisfying the fleet's three-day publication-age policy. `--release-age 0` opts into newly published releases; generated Bun configuration follows that selection. vinext currently requires the Cloudflare Vite plugin's v2 beta track; TanStack uses the stable track. `--offline` uses the bundled, build-tested snapshot rather than the registry. `--no-install` writes the project without installing dependencies. Existing non-empty folders are refused. The current Cloudflare tooling also receives the patched Undici 7.29.1 override, with a scoped package-age exception; remove it when upstream dependencies no longer need it.

vinext apps temporarily exempt only [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): its build-time glob dependency includes braces, which has no published patch. This accepts the nested-pattern denial-of-service risk in tooling; avoid processing untrusted glob patterns. Bun uses its advisory-ID ignore flag; npm uses `scripts/audit.mjs` to filter that exact advisory. All other high/critical advisories and audit errors still fail. Remove the exception when upstream publishes a fix.

Generated apps also scope Sharp 0.35.5 to Miniflare and Seroval/Seroval Plugins 1.6.8 to Solid. These patched releases satisfy the three-day age guard and replace vulnerable upstream pins. The overrides use npm's nested object form so both package managers honor them; remove each override when upstream requests a patched version.

## Maintainer checks

```sh
bun install
npm run check:ci
```

Run `npm run check:ci` before every commit or push. GitHub Actions uses this exact command too; `bun run check:ci` remains supported. The gate runs: code checks, Chromium installation (including system dependencies in CI), all four offline smoke fixtures, production browser checks, the package dry run, and a separate dependency audit of the kit and all four generated fixtures. Code and security run independently and report both results. The code stage passes fresh fixture paths to the browser suite. `bun run check` remains the faster code-only check and is not sufficient before pushing. Browser checks always start fresh production previews, even locally; stale fixtures or an existing server cannot satisfy this gate. Failed browser runs retain screenshots and traces in the CI browser-results artifact. The gate removes its temporary smoke builds on success and failure; set `STARTER_KEEP_FIXTURES=1` to retain them for debugging.

Smoke tests create fresh temporary fixtures for both frameworks with and without navigation. Browser checks use the fresh temporary production builds on ports 4411/4412. Set `STARTER_SMOKE_FIXTURES` to the directory printed by the smoke suite; individual fixture paths can also be selected with `STARTER_VINEXT_FIXTURE` and `STARTER_TANSTACK_FIXTURE`. They verify navigation, themes, reduced motion, modified clicks, offline fallback, and identical screenshots across frameworks at mobile/desktop widths and both themes.

Lighthouse measures production previews or deployed URLs. Vite/workerd preview responses are uncompressed, unlike Cloudflare's production edge. `scripts/compressed-preview.mjs` provides an explicitly labeled local gzip simulation for comparison; it does not prove deployed performance. See [validation notes](docs/validation.md) for recorded measurements and their limits. Do not change throttling, suppress audits, or call a simulation a deployed result to satisfy the score budget.

## Releases

`.github/workflows/ci.yml` runs the maintainer checks, all four framework/navigation smoke fixtures, production browser checks, and a package dry run on pull requests and pushes to `main`. After those pass on `main`, it publishes the version in `package.json` if that version is not already on npm. Bump the version before pushing a release; an unchanged version skips publication. You can also rerun CI from GitHub Actions or with `gh workflow run ci.yml --ref main`.

Publishing uses npm trusted publishing (OIDC), with no `NPM_TOKEN` or `NODE_AUTH_TOKEN` secret. In the npm package settings, configure a GitHub Actions trusted publisher with owner `MrBrunoWolff`, repository `the-starter-kit`, workflow filename `ci.yml`, and no environment name. Enable the allowed action for direct `npm publish`. See the [npm trusted publishing guide](https://docs.npmjs.com/trusted-publishers/). The package must exist before configuring its trusted publisher; this package has already been published.

For a manual release, run the maintainer checks, inspect `npm pack --dry-run`, authenticate with npm, then run `npm publish --access public`.

Generated Workers use the compatibility date validated with the dependency snapshot
in `lib/dependencies.mjs`, rather than the current calendar date. This keeps local
production previews compatible with the age-guarded workerd binary. Update the
date together with a validated runtime snapshot; scaffold callers can explicitly
select another date when their runtime supports it.
