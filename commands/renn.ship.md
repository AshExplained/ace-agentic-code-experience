---
name: renn.ship
description: Ship your project to a deployment target
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
  - AskUserQuestion
---

<objective>
Prepare and ship your project to a deployment target (Vercel, npm, Railway, etc.).

Reads brief.md for project context, detects stack for smart platform suggestions, and delegates to ship-project workflow.

**Three phases:**
1. ASK -- Present project summary, suggest platforms, user declares target
2. RESEARCH & PLAN -- Investigate target requirements, generate checklist
3. WALK CHECKLIST -- Execute auto items, present gates for human steps, track progress

When `.renn/ship-plan.md` exists from a prior run, offers resume/restart/different-target.
</objective>

<execution_context>
@~/.claude/renn/workflows/ship-project.md
</execution_context>

<context>
$ARGUMENTS

@.renn/pulse.md
@.renn/brief.md
</context>

<process>
**Follow ship-project.md workflow.**
</process>

<success_criteria>
- [ ] Project summary presented from brief.md
- [ ] Smart platform suggestions based on detected stack
- [ ] User declared shipping target (or resumed existing plan)
- [ ] Target persisted to .renn/ship-target.md for Phase 2
- [ ] Scout research spawned for target platform
- [ ] Deployment checklist saved to .renn/ship-plan.md with auto/gate classification
- [ ] Checklist items executed (auto) or presented (gate) with progress tracking
- [ ] Failed steps offer retry/skip/abort recovery
- [ ] Ship workflow completes with summary of results
</success_criteria>
