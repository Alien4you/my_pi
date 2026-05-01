/**
 * /mcp command — lists configured MCP servers from mcp.json
 *
 * Usage: /mcp
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export default function mcpList(pi: ExtensionAPI) {
	pi.registerCommand("mcp", {
		description: "Show configured MCP servers",
		handler: async (_args, ctx) => {
			const paths = [
				join(homedir(), ".pi", "agent", "mcp.json"),
				join(process.cwd(), ".pi", "mcp.json"),
			];

			const allServers: Record<string, { command: string; args?: string[]; url?: string; source: string }> = {};

			for (const p of paths) {
				try {
					const raw = await readFile(p, "utf8");
					const cfg = JSON.parse(raw);
					const servers = cfg.mcpServers ?? cfg;
					for (const [name, def] of Object.entries(servers)) {
						const s = def as any;
						allServers[name] = { command: s.command ?? "", args: s.args, url: s.url, source: p.includes(homedir()) ? "global" : "project" };
					}
				} catch {}
			}

			const names = Object.keys(allServers);
			if (names.length === 0) {
				ctx.ui.notify("No MCP servers configured", "info");
				return;
			}

			const lines = names.map((name) => {
				const s = allServers[name];
				const cmd = s.command ? `${s.command} ${(s.args ?? []).join(" ")}` : s.url ?? "?";
				return `${name}  ${cmd}  (${s.source})`;
			});

			await ctx.ui.select("MCP Servers", lines);
		},
	});
}