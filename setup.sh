#!/usr/bin/env bash
# Pi Coding Agent — setup
# Idempotent: safe to re-run
set -euo pipefail

BOLD="\033[1m"; GREEN="\033[0;32m"; CYAN="\033[0;36m"
YELLOW="\033[0;33m"; RESET="\033[0m"

ok()     { echo -e "${GREEN}✓${RESET}  $*"; }
warn()   { echo -e "${YELLOW}⚠${RESET}  $*"; }
header() { echo -e "\n${BOLD}${CYAN}━━  $*  ━━${RESET}"; }
die()    { echo -e "\n\033[0;31m✗  $*\033[0m" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE="${HOME}/.zshrc"
[[ "$(uname -s)" == "Linux" && ! -f "$PROFILE" ]] && PROFILE="${HOME}/.bashrc"

PI_AGENT="${HOME}/.pi/agent"
mkdir -p "$PI_AGENT"

# ── 1. Provider ───────────────────────────────────────────────────────────────
header "Provider"
echo "  1) opencode-go"
echo "  2) anthropic"
echo "  3) openai"
echo "  4) litellm"
read -r -p "  Choice [1-4]: " PROVIDER_CHOICE

case "$PROVIDER_CHOICE" in
  1)
    PROVIDER="opencode-go"
    DEFAULT_MODEL="opencode-go/claude-sonnet-4-5"
    read -r -s -p "  API key: " API_KEY; echo
    PROVIDER_CONFIG="{\"type\":\"api_key\",\"key\":\"$API_KEY\"}"
    grep -qF "$API_KEY" "$PROFILE" 2>/dev/null || echo "export OPENCODE_GO_API_KEY=\"$API_KEY\"" >> "$PROFILE"
    ;;
  2)
    PROVIDER="anthropic"
    DEFAULT_MODEL="anthropic/claude-sonnet-4-5"
    read -r -s -p "  API key: " API_KEY; echo
    PROVIDER_CONFIG="{\"type\":\"api_key\",\"key\":\"$API_KEY\"}"
    grep -qF "$API_KEY" "$PROFILE" 2>/dev/null || echo "export ANTHROPIC_API_KEY=\"$API_KEY\"" >> "$PROFILE"
    ;;
  3)
    PROVIDER="openai"
    DEFAULT_MODEL="openai/gpt-4o"
    read -r -s -p "  API key: " API_KEY; echo
    read -r -p "  Base URL (blank = default): " BASE_URL
    if [[ -n "$BASE_URL" ]]; then
      PROVIDER_CONFIG="{\"type\":\"api_key\",\"key\":\"$API_KEY\",\"baseUrl\":\"$BASE_URL\"}"
    else
      PROVIDER_CONFIG="{\"type\":\"api_key\",\"key\":\"$API_KEY\"}"
    fi
    grep -qF "$API_KEY" "$PROFILE" 2>/dev/null || echo "export OPENAI_API_KEY=\"$API_KEY\"" >> "$PROFILE"
    ;;
  4)
    PROVIDER="litellm"
    read -r -p "  Base URL: " BASE_URL
    read -r -s -p "  API key (blank if none): " API_KEY; echo
    read -r -p "  Default model (e.g. litellm/claude-sonnet-4-5): " DEFAULT_MODEL
    PROVIDER_CONFIG="{\"type\":\"api_key\",\"key\":\"${API_KEY:-none}\",\"baseUrl\":\"$BASE_URL\"}"
    ;;
  *) die "Invalid choice." ;;
esac
ok "Provider: $PROVIDER"

# ── 2. Node.js ────────────────────────────────────────────────────────────────
header "Node.js"
if command -v node &>/dev/null; then
  ok "Node.js $(node --version)"
elif [[ "$(uname -s)" == "Darwin" ]]; then
  brew install node
else
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# ── 3. Pi ─────────────────────────────────────────────────────────────────────
header "Pi"
if ! command -v pi &>/dev/null; then
  npm install -g @mariozechner/pi-coding-agent
else
  npm update -g @mariozechner/pi-coding-agent
fi
ok "Pi $(pi --version 2>/dev/null | head -1 || echo ready)"

