# Starter validation

The kit is a local Git repository and an npm-compatible package. Nothing has been published or deployed.

The bundled snapshot was validated on 2026-10-01 with vinext 1.0.0 and TanStack Start 1.168.59. Both frameworks, with and without sample navigation, passed TypeScript, Oxlint, Oxfmt, Knip, production builds, deployment dry-runs, and React Doctor at 100/100. A real npm installation and Bun installation were exercised. The npm tarball was also executed through npm exec and bunx from outside the checkout.

The latest-release checks also passed with vinext 1.0.1 and TanStack Start 1.168.60 (Router 1.170.41), through both Bun and npm.

The production browser suite verifies desktop/mobile navigation, matching background colors, theme persistence, back navigation, reduced motion, native modified clicks, PWA manifest and offline fallback, and byte-identical screenshots across frameworks at both viewport sizes in both themes.

[Lighthouse measurements](lighthouse-compressed.json) retain three cold browser runs for each framework and each standard mobile/desktop preset. Lighthouse 13.5.0 reported 100 in Performance, Accessibility, Best Practices, and SEO in all twelve runs. The target was a built local Workers preview behind an explicitly labeled gzip transport simulation. It compressed responses without changing app content, caching pages, changing presets, or disabling audits. The score summaries are retained here. Temporary smoke builds and browser profiles were removed after verification at the user’s request.

These are local measurements, not deployed Cloudflare scores. Cloudflare's edge normally compresses responses; workerd's local preview does not. Raw local previews also produced 100 scores after the CSS fix, but repeated raw runs varied below 100, including when other builds consumed CPU. The budget script correctly failed those runs. The recorded compression results do not guarantee 100 on every device, shared runner, or future app; rerun the included three-run budget against an authorized deployed preview before release.

PWA installability and offline behavior were tested separately from Lighthouse's four stable categories. Chrome DevTools MCP configuration is included for future trusted agent sessions; this running session used the Lighthouse CLI and Playwright rather than claiming a newly connected MCP server.
