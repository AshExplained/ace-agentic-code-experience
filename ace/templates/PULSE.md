# Pulse Template

Template for `.ace/pulse.md` — the project's living memory.

---

## File Template

```markdown
# Project Pulse

## Project Reference

See: .ace/brief.md (updated [date])

**Core value:** [One-liner from brief.md Core Value section]
**Current focus:** [Current stage name]

## Current Position

Stage: [X] of [Y] ([Stage name])
Run: [A] of [B] in current stage
Status: [Ready to plan / Planning / Ready to execute / In progress / Stage complete]
Last activity: [YYYY-MM-DD] — [What happened]

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total runs completed: [N]
- Average duration: [X] min
- Total execution time: [X.X] hours

**By Stage:**

| Stage | Runs | Total | Avg/Run |
|-------|------|-------|---------|
| - | - | - | - |

**Recent Trend:**
- Last 5 runs: [durations]
- Trend: [Improving / Stable / Degrading]

*Updated after each run completion*

## Accumulated Context

### Decisions

Decisions are logged in brief.md Key Decisions table.
Recent decisions affecting current work:

- [Stage X]: [Decision summary]
- [Stage Y]: [Decision summary]

### Pending Todos

[From .ace/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

None yet.

## Session Continuity

Last session: [YYYY-MM-DD HH:MM]
Stopped at: [Description of last completed action]
Resume file: [Path to .continue-here*.md if exists, otherwise "None"]
```

<purpose>

pulse.md is the project's short-term memory spanning all stages and sessions.

**Problem it solves:** Information is captured in recaps, issues, and decisions but not systematically consumed. Sessions start without context.

**Solution:** A single, small file that's:
- Read first in every workflow
- Updated after every significant action
- Contains digest of accumulated context
- Enables instant session restoration

</purpose>

<lifecycle>

**Creation:** After track.md is created (during init)
- Reference brief.md (read it for current context)
- Initialize empty accumulated context sections
- Set position to "Stage 1 ready to plan"

**Reading:** First step of every workflow
- status: Present status to user
- plan: Inform planning decisions
- run: Know current position
- transition: Know what's complete

**Writing:** After every significant action
- run: After recap.md created
  - Update position (stage, run, status)
  - Note new decisions (detail in brief.md)
  - Add blockers/concerns
- transition: After stage marked complete
  - Update progress bar
  - Clear resolved blockers
  - Refresh Project Reference date

</lifecycle>

<sections>

### Project Reference
Points to brief.md for full context. Includes:
- Core value (the ONE thing that matters)
- Current focus (which stage)
- Last update date (triggers re-read if stale)

Claude reads brief.md directly for requirements, constraints, and decisions.

### Current Position
Where we are right now:
- Stage X of Y — which stage
- Run A of B — which run within stage
- Status — current state
- Last activity — what happened most recently
- Progress bar — visual indicator of overall completion

Progress calculation: (completed runs) / (total runs across all stages) × 100%

### Performance Metrics
Track execution speed to identify patterns:
- Total runs completed
- Average duration per run
- Per-stage breakdown
- Recent trend (improving/stable/degrading)

Updated after each run completion.

### Accumulated Context

**Decisions:** Reference to brief.md Key Decisions table, plus recent decisions summary for quick access. Full decision log lives in brief.md.

**Pending Todos:** Ideas captured via /ace.add-todo
- Count of pending todos
- Reference to .ace/todos/pending/
- Brief list if few, count if many (e.g., "5 pending todos — see /ace.check-todos")

**Blockers/Concerns:** From "Next Stage Readiness" sections
- Issues that affect future work
- Prefix with originating stage
- Cleared when addressed

### Session Continuity
Enables instant resumption:
- When was last session
- What was last completed
- Is there a .continue-here file to resume from

</sections>

<size_constraint>

Keep pulse.md under 100 lines.

It's a DIGEST, not an archive. If accumulated context grows too large:
- Keep only 3-5 recent decisions in summary (full log in brief.md)
- Keep only active blockers, remove resolved ones

The goal is "read once, know where we are" — if it's too long, that fails.

</size_constraint>
