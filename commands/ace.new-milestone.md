---
name: ace.new-milestone
description: Start a new milestone cycle — update brief.md and route to requirements
argument-hint: "[milestone name, e.g., 'v1.1 Notifications']"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---

<objective>
Start a new milestone through unified flow: questioning → research (optional) → requirements → track.

This is the brownfield equivalent of ace.start. The project exists, brief.md has history. This command gathers "what's next", updates brief.md, then continues through the full requirements → track cycle.

**Creates/Updates:**
- `.ace/brief.md` — updated with new milestone goals
- `.ace/research/` — domain research (optional, focuses on NEW features)
- `.ace/specs.md` — scoped requirements for this milestone
- `.ace/track.md` — stage structure (continues numbering)
- `.ace/pulse.md` — reset for new milestone

**After this command:** Run `/ace.plan-stage [N]` to start execution.
</objective>

<execution_context>
@~/.claude/ace/references/questioning.md
@~/.claude/ace/references/ui-brand.md
@~/.claude/ace/templates/brief.md
@~/.claude/ace/templates/specs.md
@~/.claude/ace/workflows/new-milestone.md
</execution_context>

<context>
Milestone name: $ARGUMENTS (optional - will prompt if not provided)

**Load project context:**
@.ace/brief.md
@.ace/pulse.md
@.ace/milestones.md
@.ace/config.json

</context>

<process>
**Follow the new-milestone workflow** from `@~/.claude/ace/workflows/new-milestone.md`.

The workflow handles all milestone initialization logic including:

1. **Load context** — Read brief.md, milestones.md, pulse.md
2. **Gather milestone goals** — Present last milestone, explore new features
3. **Determine milestone version** — Parse last version, suggest next, confirm
4. **Update brief.md** — Add Current Milestone section, update requirements
5. **Update pulse.md** — Reset position, keep accumulated context
6. **Cleanup and commit** — Commit brief.md and pulse.md updates
7. **Resolve horsepower** — Model lookup for agent spawning
8. **Research decision** — 4 parallel milestone-aware scouts
9. **Define requirements** — Category scoping, REQ-IDs, specs.md
10. **Create track** — Navigator agent with continued stage numbering
11. **Done** — Present artifacts and next steps
</process>

<success_criteria>
- [ ] brief.md updated with Current Milestone section
- [ ] pulse.md reset for new milestone
- [ ] Research completed (if selected) — 4 parallel agents spawned, milestone-aware
- [ ] Requirements gathered (from research or conversation)
- [ ] User scoped each category
- [ ] specs.md created with REQ-IDs
- [ ] ace-navigator spawned with stage numbering context
- [ ] Track files written immediately (not draft)
- [ ] User feedback incorporated (if any)
- [ ] track.md created with stages continuing from previous milestone
- [ ] All commits made (if planning docs committed)
- [ ] User knows next step is `/ace.discuss-stage [N]`

**Atomic commits:** Each stage commits its artifacts immediately. If context is lost, artifacts persist.
</success_criteria>
