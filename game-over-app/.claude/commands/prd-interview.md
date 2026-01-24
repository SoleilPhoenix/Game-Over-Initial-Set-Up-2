---
name: prd-interview
description: Interview me to expand a PRD (user)
argument-hint: [PRD-file]
allowed-tools: AskUserQuestion, Read, Glob, Grep, Write, Edit
model: opus
---

You will read the current PRD file and interview me to make it implementation-ready.

Current PRD:
@$PRD

Rules:
- Use the AskUserQuestion tool.
- Ask non-obvious questions about literally anything: technical implementation, UI & UX, edge cases, tradeoffs, and acceptance criteria.
- Be very in-depth and continue interviewing me until the PRD is complete.

Before writing:
- Summarize the final spec outline and ask me to confirm.

Then:
- Overwrite `$PRD` with the final PRD (keep it well-structured with headings).