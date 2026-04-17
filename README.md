# tier

Tile multiple commands into iTerm2 split panes. Opens a new tab and runs each command in its own pane, arranged top to bottom.

## Install

### npm

```bash
npm install -g iterm2-tier
```

### From source

```bash
git clone https://github.com/koyeo/iterm2-tier.git
cd iterm2-tier
npm install
npm install -g .
```

## Usage

### Basic (string format)

```bash
tier -c "npm run dev" -c "npm run test"
```

### JSON format

```bash
tier -c '{"exec":"npm run dev"}' -c '{"exec":"npm test","waitPort":3000}'
```

JSON fields:
- `exec` (required): command to execute
- `sleep` (optional): delay N seconds before executing
- `waitPort` (optional): wait for a port to become available
- `waitFile` (optional): wait for a file to appear before executing

Multiple wait conditions can be combined. Execution order: sleep → waitPort → waitFile → exec

### Wait conditions

```bash
# Server starts first, tests wait for port 3000
tier -c '{"exec":"npm run dev"}' -c '{"exec":"npm test","waitPort":3000}'

# Delay 5 seconds
tier -c '{"exec":"npm run dev"}' -c '{"exec":"npm test","sleep":5}'

# Wait for build output
tier -c '{"exec":"npm run build"}' -c '{"exec":"npm start","waitFile":"dist/index.js"}'
```

### Config file (`-f`)

Load commands from a JSON file:

```json
{
  "dir": ".",
  "commands": [
    "htop",
    {"exec": "npm run dev"},
    {"exec": "npm test", "waitPort": 3000}
  ]
}
```

- `dir` (optional): working directory, relative paths resolve from the config file's location
- `commands`: array of commands (string or JSON object)

```bash
# Load from file
tier -f tier.json

# File + extra commands (file commands first, -c appended)
tier -f tier.json -c "htop"
```

### Working directory (`-d`)

```bash
tier -d /path/to/project -c "npm run dev" -c "npm test"
```

Priority: CLI `-d` > config file `dir` > current directory.

## Requirements

- macOS
- [iTerm2](https://iterm2.com/)
- Node.js >= 18

## License

MIT
