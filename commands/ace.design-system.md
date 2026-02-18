---
name: ace.design-system
description: Create project-wide design system (stylekit + components) for all UI stages
argument-hint: "[--skip-ux-interview]"
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
Create the project's design system (stylekit + components) for the entire project by running Phase 1 of the design pipeline. Scans track.md for all UI stages, then handles UX interview, UX synthesis, design interview, Phase 1 (stylekit creation + reviewer + approval), and commit. Stops after Phase 1 and directs user to `/ace.design-screens N` for screen prototypes.

Context budget: ~15% orchestrator, fresh 200k per subagent.
</objective>

<execution_context>
@~/.claude/ace/workflows/design-stage.md
@~/.claude/ace/references/ui-brand.md
</execution_context>

<context>
Optional flags: $ARGUMENTS (e.g., --skip-ux-interview)

This command always runs in project-level mode (no stage number argument).
</context>

<process>
**Follow the design-stage workflow** from `@~/.claude/ace/workflows/design-stage.md`.

This command adds `--phase-1-only` semantics to the arguments before the workflow processes them. The `--phase-1-only` flag causes the workflow to:

- Execute all steps through Phase 1 (validate, UI detection across track.md, UX interview, UX synthesis, design interview, Phase 1 stylekit creation + reviewer + approval + commit)
- STOP after Phase 1 commit -- skip Phase 2, skip implementation guide generation
- Route to the command's `<offer_next>` section

Also pass through `--skip-ux-interview` if present in $ARGUMENTS.

The workflow handles all design pipeline logic including:

1. **Validate environment** -- Check .ace/ exists, resolve horsepower profile
2. **Parse arguments** -- --phase-1-only + optional --skip-ux-interview (no stage number)
3. **Scan track** -- Identify all UI stages in track.md
4. **Validate UI stages** -- Confirm at least one UI stage exists in track.md, error if none found
5. **Handle UX interview** -- Dynamic questions from UX.md (unless --skip-ux-interview)
6. **UX synthesis** -- Produce UX brief, persist to file
7. **Handle design (Phase 1 only)** -- Design interview + Phase 1 (stylekit creation + reviewer + approval + commit) then STOP
8. **Present final status** -- Route to offer_next
</process>

<offer_next>
Output this markdown directly (not as a code block):

---

ACE > PROJECT DESIGN SYSTEM COMPLETE

Design system created for all UI stages

Artifacts:
- Stylekit: .ace/design/stylekit.yaml
- CSS: .ace/design/stylekit.css
- Preview: .ace/design/stylekit-preview.html
- Components: .ace/design/components/
- UX Brief: .ace/design/ux-brief.md

## Next Up

**Design Screens** -- create screen prototypes for each UI stage

/ace.design-screens {N}  (where N is the first UI stage)

<sub>/clear first -- fresh context window</sub>

---

**Also available:**
- cat .ace/design/stylekit-preview.html -- review design system
- /ace.design-system -- re-run design system creation

---
</offer_next>

<success_criteria>
- [ ] .ace/ directory validated
- [ ] Track scanned for UI stages
- [ ] At least one UI stage validated in track.md (error if no UI stages found)
- [ ] UX interview completed (unless --skip-ux-interview or no UX.md)
- [ ] UX brief synthesized and persisted to file
- [ ] Design interview completed
- [ ] Phase 1 (stylekit) approved
- [ ] Phase 1 design artifacts committed (if commit_docs enabled)
- [ ] Command STOPPED after Phase 1 (did NOT continue to Phase 2)
- [ ] User directed to /ace.design-screens as next step
</success_criteria>
</output>
