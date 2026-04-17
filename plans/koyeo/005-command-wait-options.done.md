# JSON 命令支持 sleep/wait-port/wait-file 参数

> Created: 2026-04-17

## Goal

在 `-c` 的 JSON 格式中新增 3 个可选参数，控制命令启动时机：
- `sleep`: 延迟 N 秒后再执行命令
- `waitPort`: 等待指定端口可用后再执行
- `waitFile`: 等待指定文件出现后再执行

这些等待逻辑直接在 iTerm2 pane 中执行（通过 shell 命令包装），不阻塞 Node.js 主进程。

## 新 JSON 格式

```json
{
  "name": "server",
  "exec": "npm run dev",
  "sleep": 5,
  "waitPort": 3000,
  "waitFile": "/tmp/ready.lock"
}
```

生成的实际命令（发送到 pane）：
- `sleep 5`: `sleep 5 && npm run dev`
- `waitPort 3000`: `while ! nc -z localhost 3000 2>/dev/null; do sleep 1; done && npm run dev`
- `waitFile /tmp/ready.lock`: `while [ ! -f /tmp/ready.lock ]; do sleep 1; done && npm run dev`
- 组合使用时按顺序: `sleep` → `waitPort` → `waitFile` → `exec`

## Steps

- [x] 1. 更新面板解析 (`src/cmd.js`)
  - `parseCommand()` 中解析新的 JSON 字段：`sleep`（数字）、`waitPort`（数字）、`waitFile`（字符串）
  - 新增 `wrapCommand(pane)` 函数，根据等待参数包装最终命令字符串：
    - `sleep N` → 前置 `sleep N && `
    - `waitPort PORT` → 前置 `while ! nc -z localhost PORT 2>/dev/null; do sleep 1; done && `
    - `waitFile PATH` → 前置 `while [ ! -f PATH ]; do sleep 1; done && `
    - 多个条件按 sleep → waitPort → waitFile 顺序串联
  - Pane 对象新增 `sleep`、`waitPort`、`waitFile` 字段（可选）

- [x] 2. 更新 AppleScript 生成 (`src/applescript.js`)
  - `emitPaneActions()` 中调用 `wrapCommand()` 获取最终命令，而非直接使用 `pane.command`

- [x] 3. 更新测试
  - 测试 `parseCommand` 解析新 JSON 字段
  - 测试 `wrapCommand` 各种组合：单独 sleep、单独 waitPort、单独 waitFile、组合使用
  - 测试生成的 AppleScript 包含正确的包装命令

- [x] 4. 更新 CLI help 和 README
  - help 文本中增加新字段说明和示例
  - README 中添加等待参数的使用说明

## Constraints

- 等待逻辑在 pane 内通过 shell 命令执行，不引入外部依赖
- `waitPort` 使用 `nc -z`（macOS 自带）检测端口
- `waitFile` 使用 `[ -f path ]` 检测文件
- 多个等待条件可组合使用，按 sleep → waitPort → waitFile 顺序执行

---

## Implementation Log

- **Executed at**: 2026-04-17
- **Status**: Completed

### Step Results

1. **更新面板解析** - Success
   - `parseCommand` 新增 sleep/waitPort/waitFile 字段解析
   - 新增 `wrapCommand` 函数，按顺序串联 shell 等待命令

2. **更新 AppleScript 生成** - Success
   - `emitPaneActions` 调用 `wrapCommand` 获取最终命令

3. **更新测试** - Success
   - 29 个测试全部通过，覆盖新字段解析和各种 wrapCommand 组合

4. **更新 CLI help 和 README** - Success
   - help 文本包含完整字段说明和 6 个示例
   - README 添加等待参数文档

### Notes

- 等待逻辑完全在 pane 内执行，不阻塞主进程
- `waitPort` 依赖 macOS 自带的 `nc -z`
- `waitFile` 中的路径未做 shell 转义，包含空格的路径需用户自行引用

## Follow-up TODO

- None
