---
name: ace.start
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
- `.ace/brief.md` — project context
- `.ace/config.json` — workflow preferences
- `.ace/research/` — domain research (optional)
- `.ace/specs.md` — scoped requirements
- `.ace/track.md` — stage structure
- `.ace/pulse.md` — project memory

**After this command:** Run `/ace.plan-stage 1` to start execution.

</objective>

<execution_context>

@~/.claude/ace/references/questioning.md
@~/.claude/ace/references/ui-brand.md
@~/.claude/ace/templates/brief.md
@~/.claude/ace/templates/specs.md
@~/.claude/ace/workflows/initialize-project.md

</execution_context>

<process>
**Follow the initialize-project workflow** from `@~/.claude/ace/workflows/initialize-project.md`.

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

- `.ace/brief.md`
- `.ace/config.json`
- `.ace/research/` (if research selected)
  - `STACK.md`
  - `FEATURES.md`
  - `ARCHITECTURE.md`
  - `PITFALLS.md`
  - `recap.md`
- `.ace/specs.md`
- `.ace/track.md`
- `.ace/pulse.md`

</output>

<success_criteria>

- [ ] .ace/ directory created
- [ ] Git repo initialized
- [ ] Brownfield detection completed
- [ ] Deep questioning completed (threads followed, not rushed)
- [ ] brief.md captures full context → **committed**
- [ ] config.json has workflow style, depth, parallelization → **committed**
- [ ] Research completed (if selected) — 4 parallel agents spawned → **committed**
- [ ] Requirements gathered (from research or conversation)
- [ ] User scoped each category (v1/v2/out of scope)
- [ ] specs.md created with REQ-IDs → **committed**
- [ ] ace-navigator spawned with context
- [ ] Track files written immediately (not draft)
- [ ] User feedback incorporated (if any)
- [ ] track.md created with stages, requirement mappings, success criteria
- [ ] pulse.md initialized
- [ ] specs.md traceability updated
- [ ] User knows next step is `/ace.discuss-stage 1`

**Atomic commits:** Each stage commits its artifacts immediately. If context is lost, artifacts persist.

</success_criteria>
