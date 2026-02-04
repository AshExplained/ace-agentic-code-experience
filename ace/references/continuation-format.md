# Continuation Format

Standard format for presenting next steps after completing a command or workflow.

## Core Structure

```
---

## ▶ Next Up

**{identifier}: {name}** — {one-line description}

`{command to copy-paste}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `{alternative option 1}` — description
- `{alternative option 2}` — description

---
```

## Format Rules

1. **Always show what it is** — name + description, never just a command path
2. **Pull context from source** — TRACK.md for stages, RUN.md `<objective>` for runs
3. **Command in inline code** — backticks, easy to copy-paste, renders as clickable link
4. **`/clear` explanation** — always include, keeps it concise but explains why
5. **"Also available" not "Other options"** — sounds more app-like
6. **Visual separators** — `---` above and below to make it stand out

## Variants

### Execute Next Run

```
---

## ▶ Next Up

**02.03: Refresh Token Rotation** — Add /api/auth/refresh with sliding expiry

`/ace.run 2`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- Review run before executing
- `/ace.assumptions 2` — check assumptions

---
```

### Execute Final Run in Stage

Add note that this is the last run and what comes after:

```
---

## ▶ Next Up

**02.03: Refresh Token Rotation** — Add /api/auth/refresh with sliding expiry
<sub>Final run in Stage 2</sub>

`/ace.run 2`

<sub>`/clear` first → fresh context window</sub>

---

**After this completes:**
- Stage 2 → Stage 3 transition
- Next: **Stage 3: Core Features** — User dashboard and settings

---
```

### Plan a Stage

```
---

## ▶ Next Up

**Stage 2: Authentication** — JWT login flow with refresh tokens

`/ace.plan 2`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.scope 2` — gather context first
- `/ace.recon 2` — investigate unknowns
- Review track

---
```

### Stage Complete, Ready for Next

Show completion status before next action:

```
---

## ✓ Stage 2 Complete

3/3 runs executed

## ▶ Next Up

**Stage 3: Core Features** — User dashboard, settings, and data export

`/ace.plan 3`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.scope 3` — gather context first
- `/ace.recon 3` — investigate unknowns
- Review what Stage 2 built

---
```

### Multiple Equal Options

When there's no clear primary action:

```
---

## ▶ Next Up

**Stage 3: Core Features** — User dashboard, settings, and data export

**To plan directly:** `/ace.plan 3`

**To discuss context first:** `/ace.scope 3`

**To research unknowns:** `/ace.recon 3`

<sub>`/clear` first → fresh context window</sub>

---
```

### Milestone Complete

```
---

## 🎉 Milestone v1.0 Complete

All 4 stages shipped

## ▶ Next Up

**Start v1.1** — questioning → research → requirements → track

`/ace.milestone`

<sub>`/clear` first → fresh context window</sub>

---
```

## Pulling Context

### For stages (from TRACK.md):

```markdown
### Stage 2: Authentication
**Goal**: JWT login flow with refresh tokens
```

Extract: `**Stage 2: Authentication** — JWT login flow with refresh tokens`

### For runs (from TRACK.md):

```markdown
Runs:
- [ ] 02.03: Add refresh token rotation
```

Or from RUN.md `<objective>`:

```xml
<objective>
Add refresh token rotation with sliding expiry window.

Purpose: Extend session lifetime without compromising security.
</objective>
```

Extract: `**02.03: Refresh Token Rotation** — Add /api/auth/refresh with sliding expiry`

## Anti-Patterns

### Don't: Command-only (no context)

```
## To Continue

Run `/clear`, then paste:
/ace.run 2
```

User has no idea what 02.03 is about.

### Don't: Missing /clear explanation

```
`/ace.plan 3`

Run /clear first.
```

Doesn't explain why. User might skip it.

### Don't: "Other options" language

```
Other options:
- Review track
```

Sounds like an afterthought. Use "Also available:" instead.

### Don't: Fenced code blocks for commands

```
```
/ace.plan 3
```
```

Fenced blocks inside templates create nesting ambiguity. Use inline backticks instead.
