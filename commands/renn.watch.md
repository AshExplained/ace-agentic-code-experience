---
name: ace.watch
description: Set up monitoring for your deployed project
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
Set up monitoring for your deployed project (error tracking, uptime, analytics, etc.).

Reads brief.md and ship-target.md for project context. If no ACE context exists,
asks the user directly for stack and platform info.

**Three phases:**
1. ASK -- Present project context, user selects monitoring scope
2. RESEARCH & PLAN -- Investigate monitoring tools, generate setup checklist
3. WALK CHECKLIST -- Execute auto items, present gates for human steps, track progress

When `.ace/watch-plan.md` exists from a prior run, offers resume/restart/add-more.
</objective>

<execution_context>
@~/.claude/ace/workflows/watch-project.md
</execution_context>

<context>
$ARGUMENTS

@.ace/pulse.md
@.ace/brief.md
</context>

<process>
**Follow watch-project.md workflow.**
</process>

<success_criteria>
- [ ] Project context presented from brief.md/ship-target.md (or asked directly if no ACE context)
- [ ] User selected monitoring scope
- [ ] Monitoring scope persisted to .ace/watch-scope.md
- [ ] Re-watch detection offers resume/restart/add-more when watch-plan.md exists
- [ ] Scout research spawned for monitoring tools (Phase 2)
- [ ] Monitoring checklist saved to .ace/watch-plan.md with auto/gate classification
- [ ] Checklist items executed (auto) or presented (gate) with progress tracking
</success_criteria>
