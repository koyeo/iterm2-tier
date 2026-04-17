# 支持配置文件模式 (-f/--file)

> Created: 2026-04-17

## Goal

新增 `-f/--file` 选项，从 JSON 配置文件加载命令列表。与 `-c` 不冲突，两者可同时使用，合并后一起启动。

## 配置文件格式

```json
[
  "htop",
  {"name": "server", "exec": "npm run dev"},
  {"name": "test", "exec": "npm test", "waitPort": 3000}
]
```

文件内容是一个 JSON 数组，每个元素格式与 `-c` 参数相同（字符串或 JSON 对象）。

## 合并规则

`-f` 文件中的命令先加载，`-c` 的命令追加在后面。`-f` 和 `-c` 至少需要提供一个。

```bash
# 仅文件
tier -f tier.json

# 仅 -c
tier -c "htop"

# 两者合并：文件命令在前，-c 在后
tier -f tier.json -c "extra-cmd"
```

## Steps

- [x] 1. 更新 CLI 解析 (`src/cli.js`)
  - 新增 `-f, --file <path>` 可选参数
  - 移除 `-c` 的 requiredOption，改为普通 option（因为 `-f` 可以单独使用）
  - 校验：`-f` 和 `-c` 至少提供一个，否则报错
  - 更新 help 文本，添加 `-f` 说明和示例

- [x] 2. 新增文件加载逻辑 (`src/cmd.js`)
  - 新增 `loadCommandFile(filePath)` 函数：
    - 读取文件内容（`fs.readFileSync`）
    - `JSON.parse` 解析为数组
    - 校验：必须是数组，否则报错
    - 返回字符串数组（与 `-c` 参数格式相同）
  - 更新 `buildPanes` 或在入口文件中合并：先 `-f` 后 `-c`

- [x] 3. 更新入口文件 (`bin/tier.js`)
  - 如果有 `-f`，调用 `loadCommandFile` 加载文件命令
  - 将文件命令和 `-c` 命令合并
  - 合并后校验至少有一个命令

- [x] 4. 更新测试
  - 测试 `loadCommandFile`：正常 JSON 数组、非数组报错、文件不存在报错
  - 测试合并逻辑：仅 -f、仅 -c、两者合并

- [x] 5. 更新 Makefile、README
  - Makefile 新增 `demo-file` 目标（使用示例配置文件）
  - 创建 `examples/tier.json` 示例配置文件
  - README 添加配置文件说明

## Constraints

- 不引入额外依赖，使用 `fs.readFileSync` 读取文件
- 配置文件必须是有效的 JSON 数组
- `-f` 和 `-c` 至少提供一个
- 文件路径相对于 cwd 解析

---

## Implementation Log

- **Executed at**: 2026-04-17
- **Status**: Completed

### Step Results

1. **更新 CLI 解析** - Success
   - 新增 `-f/--file` 可选参数，`-c` 改为非必需，校验至少提供一个

2. **新增文件加载逻辑** - Success
   - `loadCommandFile` 读取 JSON 数组，字符串保持原样，对象 stringify 后返回

3. **更新入口文件** - Success
   - 先加载 `-f` 文件命令，再拼接 `-c` 命令

4. **更新测试** - Success
   - 33 个测试全部通过，新增 4 个 loadCommandFile 测试

5. **更新 Makefile、README、示例文件** - Success
   - 新增 `demo-file` 目标，创建 `examples/tier.json`，README 添加配置文件说明

### Notes

- `loadCommandFile` 将对象元素 JSON.stringify 后返回，复用 `parseCommand` 的解析逻辑

## Follow-up TODO

- None
