# the-starter-kit

[npm package](https://www.npmjs.com/package/the-starter-kit) · Publication pending.

A Cloudflare Workers app generator for the Wolff fleet. Choose vinext or TanStack Start; both receive the same components, fonts, tokens, theme controls, and responsive layout.

```sh
bunx the-starter-kit my-app
npx the-starter-kit my-app
```

The interactive CLI asks for the framework, sample navigation, and package manager. Bun is the default when installed; npm is always selectable. Sample navigation follows the-system-one: desktop navigation, background-matched mobile bottom bar, measured gradient underline, animated page changes, swipe gestures, and reduced-motion support.

```sh
npx the-starter-kit my-app --framework tanstack-start --navigation --package-manager npm
bunx the-starter-kit my-app --framework vinext --no-navigation
```

These commands become available after npm publication. To try the unpublished checkout, run `node bin/the-starter-kit.mjs my-app` or install its `npm pack` tarball.

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

## Maintainer checks

```sh
bun install
bun run check
bun run test:smoke
STARTER_SMOKE_FIXTURES=<printed-directory> bun run test:e2e
npm pack --dry-run
```

Smoke tests create fresh temporary fixtures for both frameworks with and without navigation. Browser checks use the fresh temporary production builds on ports 4411/4412. Set `STARTER_SMOKE_FIXTURES` to the directory printed by the smoke suite; individual fixture paths can also be selected with `STARTER_VINEXT_FIXTURE` and `STARTER_TANSTACK_FIXTURE`. They verify navigation, themes, reduced motion, modified clicks, offline fallback, and identical screenshots across frameworks at mobile/desktop widths and both themes.

Lighthouse measures production previews or deployed URLs. Vite/workerd preview responses are uncompressed, unlike Cloudflare's production edge. `scripts/compressed-preview.mjs` provides an explicitly labeled local gzip simulation for comparison; it does not prove deployed performance. See [validation notes](docs/validation.md) for recorded measurements and their limits. Do not change throttling, suppress audits, or call a simulation a deployed result to satisfy the score budget.

Run `npm pack`, inspect the tarball, then `npm publish --access public` when you are ready to release. Publishing remains a separate action.
