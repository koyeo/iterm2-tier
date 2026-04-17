# tier

将多个命令铺设到 iTerm2 分屏中。在新 Tab 中以分屏方式同时运行多个命令，支持为面板命名。

## Install

### npm

```bash
npm install -g tier
```

### From source

```bash
git clone https://github.com/koyeo/iterm2-tier.git
cd iterm2-tier
npm install
npm install -g .
```

## Usage

### Basic (字符串格式)

```bash
tier -c "npm run dev" -c "npm run test"
```

### Named panes (JSON 格式)

```bash
tier -c '{"name":"server","exec":"npm run dev"}' -c '{"name":"logs","exec":"tail -f app.log"}'
```

JSON 格式字段：
- `exec` (必需): 要执行的命令
- `name` (可选): 面板名称，显示在 iTerm2 的 session 标题中
- `sleep` (可选): 延迟 N 秒后再执行命令
- `waitPort` (可选): 等待指定端口可用后再执行
- `waitFile` (可选): 等待指定文件出现后再执行

多个等待条件可组合使用，执行顺序: sleep → waitPort → waitFile → exec

### 等待参数示例

```bash
# server 启动后再跑测试（等待端口 3000）
tier -c '{"name":"server","exec":"npm run dev"}' \
     -c '{"name":"test","exec":"npm test","waitPort":3000}'

# 延迟 5 秒启动
tier -c '{"exec":"npm run dev"}' -c '{"exec":"npm test","sleep":5}'

# 等待构建产物出现
tier -c '{"exec":"npm run build"}' -c '{"exec":"npm start","waitFile":"dist/index.js"}'
```

### 配置文件模式 (`-f`)

从 JSON 文件加载命令列表，文件格式为包含 `commands` 数组的 JSON 对象：

```json
{
  "commands": [
    "htop",
    {"name": "server", "exec": "npm run dev"},
    {"name": "test", "exec": "npm test", "waitPort": 3000}
  ]
}
```

```bash
# 从配置文件启动
tier -f tier.json

# 配置文件 + 额外命令（文件命令在前，-c 在后）
tier -f tier.json -c "htop"
```

### 混合使用

```bash
tier -c "htop" -c '{"name":"server","exec":"npm start"}'
```

### 同名面板检测

如果面板设置了 name，打开前会自动检测是否已存在同名面板。发现同名面板时会提示确认，避免重复打开。

## Requirements

- macOS
- [iTerm2](https://iterm2.com/)
- Node.js >= 18

## License

MIT
