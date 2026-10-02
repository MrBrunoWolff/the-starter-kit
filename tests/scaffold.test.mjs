import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { scaffold } from "../lib/scaffold.mjs";
import { resolveDependencies } from "../lib/dependencies.mjs";

const cli = new URL("../bin/the-starter-kit.mjs", import.meta.url);
const fixture = async () => join(await mkdtemp(join(tmpdir(), "starter-kit-")), "my-app");
const options = {
  framework: "vinext",
  navigation: true,
  packageManager: "npm",
  install: false,
  offline: true,
};

for (const framework of ["vinext", "tanstack-start"]) {
  for (const navigation of [true, false]) {
    test(`${framework}: navigation=${navigation} creates a portable app with skills`, async () => {
      const directory = await fixture();
      await scaffold({ ...options, directory, framework, navigation, date: "2026-10-01" });
      const pkg = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
      assert.equal(pkg.private, true);
      assert.ok(pkg.devDependencies["react-doctor"]);
      assert.ok(
        pkg.scripts.deploy.includes(framework === "vinext" ? "cf deploy" : "wrangler deploy"),
      );
      assert.equal((await readdir(join(directory, ".agents/skills"))).length, 8);
      const pages = await readFile(join(directory, "src/components/sample-pages.tsx"), "utf8");
      assert.equal(pages.includes("Page2"), navigation);
      const files = await readdir(join(directory, "src/components"));
      assert.equal(files.includes("navigation.tsx"), navigation);
      assert.equal(files.includes("base-shell.tsx"), !navigation);
      assert.equal(pkg.dependencies["react-dom"], pkg.dependencies.react);
      assert.equal(pkg.overrides.undici, "7.29.1");
      assert.ok((await readFile(join(directory, ".gitignore"), "utf8")).includes("node_modules"));
      const manifest = JSON.parse(
        await readFile(join(directory, "public/manifest.webmanifest"), "utf8"),
      );
      assert.equal(manifest.display, "standalone");
      assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
    });
  }
}
test("both frameworks receive byte-identical UI and styles", async () => {
  const a = await fixture();
  const b = await fixture();
  await scaffold({ ...options, directory: a });
  await scaffold({ ...options, directory: b, framework: "tanstack-start" });
  for (const path of [
    "src/components/navigation.tsx",
    "src/components/page-transition.tsx",
    "src/components/sample-pages.tsx",
    "src/styles/globals.css",
    "src/styles/tokens.css",
    "src/styles/navigation.css",
  ])
    assert.equal(await readFile(join(a, path), "utf8"), await readFile(join(b, path), "utf8"));
});
test("non-empty destination remains untouched", async () => {
  const directory = await fixture();
  await scaffold({ ...options, directory });
  await writeFile(join(directory, "keep.txt"), "keep");
  await assert.rejects(scaffold({ ...options, directory }), /new or empty/);
  assert.equal(await readFile(join(directory, "keep.txt"), "utf8"), "keep");
});
test("bad options fail before writing", async () => {
  await assert.rejects(
    scaffold({ ...options, directory: await fixture(), framework: "next" }),
    /Framework/,
  );
  await assert.rejects(
    scaffold({ ...options, directory: await fixture(), packageManager: "pnpm" }),
    /Package manager/,
  );
});
test("latest resolver uses beta for vinext Cloudflare v2 and pins React protocol", async () => {
  const urls = [];
  const result = await resolveDependencies(
    "vinext",
    false,
    async (url) => {
      urls.push(url);
      return {
        ok: true,
        json: async () => ({ version: url.includes("/react/latest") ? "19.3.1" : "1.0.2" }),
      };
    },
    0,
  );
  assert.ok(urls.includes("https://registry.npmjs.org/vinext/latest"));
  assert.ok(urls.includes("https://registry.npmjs.org/@cloudflare/vite-plugin/beta"));
  assert.equal(result.dependencies["react-server-dom-webpack"], "19.3.1");
  assert.equal(result.dependencies["react-dom"], "19.3.1");
});
test("registry errors leave the app unwritten", async () => {
  const directory = await fixture();
  await assert.rejects(
    scaffold({
      ...options,
      directory,
      offline: false,
      fetcher: async () => ({ ok: false, status: 503 }),
    }),
    /HTTP 503/,
  );
  await assert.rejects(readdir(directory), /ENOENT/);
});
test("release-age policy excludes a fresh release without leaving the framework major", async () => {
  const now = Date.now();
  const result = await resolveDependencies("tanstack-start", false, async (url) => ({
    ok: true,
    json: async () =>
      url.endsWith("/latest")
        ? { version: "2.1.1" }
        : {
            versions: { "1.9.9": {}, "2.1.0": {}, "2.1.1": {} },
            time: {
              "1.9.9": new Date(now - 300001000).toISOString(),
              "2.1.0": new Date(now - 400000000).toISOString(),
              "2.1.1": new Date(now - 1000).toISOString(),
            },
          },
  }));
  assert.equal(result.devDependencies.vite, "2.1.0");
  assert.equal(result.dependencies["@tanstack/react-start"], "2.1.1");
});
test("CLI works through Node with flags and exits nonzero for ambiguous unattended use", async () => {
  const directory = await fixture();
  const result = spawnSync(
    process.execPath,
    [
      cli.pathname,
      directory,
      "--framework",
      "tanstack-start",
      "--no-navigation",
      "--no-install",
      "--offline",
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    spawnSync(process.execPath, [cli.pathname, "--framework", "wrong", "--yes"], {
      encoding: "utf8",
    }).status,
    1,
  );
  assert.equal(spawnSync(process.execPath, [cli.pathname], { encoding: "utf8" }).status, 1);
});
