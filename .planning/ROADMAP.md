# Roadmap: todo — Node.js To-Do CLI

## Overview

A zero-dependency Node.js CLI ships in two vertical slices. Phase 1 stands up the executable skeleton and the JSON persistence layer while delivering the first real user-facing command (`todo add`), proving the storage model works across separate process invocations. Phase 2 completes the command surface (`todo list`, `todo done`) and hardens all three commands with consistent, non-corrupting error handling — leaving a fully usable, reliable core loop.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Add** - CLI skeleton, home-directory JSON storage, and `todo add` — items persist across invocations, built on Node built-ins only
- [ ] **Phase 2: List, Complete & Validate** - `todo list` and `todo done` complete the command surface; invalid input across all commands fails clearly without corrupting data

## Phase Details

### Phase 1: Foundation & Add
**Goal**: A user can run `todo add "text"` from any directory and the item is durably saved to a JSON file in their home directory, surviving separate command invocations — with zero install step, since the tool runs on Node built-ins only.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: ITEM-01, STOR-01, STOR-02, PLAT-01
**Success Criteria** (what must be TRUE):
  1. Running `todo add "buy milk"` exits 0 and prints a confirmation.
  2. After `todo add "buy milk"`, the JSON file in the user's home directory (e.g. `~/.todos.json`) contains the new item.
  3. Running `todo add` in one process, then `todo add` again in a fresh process invocation, accumulates both items in the same file (persistence across invocations, not just in-memory).
  4. On first run — no existing data file — `todo add` creates the file gracefully instead of erroring.
  5. The tool runs with no `npm install` step; it depends only on Node built-in modules (`fs`, `path`, `os`, `process`).
**Plans**: TBD

Plans:
- [ ] 01-01: TBD (refined during planning)

### Phase 2: List, Complete & Validate
**Goal**: A user can see their full list (done and pending), mark items complete by position, and get clear, non-destructive errors for any invalid input — completing the add/list/done core loop.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: LIST-01, LIST-02, ITEM-02, ITEM-03
**Success Criteria** (what must be TRUE):
  1. Running `todo list` with no items shows a friendly empty-state message and exits 0.
  2. After `todo add "buy milk"`, running `todo list` shows the item with a pending marker (e.g. `[ ]`) and its position number.
  3. After `todo done 1`, running `todo list` shows that item with a done marker (e.g. `[x]`) instead of pending.
  4. Running `todo done <n>` with an out-of-range or non-numeric `<n>` prints a clear error and exits non-zero, and the data file is left unchanged (not corrupted).
  5. Running an unknown command, or `todo add` with no text, prints a clear error and exits non-zero.
**Plans**: TBD

Plans:
- [ ] 02-01: TBD (refined during planning)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Add | 0/TBD | Not started | - |
| 2. List, Complete & Validate | 0/TBD | Not started | - |
