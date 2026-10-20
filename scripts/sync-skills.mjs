import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

function fingerprint(directory) {
  const files = [];
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) files.push(child);
      else throw new Error(`Unsupported entry in skill bundle: ${child}`);
    }
  }
  visit(directory);
  return files
    .map((file) => [
      relative(directory, file),
      createHash("sha256").update(readFileSync(file)).digest("hex"),
    ])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

// The checked-in template owns defaults. Root-only skills and their lock entries
// are preserved; this command neither fetches publishers nor installs packages.
export function syncSkillDefaults(root, { check = true } = {}) {
  const template = join(root, "templates/common");
  const defaults = join(template, ".agents/skills");
  const changes = [];
  const names = readdirSync(defaults, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const name of names) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name) || !existsSync(join(defaults, name, "SKILL.md")))
      throw new Error(`Invalid default skill: ${name}`);
  }
  const desiredLock = JSON.parse(readFileSync(join(template, "skills-lock.json"), "utf8"));
  if (Object.keys(desiredLock.skills).some((name) => !names.includes(name)))
    throw new Error("Template lock contains a skill without a bundle.");
  for (const name of names) {
    const source = join(defaults, name);
    const expected = fingerprint(source);
    for (const agent of [".agents", ".claude"]) {
      const destination = join(root, agent, "skills", name);
      if (existsSync(destination) && isDeepStrictEqual(fingerprint(destination), expected))
        continue;
      changes.push(`${agent}/skills/${name}`);
      if (!check) {
        rmSync(destination, { recursive: true, force: true });
        mkdirSync(dirname(destination), { recursive: true });
        cpSync(source, destination, { recursive: true });
      }
    }
  }
  const lockPath = join(root, "skills-lock.json");
  const lock = existsSync(lockPath)
    ? JSON.parse(readFileSync(lockPath, "utf8"))
    : { version: 1, skills: {} };
  let changedLock = false;
  for (const [name, entry] of Object.entries(desiredLock.skills)) {
    if (!isDeepStrictEqual(lock.skills[name], entry)) {
      changes.push(`skills-lock.json:${name}`);
      lock.skills[name] = entry;
      changedLock = true;
    }
  }
  if (!check && changedLock) writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  return changes;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !["--check", "--write"].includes(args[0]))
      throw new Error("Usage: node scripts/sync-skills.mjs --check|--write");
    const changes = syncSkillDefaults(resolve(dirname(fileURLToPath(import.meta.url)), ".."), {
      check: args[0] === "--check",
    });
    if (changes.length) {
      console.log(changes.join("\n"));
      if (args[0] === "--check") process.exitCode = 1;
    } else console.log("Starter skill defaults, agent mirrors and source locks match.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
