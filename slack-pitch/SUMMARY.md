# Slack Pitch for Hellhound Audio: Summary

**Goal:** convince the boss to move the 3-person admin team from a mixed group chat to Slack, as one hub for payments, RMS quotes, to-dos, scheduling and a record of finished work.
**Approach:** very visual, bold, bubbly, little text. Show Slack screens and which buttons to press.

---

## 1. Starting point (from ChatGPT)
- A one-page PDF, "Less chasing. More done." It had too much text and was visually flat.
- Research notes, used here for the facts:
  - **Free plan:** channels, threads, search, Google Calendar/Drive apps (10 integrations max), and 90 days of visible history. Anything older than 1 year is deleted.
  - **Pro plan:** US$8.75/user/month on monthly billing (**$26.25/month for 3**), or $7.25/user/month billed annually (**$261/year for 3**). Lists and Workflow Builder need a paid plan.
  - **Routine:** every task has an owner and a due date. Updates go in the thread as **Working / Waiting / Done**, and Done includes the time and a link. A 👍 alone is ambiguous.
  - **Pilot:** 2 weeks. Measure the "is it done?" questions before and during, then review together.

## 2. Pitch PDF: `Slack-Pitch-Hellhound.pdf` (7 pages, landscape)
| # | Page | What it shows |
|---|------|---------------|
| 1 | Cover | "One hub. Every task. Zero chasing." |
| 2 | The problem | The current group chat next to an organized Slack window |
| 3 | Organize | Sidebar with sections 💰 Money / 📋 Work / ✅ Records; numbered steps: ＋ Add channels, Move to section, open Lists |
| 4 | Track | Slack List grouped into Upcoming payments, Quotes to prep in RMS, Important to-dos and Scheduling, with owner, due date, status and a tick box |
| 5 | Prove it | #done-log with dated ✅ Done posts, Google Calendar app daily agenda, November "tasks done" grid |
| 6 | Routine | Post → Working/Waiting → ✅ Done, with an example thread |
| 7 | The ask | Give it 2 weeks · $0 to try · ~$26/month for Pro · what we measure · day-14 review |

Proposed channels: `#payments-due`, `#invoices-paid`, `#quotes-rms`, `#scheduling`, `#todo-important`, `#done-log`, `#decisions`.

Source: `slack-pitch.html`, rendered to PDF with Playwright.

## 3. Video: `video/Why-Slack-45s.mp4` (45 seconds, 1080p, silent)
| Time | Scene |
|------|-------|
| 0–6s | Group-chat messages pile up: "👍 = done… or just seen??" |
| 6–10s | "Sound familiar? There's a better way." |
| 10–18s | Channels and sections slide in, with the setup steps |
| 18–27s | The to-do list fills in by category, and rows get ticked ✅ Done |
| 27–34s | A thread goes Working → Waiting → Done |
| 34–39s | The calendar fills green on the days tasks were finished |
| 39–45s | "One hub. Every task. Give it 2 weeks." · $0 to try · 15-min review on day 14 |

Source: `video/why-slack.html`, captured frame by frame with Playwright and encoded with ffmpeg.

## 4. Caveats
- The Slack screens are **drawn copies, not real screenshots**. Names and amounts are examples.
- **Lists need Pro.** Slack has **no built-in "done" calendar.** The dates come from the time stamps on ✅ Done posts.

## 5. Possible next steps
- Swap in real screenshots from a free test workspace.
- Add a music track to the video, or make a vertical 9:16 version for phones.

## Files (branch `claude/admiring-pascal-44lbax`)
```
slack-pitch/
├── Slack-Pitch-Hellhound.pdf
├── slack-pitch.html
├── SUMMARY.md
└── video/
    ├── Why-Slack-45s.mp4
    ├── why-slack.html
    └── base.css
```
