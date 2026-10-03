import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const script = new URL("../templates/common/scripts/audit.mjs", import.meta.url);
const exempt = {
  name: "braces",
  severity: "high",
  title: "Nested patterns",
  url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
};
async function audit(report, status = 1) {
  const directory = await mkdtemp(join(tmpdir(), "starter-audit-"));
  await writeFile(join(directory, "report.json"), JSON.stringify(report));
  await writeFile(
    join(directory, "npm"),
    `#!/bin/sh\ncat '${directory}/report.json'\nexit ${status}\n`,
    { mode: 0o755 },
  );
  return spawnSync(process.execPath, [script.pathname], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
  });
}
const report = (...advisories) => ({
  auditReportVersion: 2,
  vulnerabilities: {
    braces: { via: advisories },
    micromatch: { via: ["braces"] },
  },
});
test("npm audit exempts only the exact braces advisory, including dependent findings", async () => {
  const result = await audit(report(exempt));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /TEMPORARILY EXEMPT/);
  for (const advisory of [
    { ...exempt, url: "https://github.com/advisories/GHSA-other" },
    { ...exempt, name: "another-package" },
    { ...exempt, severity: "critical", url: "https://github.com/advisories/GHSA-other" },
  ])
    assert.equal((await audit(report(exempt, advisory))).status, 1);
});
test("npm audit keeps the high threshold and fails on registry or malformed reports", async () => {
  assert.equal((await audit(report({ ...exempt, severity: "moderate", url: "other" }))).status, 0);
  assert.equal((await audit({ error: { code: "ENETUNREACH" } })).status, 1);
  assert.equal((await audit(report(exempt), 2)).status, 1);
  assert.equal(
    (await audit({ auditReportVersion: 2, vulnerabilities: { unknown: { via: ["missing"] } } }))
      .status,
    1,
  );
});
