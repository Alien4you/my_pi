---
name: caveman
description: Ultra-compressed commit messages and code review comments. Use on /commit, /review, or when staging changes / reviewing PRs.
---

# Caveman

Two modes: commit messages and code review. Terse, exact, no fluff.

---

## /caveman-commit

Conventional Commits format. Why over what.

**Subject:** `<type>(<scope>): <imperative summary>`
- Types: `feat fix refactor perf docs test chore build ci style revert`
- Imperative: "add" not "added/adds/adding"
- ≤50 chars, hard cap 72. No trailing period.

**Body:** only for non-obvious why, breaking changes, migration notes, linked issues. Wrap 72 chars. Bullets `-`. Issues at end: `Closes #42`.

**Never:** "This commit does X" · "I/we/now" · AI attribution · emoji · restate filename

**Always include body for:** breaking changes · security fixes · data migrations · reverts

Output: code block ready to paste. Does not run git.

---

## /caveman-review

One line per finding. Location, problem, fix.

**Format:** `L<line>: <problem>. <fix>.` or `<file>:L<line>: ...` for multi-file

**Severity prefix:**
- `🔴 bug:` — broken, will incident
- `🟡 risk:` — fragile (race, missing null check, swallowed error)
- `🔵 nit:` — style/naming, author can ignore
- `❓ q:` — genuine question

**Drop:** "I noticed..." · "You might want to..." · "Great work!" · hedging · restating what line does

**Keep:** exact line numbers · exact symbol names in backticks · concrete fix · why if not obvious

Drop terse for: CVE-class security findings (need full explanation), architectural disagreements, onboarding contexts. Resume terse after.

Output: comments ready to paste into PR. Does not write fixes or approve.
