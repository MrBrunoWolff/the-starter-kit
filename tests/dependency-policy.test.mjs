import assert from "node:assert/strict";
import { test } from "node:test";
import * as rootPolicy from "../.github/scripts/check-dependency-releases.mjs";
import * as templatePolicy from "../templates/common/.github/scripts/check-dependency-releases.mjs";

for (const [label, policy] of [
  ["root", rootPolicy],
  ["generated", templatePolicy],
]) {
  const graph = (...versions) => ({
    declarations: new Map(),
    resolutions: new Map(
      versions.map((version) => [`chromium-bidi@${version}`, { name: "chromium-bidi", version }]),
    ),
  });
  test(`${label}: allow only the selected Chromium BiDi prerelease`, () => {
    const result = policy.changedDependencies(graph(), graph("157.0.8090-0", "157.0.8091-0"));
    assert.deepEqual(result.problems, ["New prerelease resolution: chromium-bidi@157.0.8091-0"]);
  });
  test(`${label}: the selected prerelease never bypasses the age gate`, async () => {
    const problems = await policy.checkReleaseAges(
      [{ name: "chromium-bidi", version: "157.0.8090-0" }],
      async () => ({ "157.0.8090-0": "2026-10-07T04:35:10.934Z" }),
      { now: Date.parse("2026-10-08T00:00:00Z"), securityUpdate: true },
    );
    assert.match(problems[0], /younger than three days/);
  });
  test(`${label}: permit only the selected Miniflare prereleases`, () => {
    const versions = [
      "5.20261103.0-beta",
      "5.20261104.0-beta",
      "5.20261110.0-beta",
      "5.20261111.0-beta",
    ];
    const empty = { declarations: new Map(), resolutions: new Map() };
    const resolutions = new Map(
      versions.map((version) => [`miniflare@${version}`, { name: "miniflare", version }]),
    );
    assert.deepEqual(
      policy.changedDependencies(empty, { declarations: new Map(), resolutions }).problems,
      ["New prerelease resolution: miniflare@5.20261111.0-beta"],
    );
  });
}
