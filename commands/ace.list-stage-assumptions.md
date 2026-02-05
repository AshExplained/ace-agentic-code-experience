---
name: ace.list-stage-assumptions
description: Surface Claude's assumptions about a stage approach before planning
argument-hint: "[stage]"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

<objective>
Analyze a stage and present Claude's assumptions about technical approach, implementation order, scope boundaries, risk areas, and dependencies.

Purpose: Help users see what Claude thinks BEFORE planning begins - enabling course correction early when assumptions are wrong.
Output: Conversational output only (no file creation) - ends with "What do you think?" prompt
</objective>

<execution_context>
@~/.claude/ace/workflows/list-assumptions.md
</execution_context>

<context>
Stage number: $ARGUMENTS (required)

**Load project pulse first:**
@.ace/pulse.md

**Load track:**
@.ace/track.md
</context>

<process>
1. Validate stage number argument (error if missing or invalid)
2. Check if stage exists in track
3. Follow list-assumptions.md workflow (if exists) or:
   - Analyze track description
   - Surface assumptions about: technical approach, implementation order, scope, risks, dependencies
   - Present assumptions clearly
   - Prompt "What do you think?"
4. Gather feedback and offer next steps
</process>

<success_criteria>
- Stage validated against track
- Assumptions surfaced across five areas
- User prompted for feedback
- User knows next steps (discuss context, plan stage, or correct assumptions)
</success_criteria>
