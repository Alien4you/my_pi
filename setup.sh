#!/usr/bin/env bash
# Pi Coding Agent — setup
# Idempotent: safe to re-run
set -euo pipefail

BOLD="\033[1m"; GREEN="\033[0;32m"; CYAN="\033[0;36m"
YELLOW="\033[0;33m"; RESET="\033[0m"

ok()     { echo -e "${GREEN}✓${RESET}  $*"; }
warn()   { echo -e "${YELLOW}⚠${RESET}  $*"; }
header() { echo -e "\n${BOLD}${CYAN}━━  $*  ━━${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PI_AGENT="${HOME}/.pi/agent"
mkdir -p "$PI_AGENT"

# ── 1. Node.js ────────────────────────────────────────────────────────────────
header "Node.js"
if command -v node &>/dev/null; then
  ok "Node.js $(node --version)"
else
  warn "Node.js not found — install it first (brew install node / nvm)"
  exit 1
fi

# ── 2. Pi ─────────────────────────────────────────────────────────────────────
header "Pi"
if ! command -v pi &>/dev/null; then
  npm install -g @mariozechner/pi-coding-agent
else
  npm update -g @mariozechner/pi-coding-agent
fi
ok "Pi $(pi --version 2>/dev/null | head -1 || echo ready)"

# ── 3. Settings ───────────────────────────────────────────────────────────────
header "Settings"
cat > "${PI_AGENT}/settings.json" <<'EOF'
{
  "defaultThinkingLevel": "low",
  "hideThinkingBlock": true,
  "theme": "dark",
  "quietStartup": true,
  "collapseChangelog": true,
  "enableInstallTelemetry": false,
  "warnings": { "anthropicExtraUsage": false },
  "compaction": { "enabled": true },
  "terminal": { "showImages": false }
}
EOF
ok "Settings written."

# ── 4. Packages ───────────────────────────────────────────────────────────────
header "Packages"
for pkg in \
  "npm:context-mode" \
  "npm:pi-btw" \
  "npm:pi-ask-user" \
  "npm:pi-mcp-adapter" \
  "git:github.com/tintinweb/pi-manage-todo-list@b75c449aa85ce328e9a8b632f62bf642aed40359"; do
  pi install "$pkg" 2>/dev/null && ok "$pkg" || warn "$pkg — skipped"
done

# ── 5. MCP ────────────────────────────────────────────────────────────────────
header "MCP"
PI_MCP="${PI_AGENT}/mcp.json"
if [[ ! -f "$PI_MCP" ]]; then
  cat > "$PI_MCP" <<'EOF'
{
  "mcpServers": {}
}
EOF
  ok "MCP written."
else
  warn "MCP exists — skipping."
fi

# ── 6. Extensions ─────────────────────────────────────────────────────────────
header "Extensions"
mkdir -p "${PI_AGENT}/extensions"

for ext in statusline memory context zz-read-only-mode web-search; do
  if [[ -f "${SCRIPT_DIR}/extensions/${ext}.ts" ]]; then
    cp "${SCRIPT_DIR}/extensions/${ext}.ts" "${PI_AGENT}/extensions/${ext}.ts"
    ok "${ext}.ts"
  else
    warn "${ext}.ts — not found"
  fi
done

for pkg in bash-guard; do
  if [[ -d "${SCRIPT_DIR}/extensions/${pkg}" ]]; then
    cp -r "${SCRIPT_DIR}/extensions/${pkg}" "${PI_AGENT}/extensions/${pkg}"
    (cd "${PI_AGENT}/extensions/${pkg}" && npm install --silent 2>/dev/null) && ok "${pkg}" || warn "${pkg} — npm install failed"
  else
    warn "${pkg}/ — not found"
  fi
done

if [[ -d "${SCRIPT_DIR}/extensions/subagents" ]]; then
  cp -r "${SCRIPT_DIR}/extensions/subagents" "${PI_AGENT}/extensions/subagents"
  ok "subagents"
else
  warn "subagents/ — not found"
fi

# ── 7. Skills ─────────────────────────────────────────────────────────────────
header "Skills"
mkdir -p "${PI_AGENT}/skills"
for skill_dir in "${SCRIPT_DIR}"/skills/*/; do
  skill=$(basename "$skill_dir")
  if [[ -d "$skill_dir" ]]; then
    cp -r "$skill_dir" "${PI_AGENT}/skills/${skill}"
    ok "${skill}"
  fi
done

# ── 8. Keybindings ────────────────────────────────────────────────────────────
header "Keybindings"
if [[ -f "${SCRIPT_DIR}/keybindings.json" ]]; then
  cp "${SCRIPT_DIR}/keybindings.json" "${PI_AGENT}/keybindings.json"
  ok "keybindings.json"
else
  warn "keybindings.json — not found"
fi

# ── 9. AGENTS.md ──────────────────────────────────────────────────────────────
header "AGENTS.md"
cp "${SCRIPT_DIR}/AGENTS.md" "${PI_AGENT}/AGENTS.md"
ok "AGENTS.md"

# ── Done ──────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}━━  Done  ━━${RESET}"
echo -e "  Configure provider: pi (first run prompts for API key)"
echo -e "  /mcp                   —  list MCP servers"
echo -e "  /statusline            —  toggle statusline footer"
echo ""
