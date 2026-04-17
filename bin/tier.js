#!/usr/bin/env node

import { parseCli } from "../src/cli.js";
import { loadCommandFile, buildPanes } from "../src/cmd.js";
import { tierCommands } from "../src/applescript.js";

const cli = parseCli(process.argv);

// Merge file commands (-f) and inline commands (-c)
let allCommands = [];
let fileDir = null;

if (cli.file) {
  try {
    const result = loadCommandFile(cli.file);
    allCommands = result.commands;
    fileDir = result.dir;
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

// Priority: CLI -d > config file dir > cwd
const dir = cli.cliDir || fileDir || process.cwd();

const count = panes.length;
const names = panes.filter((p) => p.name).map((p) => p.name);

if (names.length === 0) {
  process.stderr.write(`🚀 Tiling ${count} pane(s)...\n`);
} else {
  process.stderr.write(`🚀 Tiling ${count} pane(s): ${names.join(", ")}\n`);
}

try {
  await tierCommands(panes, dir);
  process.stderr.write(`✅ ${count} pane(s) tiled successfully\n`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
