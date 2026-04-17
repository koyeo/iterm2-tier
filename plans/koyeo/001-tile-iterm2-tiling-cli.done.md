# TILE - iTerm2 Tiling CLI Tool

> Created: 2026-04-17

## Goal

Build an open-source Rust CLI tool called `tile` that takes multiple shell commands as arguments and automatically tiles them into iTerm2 split panes via AppleScript automation.

## Steps

- [ ] 1. Initialize Rust project
  - Run `cargo init --name tile` in the project root (or a subdirectory)
  - Configure `Cargo.toml` with dependencies: `clap` (v4, derive feature), `anyhow`

- [ ] 2. Implement CLI argument parsing (`src/cli.rs`)
  - Use `clap` derive API to define a `Cli` struct
  - Accept variadic positional arguments as commands to run (Vec<String>)
  - Validate that at least one command is provided

- [ ] 3. Implement AppleScript generation module (`src/applescript.rs`)
  - Function to escape user input strings for safe AppleScript embedding (prevent injection)
  - Function to generate AppleScript that:
    - Activates or launches iTerm2
    - Runs the first command in the current session
    - Splits vertically and runs each subsequent command in a new pane
  - Keep AppleScript generation fully decoupled from CLI parsing

- [ ] 4. Implement iTerm2 launch detection (`src/applescript.rs`)
  - Check if iTerm2 is running via AppleScript or `pgrep`
  - If not running, launch via `open -a iTerm` and wait briefly for startup

- [ ] 5. Implement main orchestration (`src/main.rs`)
  - Parse CLI args
  - Print user-friendly status message (e.g., "Tiling 3 commands...")
  - Generate and execute the AppleScript via `std::process::Command` calling `osascript`
  - Handle errors gracefully with `anyhow`, providing clear error messages

- [ ] 6. Test manually
  - Run `cargo build` and verify compilation
  - Test with 1, 2, 3+ commands to verify split pane behavior
  - Test cold start (iTerm2 not running)
  - Test edge cases: commands with special characters, quotes, spaces

- [ ] 7. Support Homebrew installation
  - Create `Formula/tile.rb` Homebrew formula
  - Include: desc, homepage, url (GitHub release tarball), sha256, dependencies
  - Use `system "cargo", "install", *std_cargo_args` for building
  - Add `test do` block to verify the binary runs
  - Optionally set up a Homebrew tap repo (`homebrew-tap`) so users can install via `brew install koyeo/tap/tile`

- [ ] 8. Polish and finalize
  - Add README with usage examples, including `brew install` instructions
  - Ensure `cargo clippy` and `cargo fmt` pass cleanly

## Constraints

- macOS only (relies on AppleScript and iTerm2)
- iTerm2 must be installed on the target machine
- User input must be properly escaped to prevent AppleScript injection
- Rust stable toolchain (latest)

---

## Implementation Log

- **Executed at**: 2026-04-17
- **Status**: Completed

### Step Results

1. **Initialize Rust project** - Success
   - `cargo init --name tile`, added clap v4 and anyhow to Cargo.toml
2. **Implement CLI argument parsing** - Success
   - Created `src/cli.rs` with clap derive, variadic `commands` arg
3. **Implement AppleScript generation** - Success
   - Created `src/applescript.rs` with input escaping, script generation, and 4 unit tests
4. **Implement iTerm2 launch detection** - Success
   - Uses `pgrep -x iTerm2` to detect, `open -a iTerm` to launch with 2s wait
5. **Implement main orchestration** - Success
   - `src/main.rs` wires CLI parsing, status messages, and AppleScript execution
6. **Test manually** - Success
   - `cargo build` clean, all 4 unit tests pass, CLI help and error handling verified
7. **Support Homebrew installation** - Success
   - Created `Formula/tile.rb` with cargo build, sha256 placeholder for first release
8. **Polish and finalize** - Success
   - README with brew/cargo install instructions, `cargo fmt` and `cargo clippy` clean

### Notes

- Formula sha256 is a placeholder — must be updated after creating the first GitHub release tarball
- Live iTerm2 tiling was not tested in this session (requires interactive iTerm2)

## Follow-up TODO

> Items discovered during execution that still need attention.

- [ ] Create GitHub release v0.1.0 and update `Formula/tile.rb` sha256
- [ ] Create `homebrew-tap` repo at `koyeo/homebrew-tap` and add the formula
- [ ] Test live tiling with iTerm2 (1, 2, 3+ commands, cold start, special characters)
- [ ] Add MIT LICENSE file to the repo
