/**
 * Pi Statusline
 *
 * Format: Model: Sonnet 4.6 | Context: [████████░░░░░░░░] 115k/200k (57%) | Δ +5/-2 | main
 *
 * - Model:   pretty model name
 * - Context: real-time context window fill (bar + used/total/pct)
 * - Δ:       lines added/removed this session
 * - branch:  git branch
 * - Block:   rate-limit countdown (shown only when active)
 *
 * Toggle: /statusline
 */

import type { ContextUsage, ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";

function formatModel(id: string): string {
	const name = (id ?? "").split("/").pop() ?? id;
	const m = name.match(/claude-(opus|sonnet|haiku)-(\d+)[._-](\d+)/i);
	if (m) {
		const family = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
		return `${family} ${m[2]}.${m[3]}`;
	}
	return name || "unknown";
}

function fmtK(n: number): string {
	return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
}

function fmtDuration(ms: number): string {
	const s = Math.floor(ms / 1000);
	const m = Math.floor(s / 60);
	const h = Math.floor(m / 60);
	if (h > 0) return `${h}hr ${m % 60}m`;
	if (m > 0) return `${m}m ${s % 60}s`;
	return `${s}s`;
}



export default function piStatusline(pi: ExtensionAPI) {
	let enabled = false;
	let blockUntil: number | null = null;
	let linesAdded = 0;
	let linesRemoved = 0;

	// Track file changes from edit/write tool calls
	pi.on("tool_call" as any, (event: any) => {
		const name = event?.toolName ?? event?.name ?? "";
		if (name === "edit") {
			const edits = event?.input?.edits ?? event?.args?.edits ?? [];
			for (const e of edits) {
				const oldLines = (e.oldText ?? "").split("\n").length;
				const newLines = (e.newText ?? "").split("\n").length;
				linesRemoved += oldLines;
				linesAdded += newLines;
			}
		} else if (name === "write") {
			const content = event?.input?.content ?? event?.args?.content ?? "";
			if (typeof content === "string") {
				linesAdded += content.split("\n").length;
			}
		}
	});

	// Track rate-limit blocks from overloaded errors
	pi.on("message" as any, (event: any) => {
		const retryAfter = event?.retryAfter ?? event?.error?.retry_after;
		if (retryAfter) {
			blockUntil = Date.now() + Number(retryAfter) * 1000;
		} else if (event?.error?.type === "overloaded_error") {
			blockUntil = Date.now() + 2 * 60 * 1000;
		}
	});

	const render = (ctx: any, theme: any, footerData: any, width: number): string[] => {
		const sep = theme.fg("dim", " │ ");
		const parts: string[] = [];

		// ── Model ──────────────────────────────────────────────────────────
		const modelId = ctx.model?.id ?? "";
		parts.push(`Model: ${theme.fg("accent", formatModel(modelId))}`);

		// ── Context ────────────────────────────────────────────────────────
		const usage: ContextUsage | undefined = ctx.getContextUsage?.();
		const contextWindow = (usage as any)?.contextWindow ?? 200000;
		const pct = usage?.percent ?? null;

		if (pct != null) {
			const pctRounded = Math.round(pct);
			const barLen = 16;
			const filled = Math.round((pct / 100) * barLen);
			const color = pct >= 80 ? "error" : pct >= 50 ? "warning" : "success";
			const bar = "[" + theme.fg(color, "█".repeat(filled)) + theme.fg("dim", "░".repeat(barLen - filled)) + "]";
			const usedTokens = Math.round((pct / 100) * contextWindow);
			const ctxStr = `${bar} ${fmtK(usedTokens)}/${fmtK(contextWindow)} (${pctRounded}%)`;
			parts.push(`Context: ${theme.fg(color, ctxStr)}`);
		}

		// ── File changes ──────────────────────────────────────────────────
		if (linesAdded > 0 || linesRemoved > 0) {
			const parts2: string[] = [];
			if (linesAdded > 0) parts2.push(theme.fg("success", `+${linesAdded}`));
			if (linesRemoved > 0) parts2.push(theme.fg("error", `-${linesRemoved}`));
			if (parts2.length > 0) parts.push(`Δ ${parts2.join("/")}`);
		}

		// ── Git branch ────────────────────────────────────────────────────
		const branch = footerData?.getGitBranch?.();
		if (branch) {
			parts.push(theme.fg("dim", branch));
		}

		// ── Block ──────────────────────────────────────────────────────────
		if (blockUntil != null) {
			const remaining = blockUntil - Date.now();
			if (remaining > 0) {
				parts.push(`Block: ${theme.fg("error", fmtDuration(remaining))}`);
			} else {
				blockUntil = null;
			}
		}

		return [truncateToWidth(parts.join(sep), width)];
	};

	const enable = async (ctx: any) => {
		if (!enabled) {
			enabled = true;
			ctx.ui.setFooter((tui: any, theme: any, footerData: any) => ({
				dispose: footerData.onBranchChange(() => tui.requestRender()),
				invalidate() {},
				render: (width: number) => render(ctx, theme, footerData, width),
			}));
		}
	};

	const disable = async (ctx: any) => {
		if (enabled) {
			enabled = false;
			ctx.ui.setFooter(undefined);
		}
	};

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.hasUI) await enable(ctx);
	});

	pi.registerCommand("statusline", {
		description: "Toggle statusline footer",
		handler: async (_args, ctx) => {
			await (enabled ? disable(ctx) : enable(ctx));
		},
	});
}
