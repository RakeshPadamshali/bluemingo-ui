# Session Management & Project Continuity System — Reusable Prompt

> **Purpose:** Give this entire prompt to a Claude Code instance (via CLAUDE.md or project instructions) to replicate the session logging, task tracking, change logging, and document mapping workflow used in the Bluemingo MES project. Adapt the placeholders (`{PROJECT_NAME}`, file paths, etc.) to your project.

---

## The Prompt (copy everything below into your `.claude/CLAUDE.md`)

---

# {PROJECT_NAME} — Session & Documentation Management

## Session Persistence System

**IMPORTANT: On every session start, read `.claude/TASKS.md` for current work status.**

This project uses a multi-file system to maintain perfect continuity across Claude sessions:

| File | Purpose | When to Read | When to Update |
|------|---------|--------------|----------------|
| `.claude/CLAUDE.md` | Project context, conventions, architecture | Always loaded automatically | When conventions change |
| `.claude/TASKS.md` | **Active tasks, session changelog, next steps** | On session start | Every session (start + end) |
| `docs/DOCUMENT-MAP.md` | **Master document index** | Before every task | After creating/deleting/moving any doc |
| `documents/Development-Session-Log.md` | **Permanent historical record of all sessions** | When reviewing past decisions | At session end |

---

## Resuming Work (MANDATORY — Do This First Every Session)

1. Read `.claude/TASKS.md` — check current sprint, in-progress tasks, and "Next Steps"
2. Read `docs/DOCUMENT-MAP.md` — check for relevant existing documents before creating new ones
3. Pick up from "Next Steps" section or ask the user what to work on
4. Update task status as you work (PENDING -> IN_PROGRESS -> DONE)
5. Update TASKS.md before session ends with progress and new next steps

---

## Memory Recording (MANDATORY — Ask this everytime)

1. Ask this everytime if wants to create memory when there is new instructions to you.
2. Always check memory before applying anything so that mistakes can be avoided.

---

## TASKS.md Structure

`.claude/TASKS.md` is the **live working document**. It tracks what's active RIGHT NOW.

```markdown
# {PROJECT_NAME} - Active Tasks & Session Log

**Last Updated:** {DATE} (session {N})
**Current Status:** {Brief status summary}

---

## Current Sprint / Focus

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | {Task description} | PENDING / IN_PROGRESS / DONE / BLOCKED | {Context} |
| 2 | {Task description} | DONE | Completed session {N} |

---

## Session {N} Changes ({DATE}) — {One-Line Summary}

**What was done:**
1. {Change 1 — what + why}
2. {Change 2 — what + why}

**Files Created:**
- `path/to/new-file.ext` — {Purpose}

**Files Modified:**
- `path/to/changed-file.ext` — {What changed}

**Files Deleted:**
- `path/to/removed-file.ext` — {Why removed}

**Commits:**
- `{hash}` — {Commit message}

**Test Status:**
| Suite | Tests | Status |
|-------|-------|--------|
| Backend | {count} | PASS / FAIL ({details}) |
| Frontend | {count} | PASS / FAIL ({details}) |

---

## Session {N-1} Changes ({DATE}) — {One-Line Summary}
{Previous session's changes — keep last 3-5 sessions visible, older ones live in Session Log}

---

## Next Steps
{Numbered list of what to do next, in priority order. This is what the next session picks up from.}

1. {Highest priority item}
2. {Next item}
3. {Lower priority item}
```

**Rules for TASKS.md:**
- Keep the **last 3-5 session changelogs** in this file for quick context
- Older sessions get archived to the permanent Session Log
- Always update "Next Steps" before ending a session
- Task statuses: `PENDING`, `IN_PROGRESS`, `DONE`, `BLOCKED`, `DEFERRED`
- Every user request/message during a session should be reflected in the changelog

---

## Development Session Log Structure

`documents/Development-Session-Log.md` is the **permanent historical record**. It captures every session's work in detail for traceability.

```markdown
# Development Session Log

Permanent historical record of all development sessions.

---

## Session: {DATE} (Session {N} — {Title})

### Session Overview
**Primary Focus:** {Phase/Feature/Sprint name}
**Key Accomplishments:**
- {Major accomplishment 1}
- {Major accomplishment 2}
- {Major accomplishment 3}

### {Feature/Task Name} — {STATUS}
**Files Created:**
- `path/to/file.ext` — {What it does}

**Files Modified:**
- `path/to/file.ext` — {What changed and why}

**Files Deleted:**
- `path/to/file.ext` — {Why it was removed}

### Root Cause Analysis (if debugging/fixing)
**Root Cause {N}: {Title}**
- {Description of what went wrong}
- **Fix:** {What was done to fix it}

### Key Decisions
- {Decision 1 — what was decided and why}
- {Decision 2}

### Test Status Summary
| Suite | Tests | Status |
|-------|-------|--------|
| Backend | {count} | PASS / {X} FAIL |
| Frontend | {count} | PASS / {X} FAIL |
| E2E | {count} | PASS / {X} FAIL |

### Commits
- `{hash}` — {Commit message}

---

## Session: {DATE} (Session {N-1} — {Title})
{...previous session...}
```

