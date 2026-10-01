---
name: modern-web-guidance
description: Retrieve current browser guidance before implementing HTML, CSS, or client-side interactions. Use for web features, layout, motion, and performance; exclude backend and release-only tasks.
---

# Modern Web Guidance

Before implementing a web feature, search the maintained guidance with `npx -y modern-web-guidance@latest search "<task>"` (or `bunx modern-web-guidance@latest search "<task>"`). Retrieve relevant IDs using `retrieve "<id>"`. If results are vague, use `list`. Adapt the guidance to this project's framework and user requirements.

Use Baseline widely available browser features by default. Feature-detect newer APIs and keep the main action usable without them. Respect reduced motion; animate transform and opacity. Prefer native elements and small progressive enhancements over extra dependencies. If retrieval is unavailable, state that gap and check MDN or web.dev before relying on uncertain APIs.

Source: the modern-web-guidance workflow used by the Wolff personal and work fleets. This entrypoint is self-contained and uses the upstream CLI for current guides.
