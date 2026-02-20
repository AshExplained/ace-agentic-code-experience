---
name: renn.start
description: Initialize a new project with deep context gathering and brief.md
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---

<objective>

Initialize a new project through unified flow: questioning → research (optional) → requirements → track.

This is the most leveraged moment in any project. Deep questioning here means better runs, better execution, better outcomes. One command takes you from idea to ready-for-planning.

**Creates:**
- `.renn/brief.md` — project context
- `.renn/config.json` — workflow preferences
- `.renn/research/` — domain research (optional)
- `.renn/specs.md` — scoped requirements
- `.renn/track.md` — stage structure
- `.renn/pulse.md` — project memory

**After this command:** Run `/renn.plan-stage 1` to start execution.

</objective>

<execution_context>

@~/.claude/renn/references/questioning.md
@~/.claude/renn/references/ui-brand.md
@~/.claude/renn/templates/brief.md
@~/.claude/renn/templates/specs.md
@~/.claude/renn/workflows/initialize-project.md

</execution_context>

<process>
**Follow the initialize-project workflow** from `@~/.claude/renn/workflows/initialize-project.md`.

The workflow handles all initialization logic including:

1. **Setup** — Abort if project exists, init git, brownfield detection
2. **Brownfield offer** — Offer codebase mapping if existing code detected
3. **Deep questioning** — Freeform + structured probing to understand project
4. **Write brief.md** — Synthesize context, commit
5. **Workflow preferences** — Style, depth, parallelization, agent settings → config.json
6. **Resolve horsepower** — Model lookup for agent spawning
7. **Research decision** — 4 parallel scouts (stack, features, architecture, pitfalls)
8. **Define requirements** — Category scoping, REQ-IDs, specs.md
9. **Create track** — Navigator agent, stage structure, user approval loop
10. **Done** — Present artifacts and next steps
</process>

<output>

- `.renn/brief.md`
- `.renn/config.json`
- `.renn/research/` (if research selected)
  - `STACK.md`
  - `FEATURES.md`
  - `ARCHITECTURE.md`
  - `PITFALLS.md`
  - `recap.md`
- `.renn/specs.md`
- `.renn/track.md`
- `.renn/pulse.md`

</output>

<success_criteria>

- [ ] .renn/ directory created
- [ ] Git repo initialized
- [ ] Brownfield detection completed
- [ ] Deep questioning completed (threads followed, not rushed)
- [ ] brief.md captures full context → **committed**
- [ ] config.json has workflow style, depth, parallelization → **committed**
- [ ] Research completed (if selected) — 4 parallel agents spawned → **committed**
- [ ] Requirements gathered (from research or conversation)
- [ ] User scoped each category (v1/v2/out of scope)
- [ ] specs.md created with REQ-IDs → **committed**
- [ ] renn-navigator spawned with context
- [ ] Track files written immediately (not draft)
- [ ] User feedback incorporated (if any)
- [ ] track.md created with stages, requirement mappings, success criteria
- [ ] pulse.md initialized
- [ ] specs.md traceability updated
- [ ] User knows next step is `/renn.discuss-stage 1`

**Atomic commits:** Each stage commits its artifacts immediately. If context is lost, artifacts persist.

</success_criteria>
