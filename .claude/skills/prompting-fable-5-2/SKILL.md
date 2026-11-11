---
name: prompting-fable-5-2
description: Anthropic's official guidance for prompting Claude Fable 5.2 (and Mythos 5.2). Use whenever writing, reviewing, or migrating a system prompt, skill, agent file, CLAUDE.md, tool description, or harness for Fable 5.2 — or when diagnosing behaviors like early stopping, silent long turns, over-delegation to subagents, excess caution/approval requests, choppy reports, effort-level choice, or `stop_reason: "refusal"`.
---

# Prompting Claude Fable 5.2

Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2
(Snapshot taken 2026-11-11. If the user wants the latest, re-fetch the URL.)

## How to use this skill

1. Match the observed symptom to a section in the table below.
2. Apply that section's fix — use the ready-to-paste prompt text verbatim as a starting point, then adapt.
3. Apply one change at a time and measure effect + token cost.
4. **Change instructions only in new conversations.** Fable 5.2 enforces the preserved-thinking prefix check: editing `system`, `tools`, or earlier messages and resending thinking blocks can 400. Mid-conversation, put new instructions in the newest turn or a mid-conversation system message.

| Symptom | Section |
|---|---|
| Unsure which effort level / easy requests too slow | Calibrate effort |
| Turn ends before work is done | Finish the whole task |
| Approval rules / approving steps | Approvals |
| Agent duplicates code instead of merging; reports nearby bugs without fixing | Say who owns the code |
| Long agentic turns look silent | Keep users informed |
| Too many subagents | Subagents |
| Asks for approvals it doesn't need, holds back routine work | Keep caution from piling up |
| Migrating prompts from Fable 5.1 / Opus 5.5 | Review old instructions |
| Final reports hard to follow | Make reports easy to follow |
| `stop_reason: "refusal"` | Safeguard refusals |

## Where to start (migration order)

1. Set `effort: high` explicitly; also eval at `medium` and `xhigh`.
2. Read all carried-over system prompts, skills, agent files, memory, notes, harness text. Remove/test items in "Review old instructions".
3. Run your longest agentic tasks; note early stops, needless approvals, silence, over-delegation, additive-not-restructuring code.
4. Apply the fix per behavior, one at a time, measuring effect and tokens.

## Calibrate effort

Default `high`. Re-run your effort sweep; don't carry over settings tuned on Fable 5.1 / Opus 5.5.

- `low` — quick back-and-forth, well-specified, high-volume (fast subagents). Scores near Fable 5.1 at higher effort.
- `medium` — interactive coding, chat, everyday knowledge work.
- `high` — hard coding, research, agentic, long unattended runs. Most capability gain is already here.
- `xhigh` — hardest long-running coding/agentic work where a gain is measured. Many more tokens.
- `max` — ceiling measurement; open-ended science/math. Very slow/expensive.

Notes:
- Lower effort → more early stopping. At `low`/`medium` agentic work, add the "Finishing work" text.
- At `high`+, the model thinks before nearly every reply (even greetings). "Answer directly without deliberating" does **not** stop thinking at `medium`+ — lower effort instead.
- Effort barely changes reply length; control length/tone via the prompt.
- Mix levels: plan at `medium`, raise for unattended parts. Per-message effort change (beta header `mid-conversation-output-config-2026-07-01`) keeps cache; otherwise new top-level `effort` restarts cache.

## Finish the whole task

Paste into system prompt when the model stops early:

```text
# Finishing work
Please avoid stopping while you still owe work the user asked for. Be persistent and do not stop unless needed.

While status notes are welcome, as is clarifying with the user on open decisions, carry on with work that does not depend on the user's answer without unnecessary stops.

If you notice yourself inviting the user to redirect you or offering to wait, instead proceed on the next part of the task. You may meet ordinary obstacles like errors, timeouts, locked files, empty results or failing tools. Diagnose them first, and when they are not real blockers, work through them with the access you have (wait and retry, fix the request, use another tool or source) rather than stopping unnecessarily.

If someone clearly decided something is a hard blocker, such as a file marked not to be touched, access that was intentionally withheld, or a safety guardrail, leave it alone, say plainly what you found, and look for another safe way to finish the task. Stopping before the task is complete is very rarely merited, as in when the task can't move forward without user input, or where the blocker is deliberate and should not be worked past. This does not override the need for confirmation on risky or destructive actions.
```

Keep the distinction: ordinary obstacles → work through; deliberate blockers → leave alone and report. Effect: ~half as many sessions ended with doable work left; ~+30% output tokens. Keep your own confirmation step for risky/irreversible actions.

### Approvals

- Don't send a bare "continue"/"go"/👍. Say exactly what's approved: "Yes, run the migration on the staging database."
- Approval rules are applied as written — name the exact actions they cover. A broad rule like "sending messages to people outside this conversation" made the model hold back ~half of routine requests to colleagues.

## Say who owns the code

Fable 5.2 is very sensitive to ownership framing. Silent or "someone else's code" → adds to existing structure (even duplicating) and reports nearby issues instead of fixing.

To get structural improvement, add:

```text
This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.
```

Effect: merged duplicated code ~50% vs <10%. Costs ~1.5× output tokens, unrequested changes (tests, docs), and changed existing feature behavior in 1 of 6–10 tries (more at higher effort). Summaries omit small changes — **review the diff**. Omit this sentence when the user owns the code and wants minimal change; a scope-limiting rule ("No drive-by refactors") does not cancel it.

## Keep users informed during long turns

First check the client: updates between tool calls are progress-update `thinking` blocks, empty at default `thinking.display: "omitted"`. Set `display: "updates"` (beta `thinking-display-updates-2026-08-18`) or `"summarized"`, and render non-empty thinking blocks.

