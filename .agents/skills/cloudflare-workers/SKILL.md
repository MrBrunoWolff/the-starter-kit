---
name: cloudflare-workers
description: Configure, develop, validate, or deploy this app on Cloudflare Workers. Use for Cloudflare bindings and deployment; exclude unrelated frontend-only edits.
---

# Cloudflare Workers

Read package.json and the source Cloudflare config first. vinext uses cloudflare.config.ts, Cloudflare Vite plugin v2, and cf deploy. TanStack Start uses wrangler.jsonc and the Cloudflare Vite plugin. Edit source config, never generated build output. Retrieve current framework and Cloudflare documentation before changing deployment conventions.

Use cloudflare:workers to read bindings in server code. Generate binding types with the declared cf:typegen script. Never hand-write a duplicate Env interface. New Workers use today's compatibility date, nodejs_compat, logs, and traces. Keep secrets in .dev.vars locally and platform secrets remotely. Never copy account IDs or production resource bindings from examples.

Run build and deploy:check to validate packaging. A dry-run does not prove remote resources work. Remote deployment, publishing, and data changes require user authorization; follow existing authorization without asking repeatedly. Identify the Worker/account/environment before remote changes.

Docs: https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/ and https://github.com/cloudflare/vinext#cloudflare-workers .
