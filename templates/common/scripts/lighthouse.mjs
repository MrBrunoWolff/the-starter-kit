import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const target = process.argv[2];
if (!target || !/^https?:\/\//.test(target))
  throw new Error("Pass a production preview URL: bun run lighthouse http://localhost:3000");
const desktop = process.argv.includes("--desktop");
const directory = resolve("lighthouse", desktop ? "desktop" : "mobile");
await mkdir(directory, { recursive: true });
let failed = false;
const runs = [];
for (let i = 1; i <= 3; i++) {
  const output = resolve(directory, `run-${i}`);
  const args = [
    target,
    "--only-categories=performance,accessibility,best-practices,seo",
    "--output=json",
    "--output=html",
    `--output-path=${output}`,
    `--chrome-flags=${process.env.LIGHTHOUSE_CHROME_FLAGS ?? "--headless"}`,
    ...(desktop ? ["--preset=desktop"] : []),
  ];
  // Spawn the local package's CLI with Node rather than fetching an unpinned tool.
  const cli = require.resolve("lighthouse/cli/index.js");
  // Keep launcher profiles outside the app, including WSL Windows-path fallbacks.
  const browserDirectory = await mkdtemp(join(tmpdir(), "starter-lighthouse-"));
  let result;
  try {
    result = spawnSync(process.execPath, [cli, ...args], {
      stdio: "inherit",
      cwd: browserDirectory,
    });
  } finally {
    await rm(browserDirectory, { recursive: true, force: true });
  }
  if (result.status !== 0) throw new Error(`Lighthouse run ${i} failed.`);
  const report = JSON.parse(await readFile(`${output}.report.json`, "utf8"));
  const scores = Object.fromEntries(
    Object.entries(report.categories).map(([name, category]) => [
      name,
      Math.round(category.score * 100),
    ]),
  );
  console.table(scores);
  runs.push({
    url: report.finalDisplayedUrl,
    lighthouseVersion: report.lighthouseVersion,
    fetchTime: report.fetchTime,
    scores,
  });
  if (Object.values(scores).some((score) => score !== 100)) failed = true;
}
await writeFile(resolve(directory, "summary.json"), JSON.stringify(runs, null, 2) + "\n");
if (failed) {
  console.error("The 100/100 Lighthouse budget failed. Inspect the saved reports.");
  process.exitCode = 1;
}
