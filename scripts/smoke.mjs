import { mkdtemp, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { scaffold } from "../lib/scaffold.mjs";

const runDirectory = await mkdtemp(resolve(tmpdir(), "starter-smoke-"));
console.log(`Smoke fixtures: ${runDirectory}`);
// Register ownership before installing anything, so the CI gate can clean up
// even when a dependency install or a build fails halfway through.
if (process.env.STARTER_SMOKE_FIXTURES_OUTPUT) {
  await writeFile(process.env.STARTER_SMOKE_FIXTURES_OUTPUT, runDirectory);
}
for (const framework of ["vinext", "tanstack-start"]) {
  for (const navigation of [true, false]) {
    const directory = resolve(runDirectory, `${framework}-${navigation ? "nav" : "bare"}`);
    const packageManager = navigation ? "bun" : "npm";
    await scaffold({
      directory,
      framework,
      navigation,
      packageManager,
      install: true,
      offline: process.argv.includes("--offline"),
    });
    for (const script of ["check", "deploy:check", "doctor", "audit"]) {
      const result = spawnSync(packageManager, ["run", script], {
        cwd: directory,
        stdio: "inherit",
      });
      if (result.status !== 0)
        throw new Error(`${framework} navigation=${navigation}: ${script} failed`);
    }
  }
}
