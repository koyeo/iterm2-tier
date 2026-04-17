# CLI Options: Layout Type & Pane Naming

> Created: 2026-04-17

## Goal

增强 tier CLI，支持通过 option 传入命令（而非纯 positional args），支持选择布局类型，以及为每个 pane 指定名称（iTerm2 tab/session title）。

## Steps

- [ ] 1. 重新设计 CLI 参数结构 (`src/cli.rs`)
  - 使用 `-c` / `--cmd` option 传入命令，可重复使用：`tier -c "cmd1" -c "cmd2"`
  - 支持 `name:command` 格式为 pane 命名：`tier -c "server:npm run dev" -c "logs:tail -f app.log"`
  - 添加 `-l` / `--layout` option，支持布局类型：`grid`（默认）、`vertical`、`horizontal`
  - 保留 positional args 作为简写兼容：`tier "cmd1" "cmd2"` 仍可用

- [ ] 2. 新增命令解析模块 (`src/cmd.rs`)
  - 定义 `Pane` 结构体：`name: Option<String>`, `command: String`
  - 解析 `name:command` 格式，处理 `:` 分隔（注意命令中可能包含 `:`，只取第一个）
  - 合并 `-c` 和 positional args 的输入

- [ ] 3. 定义布局枚举 (`src/cli.rs`)
  - `Layout { Grid, Vertical, Horizontal }` 枚举，derive `clap::ValueEnum`
  - `Grid`：当前的自动网格布局（垂直+水平切分）
  - `Vertical`：所有 pane 左右排列（仅 split vertically）
  - `Horizontal`：所有 pane 上下排列（仅 split horizontally）

- [ ] 4. 更新 AppleScript 生成逻辑 (`src/applescript.rs`)
  - 接受 `&[Pane]` 和 `Layout` 参数
  - 根据 layout 类型选择切分方式
  - 当 pane 有 name 时，在 write text 前设置 session name：`set name to "xxx"`
  - 保持输入转义安全

- [ ] 5. 更新 main.rs 串联逻辑
  - 解析 CLI → 构建 `Vec<Pane>` → 传入 applescript 模块
  - 状态提示中显示 pane 名称（如有）

- [ ] 6. 更新测试
  - 测试 `name:command` 解析（含命令中带 `:` 的场景）
  - 测试三种 layout 的 AppleScript 生成
  - 测试 pane naming 的 AppleScript 输出

- [ ] 7. 更新 Makefile demo 和 README
  - Makefile 添加 `demo-named` 和 `demo-vertical` targets
  - README 更新用法示例

## Constraints

- `-c` 和 positional args 同时存在时，`-c` 优先，positional 追加到后面
- pane name 中的特殊字符也需要 AppleScript 转义
- 布局默认值为 `grid`
- 保持向后兼容：无 `-c` 时 positional args 行为不变

---

## Implementation Log

- **Executed at**: 2026-04-17
- **Status**: Completed

### Step Results

1. **Redesign CLI args structure** - Success
   - Added `-c`/`--cmd` (repeatable), `-l`/`--layout` (grid/vertical/horizontal), kept positional args
2. **Create Pane parsing module** - Success
   - `src/cmd.rs` with `Pane` struct, `name:command` parsing (first `:` only), `build_panes` merging
3. **Define Layout enum** - Success
   - `Layout { Grid, Vertical, Horizontal }` with `clap::ValueEnum` derive
4. **Update AppleScript generation** - Success
   - Refactored into `generate_grid_script` and `generate_linear_script`, added `set name to` for named panes
5. **Update main.rs orchestration** - Success
   - Wires CLI → `build_panes` → `tier_commands` with layout, shows pane names in status
6. **Update tests** - Success
   - 14 tests total: escape, grid compute, 3 layout types, pane naming, `name:command` parsing
7. **Update Makefile and README** - Success
   - Added `demo-named`, `demo-vertical`, `demo-horizontal` targets; README with full usage docs

### Notes

- Clippy warning for `manual_div_ceil` was fixed (`n.div_ceil(cols)`)
- All 14 tests pass, clippy and fmt clean

## Follow-up TODO

- [ ] Test live with iTerm2: named panes, all 3 layout types
- [ ] Verify `set name to` actually sets iTerm2 session title (may need `set name of current session`)
