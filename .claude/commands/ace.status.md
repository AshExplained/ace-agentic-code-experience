---
name: ace.status
description: Check project progress, show context, and route to next action (run or plan)
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Skill
---

<objective>
Check project progress, summarize recent work and what's ahead, then intelligently route to the next action - either executing an existing run or creating the next one.

Provides situational awareness before continuing work.
</objective>


<process>

<step name="verify">
**Verify planning structure exists:**

Use Bash (not Glob) to check—Glob respects .gitignore but .ace/ is often gitignored:

```bash
test -d .ace && echo "exists" || echo "missing"
```

If no `.ace/` directory:

```
No planning structure found.

Run /ace.start to start a new project.
```

Exit.

If missing pulse.md: suggest `/ace.start`.

**If track.md missing but brief.md exists:**

This means a milestone was completed and archived. Go to **Route F** (between milestones).

If missing both track.md and brief.md: suggest `/ace.start`.
</step>

<step name="load">
**Load full project context:**

- Read `.ace/pulse.md` for living memory (position, decisions, issues)
- Read `.ace/track.md` for stage structure and objectives
- Read `.ace/brief.md` for current state (What This Is, Core Value, Requirements)
- Read `.ace/config.json` for settings (horsepower, workflow toggles)
  </step>

<step name="recent">
**Gather recent work context:**

- Find the 2-3 most recent recap.md files
- Extract from each: what was accomplished, key decisions, any issues logged
- This shows "what we've been working on"
  </step>

<step name="position">
**Parse current position:**

- From pulse.md: current stage, run number, status
- Calculate: total runs, completed runs, remaining runs
- Note any blockers or concerns
- Check for intel.md: For stages without run.md files, check if `{stage}-intel.md` exists in stage directory
- Count pending todos: `ls .ace/todos/pending/*.md 2>/dev/null | wc -l`
- Check for active debug sessions: `ls .ace/debug/*.md 2>/dev/null | grep -v resolved | wc -l`
  </step>

<step name="report">
**Present rich status report:**

```
# [Project Name]

**Progress:** [████████░░] 8/10 runs complete
**Profile:** [max/balanced/eco]

## Recent Work
- [Stage X, Run Y]: [what was accomplished - 1 line]
- [Stage X, Run Z]: [what was accomplished - 1 line]

## Current Position
Stage [N] of [total]: [stage-name]
Run [M] of [stage-total]: [status]
INTEL: [✓ if intel.md exists | - if not]

## Key Decisions Made
- [decision 1 from pulse.md]
- [decision 2]

## Blockers/Concerns
- [any blockers or concerns from pulse.md]

## Pending Todos
- [count] pending — /ace.check-todos to review

## Active Debug Sessions
- [count] active — /ace.debug to continue
(Only show this section if count > 0)

## What's Next
[Next stage/run objective from TRACK]
```

</step>

<step name="route">
**Determine next action based on verified counts.**

**Step 1: Count runs, recaps, and issues in current stage**

List files in the current stage directory:

```bash
ls -1 .ace/stages/[current-stage-dir]/*-run.md 2>/dev/null | wc -l
ls -1 .ace/stages/[current-stage-dir]/*-recap.md 2>/dev/null | wc -l
ls -1 .ace/stages/[current-stage-dir]/*-uat.md 2>/dev/null | wc -l
```

State: "This stage has {X} runs, {Y} recaps."

**Step 1.5: Check for unaddressed UAT gaps**

Check for uat.md files with status "diagnosed" (has gaps needing fixes).

```bash
# Check for diagnosed UAT with gaps
grep -l "status: diagnosed" .ace/stages/[current-stage-dir]/*-uat.md 2>/dev/null
```

Track:
- `uat_with_gaps`: uat.md files with status "diagnosed" (gaps need fixing)

**Step 2: Route based on counts**

| Condition | Meaning | Action |
|-----------|---------|--------|
| uat_with_gaps > 0 | UAT gaps need fix runs | Go to **Route E** |
| recaps < runs | Unexecuted runs exist | Go to **Route A** |
| recaps = runs AND runs > 0 | Stage complete | Go to Step 3 |
| runs = 0 | Stage not yet planned | Go to **Route B** |

