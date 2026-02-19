---
name: ace.ship
description: Ship your project to a deployment target
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - AskUserQuestion
---

<objective>
Prepare and ship your project to a deployment target (Vercel, npm, Railway, etc.).

Reads brief.md for project context, detects stack for smart platform suggestions, and delegates to ship-project workflow.

**Three phases (Phase 1 active, Phases 2-3 coming in Stages 39-40):**
1. ASK -- Present project summary, suggest platforms, user declares target
2. RESEARCH & PLAN -- Investigate target requirements, generate checklist (Stage 39)
3. WALK CHECKLIST -- Execute/verify each deployment step (Stage 40)

When `.ace/ship-plan.md` exists from a prior run, offers resume/restart/different-target.
</objective>

<execution_context>
@~/.claude/ace/workflows/ship-project.md
</execution_context>

<context>
$ARGUMENTS

@.ace/pulse.md
@.ace/brief.md
</context>

<process>
**Follow ship-project.md workflow.**
</process>

<success_criteria>
- [ ] Project summary presented from brief.md
- [ ] Smart platform suggestions based on detected stack
- [ ] User declared shipping target (or resumed existing plan)
- [ ] Target persisted to .ace/ship-target.md for Phase 2
</success_criteria>
