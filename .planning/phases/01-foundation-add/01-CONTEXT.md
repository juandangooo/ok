# Phase 1: Foundation & Add - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the CLI skeleton, home-directory JSON storage, and the `todo add "text"` command. After this phase a user can add an item from any directory and it is durably saved to a JSON file in their home directory, surviving separate process invocations, with no install step (Node built-ins only).

Covers requirements ITEM-01, STOR-01, STOR-02, PLAT-01. `list` and `done` are Phase 2 — not built here, but the data schema chosen now must accommodate them.

</domain>

<decisions>
## Implementation Decisions

### Item Schema (discussed — user gave discretion, defaults locked)
- **D-01:** Each item is a JSON **object** with three fields: `text` (string), `done` (boolean, defaults to `false` on add), and `created` (ISO-8601 timestamp string set at add time). Chosen over plain strings so Phase 2's done-marking needs no schema migration. — **Reversibility:** costly — changing the item shape after items exist in users' `~/.todos.json` files requires a read-time migration; lock it now.
- **D-02:** The todos.json root is a **bare JSON array** of item objects (`[ {…}, {…} ]`) — no wrapper/version envelope. Simplest for this scope. — **Reversibility:** costly — moving to a `{version, items}` wrapper later means reading and rewriting existing bare-array files; acceptable risk given the tiny scope.

### Claude's Discretion
The user selected only "Item schema" to discuss and gave no preference within it, so the following are recorded as sensible defaults for the planner to apply. Any can be revisited, but these are the intended behavior:

- **Add argument handling:** `todo add` joins all arguments after the subcommand into a single item text, so both `todo add "buy milk"` and `todo add buy milk` work. Empty/whitespace-only text (`todo add` with no words) is an error (clear message, non-zero exit) — this is the ITEM-03 slice that applies to `add`.
- **Data file location:** `~/.todos.json` — a dotfile resolved via `os.homedir()`. Matches PROJECT.md. Not XDG config dir, to keep it simple and self-contained.
- **Corrupt-file behavior:** If `~/.todos.json` exists but is not valid JSON (or is not an array), fail with a clear error and a non-zero exit code. **Do NOT silently overwrite or recreate** — that would destroy user data. A *missing* file is the normal first-run case (treated as empty list, created on first write) and is distinct from a *corrupt* file.
- **Write safety:** Persist writes atomically — write to a temp file in the same directory, then `rename()` over the target — so an interrupted write cannot corrupt an existing list.
- **Success output:** On a successful add, print a short confirmation (e.g. `Added: "buy milk"`) and exit 0.
- **Entry point:** A single Node script with a `#!/usr/bin/env node` shebang, invokable as `todo`. Exact install/exposure mechanism (bin field, symlink, documented alias) is left to the planner; must not introduce npm dependencies.
- **JSON formatting:** Pretty-print the file (2-space indent, trailing newline) so it stays human-readable/inspectable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope & requirements
- `.planning/PROJECT.md` — Project definition, core value, constraints (built-ins only, home-dir storage), key decisions.
- `.planning/REQUIREMENTS.md` — v1 requirements; this phase covers ITEM-01, STOR-01, STOR-02, PLAT-01.
- `.planning/ROADMAP.md` §"Phase 1: Foundation & Add" — Phase goal and the 5 success criteria that define done.

No external specs or ADRs — requirements are fully captured in the decisions above and the roadmap.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield. The repo contains only `.gitignore` and `.planning/` / `.claude/` tooling. No source code yet.

### Established Patterns
- None established. This phase sets the initial conventions (single-file Node CLI, subcommand dispatch, JSON persistence helper).

### Integration Points
- The storage read/write helper created here is the seam Phase 2 (`list`, `done`) builds on — design it as a reusable load/save module rather than inlining file I/O in the `add` path.

</code_context>

<specifics>
## Specific Ideas

- Invocation shape is fixed by PROJECT.md: `todo add "buy milk"`, `todo list`, `todo done 1`.
- Item numbering in later phases is by list position, not stored IDs — so no `id` field is needed in the schema.

</specifics>

<deferred>
## Deferred Ideas

- `remove`, `edit`, `clear-done` commands — v2 (ITEM-04/05/06), out of v1 scope.
- Per-project todo files, due dates, priorities, tags — out of scope per PROJECT.md.

None of these were raised as scope creep during discussion; listed here only for continuity.

</deferred>

---

*Phase: 1-Foundation & Add*
*Context gathered: 2026-09-02*
