/**
 * Web Search extension — DuckDuckGo, no API key required
 *
 * Tools:
 *   web_search(query, num_results?)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

async function searchDDG(query: string, n: number): Promise<SearchResult[]> {
	const res = await fetch(
		`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
		{
			headers: { "User-Agent": "Mozilla/5.0" },
			signal: AbortSignal.timeout(15000),
		},
	);
	if (!res.ok) throw new Error(`DDG: ${res.status}`);
	const html = await res.text();
	const results: SearchResult[] = [];
	const linkRe = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
	const snippetRe = /class="result__snippet"[^>]*>([^<]+)</g;
	const links = [...html.matchAll(linkRe)].slice(0, n);
	const snippets = [...html.matchAll(snippetRe)].map(m => m[1]);
	for (let i = 0; i < links.length; i++) {
		results.push({ title: links[i][2].trim(), url: links[i][1], snippet: snippets[i]?.trim() ?? "" });
	}
	return results;
}

async function runSearch(query: string, n: number): Promise<SearchResult[]> {
	return searchDDG(query, n);
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
		description: "Search the web via DuckDuckGo. Returns title, URL, and snippet.",
		promptSnippet: "Search the web for current information",
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			num_results: Type.Optional(Type.Number({ description: "Number of results (default 5, max 10)" })),
		}),
		async execute(_id, params: { query: string; num_results?: number }) {
			const n = Math.min(params.num_results ?? 5, 10);
			const results = await runSearch(params.query, n);
			return { content: [{ type: "text", text: formatResults(results) }] };
		},
	});
}
