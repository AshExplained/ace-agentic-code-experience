---
name: ace.design-stage
description: Run the full design pipeline for a UI stage (UX interview, design system, screen prototypes)
argument-hint: "[stage] [--skip-ux-interview]"
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
Run the full design pipeline for a UI stage. Handles UX interview, UX synthesis, design interview, Phase 1 (stylekit), Phase 2 (screens), implementation guide generation, and design artifact commits. Standalone command that produces the same design artifacts previously produced by plan-stage's integrated design pipeline.

Context budget: ~15% orchestrator, fresh 200k per subagent.
</objective>

<execution_context>
@~/.claude/ace/workflows/design-stage.md
@~/.claude/ace/references/ui-brand.md
</execution_context>

<context>
Stage number: $ARGUMENTS (optional flags)

Normalize stage input in step 2 before any directory lookups.
</context>

<process>
**Follow the design-stage workflow** from `@~/.claude/ace/workflows/design-stage.md`.

The workflow handles all design pipeline logic including:

1. **Validate environment** -- Check .ace/ exists, resolve horsepower profile
2. **Parse arguments** -- Stage number + --skip-ux-interview flag
3. **Validate stage** -- Confirm stage exists in track.md
4. **Ensure stage directory** -- Create if needed, load intel.md early
5. **Handle research** (optional) -- Check existing, offer to run scout
6. **Detect UI stage** -- UI detection, ERROR if non-UI stage
7. **Handle UX interview** -- Dynamic questions from UX.md (unless --skip-ux-interview)
8. **UX synthesis** -- Produce UX brief, persist to file
9. **Handle design** -- Design interview + Phase 1 (stylekit) + Phase 2 (screens)
10. **Generate implementation guide** -- CSS framework detection + guide
11. **Present final status** -- Design-specific banner with next steps
</process>

<offer_next>
Output this markdown directly (not as a code block):

---

ACE > STAGE {X} DESIGNED

Stage {X}: {Name} -- design pipeline complete

Artifacts:
- Stylekit: .ace/design/stylekit.yaml
- Screens: .ace/design/screens/*.yaml
- UX Brief: {STAGE_DIR}/{STAGE}-ux-brief.md
- Implementation Guide: .ace/design/implementation-guide.md

## Next Up

**Plan Stage {X}** -- create implementation runs

/ace.plan-stage {X}

<sub>/clear first -- fresh context window</sub>

---

**Also available:**
- cat .ace/design/stylekit-preview.html -- review design system
- cat .ace/design/screens/*.html -- review screen prototypes
- /ace.design-stage {X} -- re-run design pipeline

---
</offer_next>

<success_criteria>
- [ ] .ace/ directory validated
- [ ] Stage validated against track
- [ ] Stage directory created if needed
- [ ] UI stage detection completed (non-UI stages error)
- [ ] UX interview completed (unless --skip-ux-interview or no UX.md)
- [ ] UX brief synthesized and persisted to file
- [ ] Design interview completed
- [ ] Phase 1 (stylekit) approved
- [ ] Phase 2 (screens) approved
- [ ] Implementation guide generated
- [ ] Design artifacts committed (if commit_docs enabled)
- [ ] User directed to /ace.plan-stage as next step
</success_criteria>
