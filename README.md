# my_pi

Pi Coding Agent dotfiles — one script away from a fully configured environment.

## What it sets up

| Step | What |
|------|------|
| Provider | Choose API provider (opencode-go / anthropic / openai / litellm) + key |
| Node.js | Install if missing |
| Pi | Install/update `@mariozechner/pi-coding-agent` |
| Auth | Write `~/.pi/agent/auth.json` |
| Settings | Write `~/.pi/agent/settings.json` |
| Packages | Install `context-mode`, `rpiv-btw`, `rpiv-pi` |
| MCP | Configure `context7` + `memory` servers |
| Extensions | Copy extensions to `~/.pi/agent/extensions/` |
| AGENTS.md | Copy agent behavior rules to `~/.pi/agent/` |

## Extensions

| File | Command | Description |
|------|---------|-------------|
| `mcp-list.ts` | `/mcp` | List configured MCP servers (global + project) |
| `statusline.ts` | `/statusline` | ccstatusline-style footer — model, context bar, tokens, cost, git branch. Auto-enables on session start. |

## Usage

```bash
git clone https://github.com/Alien4you/my_pi.git
cd my_pi
./setup.sh
```

Re-run anytime — it's idempotent.