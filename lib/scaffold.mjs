import { cp, lstat, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveDependencies, frameworkAgeExclusions } from "./dependencies.mjs";
import { frameworkFiles } from "./frameworks.mjs";

const templates = fileURLToPath(new URL("../templates/", import.meta.url));
const json = (value) => JSON.stringify(value, null, 2) + "\n";

export async function scaffold({
  directory,
  framework,
  navigation,
  packageManager,
  install = true,
  offline = false,
  minimumReleaseAge = 259200,
  fetcher,
  date = new Date().toISOString().slice(0, 10),
}) {
  if (!["vinext", "tanstack-start"].includes(framework))
    throw new Error("Framework must be vinext or tanstack-start.");
  if (!["bun", "npm"].includes(packageManager))
    throw new Error("Package manager must be bun or npm.");
  if (typeof navigation !== "boolean") throw new Error("Navigation must be true or false.");
  if (!Number.isSafeInteger(minimumReleaseAge) || minimumReleaseAge < 0)
    throw new Error("Release age must be a nonnegative number of seconds.");
  const destination = resolve(directory);
  const name = basename(destination);
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(name))
    throw new Error("Use a directory name with 1–63 lowercase letters, numbers, or hyphens.");
  try {
    const stat = await lstat(destination);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (await readdir(destination)).length)
      throw new Error("Destination must be a new or empty directory, without a symlink.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (
    install &&
    spawnSync(packageManager, ["--version"], {
      stdio: "ignore",
      shell: process.platform === "win32",
    }).status !== 0
  )
    throw new Error(`${packageManager} is required to install. Use --no-install to scaffold only.`);
  console.log(
    offline ? "Using the tested dependency snapshot…" : "Resolving current npm versions…",
  );
  const dependencies = await resolveDependencies(framework, offline, fetcher, minimumReleaseAge);
  // Resolve dependencies before creating files so failed registry requests leave no partial app.
  await mkdir(destination, { recursive: true });
  await cp(join(templates, "common"), destination, {
    recursive: true,
    force: true,
    errorOnExist: false,
    filter: (source) => !navigation || !source.endsWith("/base-shell.tsx"),
  });
  if (navigation)
    await cp(join(templates, "navigation"), destination, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });
  await rename(join(destination, "gitignore"), join(destination, ".gitignore"));
  await mkdir(join(destination, ".claude"), { recursive: true });
  await cp(join(destination, ".agents/skills"), join(destination, ".claude/skills"), {
    recursive: true,
  });
  const run = `${packageManager} run`;
  const isVinext = framework === "vinext";
  const scripts = {
    dev: "vite dev",
    build: "vite build",
    start: "vite preview",
    deploy: `${run} build && ${isVinext ? "cf deploy --prebuilt" : "wrangler deploy"}`,
    "deploy:check": `${run} build && ${isVinext ? "cf deploy --prebuilt --dry-run" : "wrangler deploy --dry-run"}`,
    typegen: isVinext ? "vinext typegen" : "vite build",
    "cf:typegen": isVinext ? "cf workers types" : "wrangler types",
    "wrangler:whoami": "wrangler whoami",
    typecheck: `${run} typegen && tsc --noEmit`,
    "typecheck:only": "tsc --noEmit",
    lint: "oxlint",
    "lint:fix": "oxlint --fix",
    format: "oxfmt --ignore-path .gitignore --write .",
    "format:check": "oxfmt --ignore-path .gitignore --check .",
    knip: "knip",
    doctor: "react-doctor -y . --verbose",
    lighthouse: "node scripts/lighthouse.mjs",
    check: `${run} typegen && ${run} lint && ${run} format:check && ${run} typecheck:only && ${run} knip`,
    audit:
      packageManager === "bun" ? "bun audit --audit-level=high" : "npm audit --audit-level=high",
    ...(isVinext
      ? {
          "check:compat": "vinext check",
        }
      : {}),
  };
  const files = {
    "bunfig.toml": `[install]\nminimumReleaseAge = ${minimumReleaseAge}\nignoreScripts = true\n# Latest framework companions and Cloudflare tooling security patch; see README.md.\nminimumReleaseAgeExcludes = ${JSON.stringify(["undici", ...frameworkAgeExclusions[framework]])}\n`,
    ...frameworkFiles(framework, name, navigation, date),
    "public/manifest.webmanifest": json({
      name,
      short_name: name.slice(0, 12),
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#fafafa",
      theme_color: "#fafafa",
      description: "Built for the web. Ready for the edge.",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        {
          src: "/icons/maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    }),
    "package.json": json({
      name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts,
      ...dependencies,
      overrides: { undici: "7.29.1" },
      engines: { node: ">=22.19" },
    }),
    "tsconfig.json": json({
      compilerOptions: {
        target: "ES2022",
        lib: ["DOM", "DOM.Iterable", "ES2022"],
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        types: ["vite/client", "node"],
      },
      include: [
        "src",
        "vite.config.ts",
        ...(isVinext ? ["next.config.ts", "cloudflare.config.ts", ".vinext/types/**/*.ts"] : []),
      ],
    }),
    "knip.json": json({
      $schema: "https://unpkg.com/knip@6/schema.json",
      entry: isVinext
        ? ["src/app/**/page.tsx", "src/app/**/layout.tsx", "cloudflare.config.ts"]
        : ["src/router.tsx", "src/routes/**/*.tsx"],
      project: ["src/**/*.{ts,tsx,css}", "*config.ts"],
      ignore: ["src/routeTree.gen.ts", "worker-configuration.d.ts"],
      ignoreDependencies: isVinext
        ? ["next", "@vitejs/plugin-rsc", "react-server-dom-webpack", "@vinext/cloudflare"]
        : [],
    }),
    "AGENTS.md": `# ${name}\n\nReact + ${framework}, Cloudflare Workers, ${packageManager}. Read package.json before running commands.\n\nUse the bundled skills in .agents/skills for modern web guidance, accessibility, React composition, quality checks, Cloudflare, web performance, Lighthouse, and PWA readiness.\n\nRun \`${run} check\`, \`${run} doctor\`, and \`${run} build\` after meaningful changes. Run \`${run} cf:typegen\` after binding changes. ${isVinext ? "Run check:compat after framework upgrades. vinext implements the Next.js API on Vite; consult installed types and current vinext docs, and keep next/* imports." : "TanStack Start APIs change; consult installed types and current TanStack docs. routeTree.gen.ts is generated by Vite."}\n\nPreserve the shared tokens, Space Grotesk, 768px mobile navigation breakpoint, background-matched bar, and reduced-motion behavior. Navigation and theme controls stay outside the animated content.\n\nBrowser support: Baseline widely available; newer APIs require feature detection and graceful fallback.\n\nComplete authorized work. Do not commit, push, publish, or deploy unless the user asks. Never copy credentials, account IDs, or production resource bindings from reference apps.\n`,
    "CLAUDE.md": "@AGENTS.md\n",
    "README.md": `# ${name}\n\n${framework} on Cloudflare Workers. ${navigation ? "Home, Labs, and About with desktop/mobile navigation, gradient underline, fade and swipe transitions." : "A single-page starting point with the shared fleet theme."}\n\n\`\`\`sh\n${packageManager} install\n${run} dev\n${run} check\n${run} doctor\n${run} deploy:check\n${run} deploy\n\`\`\`\n\nTailwind CSS 4, Space Grotesk, light/dark/system theme, Oxlint, Oxfmt, Knip, React Doctor, strict TypeScript, and skills, Chrome DevTools MCP, Lighthouse budgets, and PWA support are included. Versions are pinned when generated; commit the generated lockfile. Undici is overridden to 7.29.1 to patch the Cloudflare development tooling; it has a scoped package-age exception. Remove the override once upstream tooling no longer needs it.\n\n${isVinext ? "cloudflare.config.ts is the deployment source of truth. cf deploy uses Cloudflare Build Output; the Cloudflare Vite plugin v2 is currently a beta dependency." : "wrangler.jsonc is the deployment source of truth. The Cloudflare Vite plugin runs server code in workerd."}\n\nAuthenticate with ${isVinext ? "`cf login`" : "`wrangler login`"} before deploying. Add your own bindings to the source configuration, then run \`${run} cf:typegen\`. Read secrets on the server via \`cloudflare:workers\`; use .dev.vars locally and the platform CLI for deployed secrets.\n\nSkills live in .agents/skills and .claude/skills. Run ${run} lighthouse <production-url> for three mobile audits; add --desktop for desktop. The budget is 100/100 in Performance, Accessibility, Best Practices, and SEO. Reports are saved under lighthouse/. PWA registration is enabled on production builds; public/sw.js caches only the offline fallback and explicitly public icons. Increment its cache version after changing those assets. CLAUDE.md points to AGENTS.md. No remote account or resource is configured for you.\n`,
    ".github/workflows/ci.yml": `name: Quality\non: [push, pull_request]\npermissions:\n  contents: read\njobs:\n  quality:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n${packageManager === "bun" ? "      - uses: oven-sh/setup-bun@v2\n        with:\n          bun-version: latest\n      - run: bun install --frozen-lockfile\n" : "      - uses: actions/setup-node@v4\n        with:\n          node-version: 24\n          cache: npm\n      - run: npm ci\n"}      - run: ${run} check\n      - run: ${run} doctor\n      - run: ${run} build\n      - run: ${run} audit\n`,
  };
  if (!navigation)
    files["src/components/sample-pages.tsx"] =
      `export function HomePage() {\n  return <section className="main-page home-page"><p className="eyebrow">Your next idea starts here</p><h1>${name}</h1><p className="lead">Built for the web. Ready for the edge.</p></section>;\n}\n`;
  else
    files["src/styles/globals.css"] =
      (await readFile(join(templates, "common/src/styles/globals.css"), "utf8")) +
      '\n@import "./navigation.css";\n@import "./transitions.css";\n';
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(destination, path)), { recursive: true });
    await writeFile(join(destination, path), content);
  }
  if (install) {
    for (const args of [["install"], ["run", "format"]]) {
      const result = spawnSync(packageManager, args, {
        cwd: destination,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      if (result.status !== 0)
        throw new Error(
          `Files are ready in ${destination}, but ${packageManager} ${args.join(" ")} failed. Fix the error and rerun it there.`,
        );
    }
  }
  return { directory: destination, name, installed: install };
}
