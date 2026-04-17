import { execFileSync, execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { wrapCommand } from "./cmd.js";

/**
 * Escape a string for safe embedding in AppleScript.
 * Replaces backslashes and double quotes to prevent injection.
 */
export function escapeForApplescript(input) {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Check if iTerm2 is currently running.
 */
function isItermRunning() {
  try {
    execSync("pgrep -x iTerm2", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Launch iTerm2 and wait for it to start.
 */
function launchIterm() {
  execSync("open -a iTerm", { stdio: "ignore" });
  execSync("sleep 2");
}

/**
 * Emit AppleScript to set session name and write command.
 */
function emitPaneActions(lines, indent, pane) {
  if (pane.name) {
    const escapedName = escapeForApplescript(pane.name);
    lines.push(`${indent}set name to "${escapedName}"`);
  }
  const finalCmd = wrapCommand(pane);
  const escapedCmd = escapeForApplescript(finalCmd);
  lines.push(`${indent}write text "${escapedCmd}"`);
}

/**
 * Generate AppleScript to tile panes horizontally in a new tab.
 */
export function generateScript(panes) {
  const splitDir = "horizontally";
  const lines = [
    'tell application "iTerm2"',
    "    activate",
    "    tell current window",
    "        set newTab to (create tab with default profile)",
    "        tell current session of newTab",
  ];

  // First pane in current session of new tab
  emitPaneActions(lines, "            ", panes[0]);

  // Subsequent panes each get a new split
  for (let i = 1; i < panes.length; i++) {
    lines.push("        end tell");
    lines.push("        tell current session of newTab");
    lines.push(
      `            set newSession to (split ${splitDir} with default profile)`,
    );
    lines.push("            tell newSession");
    emitPaneActions(lines, "                ", panes[i]);
    lines.push("            end tell");
  }

  lines.push("        end tell");
  lines.push("    end tell");
  lines.push("end tell");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate AppleScript to find existing sessions with given names.
 * Returns the script text that outputs matching names (one per line).
 */
export function generateFindSessionsScript(names) {
  const escapedNames = names.map((n) => `"${escapeForApplescript(n)}"`);
  const nameList = `{${escapedNames.join(", ")}}`;

  const lines = [
    'set targetNames to ' + nameList,
    'set foundNames to ""',
    'tell application "iTerm2"',
    "    repeat with w in windows",
    "        repeat with t in tabs of w",
    "            repeat with s in sessions of t",
    "                set sName to name of s",
    "                repeat with tName in targetNames",
    "                    if sName is equal to contents of tName then",
    '                        set foundNames to foundNames & sName & linefeed',
    "                    end if",
    "                end repeat",
    "            end repeat",
    "        end repeat",
    "    end repeat",
    "end tell",
    "return foundNames",
  ];

  return lines.join("\n");
}

/**
 * Find existing sessions that match the given names.
 * Returns an array of names that already exist.
 */
function findNamedSessions(names) {
  if (names.length === 0) return [];

  const script = generateFindSessionsScript(names);

  try {
    const output = execFileSync("osascript", ["-e", script], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .trim()
      .split("\n")
      .filter((n) => n.length > 0);
  } catch {
    return [];
  }
}

/**
 * Prompt user for confirmation via stdin.
 * Returns a promise that resolves to true if user confirms.
 */
function confirm(message) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

/**
 * Ensure iTerm2 is running, check for duplicate named sessions,
 * generate the tiling script, and execute it.
 */
export async function tierCommands(panes) {
  if (!isItermRunning()) {
    process.stderr.write("iTerm2 is not running, launching...\n");
    launchIterm();
  }

  // Check for duplicate named sessions
  const names = panes.filter((p) => p.name).map((p) => p.name);
  if (names.length > 0) {
    const existing = findNamedSessions(names);
    if (existing.length > 0) {
      const unique = [...new Set(existing)];
      process.stderr.write(
        `⚠️  Existing pane(s) with same name found: ${unique.join(", ")}\n`,
      );
      const ok = await confirm("Continue anyway?");
      if (!ok) {
        process.stderr.write("Cancelled\n");
        return;
      }
    }
  }

  const script = generateScript(panes);

  try {
    execFileSync("osascript", ["-e", script], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : "unknown error";
    throw new Error(`AppleScript execution failed: ${stderr}`);
  }
}
