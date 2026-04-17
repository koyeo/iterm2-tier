import { Command } from "commander";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

export function parseCli(argv) {
  const program = new Command();

  program
    .name("tier")
    .description(
      `Tier - tile multiple commands into iTerm2 split panes

  Run multiple commands simultaneously in a new iTerm2 tab with split panes.
  Panes are arranged horizontally (stacked top to bottom).

Command format:
  String:  -c "npm run dev"
  JSON:    -c '{"exec":"npm run dev"}'

  A plain string is executed directly as a command.
  JSON format supports the following fields:
    exec (required)      Command to execute
    sleep (optional)     Delay N seconds before executing
    waitPort (optional)  Wait for a port to become available (uses nc -z)
    waitFile (optional)  Wait for a file to appear before executing

  Multiple wait conditions can be combined. Execution order: sleep → waitPort → waitFile → exec

Config file format (-f):
  A JSON object with a "commands" array. Each element uses the same format as -c:
  {
    "dir": ".",
    "commands": [
      "htop",
      {"exec": "npm run dev"},
      {"exec": "npm test", "waitPort": 3000}
    ]
  }

  "dir" is optional. Relative paths are resolved from the config file's directory.
  -f and -c can be used together. File commands load first, -c commands are appended.

Examples:
  # Run two commands
  $ tier -c "npm run dev" -c "npm run test"

  # Load from config file
  $ tier -f tier.json

  # Config file + extra commands
  $ tier -f tier.json -c "htop"

  # Specify working directory
  $ tier -d /path/to/project -c "npm run dev" -c "npm test"

  # Wait for port: run tests after server is ready
  $ tier -c '{"exec":"npm run dev"}' -c '{"exec":"npm test","waitPort":3000}'

  # Delay + wait for file
  $ tier -c '{"exec":"npm run build"}' -c '{"exec":"npm start","sleep":3,"waitFile":"dist/index.js"}'

Notes:
  - All panes open in a new iTerm2 tab, leaving your current workspace untouched`,
    )
    .version(version)
    .option(
      "-c, --command <command>",
      "Command to run (repeatable), supports string or JSON format",
      (val, prev) => prev.concat(val),
      [],
    )
    .option(
      "-f, --file <path>",
      "Load commands from a JSON config file",
    )
    .option(
      "-d, --dir <path>",
      "Working directory for all panes (default: current directory)",
    );

  program.parse(argv);

  const opts = program.opts();

  if (opts.command.length === 0 && !opts.file) {
    console.error("error: at least one of -c or -f is required. Use --help for usage.");
    process.exit(1);
  }

  return {
    commands: opts.command,
    file: opts.file || null,
    cliDir: opts.dir || null,
  };
}
