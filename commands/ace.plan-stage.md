---
name: ace.plan-stage
description: Create detailed execution run for a stage (run.md) with verification loop
argument-hint: "[stage] [--research] [--skip-research] [--gaps] [--skip-verify]"
agent: ace-architect
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - AskUserQuestion
  - mcp__context7__*
---

<objective>
Create executable stage prompts (run.md files) for a track stage with integrated research and verification.

**Default flow:** Research (if needed) → Plan → Verify → Done

**Orchestrator role:** Parse arguments, validate stage, research domain (unless skipped or exists), spawn ace-architect agent, verify runs with ace-plan-reviewer, iterate until runs pass or max iterations reached, present results.

**Why subagents:** Research and planning burn context fast. Verification uses fresh context. User sees the flow between agents in main context.
</objective>

<execution_context>
@~/.claude/ace/references/ui-brand.md
@~/.claude/ace/workflows/plan-stage.md
</execution_context>

<context>
Stage number: $ARGUMENTS (optional - auto-detects next unplanned stage if not provided)

**Flags:**
- `--research` — Force re-research even if research.md exists
- `--skip-research` — Skip research entirely, go straight to planning
- `--gaps` — Gap closure mode (reads proof.md, skips research)
- `--skip-verify` — Skip architect → reviewer verification loop

Normalize stage input in step 2 before any directory lookups.
</context>

<process>
**Follow the plan-stage workflow** from `@~/.claude/ace/workflows/plan-stage.md`.

The workflow handles all planning logic including:

1. **Validate environment** — Check .ace/ exists, resolve horsepower profile
2. **Parse arguments** — Stage number, flags, normalize to zero-padded format
3. **Validate stage** — Confirm stage exists in track.md
4. **Ensure stage directory** — Create if needed, load intel.md early
5. **Handle research** — Scout spawning (unless --skip-research/--gaps/exists)
6. **Handle UI redirect** — Detect UI stages, check for design artifacts, redirect to /ace.design-system if missing
7. **Check existing runs** — Offer replan if runs exist
8. **Read context files** — Inline pulse, track, specs, intel, research, design for architect
9. **Spawn architect** — Create run.md files with planning context
10. **Handle architect return** — Route by completion status
11. **Spawn reviewer** — Verify runs achieve stage goal (unless --skip-verify)
12. **Handle reviewer return** — Pass or route to revision
13. **Revision loop** — Max 3 iterations of architect → reviewer
14. **Present final status** — Route to offer_next
</process>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► STAGE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Stage {X}: {Name}** — {N} run(s) in {M} batch(es)

| Batch | Runs | What it builds |
|------|-------|----------------|
| 1    | 01, 02 | [objectives] |
| 2    | 03     | [objective]  |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute Stage {X}** — run all {N} runs

/ace.run-stage {X}

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .ace/stages/{stage-dir}/*-run.md — review runs
- /ace.plan-stage {X} --research — re-research first

───────────────────────────────────────────────────────────────
</offer_next>

<success_criteria>
- [ ] .ace/ directory validated
- [ ] Stage validated against track
- [ ] Stage directory created if needed
- [ ] intel.md loaded early and passed to ALL agents
- [ ] Research completed (unless --skip-research or --gaps or exists)
- [ ] ace-stage-scout spawned with intel.md (constrains research scope)
- [ ] Existing runs checked
- [ ] ace-architect spawned with context (intel.md + research.md)
- [ ] Runs created (ARCHITECTING COMPLETE or GATE handled)
- [ ] ace-plan-reviewer spawned with intel.md (verifies intel compliance)
- [ ] Verification passed OR user override OR max iterations with user decision
- [ ] UI stages without design artifacts blocked with redirect to /ace.design-system
- [ ] Design context loaded from disk when design artifacts exist
- [ ] User sees status between agent spawns
- [ ] User knows next steps (execute or review)
</success_criteria>
