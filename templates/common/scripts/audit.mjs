import { spawnSync } from "node:child_process";

// Temporary exception: braces has no published fix for this build-time glob
// dependency. Remove this filter when vinext's dependency chain is patched.
const exception = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const result = spawnSync("npm", ["audit", "--json", "--audit-level=high"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
try {
  if (result.error || ![0, 1].includes(result.status))
    throw result.error ?? new Error(`npm audit exited with ${result.status}`);
  const report = JSON.parse(result.stdout);
  if (report.error || report.auditReportVersion !== 2 || !report.vulnerabilities)
    throw new Error("npm audit did not return a valid vulnerability report");
  let blocked = false;
  for (const vulnerability of Object.values(report.vulnerabilities)) {
    if (!Array.isArray(vulnerability.via)) throw new Error("Invalid npm audit findings");
    for (const advisory of vulnerability.via) {
      if (typeof advisory === "string") {
        if (!report.vulnerabilities[advisory]) throw new Error("Unresolved npm audit finding");
        continue; // Its direct advisories are checked in that package's entry.
      }
      if (!["info", "low", "moderate", "high", "critical"].includes(advisory?.severity))
        throw new Error("Invalid npm audit severity");
      const ignored = advisory.name === "braces" && advisory.url === exception;
      console.log(
        `${ignored ? "TEMPORARILY EXEMPT" : advisory.severity}: ${advisory.title} (${advisory.url})`,
      );
      if (!ignored && ["high", "critical"].includes(advisory.severity)) blocked = true;
    }
  }
  process.exitCode = blocked ? 1 : 0;
} catch (error) {
  console.error(error.message);
  console.error(result.stderr || result.stdout);
  process.exitCode = 1;
}
