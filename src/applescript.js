import { execFileSync, execSync } from "node:child_process";
import { wrapCommand } from "./cmd.js";

/**
 * Escape a string for safe embedding in AppleScript.
 */
export function escapeForApplescript(input) {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Check if iTerm2 is installed on the system.
 */
function isItermInstalled() {
  try {
    execFileSync("test", ["-d", "/Applications/iTerm.app"], { stdio: "ignore" });
    return true;
  } catch {
    // not in /Applications
  }
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
 * Emit AppleScript to cd into working directory and write command.
 */
function emitPaneActions(lines, indent, pane, dir) {
  if (dir) {
    const escapedDir = escapeForApplescript(dir);
    lines.push(`${indent}write text "cd ${escapedDir}"`);
  }
  const finalCmd = wrapCommand(pane);
  const escapedCmd = escapeForApplescript(finalCmd);
  lines.push(`${indent}write text "${escapedCmd}"`);
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
    `${indent}set s1 to current session of current tab of w`,
    `${indent}tell s1`,
  ];

  emitPaneActions(lines, indent2, panes[0], dir);
  lines.push(`${indent}end tell`);

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
 * Ensure iTerm2 is running, generate the tiling script, and execute it.
 */
export function tierCommands(panes, dir) {
  if (!isItermInstalled()) {
    throw new Error(ITERM2_SETUP_GUIDE);
  }

  if (!isItermRunning()) {
    process.stderr.write("iTerm2 is not running, launching...\n");
    launchIterm();
  }

  const itermVersion = checkItermAppleScriptSupport();
  if (!itermVersion) {
    throw new Error(ITERM2_API_GUIDE);
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
