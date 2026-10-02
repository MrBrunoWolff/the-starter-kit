import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
