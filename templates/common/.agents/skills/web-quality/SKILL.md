---
name: web-quality
description: Run or repair the declared quality gates, React Doctor findings, and dependency upgrades. Use for web validation and maintenance.
---

# Web Quality

Read package.json and the lockfile, then use that package manager. Run the declared check script, followed by doctor and build. The check script already includes lint, formatting, type generation, typecheck, and Knip; do not rerun those constituents without a new failure or change.

For React Doctor, use the local doctor script, inspect findings, fix causes, and rerun affected checks. Avoid broad ignore lists or changes made solely to inflate a score. Add tests for meaningful behavior or regressions; avoid tests mirroring implementation.

Use current package docs when upgrading dependencies. React DOM and React server protocol packages must match React. For vinext, run check:compat after upgrades. Run audit independently and distinguish existing advisories from introduced ones. Report exit codes and validation limits honestly.

Adapted from wf-web-check-quality and react-doctor in the personal fleet and quality gates in the work fleet.
