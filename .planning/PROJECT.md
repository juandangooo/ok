# todo — Node.js To-Do CLI

## What This Is

A zero-dependency command-line tool for managing a personal to-do list. Users add, list, and complete items from the terminal (`todo add "buy milk"`, `todo list`, `todo done 1`). Items persist to a single JSON file in the user's home directory, so the same list is available from any directory. Built entirely on Node.js built-ins — no npm packages.

## Core Value

Adding, listing, and completing a to-do item from the terminal works reliably and persists across runs — with zero install friction (no dependencies).

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can add a to-do item with `todo add "text"`
- [ ] User can list all items with `todo list`, showing done and pending items with a visible marker
- [ ] User can mark an item complete with `todo done <n>`, where `<n>` is the item's position in the list output
- [ ] Items persist to a JSON file in the user's home directory across separate command invocations
- [ ] Tool runs on Node.js built-ins only — no external dependencies

### Out of Scope

- Remove / delete command — deferred to keep v1 minimal; can add in v2
- Clear-completed command — deferred; not needed for the core loop
- Edit item text — deferred; add/done covers the essential workflow
- Stable per-item IDs — v1 uses list position; positions are simpler and sufficient at small scale
- Per-project todo files — a single global home-directory list was chosen; per-directory lists are out of scope
- Due dates, priorities, tags, categories — beyond the minimal core loop
- Sync, sharing, or multi-device support — local file only

## Context

- Target runtime: Node.js (built-ins only — `fs`, `path`, `os`, `process`). No `package.json` dependencies.
- Storage: a single JSON file (e.g. `~/.todos.json`) resolved via the user's home directory, so the list is global rather than per-directory.
- Item identity: `todo list` numbers items by position (1, 2, 3…); `todo done <n>` targets that position. Numbering is derived from list order, not stored IDs.
- List display: all items are shown, with done items visibly distinguished from pending (e.g. `[x]` vs `[ ]`).
- Distribution: invoked as `todo` — a single executable Node script (details of install/symlink to be decided during planning).

## Constraints

- **Dependencies**: Node.js built-in modules only — No external npm packages permitted (explicit project goal).
- **Storage**: Local JSON file in the home directory — Keeps the tool self-contained and dependency-free; no database.
- **Scope**: v1 is add / list / done only — Deliberately minimal to ship the core loop first.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Item numbering by list position (not stable IDs) | Simpler to implement and reason about at personal-list scale | — Pending |
| `todo list` shows all items, done ones marked | Users want to see completed work, not just remaining | — Pending |
| Storage in home directory (global list) | One list available from any directory | — Pending |
| v1 limited to add / list / done | Ship the minimal core loop before adding remove/edit/clear | — Pending |
| Node built-ins only, no dependencies | Zero install friction; explicit project constraint | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-02 after initialization*
