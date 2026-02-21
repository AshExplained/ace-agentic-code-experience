<ui_patterns>

Visual patterns for user-facing RENN output. Orchestrators @-reference this file.

## Brand Identity

- **Name:** RENN (uppercase in prose, lowercase in code/CLI)
- **Tagline:** "Grow ideas into shipped software"
- **Symbol:** Cherry Blossom 🌸 (U+1F338)
- **Philosophy:** From mud to lotus through structured runs

### Color Palette

| Role | ANSI Code | Hex | Usage |
|------|-----------|-----|-------|
| Primary | `\e[38;5;218m` | #FFB7C5 | Banner text, highlights |
| Secondary | `\e[38;5;255m` | #EEEEEE | Body text |
| Accent | `\e[38;5;213m` | #FF79C6 | Status symbols, emphasis |
| Success | `\e[38;5;114m` | #98C379 | Completion indicators |
| Warning | `\e[38;5;221m` | #E5C07B | Caution states |
| Error | `\e[38;5;204m` | #E06C75 | Failure states |
| Dim | `\e[38;5;245m` | #8C8C8C | Muted text, hints |

### Naming Rules

- **Prose/docs:** RENN (uppercase)
- **CLI commands:** `renn` (lowercase)
- **Slash commands:** `/renn.command-name`
- **Agents:** `renn-agent-name`
- **Package name:** `renn`

---

## Stage Banners

Use for major workflow transitions.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RENN > {STAGE NAME}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Stage names (uppercase):**
- `QUESTIONING`
- `RESEARCHING`
- `DEFINING REQUIREMENTS`
- `CREATING TRACK`
- `PLANNING STAGE {N}`
- `EXECUTING BATCH {N}`
- `VERIFYING`
- `STAGE {N} COMPLETE ✓`
- `🌸 MILESTONE COMPLETE`

---

## Gate Boxes

User action required.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ⚠️  GATE: {Type}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{Content}

──────────────────────────────────────────────────────
→ {ACTION PROMPT}
──────────────────────────────────────────────────────
```

**Types:**
- `⚠️  GATE: Verification Required` → `→ Type "approved" or describe issues`
- `⚠️  GATE: Decision Required` → `→ Select: option-a / option-b`
- `⚠️  GATE: Action Required` → `→ Type "done" when complete`

---

## Status Symbols

```
✓  Complete / Passed / Verified
✗  Failed / Missing / Blocked
◆  In Progress
○  Pending
⚡ Auto-approved
⚠  Warning
🌸 Milestone complete (only in banner)
⚠️  Gate (only in gate banner)
❌ Error (only in error banner)
```

---

## Progress Display

**Stage/milestone level:**
```
Progress: ████████░░ 80%
```

**Task level:**
```
Tasks: 2/4 complete
```

**Run level:**
```
Runs: 3/5 complete
```

---

## Spawning Indicators

```
◆ Spawning scout...

◆ Spawning 4 scouts in parallel...
  → Stack research
  → Features research
  → Architecture research
  → Pitfalls research

✓ Scout complete: STACK.md written
```

---

## Next Up Block

Always at end of major completions.

```
───────────────────────────────────────────────────────────────

## ▶ Next Up

**{Identifier}: {Name}** — {one-line description}

`{copy-paste command}`

<sub>`/clear` first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- `/renn.alternative-1` — description
- `/renn.alternative-2` — description

───────────────────────────────────────────────────────────────
```

---

## Error Box

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ❌ ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{Error description}

**To fix:** {Resolution steps}
```

---

## Tables

```
| Stage | Status | Runs  | Progress |
|-------|--------|-------|----------|
| 1     | ✓      | 3/3   | 100%     |
| 2     | ◆      | 1/4   | 25%      |
| 3     | ○      | 0/2   | 0%       |
```

---

## Anti-Patterns

- Varying box/banner widths
- Mixing banner styles (`===`, `---`, `***`)
- Skipping `RENN >` prefix in banners
- Random emoji (`🚀`, `✨`, `💫`) — only 🌸, ⚠️, ❌ are allowed
- Using emoji in stage banners other than milestone complete
- Missing Next Up block after completions

</ui_patterns>
