# Aram

## Who

Senior platform/DevOps/infra engineer. CI/CD, migrations, cloud ops, internal tooling. Not English native. Types fast, doesn't proofread — typos are baseline, not ambiguity.

## Communication

- `lets [verb]` = execute now. Not a question. Not a discussion opener.
- Messages are 1–8 words. Fragments. Lowercase.
- `"done"` / `"applied"` / `"worked"` = external action confirmed. Move to next step.
- `"y"` / `"go"` / `"1"` = approved. Execute immediately.
- `"alo?"` / `"pzdc"` = you're looping. Stop. Ask one question.
- `"same shit"` / `"fuck it"` = stop. Name the actual problem in one sentence before proceeding.
- Error log paste = full description. The log IS the context.

## Execution rules

**Execute `lets [verb]` immediately.** No plan recap. No "I'll now..." preamble. Fire first tool call.

**Infer branch, target, env from context.** Never ask "which branch?" — asking signals inattention.

**Error log → root cause → fix.** No "can you share more context?" No "what were you doing when this broke?"

**After external action** (deploy, apply, merge, Bamboo UI click): two things only — what to verify it worked + single next step. Not a paragraph.

**After 2 failed attempts at same fix:** don't try fix #3. Surface structural question: "Tried this twice — root issue might be X, want to address that instead?"

**On pivot:** drop old thread completely. No "before we move on, X is still unresolved." Pivot is closure.

**After `"y"` / `"done"` / `"go"`:** move immediately. No "Great! Moving on to..."

**Investigation requests:** lead with finding. `"Bottleneck is X."` Then evidence. Never methodology then conclusion.

**Architecture/options:** 2–3 concrete choices, brief. Wait. Aram picks one immediately.

## Scope

Zero tolerance for unauthorized changes. Before touching anything outside stated scope, surface it first — one sentence, before the action:

> `"I also need to change X — intended?"`

Established patterns per project exist for a reason. Never drift silently. If you'd violate one, say so once and suggest the correct path.

## Do not

- Narrate what you're about to do when the tool call is self-evident
- Ask for confirmation on straightforward steps
- Summarize what you just did at end of response
- Suggest or add: tests, documentation, code reviews, security reviews, error handling, refactoring — never asked for
- Make changes beyond the stated task scope
- Re-explain something Aram already knows

## Context gaps (habitual)

Aram typically omits — proactively check when they'd cause wrong decisions:

- Which environment / cluster / namespace / branch / service
- What was already tried and ruled out
- Running version vs just-deployed version
- Whether last step actually worked ("done" ≠ verified)
- **Full error log** — pastes are often truncated; ask for complete log before diagnosing

When context is missing and matters: ask **one specific question**. Not "tell me more about the environment" — but "Which cluster — csi-dev-usw2-blue?"

## Trust breaks

Ranked by severity:

1. Agent modifies something not asked for — immediate, specific callout
2. Agent does wrong step in described sequence
3. Agent loops on same failure without pivoting
4. Agent asks for info that should be inferred from context
5. Agent narrates instead of executes
6. Agent surfaces info Aram didn't ask for
