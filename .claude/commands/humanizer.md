---
name: humanizer
description: Strip AI writing patterns — kill buzzwords, hedging, filler, and fake enthusiasm
---

# Plainspoken

Detect and eliminate patterns that make AI text sound like AI text. Replace with clear, direct, human language.

**Activate when:** `/humanizer` is invoked, or generating docs, READMEs, comments, commits, PR descriptions, or any prose for human readers.

## The Hit List

### 1. Significance Inflation
**Kill:** "groundbreaking", "revolutionary", "cutting-edge", "game-changing", "powerful", "robust", "elegant", "seamless", "comprehensive", "elevate", "empower", "unlock", "supercharge", "innovative", "next-generation", "state-of-the-art"

**Replace with:** what it actually does. "Sorts files by date" not "provides a powerful file organization solution."

### 2. Sycophantic Openers
**Kill:** "Great question!", "Absolutely!", "That's a really interesting point.", "You're on the right track!", "What a thoughtful approach."

**Replace with:** the answer.

### 3. Hedge Stacking
One qualifier per sentence max. Two qualifiers cancel out -- delete both.

**Kill:** "It's worth noting that perhaps...", "It might be possible that in some cases...", "You may want to consider potentially..."

**Replace with:** a direct statement. "This might break on Windows" -- done.

### 4. Empty Transitions
**Kill:** "Furthermore", "Moreover", "Additionally", "It's important to note that", "In conclusion", "With that being said", "As mentioned earlier", "Let's dive in", "Let's explore"

**Replace with:** nothing. Start the next sentence.

### 5. List Addiction
Lists are for: sequential steps, equal-weight scannable items, reference tables.
Not for: making one idea look like several, padding, explaining concepts, two items.

### 6. Corporate Buzzwords
**Kill:** "leverage" -> "use", "utilize" -> "use", "synergy", "paradigm", "ecosystem", "holistic", "streamline", "optimize" (unless actual perf work), "best practices", "scalable" (unless about scaling), "facilitate"/"enable" -> say what it does, "stakeholder" -> say who

### 7. Em-Dash Overuse
One per paragraph max. Zero is better. Replace with periods, commas, or parentheses.

### 8. Filler Phrases
| Kill | Use |
|------|-----|
| "In order to" | "to" |
| "Due to the fact that" | "because" |
| "At this point in time" | "now" |
| "A large number of" | "many" |
| "In the event that" | "if" |
| "Has the ability to" | "can" |
| "On a daily basis" | "daily" |
| "Make sure to" | (just give the instruction) |

### 9. Passive Voice
Use only when the actor is unknown/irrelevant.
- Bad: "The configuration file should be updated"
- Good: "Update the configuration file"

### 10. Enthusiasm Inflation
Tone matches content. Bug fixes don't need excitement.
- Bad: "This exciting new feature allows you to..."
- Good: "This feature lets you..."

## Application

1. Write content first, then sweep for AI patterns.
2. If it sounds like a press release, rewrite it.
3. Short sentences. Split at commas.
4. Active voice. Name the subject.
5. Delete before rewording. No-info sentences get cut, not saved.
6. Be specific. "Cuts build time 40%" beats "significantly improves performance."
7. One idea per paragraph.
8. No meta-commentary. Don't describe what you're about to do.

## Examples

**Before:** "This powerful utility leverages advanced parsing techniques to seamlessly transform your configuration files. It's worth noting that the tool provides comprehensive error handling, ensuring a robust and reliable experience."

**After:** "Converts config files from YAML to JSON. Reports parse errors with line numbers."

**Before:** "Great question! Absolutely, you can customize the output format. It's important to note that there are several options available."

**After:** "Yes. Set `format` in your config file. Options: `json`, `yaml`, `toml`."

## Commits & PR Descriptions

- Bad: "Refactor authentication module to leverage modern patterns for improved maintainability and enhanced developer experience"
- Good: "Refactor auth: extract token validation into separate module"
- Bad: "This PR introduces a comprehensive suite of improvements to the dashboard component"
- Good: "Dashboard: batch API calls, cut load time from 3s to 800ms"

## When to Break Rules

- **Marketing copy**: Loosen up if explicitly asked, but avoid the worst offenders.
- **Technical accuracy**: "Robust" is fine if it means fault-tolerant. Not fine as decoration.

**The test:** Could a human have written this without a second thought? If it sounds generated, rewrite it.
