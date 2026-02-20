# Milestone Archive Template

This template is used by the complete-milestone workflow to create archive files in `.ace/milestones/`.

---

## File Template

# Milestone v{{VERSION}}: {{MILESTONE_NAME}}

**Status:** ✅ SHIPPED {{DATE}}
**Stages:** {{STAGE_START}}-{{STAGE_END}}
**Total Runs:** {{TOTAL_RUNS}}

## Overview

{{MILESTONE_DESCRIPTION}}

## Stages

{{STAGES_SECTION}}

[For each stage in this milestone, include:]

### Stage {{STAGE_NUM}}: {{STAGE_NAME}}

**Goal**: {{STAGE_GOAL}}
**Depends on**: {{DEPENDS_ON}}
**Runs**: {{RUN_COUNT}} runs

Runs:

- [x] {{STAGE}}.01: {{RUN_DESCRIPTION}}
- [x] {{STAGE}}.02: {{RUN_DESCRIPTION}}
      [... all runs ...]

**Details:**
{{STAGE_DETAILS_FROM_TRACK}}

**For decimal stages, include (INSERTED) marker:**

### Stage 2.1: Critical Security Patch (INSERTED)

**Goal**: Fix authentication bypass vulnerability
**Depends on**: Stage 2
**Runs**: 1 run

Runs:

- [x] 02.1.01: Patch auth vulnerability

**Details:**
{{STAGE_DETAILS_FROM_TRACK}}

---

## Milestone Summary

**Decimal Stages:**

- Stage 2.1: Critical Security Patch (inserted after Stage 2 for urgent fix)
- Stage 5.1: Performance Hotfix (inserted after Stage 5 for production issue)

**Key Decisions:**
{{DECISIONS_FROM_PULSE}}
[Example:]

- Decision: Use track.md split (Rationale: Constant context cost)
- Decision: Decimal stage numbering (Rationale: Clear insertion semantics)

**Issues Resolved:**
{{ISSUES_RESOLVED_DURING_MILESTONE}}
[Example:]

- Fixed context overflow at 100+ stages
- Resolved stage insertion confusion

**Issues Deferred:**
{{ISSUES_DEFERRED_TO_LATER}}
[Example:]

- brief-pulse.md tiering (deferred until decisions > 300)

**Technical Debt Incurred:**
{{SHORTCUTS_NEEDING_FUTURE_WORK}}
[Example:]

- Some workflows still have hardcoded paths (fix in Stage 5)

---

_For current project status, see .ace/track.md_

---

## Usage Guidelines

<guidelines>
**When to create milestone archives:**
- After completing all stages in a milestone (v1.0, v1.1, v2.0, etc.)
- Triggered by complete-milestone workflow
- Before planning next milestone work

**How to fill template:**

- Replace {{PLACEHOLDERS}} with actual values
- Extract stage details from track.md
- Document decimal stages with (INSERTED) marker
- Include key decisions from pulse.md or RECAP files
- List issues resolved vs deferred
- Capture technical debt for future reference

**Archive location:**

- Save to `.ace/milestones/v{VERSION}-{NAME}.md`
- Example: `.ace/milestones/v1.0-mvp.md`

**After archiving:**

- Update track.md to collapse completed milestone in `<details>` tag
- Update brief.md to brownfield format with Current State section
- Continue stage numbering in next milestone (never restart at 01)
</guidelines>
