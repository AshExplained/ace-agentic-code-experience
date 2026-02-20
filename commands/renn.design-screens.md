---
name: renn.design-screens
description: Create screen prototypes using existing design system
argument-hint: "<stage>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

<objective>
Create screen prototypes for a UI stage using the existing design system. Runs Phase 2 of the design pipeline only: validates stylekit.yaml exists, loads UX brief and research from disk, runs screen creation + reviewer + approval + commit, generates implementation guide and commits it. Requires a prior `/renn.design-system` run. Stops after completion and directs user to `/renn.plan-stage N`.

Context budget: ~15% orchestrator, fresh 200k per subagent.
</objective>

<execution_context>
@~/.claude/renn/workflows/design-stage.md
@~/.claude/renn/references/ui-brand.md
</execution_context>

<context>
Stage number: $ARGUMENTS

Normalize stage input in step 2 before any directory lookups.
</context>

<process>
**Follow the design-stage workflow** from `@~/.claude/renn/workflows/design-stage.md`.

This command adds `--phase-2-only --skip-ux-interview` semantics to the arguments before the workflow processes them. The `--phase-2-only` flag causes the workflow to:

- Validate stylekit.yaml exists (ERROR if missing: "Run /renn.design-system first")
- Skip research, UX interview, UX synthesis, design interview, Phase 1
- Read UX brief from disk (persisted by prior /renn.design-system run)
- Read research from disk (if exists from prior research)
- Execute Phase 2: screen creation + reviewer + approval + commit
- Generate implementation guide and commit it
- Route to the command's offer_next section

The `--skip-ux-interview` flag is composed because the UX interview already happened during `renn.design-system`.

The workflow handles all design pipeline logic including:

1. **Validate environment** -- Check .renn/ exists, resolve horsepower profile
2. **Parse arguments** -- Stage number + --phase-2-only + --skip-ux-interview
3. **Validate stage** -- Confirm stage exists in track.md
4. **Ensure stage directory** -- Create if needed, load intel.md early
5. **Handle research** -- SKIPPED by --phase-2-only (research was done during /renn.design-system)
6. **Detect UI stage** -- SKIPPED by --phase-2-only (user explicitly invoked design command, UI stage is guaranteed)
7. **Handle UX interview** -- SKIPPED by --skip-ux-interview
8. **UX synthesis** -- SKIPPED (no interview answers)
9. **Handle design (Phase 2 only)** -- Mode Determination validates stylekit.yaml, loads UX brief and research from disk, runs Phase 2 (screens + reviewer + approval + commit)
10. **Generate implementation guide**
11. **Commit implementation guide**
12. **Present final status** -- Route to offer_next
</process>

<offer_next>
Output this markdown directly (not as a code block):

---

RENN > STAGE {X} SCREENS COMPLETE

Stage {X}: {Name} -- screen prototypes created

Artifacts:
- Screens: .renn/design/screens/*.yaml
- Prototypes: .renn/design/screens/*.html
- Implementation Guide: .renn/design/implementation-guide.md

## Next Up

**Plan Stage {X}** -- create implementation runs

/renn.plan-stage {X}

<sub>/clear first -- fresh context window</sub>

---

**Also available:**
- cat .renn/design/screens/*.html -- review screen prototypes
- /renn.design-screens {X} -- re-run screen creation

---
</offer_next>

<success_criteria>
- [ ] .renn/ directory validated
- [ ] Stage validated against track
- [ ] Stage directory created if needed
- [ ] stylekit.yaml existence validated (error if missing)
- [ ] UI stage detection bypassed (--phase-2-only sets UI_STAGE=true directly)
- [ ] UX brief loaded from disk
- [ ] Research loaded from disk (if exists)
- [ ] Phase 2 (screens) approved
- [ ] Phase 2 design artifacts committed (if commit_docs enabled)
- [ ] Implementation guide generated
- [ ] Implementation guide committed (if commit_docs enabled)
- [ ] User directed to /renn.plan-stage as next step
</success_criteria>
