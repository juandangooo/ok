# Requirements: todo — Node.js To-Do CLI

**Defined:** 2026-09-02
**Core Value:** Adding, listing, and completing a to-do item from the terminal works reliably and persists across runs — with zero install friction.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Items

- [ ] **ITEM-01**: User can add a to-do item with `todo add "text"`
- [ ] **ITEM-02**: User can mark an item complete with `todo done <n>`, where `<n>` is the item's position in the list output
- [ ] **ITEM-03**: Invalid input (unknown command, missing text, out-of-range or non-numeric item number) produces a clear error message and a non-zero exit code, without crashing or corrupting the data file

### Listing

- [ ] **LIST-01**: User can list all items with `todo list`, showing both done and pending items with a visible marker distinguishing them (e.g. `[x]` vs `[ ]`) and each item's position number
- [ ] **LIST-02**: Running `todo list` with no items shows a friendly empty-state message

### Storage

- [ ] **STOR-01**: Items persist to a JSON file in the user's home directory, so state carries across separate command invocations
- [ ] **STOR-02**: A missing or first-run data file is handled gracefully (treated as an empty list and created on first write)

### Platform

- [ ] **PLAT-01**: The tool runs on Node.js built-in modules only — no external npm dependencies

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Items

- **ITEM-04**: User can remove an item entirely (`todo remove <n>`)
- **ITEM-05**: User can edit the text of an existing item
- **ITEM-06**: User can clear all completed items at once

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Stable per-item IDs | v1 numbers by list position; simpler and sufficient at personal-list scale |
| Per-project / per-directory lists | A single global home-directory list was chosen |
| Due dates, priorities, tags, categories | Beyond the minimal core loop |
| Sync, sharing, multi-device | Local file only |
| External dependencies / npm packages | Explicit project constraint: built-ins only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ITEM-01 | Phase 1 | Pending |
| ITEM-02 | Phase 2 | Pending |
| ITEM-03 | Phase 2 | Pending |
| LIST-01 | Phase 2 | Pending |
| LIST-02 | Phase 2 | Pending |
| STOR-01 | Phase 1 | Pending |
| STOR-02 | Phase 1 | Pending |
| PLAT-01 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 8 total
- Mapped to phases: 8 (Phase 1: 4, Phase 2: 4)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-02*
*Last updated: 2026-09-02 after roadmap creation (traceability mapped)*
