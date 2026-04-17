# Rewrite iterm2-tier from Rust to Node.js

> Created: 2026-04-17

## Goal

将 iterm2-tier (tier) 项目从 Rust 完全重写为 Node.js，移除所有 Rust 代码和相关配置，功能保持一致。最终产物是一个可通过 `npx` 或全局安装使用的 Node.js CLI 工具。

## Steps

- [x] 1. 初始化 Node.js 项目
  - 运行 `npm init` 创建 `package.json`，包名 `tier`，版本 `0.1.0`，license MIT
  - 配置 `bin` 字段指向入口文件 `bin/tier.js`
  - 设置 `type: "module"` 使用 ESM 模块
  - 安装依赖：`commander`（CLI 解析）

- [x] 2. 实现 CLI 解析模块 (`src/cli.js`)
  - 使用 Commander.js 定义命令行参数：
    - `-c, --cmd <cmd...>`: 可重复的命名面板参数，格式 `name:command`
    - `-l, --layout <layout>`: 布局类型，支持 `grid`（默认）、`vertical`、`horizontal`
    - 位置参数 `[commands...]`: 未命名的命令
  - 支持 `--version` 和 `--help`

- [x] 3. 实现面板解析模块 (`src/cmd.js`)
  - `parseNamed(str)`: 解析 `name:command` 格式，使用 `indexOf(':')` 分割（首个冒号）
  - `buildPanes(namedCmds, positionalCmds)`: 合并 `-c` 命名命令和位置参数
  - 返回 `[{ name: string|null, command: string }]` 数组
  - 编写对应的单元测试

- [x] 4. 实现 AppleScript 生成模块 (`src/applescript.js`)
  - `escapeForApplescript(str)`: 转义反斜杠和双引号
  - `isItermRunning()`: 通过 `pgrep -x iTerm2` 检测 iTerm2 是否运行
  - `launchIterm()`: 使用 `open -a iTerm` 启动 iTerm2，等待 2 秒
  - `computeGrid(n)`: 计算网格布局（列数 = ceil(√n)，行数 = ceil(n/cols)）
  - `generateLinearScript(panes, splitDir)`: 生成垂直/水平线性布局的 AppleScript
  - `generateGridScript(panes)`: 生成网格布局的 AppleScript
  - `generateScript(panes, layout)`: 根据布局类型分发到对应生成器
  - `tierCommands(panes, layout)`: 主函数，检测/启动 iTerm2，生成并执行 AppleScript

- [x] 5. 实现入口文件 (`bin/tier.js`)
  - 添加 shebang `#!/usr/bin/env node`
  - 解析 CLI 参数
  - 构建面板列表
  - 验证至少有一个命令
  - 输出日志到 stderr（保留中文提示：正在铺设 / 已成功铺设）
  - 调用 `tierCommands()` 执行

- [x] 6. 编写测试
  - 使用 Node.js 内置 `node:test` 模块
  - 测试面板解析：有名/无名、冒号在命令中、空名处理、合并逻辑
  - 测试 AppleScript 转义
  - 测试网格计算
  - 测试脚本生成（验证生成的 AppleScript 文本）
  - 在 `package.json` 中配置 `test` 脚本

- [x] 7. 更新 Makefile
  - `build`: 无需编译（或 lint 检查）
  - `install`: `npm install -g .`
  - `uninstall`: `npm uninstall -g tier`
  - `test`: `npm test`
  - `lint`: `npx eslint src/`（可选）
  - 保留 `demo*` 目标

- [x] 8. 更新 Homebrew Formula (`Formula/tier.rb`)
  - 改为 Node.js 分发方式
  - 添加 `depends_on "node"` 依赖
  - 更新安装步骤为 `npm install` + link

- [x] 9. 移除 Rust 相关文件
  - 删除 `Cargo.toml`、`Cargo.lock`
  - 删除 `src/main.rs`、`src/cli.rs`、`src/cmd.rs`、`src/applescript.rs`
  - 更新 `.gitignore`：移除 `/target`，添加 `node_modules/`

- [x] 10. 更新 README.md
  - 更新安装说明（npm / Homebrew）
  - 保持使用示例不变
  - 更新技术栈描述

## Constraints

- 仅支持 macOS（依赖 iTerm2 和 osascript）
- CLI 接口（参数、用法）必须与 Rust 版本完全一致，确保用户无感迁移
- Node.js >= 18（使用 ESM 和内置 test runner）
- 尽量减少外部依赖，仅使用 `commander` 作为 CLI 框架
- AppleScript 生成逻辑需完全对齐 Rust 版本，包括网格计算算法和字符串转义

---

## Implementation Log

- **Executed at**: 2026-04-17
- **Status**: Completed

### Step Results

1. **初始化 Node.js 项目** - Success
   - Created `package.json` with ESM, bin field, commander dependency
   - `npm install` completed successfully

2. **实现 CLI 解析模块** - Success
   - Created `src/cli.js` using Commander.js with -c, -l, positional args

3. **实现面板解析模块** - Success
   - Created `src/cmd.js` with `parseNamed` and `buildPanes` functions

4. **实现 AppleScript 生成模块** - Success
   - Created `src/applescript.js` with all generation logic ported from Rust
   - Grid computation, linear/grid layout scripts, iTerm2 detection/launch

5. **实现入口文件** - Success
   - Created `bin/tier.js` with shebang, Chinese log messages, error handling

6. **编写测试** - Success
   - 15 tests across `test/cmd.test.js` and `test/applescript.test.js`
   - All tests pass using `node:test`

7. **更新 Makefile** - Success
   - Updated all targets from cargo to npm/node commands

8. **更新 Homebrew Formula** - Success
   - Changed to `depends_on "node"`, npm-based install

9. **移除 Rust 相关文件** - Success
   - Deleted Cargo.toml, Cargo.lock, and all .rs source files
   - Updated .gitignore to node_modules/

10. **更新 README.md** - Success
    - Added npm install instructions, updated from-source section, added Node.js requirement

### Notes

- CLI interface is fully compatible with the Rust version (same flags, same behavior)
- All 15 unit tests pass covering cmd parsing, AppleScript escaping, grid computation, and script generation

## Follow-up TODO

- [ ] Update Homebrew formula SHA256 when publishing a release tag
- [ ] Test actual iTerm2 pane tiling on macOS (unit tests only verify script generation)
- [ ] Consider publishing to npm registry (`npm publish`)
- [ ] Add `.npmignore` to exclude test/plans directories from npm package
