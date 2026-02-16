---
name: ace.restyle
description: Redesign a stage's visuals without re-planning (keep stylekit or full redo)
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
Redesign a stage's visuals by invoking the design-stage workflow in restyle mode. Requires an existing design (stylekit.yaml) from a prior `/ace.design-stage` run. Skips UX interview by default since restyle is about visual direction, not UX.

Context budget: ~15% orchestrator, fresh 200k per subagent.
</objective>

<execution_context>
@~/.claude/ace/workflows/design-stage.md
@~/.claude/ace/references/ui-brand.md
</execution_context>

<context>
Stage number: $ARGUMENTS

Normalize stage input in step 2 before any directory lookups.
</context>

<process>
**Follow the design-stage workflow** from `@~/.claude/ace/workflows/design-stage.md`.

This command adds `--restyle --skip-ux-interview` semantics to the arguments before the workflow processes them. The `--restyle` flag causes the workflow to:

- **Validate stylekit.yaml exists** -- If no existing design is found, display an error directing the user to run `/ace.design-stage N` first
- **Skip normal mode determination** -- Bypass the standard priority cascade (stylekit exists / DESIGN.md exists / greenfield)
- **Present restyle choice** -- "Keep stylekit (redo screens only)" or "Full redo (new stylekit + screens)"
- **Skip UX interview** -- Restyle is a visual refresh, not a UX rethink; the UX brief from the original design run remains valid

The workflow handles all logic including:

1. **Validate environment** -- Check .ace/ exists, resolve horsepower profile
2. **Parse arguments** -- Stage number + --restyle + --skip-ux-interview flags
3. **Validate stage** -- Confirm stage exists in track.md
4. **Ensure stage directory** -- Create if needed, load intel.md early
5. **Handle research** (optional) -- Check existing, offer to run scout
6. **Detect UI stage** -- UI detection, ERROR if non-UI stage
7. **Handle design (restyle mode)** -- Validate stylekit exists, present restyle choice, execute chosen design pipeline path
8. **Generate implementation guide** -- CSS framework detection + guide
9. **Present final status** -- Restyle-specific banner with next steps
</process>

<offer_next>
Output this markdown directly (not as a code block):

---

ACE > STAGE {X} RESTYLED

Stage {X}: {Name} -- restyle complete

Artifacts:
- Stylekit: .ace/design/stylekit.yaml
- Screens: .ace/design/screens/*.yaml
- Implementation Guide: .ace/design/implementation-guide.md

## Next Up

If your run.md files need updating after the restyle:

/ace.plan-stage {X}

If existing runs are still valid (layout unchanged, only visuals refreshed):

/ace.run-stage {X}

<sub>/clear first -- fresh context window</sub>

---

**Also available:**
- cat .ace/design/stylekit-preview.html -- review design system
- cat .ace/design/screens/*.html -- review screen prototypes
- /ace.design-stage {X} -- full design pipeline (includes UX interview)

---
</offer_next>

<success_criteria>
- [ ] Existing stylekit validated
- [ ] Restyle choice presented and user selected
- [ ] Design pipeline executed in chosen mode
- [ ] Design artifacts updated
- [ ] User directed to next step
</success_criteria>
