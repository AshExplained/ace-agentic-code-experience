---
type: prompt
name: renn.complete-milestone
description: Archive completed milestone and prepare for next version
argument-hint: <milestone-id>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Mark milestone {{milestone-id}} complete, archive to milestones/, and update track.md and specs.md.

Purpose: Create historical record of shipped milestone, archive milestone artifacts (track + specs), and prepare for next milestone.
Output: Milestone archived (track + specs), brief.md evolved, local git tag created.
</objective>

<execution_context>
**Load these files NOW (before proceeding):**

- @~/.claude/renn/workflows/complete-milestone.md (main workflow)
- @~/.claude/renn/templates/milestone-archive.md (archive template)
  </execution_context>

<context>
$ARGUMENTS

**Project files:**
- `.renn/track.md`
- `.renn/specs.md`
- `.renn/pulse.md`
- `.renn/brief.md`
</context>

<process>

**Follow complete-milestone.md workflow:**

0. **Check for audit:**

   - Look for `.renn/{{milestone-id}}-MILESTONE-AUDIT.md`
   - If missing or stale: recommend `/renn.audit-milestone` first
   - If audit status is `gaps_found`: recommend `/renn.plan-milestone-gaps` first
   - If audit status is `passed`: proceed to step 1

   ```markdown
   ## Pre-flight Check

   {If no {{milestone-id}}-MILESTONE-AUDIT.md:}
   No milestone audit found. Run `/renn.audit-milestone` first to verify
   specs coverage, cross-stage integration, and E2E flows.

   {If audit has gaps:}
   Milestone audit found gaps. Run `/renn.plan-milestone-gaps` to create
   stages that close the gaps, or proceed anyway to accept as tech debt.

   {If audit passed:}
   Milestone audit passed. Proceeding with completion.
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

   - Create `.renn/milestones/{{milestone-id}}-track.md`
   - Extract full stage details from track.md
   - Fill milestone-archive.md template
   - Update track.md to one-line summary with link

5. **Archive specs:**

   - Create `.renn/milestones/{{milestone-id}}-specs.md`
   - Mark all v1 specs as complete (checkboxes checked)
   - Note spec outcomes (validated, adjusted, dropped)
   - Delete `.renn/specs.md` (fresh one created for next milestone)

6. **Update brief.md:**

   - Full evolution review (What This Is, Core Value, Specs audit, Context, Key Decisions, Constraints)
   - Move shipped specs to Validated
   - Update "Last updated" footer

7. **Tag and commit:**

   - Create local tag: `{{milestone-id}}-[slug]` (e.g., M11-watch-command)
   - Ask about pushing tag to remote
   - Commit archive files (if commit_docs=true)

8. **Offer next steps:**
   - `/renn.ship` -- ship the completed milestone to a deployment target
   - `/renn.new-milestone` -- start next milestone (questioning -> research -> specs -> track)

</process>

<success_criteria>

- Milestone archived to `.renn/milestones/{{milestone-id}}-track.md`
- Specs archived to `.renn/milestones/{{milestone-id}}-specs.md`
- `.renn/specs.md` deleted (fresh for next milestone)
- track.md collapsed to one-line entry
- brief.md updated with current state
- Local git tag created (`{{milestone-id}}-[slug]`)
- User asked about pushing tag to remote
- Commit successful (if commit_docs=true)
- User knows next steps (including need for fresh specs)
  </success_criteria>

<critical_rules>

- **Load workflow first:** Read complete-milestone.md before executing
- **Verify completion:** All stages must have recap.md files
- **User confirmation:** Wait for approval at verification gates
- **Archive before deleting:** Always create archive files before updating/deleting originals
- **One-line summary:** Collapsed milestone in track.md should be single line with link
- **Context efficiency:** Archive keeps track.md and specs.md constant size per milestone
- **Fresh specs:** Next milestone starts with `/renn.new-milestone` which includes specs definition
- **M-format tags only:** Never create semver tags -- version tags belong to the project's version manager, not RENN
  </critical_rules>
