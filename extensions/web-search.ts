/**
 * Web Search extension
 *
 * Tools:
 *   web_search(query, num_results?) — search via Jina (s.jina.ai), no key required
 *
 * Optional: set JINA_API_KEY for higher rate limits (free at jina.ai)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

async function searchJina(query: string, n: number): Promise<SearchResult[]> {
	const headers: Record<string, string> = { "Accept": "application/json" };
	if (process.env.JINA_API_KEY) headers["Authorization"] = `Bearer ${process.env.JINA_API_KEY}`;

	const res = await fetch(`https://s.jina.ai/?q=${encodeURIComponent(query)}&count=${n}`, {
		headers,
		signal: AbortSignal.timeout(15000),
	});
	if (!res.ok) throw new Error(`Jina search: ${res.status} ${await res.text()}`);
	const data = await res.json() as any;
	return (data.data ?? []).map((r: any) => ({
		title: r.title ?? "",
		url: r.url ?? "",
		snippet: r.description ?? r.content?.slice(0, 200) ?? "",
	}));
}

function formatResults(results: SearchResult[]): string {
	if (results.length === 0) return "No results found.";
	return results
		.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`)
		.join("\n\n");
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description: "Search the web via Jina. Returns title, URL, and snippet for each result. No API key required.",
		promptSnippet: "Search the web for current information",
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			num_results: Type.Optional(Type.Number({ description: "Number of results (default 5, max 10)" })),
		}),
		async execute(_id, params: { query: string; num_results?: number }) {
			const n = Math.min(params.num_results ?? 5, 10);
			const results = await searchJina(params.query, n);
			return { content: [{ type: "text", text: formatResults(results) }] };
		},
	});
}
