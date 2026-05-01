/**
 * Pi Statusline — matches ccstatusline config:
 *   model | context-bar | session-usage | block-timer(omit)
 *
 * Toggle: /statusline
 * Auto-enables on session start.
 *
 * Context bar color: green < 50%, yellow < 80%, red >= 80%
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

export default function piStatusline(pi: ExtensionAPI) {
	let enabled = false;

	const render = (ctx: ExtensionAPI, theme: any, footerData: any, width: number): string[] => {
		let input = 0, output = 0, cost = 0;
		for (const e of ctx.sessionManager.getBranch()) {
			if (e.type === "message" && e.message.role === "assistant") {
				const m = e.message as AssistantMessage;
				input += m.usage?.input ?? 0;
				output += m.usage?.output ?? 0;
				cost += m.usage?.cost?.total ?? 0;
			}
		}

		const usage = ctx.getContextUsage?.();
		const sep = theme.fg("dim", " │ ");

		// Model
		const model = ctx.model?.id ?? "no-model";

		// Context bar — 16 chars wide, color-coded
		let ctxStr = "";
		if (usage?.percent != null) {
			const pct = usage.percent;
			const barLen = 16;
			const filled = Math.round((pct / 100) * barLen);
			const empty = barLen - filled;
			const color = pct >= 80 ? "error" : pct >= 50 ? "warning" : "success";
			const bar = theme.fg(color, "█".repeat(filled)) + theme.fg("dim", "░".repeat(empty));
			ctxStr = bar + theme.fg(color, ` ${pct}%`);
		}

		// Session usage — ↑input ↓output cost
		const fmt = (n: number) => n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`;
		const usageStr = theme.fg("text", `↑${fmt(input)} ↓${fmt(output)}`);

		// Cost
		const costStr = theme.fg("text", `$${cost.toFixed(2)}`);

		// Git branch
		const branch = footerData.getGitBranch();
		const branchStr = branch ? sep + theme.fg("dim", `\ue0a0 ${branch}`) : "";

		const full = theme.fg("accent", `⬡ ${model}`) + sep + ctxStr + sep + usageStr + sep + costStr + branchStr;
		return [truncateToWidth(full, width)];
	};

	// Auto-enable on session start
	const enable = async (ctx: any) => {
		if (!enabled) {
			enabled = true;
			ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
				const unsub = footerData.onBranchChange(() => tui.requestRender());
				return {
					dispose: unsub,
					invalidate() {},
					render(width: number): string[] {
						return render(ctx, theme, footerData, width);
					},
				};
			});
			ctx.ui.notify("Statusline on", "info");
		}
	};

	const disable = async (ctx: any) => {
		if (enabled) {
			enabled = false;
			ctx.ui.setFooter(undefined);
			ctx.ui.notify("Default footer", "info");
		}
	};

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.hasUI) await enable(ctx);
	});

	pi.registerCommand("statusline", {
		description: "Toggle ccstatusline-style footer",
		handler: async (_args, ctx) => {
			await (enabled ? disable(ctx) : enable(ctx));
		},
	});
}