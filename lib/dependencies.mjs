// Keep the runtime date with the tested snapshot. Today's date can exceed the
// workerd version allowed by the package release-age guard.
export const testedCompatibilityDate = "2026-10-01";

// Exact dependency versions validated against both Cloudflare production builds.
export const snapshot = {
  "@fontsource/space-grotesk": "5.3.0",
  react: "19.3.0",
  "react-dom": "19.3.0",
  "react-server-dom-webpack": "19.3.0",
  vinext: "1.0.0",
  "@cloudflare/vite-plugin": "1.63.1",
  "cloudflare-v2": "2.0.0-beta.sha-91c870c02",
  cf: "1.0.0-beta.14",
  "@tailwindcss/vite": "4.3.3",
  "@types/node": "26.6.3",
  "@types/react": "19.3.0",
  "@types/react-dom": "19.3.0",
  "@vinext/cloudflare": "1.0.0",
  "@vitejs/plugin-rsc": "0.5.35",
  knip: "6.38.0",
  lighthouse: "13.5.0",
  next: "16.4.1",
  oxfmt: "0.71.0",
  oxlint: "1.86.0",
  "react-doctor": "0.9.14",
  tailwindcss: "4.3.3",
  typescript: "7.0.2",
  vite: "8.3.3",
  wrangler: "4.149.0",
  "@tanstack/react-router": "1.170.44",
  "@tanstack/react-start": "1.169.1",
  "@vitejs/plugin-react": "6.1.1",
};

export function dependencyNames(framework) {
  return {
    dependencies: [
      "react",
      "react-dom",
      "@fontsource/space-grotesk",
      ...(framework === "vinext"
        ? ["vinext", "react-server-dom-webpack"]
        : ["@tanstack/react-start", "@tanstack/react-router"]),
    ],
    devDependencies: [
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "typescript",
      "vite",
      "wrangler",
      "oxlint",
      "oxfmt",
      "knip",
      "react-doctor",
      "lighthouse",
      "tailwindcss",
      "@tailwindcss/vite",
      "@cloudflare/vite-plugin",
      ...(framework === "vinext"
        ? ["next", "@vinext/cloudflare", "@vitejs/plugin-rsc", "cf"]
        : ["@vitejs/plugin-react"]),
    ],
  };
}

export async function resolveDependencies(
  framework,
  offline,
  fetcher = fetch,
  minimumReleaseAge = 259200,
) {
  if (!Number.isSafeInteger(minimumReleaseAge) || minimumReleaseAge < 259200)
    throw new Error("Release age must be at least 259200 seconds (three days).");
  const names = dependencyNames(framework);
  const result = { dependencies: {}, devDependencies: {} };
  const eligible = new Map();
  const compare = (a, b) => {
    const av = a.split(".").map(Number);
    const bv = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if (av[i] !== bv[i]) return av[i] - bv[i];
    return 0;
  };
  await Promise.all(
    Object.entries(names).flatMap(([group, packages]) =>
      packages.map(async (name) => {
        const allowPrerelease =
          name === "cf" || (framework === "vinext" && name === "@cloudflare/vite-plugin");
        let version =
          snapshot[
            framework === "vinext" && name === "@cloudflare/vite-plugin" ? "cloudflare-v2" : name
          ];
        if (!offline) {
          const response = await fetcher(`https://registry.npmjs.org/${name}`, {
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok)
            throw new Error(
              `Could not resolve ${name}: HTTP ${response.status}. Use --offline for the tested snapshot.`,
            );
          const metadata = await response.json();
          const latest =
            metadata["dist-tags"]?.[
              framework === "vinext" && name === "@cloudflare/vite-plugin" ? "beta" : "latest"
            ];
          const core = latest?.match(/^(\d+\.\d+\.\d+)(?:-[\w.-]+)?(?:\+[\w.-]+)?$/)?.[1];
          if (!core) throw new Error(`Invalid npm latest tag for ${name}.`);
          const cutoff = Date.now() - minimumReleaseAge * 1000;
          const candidates = Object.keys(metadata.versions ?? {})
            .filter(
              (candidate) =>
                (allowPrerelease
                  ? /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(candidate)
                  : /^\d+\.\d+\.\d+$/.test(candidate)) &&
                compare(candidate.split("-")[0], core) <= 0 &&
                !metadata.versions[candidate].deprecated &&
                Number.isFinite(Date.parse(metadata.time?.[candidate])) &&
                Date.parse(metadata.time[candidate]) <= cutoff,
            )
            .sort((a, b) =>
              allowPrerelease
                ? Date.parse(metadata.time[b]) - Date.parse(metadata.time[a])
                : compare(b, a),
            );
          eligible.set(name, candidates);
          version = candidates[0];
          if (!version)
            throw new Error(
              `No stable ${name} release meets the ${minimumReleaseAge}-second publication-age policy.`,
            );
        }
        if (
          !(allowPrerelease ? /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/ : /^\d+\.\d+\.\d+$/).test(
            version ?? "",
          )
        )
          throw new Error(`Invalid stable npm version for ${name}.`);
        result[group][name] = version;
      }),
    ),
  );
  // Select an aged version shared by every React protocol package, rather than
  // copying React's version over a separately checked package's selection.
  const protocol = [
    "react",
    "react-dom",
    ...(framework === "vinext" ? ["react-server-dom-webpack"] : []),
  ];
  if (!offline) {
    const common = eligible
      .get("react")
      .find((version) => protocol.every((name) => eligible.get(name).includes(version)));
    if (!common)
      throw new Error("No common stable React protocol version meets the publication-age policy.");
    for (const name of protocol) result.dependencies[name] = common;
  } else if (protocol.some((name) => result.dependencies[name] !== result.dependencies.react)) {
    throw new Error("The tested React protocol snapshot is inconsistent.");
  }
  for (const group of Object.values(result)) {
    const sorted = Object.entries(group).sort(([a], [b]) => a.localeCompare(b));
    for (const key of Object.keys(group)) delete group[key];
    Object.assign(group, Object.fromEntries(sorted));
  }
  return result;
}
