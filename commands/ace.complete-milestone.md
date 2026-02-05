---
type: prompt
name: ace.complete-milestone
description: Archive completed milestone and prepare for next version
argument-hint: <version>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Mark milestone {{version}} complete, archive to milestones/, and update track.md and specs.md.

Purpose: Create historical record of shipped version, archive milestone artifacts (track + specs), and prepare for next milestone.
Output: Milestone archived (track + specs), brief.md evolved, git tagged.
</objective>

<execution_context>
**Load these files NOW (before proceeding):**

- @~/.claude/ace/workflows/ship-milestone.md (main workflow)
- @~/.claude/ace/templates/milestone-archive.md (archive template)
  </execution_context>

<context>
**Project files:**
- `.ace/track.md`
- `.ace/specs.md`
- `.ace/pulse.md`
- `.ace/brief.md`

**User input:**

- Version: {{version}} (e.g., "1.0", "1.1", "2.0")
  </context>

<process>

**Follow ship-milestone.md workflow:**

0. **Check for audit:**

   - Look for `.ace/v{{version}}-MILESTONE-AUDIT.md`
   - If missing or stale: recommend `/ace.audit-milestone` first
   - If audit status is `gaps_found`: recommend `/ace.plan-milestone-gaps` first
   - If audit status is `passed`: proceed to step 1

   ```markdown
   ## Pre-flight Check

   {If no v{{version}}-MILESTONE-AUDIT.md:}
   ⚠ No milestone audit found. Run `/ace.audit-milestone` first to verify
   specs coverage, cross-stage integration, and E2E flows.

   {If audit has gaps:}
   ⚠ Milestone audit found gaps. Run `/ace.plan-milestone-gaps` to create
   stages that close the gaps, or proceed anyway to accept as tech debt.

   {If audit passed:}
   ✓ Milestone audit passed. Proceeding with completion.
   ```

1. **Verify readiness:**

   - Check all stages in milestone have completed runs (recap.md exists)
   - Present milestone scope and stats
   - Wait for confirmation

2. **Gather stats:**

   - Count stages, runs, tasks
   - Calculate git range, file changes, LOC
   - Extract timeline from git log
   - Present summary, confirm

3. **Extract accomplishments:**

   - Read all stage recap.md files in milestone range
   - Extract 4-6 key accomplishments
   - Present for approval

4. **Archive milestone:**

   - Create `.ace/milestones/v{{version}}-track.md`
   - Extract full stage details from track.md
   - Fill milestone-archive.md template
   - Update track.md to one-line summary with link

5. **Archive specs:**

   - Create `.ace/milestones/v{{version}}-specs.md`
   - Mark all v1 specs as complete (checkboxes checked)
   - Note spec outcomes (validated, adjusted, dropped)
   - Delete `.ace/specs.md` (fresh one created for next milestone)

6. **Update brief.md:**

   - Add "Current State" section with shipped version
   - Add "Next Milestone Goals" section
   - Archive previous content in `<details>` (if v1.1+)

7. **Commit and tag:**

   - Stage: milestones.md, brief.md, track.md, pulse.md, archive files
   - Commit: `chore: archive v{{version}} milestone`
   - Tag: `git tag -a v{{version}} -m "[milestone summary]"`
   - Ask about pushing tag

8. **Offer next steps:**
   - `/ace.new-milestone` — start next milestone (questioning → research → specs → track)

</process>

<success_criteria>

- Milestone archived to `.ace/milestones/v{{version}}-track.md`
- Specs archived to `.ace/milestones/v{{version}}-specs.md`
- `.ace/specs.md` deleted (fresh for next milestone)
- track.md collapsed to one-line entry
- brief.md updated with current state
- Git tag v{{version}} created
- Commit successful
- User knows next steps (including need for fresh specs)
  </success_criteria>

<critical_rules>

- **Load workflow first:** Read ship-milestone.md before executing
- **Verify completion:** All stages must have recap.md files
- **User confirmation:** Wait for approval at verification gates
- **Archive before deleting:** Always create archive files before updating/deleting originals
- **One-line summary:** Collapsed milestone in track.md should be single line with link
- **Context efficiency:** Archive keeps track.md and specs.md constant size per milestone
- **Fresh specs:** Next milestone starts with `/ace.new-milestone` which includes specs definition
  </critical_rules>
