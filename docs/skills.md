# Skill ownership

`templates/common/.agents/skills` is the source of truth for the ten default
bundles shipped in generated apps. Keep third-party instructions unmodified;
`templates/common/skills-lock.json` records their publisher, path and revision.

| Default               | Owner / source                                                    |
| --------------------- | ----------------------------------------------------------------- |
| modern-web-guidance   | GoogleChrome/modern-web-guidance                                  |
| web-design-guidelines | vercel-labs/agent-skills                                          |
| web-perf              | cloudflare/skills; retain its license                             |
| wf-web-lighthouse     | MrBrunoWolff/the-skills                                           |
| security-audit        | cloudflare/security-audit-skill                                   |
| code-review           | mattpocock/skills                                                 |
| cloudflare-workers    | This kit: runtime and release-policy conventions                  |
| pwa-readiness         | This kit: generated manifest, service worker and offline behavior |
| react-composition     | This kit: component and router-adapter conventions                |
| web-quality           | This kit: declared quality gates and maintenance workflow         |

The four kit-owned bundles intentionally have no fabricated upstream lock entry.
Their provenance is the template in this repository. Keep project-specific UI
rules in the generated `AGENTS.md` rather than forking generic upstream skills.
The kit's root also retains its separate `migrate-to-vinext` workflow.

After reviewing an upstream update, refresh the explicitly selected bundle and
its lock in `templates/common`, then run these from the kit checkout:

```sh
npm run skills:sync
npm run skills:check
npm test
```

The sync command is offline. It copies template defaults into the kit's
`.agents/skills` and `.claude/skills` and merges only their template lock entries.
It preserves root-only skills. The check command reports drift without writing.
The scaffold copies the canonical defaults and source lock into each generated
app, then creates that app's Claude mirror; generation does not fetch skill
publishers. A generated app can adopt its own reviewed selection afterwards.

Security-audit and code-review activate for their own review tasks. They do not
run during scaffolding. Native tools, browsers and MCP servers remain separate
capabilities that must be available when a review requires them.
