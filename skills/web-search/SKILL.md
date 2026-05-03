---
name: web-search
description: Web search skills. /web-search for quick lookup, /deep-search for multi-source research with synthesis.
---

# Web Search Skills

Two search modes. Use `web_search` and `web_fetch` tools.

---

## /web-search

**Single-query search. Fast answer.**

Process:
1. Run `web_search` with the query (10 results)
2. Scan snippets — if the answer is clear, respond immediately
3. If snippets are insufficient, fetch the 1–2 most relevant URLs with `web_fetch`
4. Answer directly. Lead with the finding.

Output format:
- Finding first, evidence after
- Include source URLs inline
- No methodology narration

When to use: factual lookups, quick checks, "what is X", "latest version of Y", error messages.

---

## /deep-search

**Multi-angle research. Synthesized answer with sources.**

Process:
1. Break the topic into 3–4 distinct search angles (direct answer / official source / practical experience / recent developments)
2. Run `web_search` for each angle (5–8 results per query)
3. Identify the 3–5 most authoritative/relevant URLs across all results
4. Fetch each with `web_fetch`
5. Synthesize into a structured brief

Source ranking: official docs > recent blog posts > forums > SEO content. Drop stale results (>2 years unless foundational).

Output format:
```
## Summary
<2-3 sentence answer>

## Findings
1. [finding] — [source URL]
2. [finding] — [source URL]
...

## Sources
✓ [URL] — why kept
✗ [URL] — why dropped

## Gaps
What couldn't be found or confirmed.
```

When to use: architecture decisions, comparing options, researching unfamiliar tech, anything requiring synthesis across multiple sources.
