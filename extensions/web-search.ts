/**
 * Web Search + Fetch extension
 *
 * Tools:
 *   web_search(query, num_results?) — search the web, return title/url/snippet list
 *   web_fetch(url)                  — fetch URL, return as clean markdown
 *
 * Search providers (auto-detected from env, first found wins):
 *   BRAVE_API_KEY                         — Brave Search (recommended, 2k free/month)
 *   SERPER_API_KEY                        — Serper.dev
 *   GOOGLE_SEARCH_API_KEY + GOOGLE_CSE_ID — Google Custom Search
 *
 * Web fetch: Jina Reader (r.jina.ai) — free, no key required.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

async function searchBrave(query: string, n: number): Promise<SearchResult[]> {
	const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${n}`;
	const res = await fetch(url, {
		headers: { "X-Subscription-Token": process.env.BRAVE_API_KEY!, "Accept": "application/json" },
		signal: AbortSignal.timeout(10000),
	});
	if (!res.ok) throw new Error(`Brave: ${res.status} ${await res.text()}`);
	const data = await res.json() as any;
	return (data.web?.results ?? []).map((r: any) => ({
		title: r.title ?? "",
		url: r.url ?? "",
		snippet: r.description ?? "",
	}));
}

async function searchSerper(query: string, n: number): Promise<SearchResult[]> {
	const res = await fetch("https://google.serper.dev/search", {
		method: "POST",
		headers: { "X-API-KEY": process.env.SERPER_API_KEY!, "Content-Type": "application/json" },
		body: JSON.stringify({ q: query, num: n }),
		signal: AbortSignal.timeout(10000),
	});
	if (!res.ok) throw new Error(`Serper: ${res.status} ${await res.text()}`);
	const data = await res.json() as any;
	return (data.organic ?? []).map((r: any) => ({
		title: r.title ?? "",
		url: r.link ?? "",
		snippet: r.snippet ?? "",
	}));
}

async function searchGoogle(query: string, n: number): Promise<SearchResult[]> {
	const params = new URLSearchParams({
		q: query,
		key: process.env.GOOGLE_SEARCH_API_KEY!,
		cx: process.env.GOOGLE_CSE_ID!,
		num: String(n),
	});
	const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
		signal: AbortSignal.timeout(10000),
	});
	if (!res.ok) throw new Error(`Google: ${res.status} ${await res.text()}`);
	const data = await res.json() as any;
	return (data.items ?? []).map((r: any) => ({
		title: r.title ?? "",
		url: r.link ?? "",
		snippet: r.snippet ?? "",
	}));
}

async function runSearch(query: string, n: number): Promise<SearchResult[]> {
	if (process.env.BRAVE_API_KEY) return searchBrave(query, n);
	if (process.env.SERPER_API_KEY) return searchSerper(query, n);
	if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_CSE_ID) return searchGoogle(query, n);
	throw new Error(
		"No search provider configured. Set one of: BRAVE_API_KEY, SERPER_API_KEY, or GOOGLE_SEARCH_API_KEY + GOOGLE_CSE_ID",
	);
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
		description: "Search the web. Returns title, URL, and snippet for each result.",
		promptSnippet: "Search the web for current information",
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			num_results: Type.Optional(Type.Number({ description: "Number of results (default 10, max 20)" })),
		}),
		async execute(_id, params: { query: string; num_results?: number }) {
			const n = Math.min(params.num_results ?? 10, 20);
			const results = await runSearch(params.query, n);
			return { content: [{ type: "text", text: formatResults(results) }] };
		},
	});

}
