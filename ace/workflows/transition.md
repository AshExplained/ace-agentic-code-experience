<required_reading>

**Read these files NOW:**

1. `.ace/PULSE.md`
2. `.ace/BRIEF.md`
3. `.ace/TRACK.md`
4. Current stage's run files (`*-RUN.md`)
5. Current stage's recap files (`*-RECAP.md`)

</required_reading>

<purpose>

Mark current stage complete and advance to next. This is the natural point where progress tracking and BRIEF.md evolution happen.

"Planning next stage" = "current stage is done"

</purpose>

<process>

<step name="load_project_state" priority="first">

Before transition, read project state:

```bash
cat .ace/PULSE.md 2>/dev/null
cat .ace/BRIEF.md 2>/dev/null
```

Parse current position to verify we're transitioning the right stage.
Note accumulated context that may need updating after transition.

</step>

<step name="verify_completion">

Check current stage has all run recaps:

```bash
ls .ace/stages/XX-current/*-RUN.md 2>/dev/null | sort
ls .ace/stages/XX-current/*-RECAP.md 2>/dev/null | sort
```

**Verification logic:**

- Count RUN files
- Count RECAP files
- If counts match: all runs complete
- If counts don't match: incomplete

<config-check>

```bash
cat .ace/config.json 2>/dev/null
```

</config-check>

**If all runs complete:**

<if style="turbo">

```
⚡ Auto-approved: Transition Stage [X] → Stage [X+1]
Stage [X] complete — all [Y] runs finished.

Proceeding to mark done and advance...
```

Proceed directly to cleanup_handoff step.

</if>

<if style="guided" OR="custom with gates.confirm_transition true">

Ask: "Stage [X] complete — all [Y] runs finished. Ready to mark done and move to Stage [X+1]?"

Wait for confirmation before proceeding.

</if>

**If runs incomplete:**

**SAFETY RAIL: always_confirm_destructive applies here.**
Skipping incomplete runs is destructive — ALWAYS prompt regardless of style.

Present:

```
Stage [X] has incomplete runs:
- {stage}.01-RECAP.md ✓ Complete
- {stage}.02-RECAP.md ✗ Missing
- {stage}.03-RECAP.md ✗ Missing

⚠️ Safety rail: Skipping runs requires confirmation (destructive action)

Options:
1. Continue current stage (execute remaining runs)
2. Mark complete anyway (skip remaining runs)
3. Review what's left
```

Wait for user decision.

</step>

<step name="cleanup_handoff">

Check for lingering handoffs:

```bash
ls .ace/stages/XX-current/.continue-here*.md 2>/dev/null
```

If found, delete them — stage is complete, handoffs are stale.

</step>

<step name="update_track">

Update the track file:

```bash
TRACK_FILE=".ace/TRACK.md"
```

Update the file:

- Mark current stage: `[x] Complete`
- Add completion date
- Update run count to final (e.g., "3/3 runs complete")
- Update Progress table
- Keep next stage as `[ ] Not started`

**Example:**

```markdown
## Stages

- [x] Stage 1: Foundation (completed 2025-01-15)
- [ ] Stage 2: Authentication ← Next
- [ ] Stage 3: Core Features

## Progress

| Stage             | Runs Complete | Status      | Completed  |
| ----------------- | ------------- | ----------- | ---------- |
| 1. Foundation     | 3/3           | Complete    | 2025-01-15 |
| 2. Authentication | 0/2           | Not started | -          |
| 3. Core Features  | 0/1           | Not started | -          |
```

</step>

<step name="archive_prompts">

If prompts were generated for the stage, they stay in place.
The `completed/` subfolder pattern from create-meta-prompts handles archival.

</step>

<step name="evolve_brief">

Evolve BRIEF.md to reflect learnings from completed stage.

**Read stage recaps:**

```bash
cat .ace/stages/XX-current/*-RECAP.md
```

**Assess requirement changes:**

1. **Requirements validated?**
   - Any Active requirements shipped in this stage?
   - Move to Validated with stage reference: `- ✓ [Requirement] — Stage X`

