// Exact dependency versions validated against both Cloudflare production builds.
export const snapshot = {
  "@fontsource/space-grotesk": "5.3.0",
  react: "19.3.0",
  "react-dom": "19.3.0",
  "react-server-dom-webpack": "19.3.0",
  vinext: "1.0.0",
  "@cloudflare/vite-plugin": "1.62.0",
  "@tailwindcss/vite": "4.3.3",
  "@types/node": "26.6.3",
  "@types/react": "19.3.0",
  "@types/react-dom": "19.3.0",
  "@vinext/cloudflare": "1.0.0",
  "@vitejs/plugin-rsc": "0.5.35",
  cf: "1.0.0-beta.5",
  knip: "6.38.0",
  lighthouse: "13.5.0",
  next: "16.3.6",
  oxfmt: "0.71.0",
  oxlint: "1.86.0",
  "react-doctor": "0.9.14",
  tailwindcss: "4.3.3",
  typescript: "7.0.2",
  vite: "8.3.1",
  wrangler: "4.143.0",
  "@tanstack/react-router": "1.170.40",
  "@tanstack/react-start": "1.168.59",
  "@vitejs/plugin-react": "6.1.1",
  "cloudflare-v2": "2.0.0-beta.sha-ad79608dd",
};

// The requested framework stays current; tooling follows the fleet age policy.
export const latestFrameworkPackages = new Set([
  "vinext",
  "@vinext/cloudflare",
  "@tanstack/react-start",
  "@tanstack/react-router",
]);

export const frameworkAgeExclusions = {
  vinext: ["vinext", "@vinext/cloudflare", "@vinext/types", "@cloudflare/workers-response-store"],
  "tanstack-start": [
    "@tanstack/react-start",
    "@tanstack/react-router",
    "@tanstack/router-core",
    "@tanstack/history",
    "@tanstack/router-utils",
    "@tanstack/react-start-rsc",
    "@tanstack/start-client-core",
    "@tanstack/start-plugin-core",
    "@tanstack/start-server-core",
    "@tanstack/react-start-client",
    "@tanstack/react-start-server",
    "@tanstack/router-plugin",
    "@tanstack/router-generator",
    "@tanstack/react-start-rsc-runtime",
    "@tanstack/react-store",
    "@tanstack/store",
    "@tanstack/start-storage-context",
  ],
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
  const names = dependencyNames(framework);
  const result = { dependencies: {}, devDependencies: {} };
  await Promise.all(
    Object.entries(names).flatMap(([group, packages]) =>
      packages.map(async (name) => {
        const v2 = framework === "vinext" && name === "@cloudflare/vite-plugin";
        let version = snapshot[v2 ? "cloudflare-v2" : name];
        if (!offline) {
          const tag = v2 ? "beta" : "latest";
          const response = await fetcher(`https://registry.npmjs.org/${name}/${tag}`, {
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok)
            throw new Error(
              `Could not resolve ${name}@${tag}: HTTP ${response.status}. Use --offline for the tested snapshot.`,
            );
          version = (await response.json()).version;
          if (minimumReleaseAge > 0 && !latestFrameworkPackages.has(name)) {
            const metadataResponse = await fetcher(`https://registry.npmjs.org/${name}`, {
              signal: AbortSignal.timeout(30000),
            });
            if (!metadataResponse.ok)
              throw new Error(`Could not check publication dates for ${name}.`);
            const metadata = await metadataResponse.json();
            const cutoff = Date.now() - minimumReleaseAge * 1000;
            const major = version.split(".")[0];
            const prerelease = version.includes("-");
            const candidates = Object.keys(metadata.versions ?? {}).filter(
              (candidate) =>
                candidate.split(".")[0] === major &&
                (prerelease ? candidate.includes("-beta") : !candidate.includes("-")) &&
                Date.parse(metadata.time?.[candidate]) <= cutoff,
            );
            candidates.sort((a, b) => Date.parse(metadata.time[b]) - Date.parse(metadata.time[a]));
            if (Date.parse(metadata.time?.[version]) > cutoff || !metadata.time?.[version])
              version = candidates[0];
            if (!version)
              throw new Error(
                `No ${name}@${tag} release meets the ${minimumReleaseAge}-second publication-age policy.`,
              );
          }
        }
        if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version ?? ""))
          throw new Error(`Invalid npm version for ${name}.`);
        result[group][name] = version;
      }),
    ),
  );
  // React's server and client protocol packages must use the same version.
  const reactVersion = result.dependencies.react;
  result.dependencies["react-dom"] = reactVersion;
  if (framework === "vinext") result.dependencies["react-server-dom-webpack"] = reactVersion;
  for (const group of Object.values(result)) {
    const sorted = Object.entries(group).sort(([a], [b]) => a.localeCompare(b));
    for (const key of Object.keys(group)) delete group[key];
    Object.assign(group, Object.fromEntries(sorted));
  }
  return result;
}
