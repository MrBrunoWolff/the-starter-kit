import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { syncSkillDefaults } from "../scripts/sync-skills.mjs";

test("default sync repairs mirrors and provenance while preserving root-only skills", (t) => {
  const root = mkdtempSync(join(tmpdir(), "starter-skills-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, "templates/common/.agents/skills/example");
  const extra = join(root, ".agents/skills/root-only");
  mkdirSync(source, { recursive: true });
  mkdirSync(extra, { recursive: true });
  writeFileSync(join(source, "SKILL.md"), "Reviewed default");
  writeFileSync(join(extra, "SKILL.md"), "Keep this root-only skill");
  const entry = { source: "official/skills", computedHash: "reviewed" };
  writeFileSync(
    join(root, "templates/common/skills-lock.json"),
    JSON.stringify({ skills: { example: entry } }),
  );
  writeFileSync(
    join(root, "skills-lock.json"),
    JSON.stringify({ version: 1, skills: { "root-only": { source: "other/skills" } } }),
  );
  assert.ok(syncSkillDefaults(root).length > 0);
  assert.throws(() => readFileSync(join(root, ".claude/skills/example/SKILL.md")), /ENOENT/);
  syncSkillDefaults(root, { check: false });
  assert.deepEqual(syncSkillDefaults(root), []);
  assert.equal(
    readFileSync(join(root, ".claude/skills/example/SKILL.md"), "utf8"),
    "Reviewed default",
  );
  assert.equal(readFileSync(join(extra, "SKILL.md"), "utf8"), "Keep this root-only skill");
  const lock = JSON.parse(readFileSync(join(root, "skills-lock.json"), "utf8"));
  assert.deepEqual(lock.skills.example, entry);
  assert.equal(lock.skills["root-only"].source, "other/skills");
  writeFileSync(join(root, ".claude/skills/example/SKILL.md"), "Stale mirror");
  assert.deepEqual(syncSkillDefaults(root), [".claude/skills/example"]);
});