**Rules for Session Log:**
- Entries are in **reverse chronological order** (newest first)
- Every session gets an entry, no matter how small
- Include root cause analysis for any debugging work — this prevents repeating mistakes
- Key decisions with rationale — future sessions need to understand WHY, not just WHAT
- Always include the test status table — it's the health check

---

## Document Map (MANDATORY)

`docs/DOCUMENT-MAP.md` is the **master index of ALL project documents**.

```markdown
# Document Map

**Master index of all project documents. Check this before starting any task.**

Last Updated: {DATE}

---

## Project Configuration

| Document | Path | Purpose | Module | Last Updated |
|----------|------|---------|--------|--------------|
| Project Instructions | `.claude/CLAUDE.md` | Conventions, stack, standards | All | {date} |
| Active Tasks | `.claude/TASKS.md` | Sprint tasks, session log | All | {date} |
| Session Log | `documents/Development-Session-Log.md` | Permanent session history | All | {date} |

---

## Specifications & Requirements

| Document | Path | Purpose | Module | Last Updated |
|----------|------|---------|--------|--------------|
| {Doc name} | `{path}` | {Purpose} | {Module} | {date} |

---

## Reference Documents

| Document | Path | Purpose | Module | Last Updated |
|----------|------|---------|--------|--------------|
| {Doc name} | `{path}` | {Purpose} | {Module} | {date} |

---

## User-Facing Documentation

| Document | Path | Purpose | Module | Last Updated |
|----------|------|---------|--------|--------------|
| {Doc name} | `{path}` | {Purpose} | {Module} | {date} |

---

## Analysis & Audits

| Document | Path | Purpose | Module | Last Updated |
|----------|------|---------|--------|--------------|
| {Doc name} | `{path}` | {Purpose} | {Module} | {date} |
```

**Document Map Rules (Non-Negotiable):**
1. **Before starting any task** — Check DOCUMENT-MAP.md for relevant existing documents. Do NOT create a document that already exists.
2. **After creating any new document** — Add it to DOCUMENT-MAP.md IMMEDIATELY. No exceptions.
3. **After deleting or moving a document** — Update DOCUMENT-MAP.md to reflect the change.
4. Every entry must include: path, purpose, last-updated date, and related module.
5. Organize by category (Config, Specs, Reference, User-Facing, Analysis).

---

## Session Logging Protocol (Do This At Session End)

**At the end of every session, update BOTH files:**

### 1. Update `.claude/TASKS.md`:
- Change task statuses (PENDING -> DONE, add new tasks if discovered)
- Add a "Session {N} Changes" section at the top with:
  - What was done (numbered list)
  - Files created/modified/deleted
  - Commits made
  - Test status
- Update "Next Steps" with what should happen next

### 2. Update `documents/Development-Session-Log.md`:
- Add a full session entry (see structure above) at the TOP of the file
- Include: overview, accomplishments, file changes, decisions, test status, commits
- Include root cause analysis for any debugging work

### 3. Update `docs/DOCUMENT-MAP.md` (if any documents were created/deleted/moved)

---

## Reference Document Maintenance

When making changes that affect project structure, APIs, or architecture, update the corresponding reference documents:

| Change Type | Update These Documents |
|-------------|----------------------|
| New API endpoint | API Reference doc |
| New database table/entity | Entity Reference, Database Schema doc |
| New validation rules | Validation Rules doc |
| New SQL migration/patch | Database Schema doc |
| Architecture change | Architecture doc, relevant diagrams |
| Major feature addition | Main functional document |
| New document created | DOCUMENT-MAP.md (immediately!) |

---

## Quick Reference — What Goes Where

| Information | File | Example |
|-------------|------|---------|
| "What am I working on right now?" | `.claude/TASKS.md` | Current sprint table |
| "What should I do next?" | `.claude/TASKS.md` | "Next Steps" section |
| "What changed in the last 3 sessions?" | `.claude/TASKS.md` | Session changelog sections |
| "What happened in session 12?" | `documents/Development-Session-Log.md` | Session 12 entry |
| "Why did we make that decision?" | `documents/Development-Session-Log.md` | "Key Decisions" in relevant session |
| "How did we debug that bug?" | `documents/Development-Session-Log.md` | "Root Cause Analysis" section |
| "Does a document about X already exist?" | `docs/DOCUMENT-MAP.md` | Search by purpose/module |
| "Where is the API reference?" | `docs/DOCUMENT-MAP.md` | Reference Documents table |
| "What are our coding conventions?" | `.claude/CLAUDE.md` | Development Conventions section |

---

## Setup Checklist (For New Projects)

To bootstrap this system on a new project:

1. Create `.claude/CLAUDE.md` with your project conventions (tech stack, coding standards, etc.) and paste this entire session management section into it
2. Create `.claude/TASKS.md` with the initial sprint/task list
3. Create `docs/DOCUMENT-MAP.md` with your initial documents listed
4. Create `documents/Development-Session-Log.md` with the first session entry
5. Replace all `{PROJECT_NAME}` placeholders with your project name
6. Add any project-specific document categories to the Document Map template
7. Adjust the "Reference Document Maintenance" table to match your project's document types
