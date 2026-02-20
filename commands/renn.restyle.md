---
name: renn.restyle
description: Redesign a stage's visuals without re-planning (redo screens with existing stylekit)
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
Redesign a stage's visuals by invoking the design-stage workflow in restyle mode. Requires an existing design (stylekit.yaml) from a prior `/renn.design-system` run. Skips UX interview by default since restyle is about visual direction, not UX.

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

This command adds `--restyle --skip-ux-interview` semantics to the arguments before the workflow processes them. The `--restyle` flag causes the workflow to:

- **Validate stylekit.yaml exists** -- If no existing design is found, display an error directing the user to run `/renn.design-system` first
- **Skip normal mode determination** -- Bypass the standard priority cascade (stylekit exists / DESIGN.md exists / greenfield)
- **Set screens-only mode** -- Automatically uses existing stylekit, creates new screen prototypes
- **Skip UX interview** -- Restyle is a visual refresh, not a UX rethink; the UX brief from the original design run remains valid

The workflow handles all logic including:

1. **Validate environment** -- Check .renn/ exists, resolve horsepower profile
2. **Parse arguments** -- Stage number + --restyle + --skip-ux-interview flags
3. **Validate stage** -- Confirm stage exists in track.md
4. **Ensure stage directory** -- Create if needed, load intel.md early
5. **Handle research** (optional) -- Check existing, offer to run scout
6. **Detect UI stage** -- UI detection, ERROR if non-UI stage
7. **Handle design (restyle mode)** -- Validate stylekit exists, set screens-only mode, execute screen design pipeline
8. **Generate implementation guide** -- CSS framework detection + guide
9. **Present final status** -- Restyle-specific banner with next steps
</process>

<offer_next>
Output this markdown directly (not as a code block):

---

RENN > STAGE {X} RESTYLED

Stage {X}: {Name} -- restyle complete

Artifacts:
- Stylekit: .renn/design/stylekit.yaml
- Screens: .renn/design/screens/*.yaml
- Implementation Guide: .renn/design/implementation-guide.md

## Next Up

If your run.md files need updating after the restyle:

/renn.plan-stage {X}

If existing runs are still valid (layout unchanged, only visuals refreshed):

/renn.run-stage {X}

<sub>/clear first -- fresh context window</sub>

---

**Also available:**
- cat .renn/design/stylekit-preview.html -- review design system
- cat .renn/design/screens/*.html -- review screen prototypes
- /renn.design-system -- recreate design system from scratch
- /renn.design-screens {X} -- create new screen prototypes

---
</offer_next>

<success_criteria>
- [ ] Existing stylekit validated
- [ ] Screens-only mode set automatically
- [ ] Design pipeline executed in screens-only mode
- [ ] Design artifacts updated
- [ ] User directed to next step
</success_criteria>
