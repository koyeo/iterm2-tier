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
 * Check if iTerm2 is installed on the system.
 */
function isItermInstalled() {
  // Check common install path first
  try {
    execFileSync("test", ["-d", "/Applications/iTerm.app"], { stdio: "ignore" });
    return true;
  } catch {
    // not in /Applications
  }
  // Fallback: Spotlight search
  try {
    const result = execSync(
      "mdfind 'kMDItemCFBundleIdentifier == \"com.googlecode.iterm2\"' | head -1",
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return result.length > 0;
  } catch {
    return false;
  }
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
 * Check if iTerm2 supports AppleScript API.
 */
function checkItermAppleScriptSupport() {
  try {
    const result = execFileSync("osascript", ["-e", 'tell application "iTerm2" to get version'], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return result;
  } catch {
    return null;
  }
}

/**
 * Launch iTerm2 and wait for it to start.
 */
function launchIterm() {
  execSync("open -a iTerm", { stdio: "ignore" });
  execSync("sleep 2");
}

const ITERM2_SETUP_GUIDE = `
iTerm2 is required but was not found on this system.

  Install:
    1. Download from https://iterm2.com/downloads.html
    2. Move iTerm.app to /Applications
    3. Open iTerm2 and grant Accessibility permissions when prompted

  Or install via Homebrew:
    $ brew install --cask iterm2

  After installation, ensure AppleScript access is enabled:
    iTerm2 → Settings → General → Magic → Enable Python API (includes AppleScript)

  Then run tier again.
`;

const ITERM2_API_GUIDE = `
iTerm2 AppleScript API is not responding.

  Please check the following:
    1. Open iTerm2
    2. Go to Settings → General → Magic
    3. Ensure "Enable Python API" is checked (this also enables AppleScript control)
    4. Restart iTerm2

  If the problem persists, try resetting automation permissions:
    System Settings → Privacy & Security → Automation
    Ensure your terminal app is allowed to control iTerm2.

  More info: https://iterm2.com/documentation-scripting.html
`;

/**
 * Emit AppleScript to cd into working directory, write command, and set session name.
 * Name is set LAST so iTerm2 doesn't override it with the process title.
 */
function emitPaneActions(lines, indent, pane, dir) {
  if (dir) {
    const escapedDir = escapeForApplescript(dir);
    lines.push(`${indent}write text "cd ${escapedDir}"`);
  }
  const finalCmd = wrapCommand(pane);
  const escapedCmd = escapeForApplescript(finalCmd);
  lines.push(`${indent}write text "${escapedCmd}"`);
  if (pane.name) {
    const escapedName = escapeForApplescript(pane.name);
    // delay to let the command start, then set name so it sticks
    lines.push(`${indent}delay 0.3`);
    lines.push(`${indent}set name to "${escapedName}"`);
  }
}

/**
 * Generate AppleScript to tile panes horizontally in a new tab.
 */
export function generateScript(panes, dir) {
  const splitDir = "horizontally";
  const indent = "        ";
  const indent2 = "            ";
  const lines = [
    'tell application "iTerm2"',
    "    activate",
    "    if (count of windows) is 0 then",
    "        create window with default profile",
    "        set w to current window",
    "    else",
    "        set w to current window",
    "        tell w",
    "            set newTab to (create tab with default profile)",
    "        end tell",
    "    end if",
    // Save the first session as s1
    `${indent}set s1 to current session of current tab of w`,
    `${indent}tell s1`,
  ];

  // First pane
  emitPaneActions(lines, indent2, panes[0], dir);
  lines.push(`${indent}end tell`);

  // Subsequent panes: always split from the last session to maintain order
  for (let i = 1; i < panes.length; i++) {
    const prev = `s${i}`;
    const curr = `s${i + 1}`;
    lines.push(`${indent}tell ${prev}`);
    lines.push(`${indent2}set ${curr} to (split ${splitDir} with default profile)`);
    lines.push(`${indent}end tell`);
    lines.push(`${indent}tell ${curr}`);
    emitPaneActions(lines, indent2, panes[i], dir);
    lines.push(`${indent}end tell`);
  }

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
    '                    if sName is contents of tName or sName starts with (contents of tName & " ") then',
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
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output
      .trim()
      .split("\n")
      .filter((n) => n.length > 0);
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : "";
    if (stderr) {
      process.stderr.write(`Warning: failed to check existing panes: ${stderr}\n`);
    }
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
export async function tierCommands(panes, dir) {
  // Check if iTerm2 is installed
  if (!isItermInstalled()) {
    throw new Error(ITERM2_SETUP_GUIDE);
  }

  // Launch iTerm2 if not running
  if (!isItermRunning()) {
    process.stderr.write("iTerm2 is not running, launching...\n");
    launchIterm();
  }

  // Verify AppleScript API works
  const itermVersion = checkItermAppleScriptSupport();
  if (!itermVersion) {
    throw new Error(ITERM2_API_GUIDE);
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

  const script = generateScript(panes, dir);

  try {
    execFileSync("osascript", ["-e", script], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : "unknown error";
    throw new Error(`AppleScript execution failed: ${stderr}`);
  }
}