2. **Requirements invalidated?**
   - Any Active requirements discovered to be unnecessary or wrong?
   - Move to Out of Scope with reason: `- [Requirement] — [why invalidated]`

3. **Requirements emerged?**
   - Any new requirements discovered during building?
   - Add to Active: `- [ ] [New requirement]`

4. **Decisions to log?**
   - Extract decisions from RECAP.md files
   - Add to Key Decisions table with outcome if known

5. **"What This Is" still accurate?**
   - If the product has meaningfully changed, update the description
   - Keep it current and accurate

**Update BRIEF.md:**

Make the edits inline. Update "Last updated" footer:

```markdown
---
*Last updated: [date] after Stage [X]*
```

**Example evolution:**

Before:

```markdown
### Active

- [ ] JWT authentication
- [ ] Real-time sync < 500ms
- [ ] Offline mode

### Out of Scope

- OAuth2 — complexity not needed for v1
```

After (Stage 2 shipped JWT auth, discovered rate limiting needed):

```markdown
### Validated

- ✓ JWT authentication — Stage 2

### Active

- [ ] Real-time sync < 500ms
- [ ] Offline mode
- [ ] Rate limiting on sync endpoint

### Out of Scope

- OAuth2 — complexity not needed for v1
```

**Step complete when:**

- [ ] Stage recaps reviewed for learnings
- [ ] Validated requirements moved from Active
- [ ] Invalidated requirements moved to Out of Scope with reason
- [ ] Emerged requirements added to Active
- [ ] New decisions logged with rationale
- [ ] "What This Is" updated if product changed
- [ ] "Last updated" footer reflects this transition

</step>

<step name="update_current_position_after_transition">

Update Current Position section in PULSE.md to reflect stage completion and transition.

**Format:**

```markdown
Stage: [next] of [total] ([Next stage name])
Run: Not started
Status: Ready to plan
Last activity: [today] — Stage [X] complete, transitioned to Stage [X+1]

Progress: [updated progress bar]
```

**Instructions:**

- Increment stage number to next stage
- Reset run to "Not started"
- Set status to "Ready to plan"
- Update last activity to describe transition
- Recalculate progress bar based on completed runs

**Example — transitioning from Stage 2 to Stage 3:**

Before:

```markdown
## Current Position

Stage: 2 of 4 (Authentication)
Run: 2 of 2 in current stage
Status: Stage complete
Last activity: 2025-01-20 — Completed 02.02-RUN.md

Progress: ███████░░░ 60%
```

After:

```markdown
## Current Position

Stage: 3 of 4 (Core Features)
Run: Not started
Status: Ready to plan
Last activity: 2025-01-20 — Stage 2 complete, transitioned to Stage 3

Progress: ███████░░░ 60%
```

**Step complete when:**

- [ ] Stage number incremented to next stage
- [ ] Run status reset to "Not started"
- [ ] Status shows "Ready to plan"
- [ ] Last activity describes the transition
- [ ] Progress bar reflects total completed runs

</step>

<step name="update_project_reference">

Update Project Reference section in PULSE.md.

```markdown
## Project Reference

See: .ace/BRIEF.md (updated [today])

**Core value:** [Current core value from BRIEF.md]
**Current focus:** [Next stage name]
```

Update the date and current focus to reflect the transition.

</step>

<step name="review_accumulated_context">

Review and update Accumulated Context section in PULSE.md.

**Decisions:**

- Note recent decisions from this stage (3-5 max)
- Full log lives in BRIEF.md Key Decisions table

**Blockers/Concerns:**

- Review blockers from completed stage
- If addressed in this stage: Remove from list
- If still relevant for future: Keep with "Stage X" prefix
- Add any new concerns from completed stage's recaps

**Example:**

Before:

```markdown
### Blockers/Concerns

- ⚠️ [Stage 1] Database schema not indexed for common queries
- ⚠️ [Stage 2] WebSocket reconnection behavior on flaky networks unknown
```

After (if database indexing was addressed in Stage 2):

```markdown
### Blockers/Concerns

- ⚠️ [Stage 2] WebSocket reconnection behavior on flaky networks unknown
```

**Step complete when:**

