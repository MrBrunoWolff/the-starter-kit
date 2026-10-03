import { test } from "node:test";
import assert from "node:assert/strict";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

for (const packageManager of ["bun", "npm"]) {
  test(`CI gate stops when the ${packageManager} code check fails`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "starter-ci-failure-"));
    const calls = join(directory, "calls.jsonl");
    try {
      await writeFile(
        join(directory, packageManager),
        `#!${process.execPath}\nconst fs = require('node:fs');\nfs.appendFileSync(process.env.CI_TEST_CALLS, JSON.stringify(process.argv.slice(2)) + '\\n');\nprocess.exit(17);\n`,
        { mode: 0o755 },
      );
      const result = spawnSync(
        process.execPath,
        [new URL("../scripts/check-ci.mjs", import.meta.url).pathname],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            npm_execpath: join(directory, packageManager),
            CI_TEST_CALLS: calls,
          },
        },
      );
      assert.equal(result.status, 17, result.stderr);
      assert.deepEqual((await readFile(calls, "utf8")).trim().split("\n").map(JSON.parse), [
        ["run", "check"],
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}

for (const packageManager of ["bun", "npm"]) {
  for (const failure of [null, "smoke", "browser"]) {
    test(`${packageManager}: ${failure ?? "successful"} gate owns fresh fixtures and cleans up`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "starter-ci-flow-"));
      const calls = join(directory, "calls.jsonl");
      let fixtures;
      try {
        await mkdir(join(directory, "scripts"));
        await mkdir(join(directory, "bin"));
        await mkdir(join(directory, "node_modules/@playwright/test"), { recursive: true });
        await copyFile(
          new URL("../scripts/check-ci.mjs", import.meta.url),
          join(directory, "scripts/check-ci.mjs"),
        );
        const driver = join(directory, "driver.cjs");
        await writeFile(
          driver,
          `const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const args = process.argv.slice(2);
const call = {
  args,
  ci: process.env.CI,
  fixtures: process.env.STARTER_SMOKE_FIXTURES,
  vinext: process.env.STARTER_VINEXT_FIXTURE,
  tanstack: process.env.STARTER_TANSTACK_FIXTURE,
};
if (args.includes('test:smoke')) {
  call.owned = fs.mkdtempSync(path.join(os.tmpdir(), 'starter-smoke-'));
  fs.writeFileSync(process.env.STARTER_SMOKE_FIXTURES_OUTPUT, call.owned);
}
fs.appendFileSync(process.env.CI_TEST_CALLS, JSON.stringify(call) + '\\n');
if (args.includes('test:smoke') && process.env.CI_TEST_FAILURE === 'smoke') process.exit(29);
if (args.includes('test:e2e') && process.env.CI_TEST_FAILURE === 'browser') process.exit(23);
`,
        );
        for (const command of ["bun", "npm"]) {
          await writeFile(
            join(directory, "bin", command),
            `#!${process.execPath}\nrequire(${JSON.stringify(driver)});\n`,
            { mode: 0o755 },
          );
        }
        await writeFile(
          join(directory, "node_modules/@playwright/test/cli.js"),
          `require(${JSON.stringify(driver)});\n`,
        );
        const result = spawnSync(process.execPath, [join(directory, "scripts/check-ci.mjs")], {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${join(directory, "bin")}:${process.env.PATH}`,
            npm_execpath: join(directory, "bin", packageManager),
            CI_TEST_CALLS: calls,
            CI_TEST_FAILURE: failure ?? "",
            STARTER_SMOKE_FIXTURES: "/stale/fixtures",
            STARTER_VINEXT_FIXTURE: "/stale/vinext",
            STARTER_TANSTACK_FIXTURE: "/stale/tanstack",
            STARTER_KEEP_FIXTURES: "0",
          },
        });
        const recorded = (await readFile(calls, "utf8")).trim().split("\n").map(JSON.parse);
        fixtures = recorded.find((call) => call.owned)?.owned;
        assert.ok(fixtures);
        assert.equal(
          result.status,
          failure === "smoke" ? 29 : failure === "browser" ? 23 : 0,
          result.stderr,
        );
        assert.equal(
          recorded.some((call) => call.args[0] === "pack"),
          failure === null,
        );
        const browser = recorded.find((call) => call.args.includes("test:e2e"));
        if (failure === "smoke") assert.equal(browser, undefined);
        else {
          assert.equal(browser.ci, "1");
          assert.equal(browser.fixtures, fixtures);
          assert.equal(browser.vinext, join(fixtures, "vinext-nav"));
          assert.equal(browser.tanstack, join(fixtures, "tanstack-start-nav"));
        }
        await assert.rejects(access(fixtures), { code: "ENOENT" });
      } finally {
        if (fixtures) await rm(fixtures, { recursive: true, force: true });
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
}
