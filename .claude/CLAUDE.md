<!-- GSD:project-start source:PROJECT.md -->

## Project

**todo — Node.js To-Do CLI**

A zero-dependency command-line tool for managing a personal to-do list. Users add, list, and complete items from the terminal (`todo add "buy milk"`, `todo list`, `todo done 1`). Items persist to a single JSON file in the user's home directory, so the same list is available from any directory. Built entirely on Node.js built-ins — no npm packages.

**Core Value:** Adding, listing, and completing a to-do item from the terminal works reliably and persists across runs — with zero install friction (no dependencies).

### Constraints

- **Dependencies**: Node.js built-in modules only — No external npm packages permitted (explicit project goal).
- **Storage**: Local JSON file in the home directory — Keeps the tool self-contained and dependency-free; no database.
- **Scope**: v1 is add / list / done only — Deliberately minimal to ship the core loop first.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
