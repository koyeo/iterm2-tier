import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeForApplescript, generateScript } from "../src/applescript.js";

describe("escapeForApplescript", () => {
  it("escapes double quotes", () => {
    assert.equal(escapeForApplescript('echo "hi"'), 'echo \\"hi\\"');
  });

  it("escapes backslashes", () => {
    assert.equal(escapeForApplescript("path\\to"), "path\\\\to");
  });
});

describe("generateScript", () => {
  it("creates new tab for single command", () => {
    const panes = [{ command: "ls" }];
    const script = generateScript(panes);
    assert.ok(script.includes('write text "ls"'));
    assert.ok(!script.includes("split horizontally"));
  });

  it("splits horizontally for multiple panes", () => {
    const panes = [{ command: "a" }, { command: "b" }];
    const script = generateScript(panes);
    assert.ok(script.includes("split horizontally"));
  });

  it("generates three panes with two splits", () => {
    const panes = [{ command: "cmd1" }, { command: "cmd2" }, { command: "cmd3" }];
    const script = generateScript(panes);
    assert.ok(script.includes('write text "cmd1"'));
    assert.ok(script.includes('write text "cmd2"'));
    assert.ok(script.includes('write text "cmd3"'));
    const splitMatches = script.match(/split horizontally/g);
    assert.equal(splitMatches.length, 2);
  });

  it("prepends cd to working directory for each pane", () => {
    const panes = [{ command: "ls" }, { command: "pwd" }];
    const script = generateScript(panes, "/tmp/my-project");
    const cdMatches = script.match(/write text "cd \/tmp\/my-project"/g);
    assert.equal(cdMatches.length, 2);
  });

  it("does not cd when dir is undefined", () => {
    const panes = [{ command: "ls" }];
    const script = generateScript(panes);
    assert.ok(!script.includes("cd "));
  });

  it("cd comes before command", () => {
    const panes = [{ command: "npm start" }];
    const script = generateScript(panes, "/work");
    const cdIdx = script.indexOf('write text "cd /work"');
    const cmdIdx = script.indexOf('write text "npm start"');
    assert.ok(cdIdx < cmdIdx);
  });
});
