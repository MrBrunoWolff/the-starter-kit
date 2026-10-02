import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const packageManager = process.env.npm_execpath?.includes("bun") ? "bun" : "npm";
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(packageManager, ["run", "check"]);
const playwright = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
run(process.execPath, [
  playwright,
  "install",
  ...(process.env.CI ? ["--with-deps"] : []),
  "chromium",
]);
const results = await mkdtemp(join(tmpdir(), "starter-ci-"));
const output = join(results, "fixtures.txt");
run(packageManager, ["run", "test:smoke", "--", "--offline"], {
  ...process.env,
  STARTER_SMOKE_FIXTURES_OUTPUT: output,
});
const fixtures = await readFile(output, "utf8");
await rm(results, { recursive: true });
run(packageManager, ["run", "test:e2e"], {
  ...process.env,
  CI: "1",
  STARTER_SMOKE_FIXTURES: fixtures,
  STARTER_VINEXT_FIXTURE: join(fixtures, "vinext-nav"),
  STARTER_TANSTACK_FIXTURE: join(fixtures, "tanstack-start-nav"),
});
run("npm", ["pack", "--dry-run"]);
console.log("CI quality gate passed.");
