---
name: renn.continue
description: Resume work from previous session with full context restoration
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
  - SlashCommand
---

<objective>
Restore complete project context and resume work seamlessly from previous session.

Routes to the continue-project workflow which handles:

- pulse.md loading (or reconstruction if missing)
- Gate detection (.continue-here files)
- Incomplete work detection (run.md without recap.md)
- Status presentation
- Context-aware next action routing
</objective>

<execution_context>
@~/.claude/renn/workflows/continue-project.md
</execution_context>

<process>
**Follow the continue-project workflow** from `@~/.claude/renn/workflows/continue-project.md`.

The workflow handles all resumption logic including:

1. Project existence verification
2. pulse.md loading or reconstruction
3. Gate and incomplete work detection
4. Visual status presentation
5. Context-aware option offering (checks intel.md before suggesting plan vs discuss)
6. Routing to appropriate next command
7. Session continuity updates
</process>

<success_criteria>
- [ ] Project context restored from pulse.md (or reconstructed if missing)
- [ ] Gates and incomplete work detected (checked .continue-here files and run.md without recap.md)
- [ ] Visual status and context-aware next actions presented to user
</success_criteria>
