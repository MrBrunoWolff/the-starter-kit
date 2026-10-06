import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { qualityConfig, qualityWorkflow } from "../lib/quality.mjs";

test("generated quality contract preserves both package managers and independent security", () => {
  for (const manager of ["bun", "npm"]) {
    const config = qualityConfig(manager, true);
    assert.ok(config.stages.code.every(([bin]) => bin === manager));
    assert.deepEqual(config.stages.security, [[manager, "run", "audit"]]);
    const workflow = qualityWorkflow(manager);
    assert.ok(workflow.includes(manager === "bun" ? "bun install --frozen-lockfile" : "npm ci"));
    assert.ok(workflow.includes("needs: [code, security]"));
    assert.ok(workflow.includes("if: always()"));
    assert.ok(!workflow.includes("bun-version: latest"));
  }
});

test("failed code does not suppress security and aggregate still fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "quality-contract-"));
  try {
    await mkdir(join(directory, "scripts"));
    await writeFile(
      join(directory, "scripts/quality.mjs"),
      await readFile(new URL("../templates/common/scripts/quality.mjs", import.meta.url)),
    );
    const evidence = join(directory, "security-ran");
    await writeFile(
      join(directory, "quality.config.json"),
      JSON.stringify({
        tier: "quick",
        stages: {
          code: [[process.execPath, "-e", "process.exit(1)"]],
          security: [
            [
              process.execPath,
              "-e",
              `require('node:fs').writeFileSync(${JSON.stringify(evidence)}, 'yes')`,
            ],
          ],
        },
      }),
    );
    const result = spawnSync(process.execPath, [join(directory, "scripts/quality.mjs")], {
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(await readFile(evidence, "utf8"), "yes");
    const unknown = spawnSync(
      process.execPath,
      [join(directory, "scripts/quality.mjs"), "missing"],
      { encoding: "utf8" },
    );
    assert.notEqual(unknown.status, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