- [ ] Recent decisions noted (full log in BRIEF.md)
- [ ] Resolved blockers removed from list
- [ ] Unresolved blockers kept with stage prefix
- [ ] New concerns from completed stage added

</step>

<step name="update_session_continuity_after_transition">

Update Session Continuity section in PULSE.md to reflect transition completion.

**Format:**

```markdown
Last session: [today]
Stopped at: Stage [X] complete, ready to plan Stage [X+1]
Resume file: None
```

**Step complete when:**

- [ ] Last session timestamp updated to current date and time
- [ ] Stopped at describes stage completion and next stage
- [ ] Resume file confirmed as None (transitions don't use resume files)

</step>

<step name="offer_next_stage">

**MANDATORY: Verify milestone status before presenting next steps.**

**Step 1: Read TRACK.md and identify stages in current milestone**

Read the TRACK.md file and extract:
1. Current stage number (the stage just transitioned from)
2. All stage numbers in the current milestone section

To find stages, look for:
- Stage headers: lines starting with `### Stage` or `#### Stage`
- Stage list items: lines like `- [ ] **Stage X:` or `- [x] **Stage X:`

Count total stages and identify the highest stage number in the milestone.

State: "Current stage is {X}. Milestone has {N} stages (highest: {Y})."

**Step 2: Route based on milestone status**

| Condition | Meaning | Action |
|-----------|---------|--------|
| current stage < highest stage | More stages remain | Go to **Route A** |
| current stage = highest stage | Milestone complete | Go to **Route B** |

---

**Route A: More stages remain in milestone**

Read TRACK.md to get the next stage's name and goal.

**If next stage exists:**

<if style="turbo">

```
Stage [X] marked complete.

Next: Stage [X+1] — [Name]

⚡ Auto-continuing: Plan Stage [X+1] in detail
```

Exit skill and invoke SlashCommand("/ace.plan-stage [X+1]")

</if>

<if style="guided" OR="custom with gates.confirm_transition true">

```
## ✓ Stage [X] Complete

---

## ▶ Next Up

**Stage [X+1]: [Name]** — [Goal from TRACK.md]

`/ace.plan-stage [X+1]`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.discuss-stage [X+1]` — gather context first
- `/ace.research-stage [X+1]` — investigate unknowns
- Review track

---
```

</if>

---

**Route B: Milestone complete (all stages done)**

<if style="turbo">

```
Stage {X} marked complete.

🎉 Milestone {version} is 100% complete — all {N} stages finished!

⚡ Auto-continuing: Complete milestone and archive
```

Exit skill and invoke SlashCommand("/ace.complete-milestone {version}")

</if>

<if style="guided" OR="custom with gates.confirm_transition true">

```
## ✓ Stage {X}: {Stage Name} Complete

🎉 Milestone {version} is 100% complete — all {N} stages finished!

---

## ▶ Next Up

**Complete Milestone {version}** — archive and prepare for next

`/ace.complete-milestone {version}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- Review accomplishments before archiving

---
```

</if>

</step>

</process>

<implicit_tracking>
Progress tracking is IMPLICIT: planning stage N implies stages 1-(N-1) complete. No separate progress step—forward motion IS progress.
</implicit_tracking>

<partial_completion>

If user wants to move on but stage isn't fully complete:

```
Stage [X] has incomplete runs:
- {stage}.02-RUN.md (not executed)
- {stage}.03-RUN.md (not executed)

Options:
1. Mark complete anyway (runs weren't needed)
2. Defer work to later stage
3. Stay and finish current stage
```

Respect user judgment — they know if work matters.

**If marking complete with incomplete runs:**

- Update TRACK: "2/3 runs complete" (not "3/3")
- Note in transition message which runs were skipped

</partial_completion>

<success_criteria>

Transition is complete when:

- [ ] Current stage run recaps verified (all exist or user chose to skip)
- [ ] Any stale handoffs deleted
- [ ] TRACK.md updated with completion status and run count
- [ ] BRIEF.md evolved (requirements, decisions, description if needed)
- [ ] PULSE.md updated (position, project reference, context, session)
- [ ] Progress table updated
- [ ] User knows next steps

</success_criteria>
