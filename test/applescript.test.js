import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  escapeForApplescript,
  generateScript,
  generateFindSessionsScript,
} from "../src/applescript.js";

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
    const panes = [{ name: null, command: "ls" }];
    const script = generateScript(panes);
    assert.ok(script.includes("create tab with default profile"));
    assert.ok(script.includes('write text "ls"'));
    assert.ok(!script.includes("split horizontally"));
  });

  it("splits horizontally for multiple panes", () => {
    const panes = [
      { name: null, command: "a" },
      { name: null, command: "b" },
    ];
    const script = generateScript(panes);
    assert.ok(script.includes("create tab with default profile"));
    assert.ok(script.includes("split horizontally"));
  });

  it("includes pane names", () => {
    const panes = [
      { name: "server", command: "npm start" },
      { name: "logs", command: "tail -f app.log" },
    ];
    const script = generateScript(panes);
    assert.ok(script.includes('set name to "server"'));
    assert.ok(script.includes('set name to "logs"'));
    assert.ok(script.includes('write text "npm start"'));
  });

  it("omits name when null", () => {
    const panes = [
      { name: "web", command: "npm start" },
      { name: null, command: "htop" },
    ];
    const script = generateScript(panes);
    assert.ok(script.includes('set name to "web"'));
    const nameMatches = script.match(/set name to/g);
    assert.equal(nameMatches.length, 1);
  });

  it("generates three panes with two splits", () => {
    const panes = [
      { name: null, command: "cmd1" },
      { name: null, command: "cmd2" },
      { name: null, command: "cmd3" },
    ];
    const script = generateScript(panes);
    assert.ok(script.includes('write text "cmd1"'));
    assert.ok(script.includes('write text "cmd2"'));
    assert.ok(script.includes('write text "cmd3"'));
    const splitMatches = script.match(/split horizontally/g);
    assert.equal(splitMatches.length, 2);
  });
});

describe("generateFindSessionsScript", () => {
  it("generates script to search for named sessions", () => {
    const script = generateFindSessionsScript(["server", "logs"]);
    assert.ok(script.includes('"server"'));
    assert.ok(script.includes('"logs"'));
    assert.ok(script.includes("repeat with w in windows"));
    assert.ok(script.includes("name of s"));
  });

  it("escapes special characters in names", () => {
    const script = generateFindSessionsScript(['test"name']);
    assert.ok(script.includes('test\\"name'));
  });
});