# ── 4. Auth ───────────────────────────────────────────────────────────────────
header "Auth"
node -e "
  const fs = require('fs'), p = '${PI_AGENT}/auth.json';
  let d = {};
  try { d = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  d['${PROVIDER}'] = ${PROVIDER_CONFIG};
  fs.writeFileSync(p, JSON.stringify(d, null, 2), { mode: 0o600 });
"
ok "Auth written ($PI_AGENT/auth.json)"

# ── 5. Settings ───────────────────────────────────────────────────────────────
header "Settings"
cat > "${PI_AGENT}/settings.json" <<EOF
{
  "defaultProvider": "$PROVIDER",
  "defaultModel": "$DEFAULT_MODEL",
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

# ── 6. Packages ───────────────────────────────────────────────────────────────
header "Packages"
for pkg in context-mode @juicesharp/rpiv-btw @juicesharp/rpiv-pi; do
  pi install "npm:$pkg" 2>/dev/null && ok "$pkg" || warn "$pkg — skipped"
done
warn "Run inside pi: /rpiv-setup  (silences sibling-deps warning)"

# ── 7. MCP ────────────────────────────────────────────────────────────────────
header "MCP"
PI_MCP="${PI_AGENT}/mcp.json"
if [[ ! -f "$PI_MCP" ]]; then
  cat > "$PI_MCP" <<'EOF'
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
EOF
  ok "MCP written."
else
  warn "MCP exists — skipping."
fi

# ── 8. Extensions ─────────────────────────────────────────────────────────────
header "Extensions"
mkdir -p "${PI_AGENT}/extensions"

# Single-file extensions
for ext in mcp-list statusline memory context zz-read-only-mode web-search; do
  if [[ -f "${SCRIPT_DIR}/extensions/${ext}.ts" ]]; then
    cp "${SCRIPT_DIR}/extensions/${ext}.ts" "${PI_AGENT}/extensions/${ext}.ts"
    ok "${ext}.ts"
  else
    warn "${ext}.ts — not found"
  fi
done

# npm package extensions (copy dir + npm install)
for pkg in bash-guard; do
  if [[ -d "${SCRIPT_DIR}/extensions/${pkg}" ]]; then
    cp -r "${SCRIPT_DIR}/extensions/${pkg}" "${PI_AGENT}/extensions/${pkg}"
    (cd "${PI_AGENT}/extensions/${pkg}" && npm install --silent 2>/dev/null) && ok "${pkg}" || warn "${pkg} — npm install failed"
  else
    warn "${pkg}/ — not found"
  fi
done

# Subagents extension (directory, no package.json)
if [[ -d "${SCRIPT_DIR}/extensions/subagents" ]]; then
  cp -r "${SCRIPT_DIR}/extensions/subagents" "${PI_AGENT}/extensions/subagents"
  ok "subagents"
else
  warn "subagents/ — not found"
fi

# ── Skills ────────────────────────────────────────────────────────────────────
header "Skills"
mkdir -p "${PI_AGENT}/skills"
for skill_dir in "${SCRIPT_DIR}"/skills/*/; do
  skill=$(basename "$skill_dir")
  # caveman-* skills use global ~/.agents/skills/ — skip to avoid collision
  [[ "$skill" == caveman-* ]] && continue
  if [[ -d "$skill_dir" ]]; then
    cp -r "$skill_dir" "${PI_AGENT}/skills/${skill}"
    ok "${skill}"
  fi
done

# ── Themes ────────────────────────────────────────────────────────────────────
header "Themes"
mkdir -p "${PI_AGENT}/themes"
if [[ -f "${SCRIPT_DIR}/themes/one-dark-pro.json" ]]; then
  cp "${SCRIPT_DIR}/themes/one-dark-pro.json" "${PI_AGENT}/themes/one-dark-pro.json"
  ok "one-dark-pro"
else
  warn "one-dark-pro.json — not found"
fi

# ── 10. Keybindings ───────────────────────────────────────────────────────────
header "Keybindings"
if [[ -f "${SCRIPT_DIR}/keybindings.json" ]]; then
  cp "${SCRIPT_DIR}/keybindings.json" "${PI_AGENT}/keybindings.json"
  ok "keybindings.json"
else
  warn "keybindings.json — not found"
fi

# ── 11. AGENTS.md ───────────────────────────────────────────────────────────────
header "AGENTS.md"
echo "  Model architecture?"
echo "  1) Dense  (Claude, Anthropic, Llama)"
echo "  2) MoE    (DeepSeek, Mixtral, Gemini, Grok)"
echo "  3) Hybrid (both)"
read -r -p "  Choice [1-3]: " ARCH_CHOICE

cp "${SCRIPT_DIR}/AGENTS.md" "${PI_AGENT}/AGENTS.md"

if [[ "$ARCH_CHOICE" == "2" || "$ARCH_CHOICE" == "3" ]]; then
  if [[ -f "${SCRIPT_DIR}/agents/moe-supplement.md" ]]; then
    echo "" >> "${PI_AGENT}/AGENTS.md"
    cat "${SCRIPT_DIR}/agents/moe-supplement.md" >> "${PI_AGENT}/AGENTS.md"
    ok "AGENTS.md + MoE supplement."
  else
    warn "moe-supplement.md not found — using base only."
  fi
else
  ok "AGENTS.md (dense)."
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}━━  Done  ━━${RESET}"
echo -e "  source $PROFILE"
echo -e "  /mcp                   —  list MCP servers"
echo -e "  /statusline            —  toggle statusline footer"
echo ""
