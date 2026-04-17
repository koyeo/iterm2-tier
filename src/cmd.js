import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

/**
 * Load commands from a JSON config file.
 * The file must contain a JSON object with a `commands` array:
 *   { "dir": "./", "commands": [ "cmd", {"exec":"cmd", ...}, ... ] }
 * Each element in the array can be:
 *   - A string (plain command)
 *   - An object with exec, sleep, waitPort, waitFile fields
 *
 * If `dir` is specified, relative paths are resolved from the config file's directory.
 *
 * Returns { commands: string[], dir: string | null }
 */
export function loadCommandFile(filePath) {
  const fullPath = resolve(filePath);
  const fileDir = dirname(fullPath);
  const content = readFileSync(fullPath, "utf-8");
  const data = JSON.parse(content);

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`Config file must contain a JSON object with a "commands" array: ${filePath}`);
  }

  if (!Array.isArray(data.commands)) {
    throw new Error(`Config file must have a "commands" array: ${filePath}`);
  }

  const commands = data.commands.map((item) => {
    if (typeof item === "string") return item;
    if (typeof item === "object" && item !== null) return JSON.stringify(item);
    throw new Error(`Invalid entry in config file: ${JSON.stringify(item)}`);
  });

  let dir = null;
  if (typeof data.dir === "string" && data.dir.length > 0) {
    dir = resolve(fileDir, data.dir);
  }

  return { commands, dir, fileDir };
}

/**
 * Parse a command string into a pane object.
 * If the input is valid JSON with an `exec` field, extract fields.
 * Otherwise, treat the entire string as a command.
 *
 * JSON fields:
 *   exec (required): command to execute
 *   sleep (optional): seconds to sleep before executing
 *   waitPort (optional): port number to wait for before executing
 *   waitFile (optional): file path to wait for before executing
 */
export function parseCommand(input) {
  try {
    const obj = JSON.parse(input);
    if (typeof obj === "object" && obj !== null && typeof obj.exec === "string") {
      return {
        command: obj.exec,
        sleep: typeof obj.sleep === "number" && obj.sleep > 0 ? obj.sleep : null,
        waitPort: typeof obj.waitPort === "number" && obj.waitPort > 0 ? obj.waitPort : null,
        waitFile: typeof obj.waitFile === "string" && obj.waitFile.length > 0 ? obj.waitFile : null,
      };
    }
  } catch {
    // Not JSON, treat as plain command string
  }
  return { command: input, sleep: null, waitPort: null, waitFile: null };
}

/**
 * Wrap a pane's command with wait conditions.
 * Order: sleep → waitPort → waitFile → exec
 */
export function wrapCommand(pane) {
  const parts = [];

  if (pane.sleep) {
    parts.push(`sleep ${pane.sleep}`);
  }

  if (pane.waitPort) {
    parts.push(`while ! nc -z localhost ${pane.waitPort} 2>/dev/null; do sleep 1; done`);
  }

  if (pane.waitFile) {
    parts.push(`while [ ! -f ${pane.waitFile} ]; do sleep 1; done`);
  }

  parts.push(pane.command);

  return parts.join(" && ");
}

/**
 * Build a list of panes from `-c` command arguments.
 */
export function buildPanes(cmds) {
  return cmds.map((s) => parseCommand(s));
}