Options (strongest first):

1. **Harness reminder.** Count consecutive tool steps with no `text` and no non-empty `thinking`. After several, append as a turn-scoped system message (`clear_at: "next_user_message"`, beta `mid-conversation-system-clear-at-2026-08-21`):
   ```text
   The user hasn't heard from you in a while: say in a few words what you're doing, then continue.
   ```
   Roughly halves the longest silent stretch, negligible cost. Leave reminders in `messages` afterwards (removing/rewording edits history and invalidates thinking).
2. **Opening line + updates + recap** (system prompt, ~+20% tokens, human-in-loop use):
   ```text
   Before you start, say in a line what you're about to do; brief updates while you work help the user follow along. Close with a short recap that stands on its own (what you found, what you did, and what's next), so a reader who only sees the last message has the full picture.
   ```
3. **No harness control:**
   ```text
   Every few tool calls, give the user a one-line update on where things stand.
   ```

Expect gaps anyway; matters less for async long-running tasks.

## Set expectations for subagents

Delegation depends on harness: rare with a minimal spawn tool, frequent if prompts invite it.

- First review lines in system prompts/skills/agent files that tell it to delegate.
- Only then, if still over-delegating, rewrite the spawn-tool description to: (1) state cost first, (2) say when delegation is/isn't worth it, (3) say how to brief a subagent. Tested version cut delegation ~⅓ with same success.
- Tune: less cost talk if it under-delegates, more if over-delegates.
- At `xhigh`/`max` it may use subagents to review its own work. Works well as planner/orchestrator. Check which model subagents default to.

## Keep caution from piling up

Cautions accumulate in memory, notes, instruction files, inter-agent messages; Fable 5.2 obeys them closely (esp. multi-agent setups).

- **Remove stale notes.** One old "never retry" note dropped retries from ~all to ~40%.
- **Name steps that need no approval** explicitly (e.g. list retries — only for safe-to-repeat calls). A general "act more freely" did nothing; an explicit list raised retries from ~0 to ~50%.
- **Check what reviewer agents attach** (e.g. "stop at the first error" suppressed retries).
- **Write the exception into the rule itself.** "Never X" + separate "approved steps are OK" → ~1/10 compliance. Rule that says "get a go-ahead first before X" → ~9/10.
- Keep your own confirmation for risky/irreversible actions.

## Review instructions written for earlier models

Reconsider/remove:

- **Standing delegate instructions** in prompts/skills/agent files.
- **Token budgets written into the prompt** by the harness — removing a large one lowered cost with equal performance. (Not about API task budgets.)
- **Harness code editing earlier turns** — invalidates preserved thinking → 400 (Messages API) or dropped blocks (Batches). Keep history append-only; use context editing or compaction (no earlier turns kept after summary). Option: `thinking.block_binding.prefix_mismatch_behavior: "drop_block"` (beta `thinking-binding-controls-2026-08-01`), but dropped thinking raises output tokens — measure.
- **Opus 5.5 "treat that answer as done" lines** — reduce thinking but make the model far less likely to flag its own earlier mistakes. Omit where re-examination matters.
- **"Think less" instructions** — ineffective at `medium`+; lower effort instead.
- **Rigid style rules** (e.g. "one instruction per sentence, ≤20 words") → choppy prose. Remove before adding the reports text.
- **Accumulated rules/notes/memories** — delete cautions whose reason no longer holds; rewrite absolute rules to state scope and reason. If stuck, restart with trimmed memory (keep a copy).

## Make reports easy to follow

For final reports/handoffs, add (and adapt):

```text
# Communicating clearly
Write for an intelligent but low-context reader. The person reading has not seen your tool calls, your reasoning or the files you opened, and may be switching in from other work. Messages should generally be self-contained: the reader should understand what you mean without having to dig for other context. Put the key points in the first few sentences. Practice progressive disclosure in your sentence order, and do not use undefined references and ideas in line 1 that won't make sense until the reader reaches line 12.

Use plain words, and write in clear, understandable full sentences. Do not use a term or abbreviation that you made up during the work. Say what the thing is in a way any reader would understand. Write mostly in the style of ASD-STE100 Simplified Technical English: short sentences, one idea per sentence, active voice, and consistently using the same word for the same thing. Use a paragraph of flowing prose where ideas connect, and keep bullets for lists of separate items. Leave out unnecessary details unless the reader asks and practice concision, but do ensure that your messages have the key context. Aim to make your user-facing text as human-readable and clear as possible.
```

Optionally add length limits or required details.

## Safeguard refusals

Classifiers can return `stop_reason: "refusal"` with `stop_details.category`:

- `cyber` — malware/exploit development
- `bio` — dangerous lab methods
- `frontier_llm` — helping develop competing AI models
- `reasoning_extraction` — asking the model to reproduce its internal reasoning in the response
- `general_harms` — other usage-policy areas

Benign security/life-science work can trip `cyber`/`bio` → Cyber Verification Program / Life Sciences Verification Program (Mythos 5.2 is available to verified orgs). **Remove any prompt/skill/tool text asking the model to write its reasoning in the response**; use `display: "summarized"` and read thinking blocks instead. To retry on another model, see "Refusals, fallback, and billing" in the Fable 5.2 what's-new docs.

## Related docs

- What's new in Fable 5.2: https://platform.claude.com/docs/en/models/fable-5-2/whats-new-fable-5-2
- Migration guide: https://platform.claude.com/docs/en/models/fable-5-2/migration-guide
- General prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Effort: https://platform.claude.com/docs/en/build-with-claude/effort
- Preserved thinking: https://platform.claude.com/docs/en/build-with-claude/preserved-thinking
