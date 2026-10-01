#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { spawnSync } from "node:child_process";
import { scaffold } from "../lib/scaffold.mjs";

const help = `the-starter-kit [directory] [options]

  --framework vinext|tanstack-start
  --navigation / --no-navigation    Include Home, Labs, About + animated navigation
  --package-manager bun|npm         Defaults to Bun when installed
  --no-install                      Write files without installing dependencies
  --offline                         Use the bundled, tested dependency snapshot
  --release-age seconds             Minimum package publication age (259200)
  --yes, -y                         Accept defaults (vinext, sample navigation)
  --help, -h                        Show this help

Skills are included by default. Existing non-empty folders are never overwritten.
`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      framework: { type: "string" },
      navigation: { type: "boolean" },
      "no-navigation": { type: "boolean" },
      "package-manager": { type: "string" },
      "no-install": { type: "boolean" },
      offline: { type: "boolean" },
      "release-age": { type: "string" },
      yes: { type: "boolean", short: "y" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    stdout.write(help);
  } else {
    if (positionals.length > 1) throw new Error("Pass only one destination directory.");
    if (values.navigation && values["no-navigation"])
      throw new Error("Choose one navigation flag.");
    let directory = positionals[0];
    let framework = values.framework;
    let navigation = values["no-navigation"] ? false : values.navigation;
    const defaultManager =
      spawnSync("bun", ["--version"], { stdio: "ignore", shell: process.platform === "win32" })
        .status === 0
        ? "bun"
        : "npm";
    let packageManager = values["package-manager"];
    const interactive = stdin.isTTY && stdout.isTTY && !values.yes;
    if (interactive) {
      const rl = createInterface({ input: stdin, output: stdout });
      try {
        directory ??= (await rl.question("Project directory (my-app): ")).trim() || "my-app";
        if (!framework) {
          const answer = (await rl.question("Framework: 1) vinext  2) TanStack Start (1): "))
            .trim()
            .toLowerCase();
          framework = ["2", "tanstack", "tanstack-start"].includes(answer)
            ? "tanstack-start"
            : answer && !["1", "vinext"].includes(answer)
              ? answer
              : "vinext";
        }
        if (navigation === undefined) {
          const answer = (
            await rl.question(
              "Add sample navigation with page transitions and mobile bottom bar? (Y/n): ",
            )
          )
            .trim()
            .toLowerCase();
          if (!["", "y", "yes", "n", "no"].includes(answer))
            throw new Error("Answer yes or no for sample navigation.");
          navigation = !["n", "no"].includes(answer);
        }
        if (!packageManager)
          packageManager =
            (await rl.question(`Package manager: bun / npm (${defaultManager}): `))
              .trim()
              .toLowerCase() || defaultManager;
      } finally {
        rl.close();
      }
    } else if (!values.yes && (!directory || !framework || navigation === undefined)) {
      throw new Error(
        "Non-interactive usage requires directory, --framework, and a navigation flag (or --yes).",
      );
    }
    directory ??= "my-app";
    framework ??= "vinext";
    navigation ??= true;
    packageManager ??= defaultManager;
    const result = await scaffold({
      directory,
      framework,
      navigation,
      packageManager,
      install: !values["no-install"],
      offline: values.offline ?? false,
      minimumReleaseAge:
        values["release-age"] === undefined ? 259200 : Number(values["release-age"]),
    });
    stdout.write(
      `\nCreated ${result.name} (${framework}) in ${result.directory}\n\n  cd ${JSON.stringify(directory)}\n  ${packageManager} ${result.installed ? "run dev" : "install"}\n\nQuality: ${packageManager} run check\nHealth: ${packageManager} run doctor\nDeploy: ${packageManager} run deploy\n`,
    );
  }
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
}
