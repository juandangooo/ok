# Phase 1: Foundation & Add - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-02
**Phase:** 1-Foundation & Add
**Areas discussed:** Item schema

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Item schema | Shape of each item in todos.json (Phase 2 adds `done`) | ✓ |
| Add arguments | Require quotes vs join loose args | |
| File location | `~/.todos.json` dotfile vs XDG config dir | |
| Corrupt file | Fail clearly vs silently recreate | |

**User's choice:** Item schema only.
**Notes:** Remaining three areas left to Claude's discretion (see below).

---

## Item Schema

### Item shape

| Option | Description | Selected |
|--------|-------------|----------|
| Object w/ done + created | `{text, done, created}` — Phase-2-ready, timestamp included | ✓ (default applied) |
| Object, text + done only | `{text, done}` — minimal, still Phase-2-ready | |
| Plain strings | `["buy milk", ...]` — simplest now, forces migration later | |

### File root

| Option | Description | Selected |
|--------|-------------|----------|
| Bare array | `[ {...}, {...} ]` | ✓ (default applied) |
| Wrapper object | `{ version, items }` | |

**User's choice:** "No preference" on both — deferred to Claude. Recommended defaults applied: item = `{text, done, created}`, root = bare array.
**Notes:** Object schema chosen so Phase 2 (`done` marking) needs no migration. `created` is a cheap ISO timestamp. No `id` field — later phases number by list position, not stored IDs.

---

## Claude's Discretion

- **Add argument handling** — join all args after `add` into one text; both quoted and unquoted forms work; empty text errors (non-zero exit).
- **Data file location** — `~/.todos.json` via `os.homedir()` (per PROJECT.md), not XDG.
- **Corrupt-file behavior** — fail with clear error + non-zero exit; never silently overwrite. Missing file is normal first-run (create on first write).
- **Write safety** — atomic write via temp file + `rename()`.
- **Success output** — `Added: "<text>"`, exit 0.
- **Entry point** — single `#!/usr/bin/env node` script, invokable as `todo`; exact exposure mechanism left to planner; no npm dependencies.
- **JSON formatting** — pretty-printed, 2-space indent.

## Deferred Ideas

- `remove` / `edit` / `clear-done` commands — v2 (ITEM-04/05/06).
- Per-project files, due dates, priorities, tags — out of scope per PROJECT.md.
