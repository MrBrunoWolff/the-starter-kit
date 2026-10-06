import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(resolve(cwd, "quality.config.json"), "utf8"));
const manager = config.stages.code[0][0];
const result = spawnSync(
  manager,
  [
    "run",
    "doctor",
    ...(manager === "npm" ? ["--"] : []),
    "--json",
    "--scope",
    "full",
    "--blocking",
    "warning",
  ],
  { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error || result.status !== 0) {
  if (result.stdout) process.stdout.write(result.stdout);
  throw result.error ?? new Error("React Doctor failed");
}
const report = JSON.parse(result.stdout);
console.log(JSON.stringify({ summary: report.summary, diagnostics: report.diagnostics }, null, 2));
const scores = report.projects.map((project) =>
  typeof project.score === "number" ? project.score : project.score?.score,
);
if (
  !report.ok ||
  report.summary.errorCount ||
  report.summary.warningCount ||
  !scores.length ||
  scores.some((score) => score !== 100) ||
  report.projects.some((project) => !project.complete)
) {
  throw new Error(
    "React Doctor requires complete scans, zero warnings/errors, and a measured 100/100 for every project. An unavailable score does not pass.",
  );
}
console.log("React Doctor: 100/100 for every scanned project, no warnings or errors.");