---

**Route A: Unexecuted run exists**

Find the first run.md without matching recap.md.
Read its `<objective>` section.

```
---

## ▶ Next Up

**{stage}-{run}: [Run Name]** — [objective summary from run.md]

`/ace.run-stage {stage}`

<sub>`/clear` first → fresh context window</sub>

---
```

---

**Route B: Stage needs planning**

Check if `{stage}-intel.md` exists in stage directory.

**If intel.md exists:**

```
---

## ▶ Next Up

**Stage {N}: {Name}** — {Goal from track.md}
<sub>✓ Context gathered, ready to plan</sub>

`/ace.plan-stage {stage-number}`

<sub>`/clear` first → fresh context window</sub>

---
```

**If intel.md does NOT exist:**

```
---

## ▶ Next Up

**Stage {N}: {Name}** — {Goal from track.md}

`/ace.discuss-stage {stage}` — gather context and clarify approach

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.design-system {stage}` — create design system (if UI stage)
- `/ace.plan-stage {stage}` — skip discussion, plan directly
- `/ace.list-stage-assumptions {stage}` — see Claude's assumptions

---
```

---

**Route E: UAT gaps need fix runs**

uat.md exists with gaps (diagnosed issues). User needs to plan fixes.

```
---

## ⚠ UAT Gaps Found

**{stage}-uat.md** has {N} gaps requiring fixes.

`/ace.plan-stage {stage} --gaps`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.run-stage {stage}` — execute stage runs
- `/ace.audit {stage}` — run more UAT testing

---
```

---

**Step 3: Check milestone status (only when stage complete)**

Read track.md and identify:
1. Current stage number
2. All stage numbers in the current milestone section

Count total stages and identify the highest stage number.

State: "Current stage is {X}. Milestone has {N} stages (highest: {Y})."

**Route based on milestone status:**

| Condition | Meaning | Action |
|-----------|---------|--------|
| current stage < highest stage | More stages remain | Go to **Route C** |
| current stage = highest stage | Milestone complete | Go to **Route D** |

---

**Route C: Stage complete, more stages remain**

Read track.md to get the next stage's name and goal.

```
---

## ✓ Stage {Z} Complete

## ▶ Next Up

**Stage {Z+1}: {Name}** — {Goal from track.md}

`/ace.discuss-stage {Z+1}` — gather context and clarify approach

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.design-system {Z+1}` — create design system (if UI stage)
- `/ace.plan-stage {Z+1}` — skip discussion, plan directly
- `/ace.audit {Z}` — user acceptance test before continuing

---
```

---

**Route D: Milestone complete**

```
---

## Milestone Complete

All {N} stages finished!

## ▶ Next Up

**Complete Milestone** — archive and prepare for next

`/ace.complete-milestone`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.audit` — user acceptance test before completing milestone

---
```

---

**Route F: Between milestones (track.md missing, brief.md exists)**

A milestone was completed and archived. Ready to start the next milestone cycle.

Read milestones.md to find the last completed milestone version.

```
---

## ✓ Milestone v{X.Y} Complete

Ready to plan the next milestone.

## ▶ Next Up

**Start Next Milestone** — questioning → research → requirements → track

`/ace.new-milestone`

<sub>`/clear` first → fresh context window</sub>

---
```

</step>

<step name="edge_cases">
**Handle edge cases:**

- Stage complete but next stage not planned → offer `/ace.plan-stage [next]`
- All work complete → offer milestone completion
- Blockers present → highlight before offering to continue
- Handoff file exists → mention it, offer `/ace.continue`
  </step>

</process>

<success_criteria>

- [ ] Rich context provided (recent work, decisions, issues)
- [ ] Current position clear with visual progress
- [ ] What's next clearly explained
- [ ] Smart routing: /ace.run-stage if runs exist, /ace.plan-stage if not
- [ ] User confirms before any action
- [ ] Seamless handoff to appropriate ace command
      </success_criteria>
