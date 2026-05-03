/**
 * Web Search extension
 *
 * Tools:
 *   web_search(query, num_results?) — search the web, no API key required
 *
 * Providers (first configured wins):
 *   JINA_API_KEY  — Jina Search (free key at jina.ai)
 *   TAVILY_API_KEY — Tavily (1k/month free, best quality)
 *   fallback      — DuckDuckGo HTML scrape (no key, limited results)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

async function searchJina(query: string, n: number): Promise<SearchResult[]> {
	const res = await fetch(`https://s.jina.ai/?q=${encodeURIComponent(query)}&count=${n}`, {
		headers: {
			"Accept": "application/json",
			"Authorization": `Bearer ${process.env.JINA_API_KEY}`,
		},
		signal: AbortSignal.timeout(15000),
	});
	if (!res.ok) throw new Error(`Jina: ${res.status}`);
	const data = await res.json() as any;
	return (data.data ?? []).map((r: any) => ({
		title: r.title ?? "",
		url: r.url ?? "",
		snippet: r.description ?? r.content?.slice(0, 200) ?? "",
	}));
}

async function searchTavily(query: string, n: number): Promise<SearchResult[]> {
	const res = await fetch("https://api.tavily.com/search", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: n }),
		signal: AbortSignal.timeout(15000),
	});
	if (!res.ok) throw new Error(`Tavily: ${res.status}`);
	const data = await res.json() as any;
	return (data.results ?? []).map((r: any) => ({
		title: r.title ?? "",
		url: r.url ?? "",
		snippet: r.content?.slice(0, 200) ?? "",
	}));
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
	if (process.env.JINA_API_KEY) return searchJina(query, n);
	if (process.env.TAVILY_API_KEY) return searchTavily(query, n);
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
		description: "Search the web. Returns title, URL, and snippet. Set JINA_API_KEY or TAVILY_API_KEY for best results; falls back to DuckDuckGo.",
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
