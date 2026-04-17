#!/usr/bin/env node

import { resolve } from "node:path";
import { parseCli } from "../src/cli.js";
import { loadCommandFile, buildPanes } from "../src/cmd.js";
import { tierCommands } from "../src/applescript.js";

const cli = parseCli(process.argv);

// Merge file commands (-f) and inline commands (-c)
let allCommands = [];
let configDir = null;
let configFileDir = null;

if (cli.file) {
  try {
    const result = loadCommandFile(cli.file);
    allCommands = result.commands;
    configDir = result.dir;
    configFileDir = result.fileDir;
  } catch (err) {
    console.error(`Failed to load config file: ${err.message}`);
    process.exit(1);
  }
}

allCommands = allCommands.concat(cli.commands);

const panes = buildPanes(allCommands);

if (panes.length === 0) {
  console.error("No commands provided. Use -c or -f to specify commands.");
  process.exit(1);
}

// Resolve working directory:
//   -d with -f: resolve -d relative to config file's directory
//   -d without -f: resolve -d relative to cwd
//   no -d: config file dir > cwd
let dir;
if (cli.cliDir) {
  const baseDir = configFileDir || process.cwd();
  dir = resolve(baseDir, cli.cliDir);
} else {
  dir = configDir || process.cwd();
}

const count = panes.length;
process.stderr.write(`🚀 Tiling ${count} pane(s)...\n`);

try {
  tierCommands(panes, dir);
  process.stderr.write(`✅ ${count} pane(s) tiled successfully\n`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
