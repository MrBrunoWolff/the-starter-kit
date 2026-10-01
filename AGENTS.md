# Maintaining the starter kit

Read README.md and package.json. This is a Node ESM npm CLI; generated apps may use Bun or npm. Preserve both package-manager paths and both frameworks.

Use the bundled modern-web-guidance, cloudflare-workers, web-perf, wf-web-lighthouse, and pwa-readiness skills for relevant changes. Keep skills self-contained in templates/common/.agents/skills and mirror them to the kit's .agents/skills and .claude/skills when updating defaults.

Framework differences belong in lib/frameworks.mjs and lib/scaffold.mjs. Shared UI belongs in templates/common and templates/navigation. Keep rendered output identical across frameworks and test all four framework/navigation combinations. Preserve fleet tokens and navigation behavior, local fonts, theme persistence, keyboard navigation, reduced motion, and native modified clicks.

Run bun run check after changes. Template/configuration changes also require smoke checks and production browser checks. Measure Lighthouse using production builds, three cold runs, both standard mobile and desktop presets, all four stable categories. Label local compression simulations. Never fabricate or relax scores to pass. Keep private data, API responses and authenticated HTML out of PWA caches.

Use the three-day package-age baseline for tooling; keep the selected framework on its latest release through the documented scoped exceptions. Update lib/dependencies.mjs only from validated manifests. Do not copy account identifiers, secrets, personal agent settings, or production resource bindings into templates. Do not commit, push, publish, or deploy unless requested.
