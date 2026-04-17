# CLI 重新设计：新 Tab + 命名面板 + 重复检测

> Created: 2026-04-17

## Goal

重新设计 tier 的 CLI 接口：
- 移除 grid 布局和位置参数，只保留 vertical/horizontal 布局
- `-c/--command` 支持字符串（纯命令）和 JSON（`{name, exec}`）两种格式
- 所有 pane 在新 tab 中打开
- 打开前检测是否存在同名 panel，存在则交互式确认
- Help 信息详细，方便 AI 参考

## 新 CLI 设计

```
tier - 将多个命令铺设到 iTerm2 分屏中

Usage:
  tier [options] -c <command> [-c <command> ...]

Options:
  -c, --command <command>   要执行的命令（可重复）
                            字符串格式: -c "npm run dev"
                            JSON 格式:  -c '{"name":"server","exec":"npm run dev"}'
                            JSON 格式中 name 为面板名称，exec 为执行命令
  -l, --layout <layout>    布局方式: horizontal (默认), vertical
                            horizontal: 上下堆叠排列
                            vertical: 左右并排排列
  -V, --version             显示版本号
  -h, --help                显示帮助信息

Examples:
  # 启动两个命令（水平排列）
  tier -c "npm run dev" -c "npm run test"

  # 命名面板 + 垂直排列
  tier -l vertical -c '{"name":"server","exec":"npm run dev"}' -c '{"name":"logs","exec":"tail -f app.log"}'

  # 混合使用
  tier -c "htop" -c '{"name":"server","exec":"npm start"}'
```

## Steps

- [x] 1. 重写 CLI 解析 (`src/cli.js`)
  - 移除 positional arguments 支持
  - 移除 grid 布局选项
  - `-c/--command` 改为必需参数，可重复
  - `-l/--layout` 只接受 `horizontal`（默认）和 `vertical`
  - 添加详细的 help 文本（包含 Examples 部分），方便 AI 参考

- [x] 2. 重写面板解析 (`src/cmd.js`)
  - 移除 `parseNamed()`（旧的 `name:command` 格式）
  - 新增 `parseCommand(input)` 函数：
    - 尝试 `JSON.parse(input)`，成功则提取 `{name, exec}`
    - 解析失败则视为纯字符串命令，`name = null`
    - JSON 格式校验：必须有 `exec` 字段，`name` 可选
  - `buildPanes(cmds)` 只接受 `-c` 参数数组（移除 positional 参数）

- [x] 3. 修改 AppleScript 生成 (`src/applescript.js`)
  - 移除 `computeGrid()` 和 `generateGridScript()`
  - 修改 `generateLinearScript()` 和 `generateGridScript()`，改为在新 tab 中创建 pane：
    ```applescript
    tell application "iTerm2"
        activate
        tell current window
            set newTab to (create tab with default profile)
            tell current session of newTab
                -- 第一个 pane
            end tell
        end tell
    end tell
    ```
  - `generateScript()` 只分发 vertical/horizontal

- [x] 4. 新增同名面板检测 (`src/applescript.js`)
  - 新增 `findNamedSessions(names)` 函数：
    - 生成 AppleScript 遍历所有 window > tab > session，检查 session name
    - 返回已存在的 name 列表
  - 在 `tierCommands()` 中，执行前调用检测
  - 如果发现重名，向 stderr 输出提示并等待 stdin 确认（y/n）

- [x] 5. 更新入口文件 (`bin/tier.js`)
  - 适配新的 CLI 接口（移除 positional args）
  - 校验至少有一个 `-c` 参数
  - 日志输出适配（显示命名面板的 name）

- [x] 6. 更新测试
  - 移除 grid 相关测试
  - 移除旧的 `parseNamed` 测试
  - 新增 `parseCommand` 测试：字符串输入、JSON 输入、JSON 校验失败
  - 新增新 tab AppleScript 生成测试
  - 测试 `findNamedSessions` 生成的 AppleScript 脚本

- [x] 7. 更新 Makefile demo 命令
  - 移除 `demo`（grid 演示）
  - 更新 `demo-named` 使用 JSON 格式
  - 更新 `demo-vertical` 和 `demo-horizontal`

- [x] 8. 更新 README.md
  - 更新 Usage 示例为新格式
  - 移除 grid 相关说明
  - 添加 JSON 格式说明

## Constraints

- CLI 接口是破坏性变更，旧的 `name:command` 格式和位置参数不再支持
- 交互式确认使用 Node.js 原生 readline，不引入额外依赖
- Help 文本需要足够详细，包含示例，方便 AI 工具解析和使用

---

## Implementation Log

- **Executed at**: 2026-04-17
- **Status**: Completed

### Step Results

1. **重写 CLI 解析** - Success
   - 使用 Commander.js，-c/--command 必需可重复，-l 只支持 horizontal/vertical，详细 help 含示例

2. **重写面板解析** - Success
   - `parseCommand` 支持 JSON（`{name,exec}`）和纯字符串，`buildPanes` 只接受 `-c` 数组

3. **修改 AppleScript 生成** - Success
   - 移除 grid 相关代码，所有 pane 在新 tab 中创建

4. **新增同名面板检测** - Success
   - `findNamedSessions` 遍历 iTerm2 所有 session 检测同名，`confirm` 使用 readline 交互确认

5. **更新入口文件** - Success
   - 适配 async tierCommands，移除 positional args

6. **更新测试** - Success
   - 18 个测试全部通过：parseCommand、generateScript（新 tab）、generateFindSessionsScript

7. **更新 Makefile demo 命令** - Success
   - 移除 grid demo，更新为新 -c 格式

8. **更新 README.md** - Success
   - 新格式用法、JSON 说明、同名检测说明

### Notes

- `tierCommands` 改为 async 函数（因 readline confirm 是异步的）
- 入口文件使用 top-level await

## Follow-up TODO

- [ ] 在 iTerm2 中手动验证新 tab 创建和分屏效果
- [ ] 验证同名面板检测交互式确认流程
- [ ] 考虑 iTerm2 未安装时的错误提示优化
