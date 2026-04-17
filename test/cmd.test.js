import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseCommand, wrapCommand, buildPanes, loadCommandFile } from "../src/cmd.js";

describe("parseCommand", () => {
  it("treats plain string as command", () => {
    const pane = parseCommand("npm run dev");
    assert.equal(pane.command, "npm run dev");
    assert.equal(pane.sleep, null);
    assert.equal(pane.waitPort, null);
    assert.equal(pane.waitFile, null);
  });

  it("parses JSON with exec", () => {
    const pane = parseCommand('{"exec":"npm run dev"}');
    assert.equal(pane.command, "npm run dev");
  });

  it("treats JSON without exec field as plain string", () => {
    const pane = parseCommand('{"foo":"bar"}');
    assert.equal(pane.command, '{"foo":"bar"}');
  });

  it("treats invalid JSON as plain string", () => {
    const pane = parseCommand("{broken");
    assert.equal(pane.command, "{broken");
  });

  it("parses sleep field", () => {
    const pane = parseCommand('{"exec":"npm start","sleep":5}');
    assert.equal(pane.sleep, 5);
    assert.equal(pane.command, "npm start");
  });

  it("parses waitPort field", () => {
    const pane = parseCommand('{"exec":"npm test","waitPort":3000}');
    assert.equal(pane.waitPort, 3000);
  });

  it("parses waitFile field", () => {
    const pane = parseCommand('{"exec":"npm test","waitFile":"/tmp/ready"}');
    assert.equal(pane.waitFile, "/tmp/ready");
  });

  it("parses all wait fields together", () => {
    const pane = parseCommand('{"exec":"cmd","sleep":3,"waitPort":8080,"waitFile":"/tmp/lock"}');
    assert.equal(pane.sleep, 3);
    assert.equal(pane.waitPort, 8080);
    assert.equal(pane.waitFile, "/tmp/lock");
  });

  it("ignores invalid sleep value", () => {
    const pane = parseCommand('{"exec":"cmd","sleep":"abc"}');
    assert.equal(pane.sleep, null);
  });

  it("ignores zero/negative sleep", () => {
    const pane = parseCommand('{"exec":"cmd","sleep":0}');
    assert.equal(pane.sleep, null);
  });
});

describe("wrapCommand", () => {
  it("returns plain command when no wait options", () => {
    const result = wrapCommand({ command: "npm start", sleep: null, waitPort: null, waitFile: null });
    assert.equal(result, "npm start");
  });

  it("prepends sleep", () => {
    const result = wrapCommand({ command: "npm start", sleep: 5, waitPort: null, waitFile: null });
    assert.equal(result, "sleep 5 && npm start");
  });

  it("prepends waitPort", () => {
    const result = wrapCommand({ command: "npm test", sleep: null, waitPort: 3000, waitFile: null });
    assert.equal(result, "while ! nc -z localhost 3000 2>/dev/null; do sleep 1; done && npm test");
  });

  it("prepends waitFile", () => {
    const result = wrapCommand({ command: "npm test", sleep: null, waitPort: null, waitFile: "/tmp/ready" });
    assert.equal(result, "while [ ! -f /tmp/ready ]; do sleep 1; done && npm test");
  });

  it("chains sleep + waitPort + waitFile in order", () => {
    const result = wrapCommand({ command: "cmd", sleep: 2, waitPort: 8080, waitFile: "/tmp/lock" });
    assert.equal(
      result,
      "sleep 2 && while ! nc -z localhost 8080 2>/dev/null; do sleep 1; done && while [ ! -f /tmp/lock ]; do sleep 1; done && cmd",
    );
  });

  it("chains sleep + waitPort without waitFile", () => {
    const result = wrapCommand({ command: "cmd", sleep: 3, waitPort: 5432, waitFile: null });
    assert.equal(result, "sleep 3 && while ! nc -z localhost 5432 2>/dev/null; do sleep 1; done && cmd");
  });
});

describe("buildPanes", () => {
  it("builds panes from command array", () => {
    const panes = buildPanes(["htop", '{"exec":"npm start"}']);
    assert.equal(panes.length, 2);
    assert.equal(panes[0].command, "htop");
    assert.equal(panes[1].command, "npm start");
  });

  it("returns empty array when no inputs", () => {
    const panes = buildPanes([]);
    assert.equal(panes.length, 0);
  });
});

describe("loadCommandFile", () => {
  let tmpDir;

  function writeTmpFile(name, content) {
    const filePath = join(tmpDir, name);
    writeFileSync(filePath, content, "utf-8");
    return filePath;
  }

  tmpDir = mkdtempSync(join(tmpdir(), "tier-test-"));

  it("loads commands object with strings and objects", () => {
    const file = writeTmpFile("basic.json", JSON.stringify({
      commands: ["htop", { exec: "npm start" }, { exec: "npm test", waitPort: 3000 }],
    }));
    const result = loadCommandFile(file);
    assert.equal(result.commands.length, 3);
    assert.equal(result.commands[0], "htop");
    assert.equal(result.dir, null);
  });

  it("resolves relative dir from config file directory", () => {
    const file = writeTmpFile("withdir.json", JSON.stringify({
      dir: "./sub",
      commands: ["ls"],
    }));
    const result = loadCommandFile(file);
    assert.equal(result.dir, join(tmpDir, "sub"));
  });

  it("resolves absolute dir as-is", () => {
    const file = writeTmpFile("absdir.json", JSON.stringify({
      dir: "/tmp/my-project",
      commands: ["ls"],
    }));
    const result = loadCommandFile(file);
    assert.equal(result.dir, "/tmp/my-project");
  });

  it("resolves '.' to config file directory", () => {
    const file = writeTmpFile("dotdir.json", JSON.stringify({
      dir: ".",
      commands: ["ls"],
    }));
    const result = loadCommandFile(file);
    assert.equal(result.dir, tmpDir);
  });

  it("returns null dir when not specified", () => {
    const file = writeTmpFile("nodir.json", JSON.stringify({ commands: ["ls"] }));
    const result = loadCommandFile(file);
    assert.equal(result.dir, null);
  });

  it("throws on plain array", () => {
    const file = writeTmpFile("arr.json", '["cmd1","cmd2"]');
    assert.throws(() => loadCommandFile(file), /JSON object/);
  });

  it("throws on object without commands array", () => {
    const file = writeTmpFile("noarr.json", '{"exec":"cmd"}');
    assert.throws(() => loadCommandFile(file), /"commands" array/);
  });

  it("throws on missing file", () => {
    assert.throws(() => loadCommandFile("/nonexistent/file.json"));
  });

  it("works with buildPanes end-to-end", () => {
    const file = writeTmpFile("e2e.json", JSON.stringify({
      commands: ["htop", { exec: "npm start", sleep: 2 }],
    }));
    const result = loadCommandFile(file);
    const panes = buildPanes(result.commands);
    assert.equal(panes.length, 2);
    assert.equal(panes[0].command, "htop");
    assert.equal(panes[1].command, "npm start");
    assert.equal(panes[1].sleep, 2);
  });
});
