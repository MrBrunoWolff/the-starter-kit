import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const packageManager = process.env.npm_execpath?.includes("bun") ? "bun" : "npm";
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Object.assign(new Error(`${command} ${args.join(" ")} failed.`), {
      exitCode: result.status ?? 1,
    });
}

async function cleanupResults(results) {
  try {
    const fixtures = await readFile(join(results, "fixtures.txt"), "utf8").catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (fixtures) {
      // Only remove the smoke directory created by this invocation.
      if (
        dirname(fixtures) !== resolve(tmpdir()) ||
        !basename(fixtures).startsWith("starter-smoke-")
      )
        throw new Error(`Unexpected smoke fixture path: ${fixtures}`);
      if (process.env.STARTER_KEEP_FIXTURES === "1")
        console.log(`Retained smoke fixtures: ${fixtures}`);
      else await rm(fixtures, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`Fixture cleanup failed: ${error.message}`);
    process.exitCode ||= 1;
  } finally {
    await rm(results, { recursive: true, force: true });
  }
}

const stage = process.argv[2] ?? "code";
if (!["code", "security"].includes(stage)) throw new Error(`Unknown fixture stage: ${stage}`);
let results;
try {
  if (stage === "code") {
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
  }
  results = await mkdtemp(join(tmpdir(), "starter-ci-"));
  const output = join(results, "fixtures.txt");
  run(
    packageManager,
    ["run", "test:smoke", "--", "--offline", ...(stage === "security" ? ["--security-only"] : [])],
    {
      ...process.env,
      STARTER_SMOKE_FIXTURES_OUTPUT: output,
    },
  );
  if (stage === "code") {
    const fixtures = await readFile(output, "utf8");
    run(packageManager, ["run", "test:e2e"], {
      ...process.env,
      CI: "1",
      STARTER_SMOKE_FIXTURES: fixtures,
      STARTER_VINEXT_FIXTURE: join(fixtures, "vinext-nav"),
      STARTER_TANSTACK_FIXTURE: join(fixtures, "tanstack-start-nav"),
    });
    run("npm", ["pack", "--dry-run"]);
  }
  console.log(`Fixture ${stage} gate passed.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
} finally {
  if (results) await cleanupResults(results);
}
