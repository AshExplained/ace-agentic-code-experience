<purpose>

Mark a shipped milestone as complete. This creates a historical record in milestones.md, performs full brief.md evolution review, reorganizes track.md with milestone groupings, and creates a local git tag.

This is the ritual that separates "development" from "shipped."

</purpose>

<required_reading>

**Read these files NOW:**

1. templates/milestone.md
2. templates/milestone-archive.md
3. `.ace/track.md`
4. `.ace/specs.md`
5. `.ace/brief.md`

</required_reading>

<archival_behavior>

When a milestone completes, this workflow:

1. Extracts full milestone details to `.ace/milestones/[MILESTONE]-track.md`
2. Archives specs to `.ace/milestones/[MILESTONE]-specs.md`
3. Updates track.md to replace milestone details with one-line summary
4. Deletes specs.md (fresh one created for next milestone)
5. Performs full brief.md evolution review
6. Offers to create next milestone inline

**Context Efficiency:** Archives keep track.md constant-size and specs.md milestone-scoped.

**Archive Format:**

**TRACK archive** uses `templates/milestone-archive.md` template with:
- Milestone header (status, stages, date)
- Full stage details from track
- Milestone summary (decisions, issues, technical debt)

**SPECS archive** contains:
- All v1 specs marked complete with outcomes
- Traceability table with final status
- Notes on any specs that changed during milestone

</archival_behavior>

<process>

<step name="verify_readiness">

Check if milestone is truly complete:

```bash
cat .ace/track.md
ls .ace/stages/*/recap.md 2>/dev/null | wc -l
```

**Questions to ask:**

- Which stages belong to this milestone?
- Are all those stages complete (all runs have recaps)?
- Has the work been tested/validated?
- Is this ready to ship/tag?

Present:

```
Milestone: [ID and Name from user, e.g., "M03 Authentication"]

Appears to include:
- Stage 1: Foundation (2/2 runs complete)
- Stage 2: Authentication (2/2 runs complete)
- Stage 3: Core Features (3/3 runs complete)
- Stage 4: Polish (1/1 run complete)

Total: 4 stages, 8 runs, all complete
```

<config-check>

```bash
cat .ace/config.json 2>/dev/null
```

</config-check>

<if style="turbo">

```
Auto-approved: Milestone scope verification

[Show breakdown summary without prompting]

Proceeding to stats gathering...
```

Proceed directly to gather_stats step.

</if>

<if style="guided" OR="custom with gates.confirm_milestone_scope true">

```
Ready to mark this milestone as shipped?
(yes / wait / adjust scope)
```

Wait for confirmation.

If "adjust scope": Ask which stages should be included.
If "wait": Stop, user will return when ready.

</if>

</step>

<step name="gather_stats">

Calculate milestone statistics:

```bash
# Count stages and runs in milestone
# (user specified or detected from track)

# Find git range
git log --oneline --grep="feat(" | head -20

# Count files modified in range
git diff --stat FIRST_COMMIT..LAST_COMMIT | tail -1

# Count LOC (adapt to language)
find . -name "*.swift" -o -name "*.ts" -o -name "*.py" | xargs wc -l 2>/dev/null

# Calculate timeline
git log --format="%ai" FIRST_COMMIT | tail -1  # Start date
git log --format="%ai" LAST_COMMIT | head -1   # End date
```

Present summary:

```
Milestone Stats:
- Stages: [X-Y]
- Runs: [Z] total
- Tasks: [N] total (estimated from stage recaps)
- Files modified: [M]
- Lines of code: [LOC] [language]
- Timeline: [Days] days ([Start] -> [End])
- Git range: feat(XX.XX) -> feat(YY.YY)
```

</step>

<step name="extract_accomplishments">

Read all stage recap.md files in milestone range:

```bash
cat .ace/stages/01-*/01-*-recap.md
cat .ace/stages/02-*/02-*-recap.md
# ... for each stage in milestone
```

From recaps, extract 4-6 key accomplishments.

Present:

```
Key accomplishments for this milestone:
1. [Achievement from stage 1]
2. [Achievement from stage 2]
3. [Achievement from stage 3]
4. [Achievement from stage 4]
5. [Achievement from stage 5]
```

</step>

<step name="create_milestone_entry">

Create or update `.ace/milestones.md`.

If file doesn't exist:

```markdown
# Project Milestones: [Project Name from brief.md]

[New entry]
```

If exists, prepend new entry (reverse chronological order).

Use template from `templates/milestone.md`:

```markdown
## [MILESTONE] [Name] (Shipped: YYYY-MM-DD)

**Delivered:** [One sentence from user]

**Stages completed:** [X-Y] ([Z] runs total)

**Key accomplishments:**

- [List from previous step]

**Stats:**

- [Files] files created/modified
- [LOC] lines of [language]
- [Stages] stages, [Runs] runs, [Tasks] tasks
- [Days] days from [start milestone or start project] to ship

**Git range:** `[FIRST_COMMIT]` -> `[LAST_COMMIT]`

**Tag:** `[MILESTONE]-[slug]`

**What's next:** [Ask user: what's the next goal?]

---
```

</step>

<step name="evolve_brief_full_review">

Perform full brief.md evolution review at milestone completion.

**Read all stage recaps in this milestone:**

```bash
cat .ace/stages/*-*/*-recap.md
```

**Full review checklist:**

1. **Project identity check:**
   - Read the `# Heading` (project name) and `## What This Is` description
   - Cross-reference against `package.json` description (if exists) and `.ace/codebase/ARCHITECTURE.md` (if exists)
   - Does the heading still name the full project, or has it narrowed to a phase/milestone?
   - Does "What This Is" describe the product as it exists today, or an earlier version?
   - Update heading and description if the project has grown beyond what they capture

2. **Core Value check:**
   - Is the stated core value still the right priority?
   - Did shipping reveal a different core value?
   - Update if the ONE thing has shifted

3. **Specs audit:**

   **Validated section:**
   - All Active specs shipped in this milestone -> Move to Validated
   - Format: `- [Spec] -- shipped [MILESTONE]`

   **Active section:**
   - Remove specs that moved to Validated
   - Add any new specs for next milestone
   - Keep specs that weren't addressed yet

   **Out of Scope audit:**
   - Review each item -- is the reasoning still valid?
   - Remove items that lack current relevance
   - Add any specs invalidated during this milestone

4. **Context update:**
   - Current codebase state (LOC, tech stack)
   - User feedback themes (if any)
   - Known issues or technical debt to address

5. **Key Decisions audit:**
   - Extract all decisions from milestone stage recaps
   - Add to Key Decisions table with outcomes where known
   - Mark Good, Revisit, or Pending for each

6. **Constraints check:**
   - Any constraints that changed during development?
   - Update as needed

**Update brief.md:**

Make all edits inline. Update "Last updated" footer:

```markdown
---
*Last updated: [date] after [MILESTONE] milestone*
```

**Step complete when:**

- [ ] "What This Is" reviewed and updated if needed
- [ ] Core Value verified as still correct
- [ ] All shipped specs moved to Validated
- [ ] New specs added to Active for next milestone
- [ ] Out of Scope reasoning audited
- [ ] Context updated with current state
- [ ] All milestone decisions added to Key Decisions
- [ ] "Last updated" footer reflects milestone completion

</step>

<step name="reorganize_track">

Update `.ace/track.md` to group completed milestone stages.

Add milestone headers and collapse completed work:

```markdown
# Track: [Project Name]

## Milestones

- SHIPPED **M01 MVP** -- Stages 1-4 (shipped YYYY-MM-DD)
- SHIPPED **M02 Security** -- Stages 5-6 (shipped YYYY-MM-DD)
- **M03 Redesign** -- Stages 7-10 (in progress)

## Stages

<details>
<summary>SHIPPED M01 MVP (Stages 1-4) -- SHIPPED YYYY-MM-DD</summary>

- [x] Stage 1: Foundation (2/2 runs) -- completed YYYY-MM-DD
- [x] Stage 2: Authentication (2/2 runs) -- completed YYYY-MM-DD
- [x] Stage 3: Core Features (3/3 runs) -- completed YYYY-MM-DD
- [x] Stage 4: Polish (1/1 run) -- completed YYYY-MM-DD

</details>

### M03 [Name] (In Progress / Planned)

- [ ] Stage 7: [Name] ([N] runs)
- [ ] Stage 8: [Name] ([N] runs)

## Progress

| Stage             | Milestone | Runs Complete | Status      | Completed  |
| ----------------- | --------- | ------------- | ----------- | ---------- |
| 1. Foundation     | M01       | 2/2           | Complete    | YYYY-MM-DD |
| 2. Authentication | M01       | 2/2           | Complete    | YYYY-MM-DD |
| 3. Core Features  | M01       | 3/3           | Complete    | YYYY-MM-DD |
| 4. Polish         | M01       | 1/1           | Complete    | YYYY-MM-DD |
| 5. Security Audit | M02       | 0/1           | Not started | -          |
| 6. Hardening      | M02       | 0/2           | Not started | -          |
```

</step>

<step name="archive_milestone">

Extract completed milestone details and create archive file.

**Process:**

1. Create archive file path: `.ace/milestones/[MILESTONE]-track.md`

2. Read `~/.claude/ace/templates/milestone-archive.md` template

3. Extract data from current track.md:
   - All stages belonging to this milestone (by stage number range)
   - Full stage details (goals, runs, dependencies, status)
   - Stage run lists with completion checkmarks

4. Extract data from brief.md:
   - Key decisions made during this milestone
   - Specs that were validated

5. Fill template {{PLACEHOLDERS}}:
   - {{MILESTONE_ID}} -- Milestone identifier (e.g., "M11")
   - {{MILESTONE_NAME}} -- From track.md milestone header
   - {{DATE}} -- Today's date
   - {{STAGE_START}} -- First stage number in milestone
   - {{STAGE_END}} -- Last stage number in milestone
   - {{TOTAL_RUNS}} -- Count of all runs in milestone
   - {{MILESTONE_DESCRIPTION}} -- From track.md overview
   - {{STAGES_SECTION}} -- Full stage details extracted
   - {{DECISIONS_FROM_BRIEF}} -- Key decisions from brief.md
   - {{ISSUES_RESOLVED_DURING_MILESTONE}} -- From recaps

6. Write filled template to `.ace/milestones/[MILESTONE]-track.md`

7. Delete track.md (fresh one created for next milestone):
   ```bash
   rm .ace/track.md
   ```

8. Verify archive exists:
   ```bash
   ls .ace/milestones/[MILESTONE]-track.md
   ```

9. Confirm track archive complete:

   ```
   Track archived to milestones/[MILESTONE]-track.md
   track.md deleted (fresh one for next milestone)
   ```

**Note:** Stage directories (`.ace/stages/`) are NOT deleted. They accumulate across milestones as the raw execution history. Stage numbering continues (M01 stages 1-4, M02 stages 5-8, etc.).

</step>

<step name="archive_specs">

Archive specs and prepare for fresh specs in next milestone.

**Process:**

1. Read current specs.md:
   ```bash
   cat .ace/specs.md
   ```

2. Create archive file: `.ace/milestones/[MILESTONE]-specs.md`

3. Transform specs for archive:
   - Mark all v1 specs as `[x]` complete
   - Add outcome notes where relevant (validated, adjusted, dropped)
   - Update traceability table status to "Complete" for all shipped specs
   - Add "Milestone Summary" section with:
     - Total specs shipped
     - Any specs that changed scope during milestone
     - Any specs dropped and why

4. Write archive file with header:
   ```markdown
   # Specs Archive: [MILESTONE] [Milestone Name]

   **Archived:** [DATE]
   **Status:** SHIPPED

   This is the archived specs for [MILESTONE].
   For current specs, see `.ace/specs.md` (created for next milestone).

   ---

   [Full specs.md content with checkboxes marked complete]

   ---

   ## Milestone Summary

   **Shipped:** [X] of [Y] v1 specs
   **Adjusted:** [list any specs that changed during implementation]
   **Dropped:** [list any specs removed and why]

   ---
   *Archived: [DATE] as part of [MILESTONE] milestone completion*
   ```

5. Delete original specs.md:
   ```bash
   rm .ace/specs.md
   ```

6. Confirm:
   ```
   Specs archived to milestones/[MILESTONE]-specs.md
   specs.md deleted (fresh one needed for next milestone)
   ```

**Important:** The next milestone workflow starts with `/ace.new-milestone` which includes specs definition. brief.md's Validated section carries the cumulative record across milestones.

</step>

<step name="archive_audit">

Move the milestone audit file to the archive (if it exists):

```bash
# Move audit to milestones folder (if exists)
[ -f .ace/[MILESTONE]-MILESTONE-AUDIT.md ] && mv .ace/[MILESTONE]-MILESTONE-AUDIT.md .ace/milestones/
```

Confirm:
```
Audit archived to milestones/[MILESTONE]-MILESTONE-AUDIT.md
```

(Skip silently if no audit file exists -- audit is optional)

</step>

<step name="update_pulse">

Update pulse.md to reflect milestone completion.

**Project Reference:**

```markdown
## Project Reference

See: .ace/brief.md (updated [today])

**Core value:** [Current core value from brief.md]
**Current focus:** [Next milestone or "Planning next milestone"]
```

**Current Position:**

```markdown
Stage: [Next stage] of [Total] ([Stage name])
Run: Not started
Status: Ready to plan
Last activity: [today] -- [MILESTONE] milestone complete

Progress: [updated progress bar]
```

**Accumulated Context:**

- Clear decisions summary (full log in brief.md)
- Clear resolved blockers
- Keep open blockers for next milestone

</step>

<step name="handle_branches">

Check if branching was used and offer merge options.

**Check branching strategy:**

```bash
# Get branching strategy from config
BRANCHING_STRATEGY=$(cat .ace/config.json 2>/dev/null | grep -o '"branching_strategy"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/' || echo "none")
```

**If strategy is "none":** Skip to git_tag step.

**For "stage" strategy -- find stage branches:**

```bash
STAGE_BRANCH_TEMPLATE=$(cat .ace/config.json 2>/dev/null | grep -o '"stage_branch_template"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/' || echo "ace/stage-{stage}-{slug}")

# Extract prefix from template (before first variable)
BRANCH_PREFIX=$(echo "$STAGE_BRANCH_TEMPLATE" | sed 's/{.*//')

# Find all stage branches for this milestone
STAGE_BRANCHES=$(git branch --list "${BRANCH_PREFIX}*" 2>/dev/null | sed 's/^\*//' | tr -d ' ')
```

**For "milestone" strategy -- find milestone branch:**

```bash
MILESTONE_BRANCH_TEMPLATE=$(cat .ace/config.json 2>/dev/null | grep -o '"milestone_branch_template"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/' || echo "ace/{milestone}-{slug}")

# Extract prefix from template
BRANCH_PREFIX=$(echo "$MILESTONE_BRANCH_TEMPLATE" | sed 's/{.*//')

# Find milestone branch
MILESTONE_BRANCH=$(git branch --list "${BRANCH_PREFIX}*" 2>/dev/null | sed 's/^\*//' | tr -d ' ' | head -1)
```

**If no branches found:** Skip to git_tag step.

**If branches exist -- present merge options:**

```
## Git Branches Detected

Branching strategy: {stage/milestone}

Branches found:
{list of branches}

Options:
1. **Merge to main** -- Merge branch(es) to main
2. **Delete without merging** -- Branches already merged or not needed
3. **Keep branches** -- Leave for manual handling
```

Use AskUserQuestion:

```
AskUserQuestion([
  {
    question: "How should branches be handled?",
    header: "Branches",
    multiSelect: false,
    options: [
      { label: "Squash merge (Recommended)", description: "Squash all commits into one clean commit on main" },
      { label: "Merge with history", description: "Preserve all individual commits (--no-ff)" },
      { label: "Delete without merging", description: "Branches already merged or not needed" },
      { label: "Keep branches", description: "Leave branches for manual handling later" }
    ]
  }
])
```

**If "Squash merge":**

```bash
CURRENT_BRANCH=$(git branch --show-current)
git checkout main

# For stage strategy - squash merge each stage branch
if [ "$BRANCHING_STRATEGY" = "stage" ]; then
  for branch in $STAGE_BRANCHES; do
    echo "Squash merging $branch..."
    git merge --squash "$branch"
    git commit -m "feat: $branch for [MILESTONE]"
  done
fi

# For milestone strategy - squash merge milestone branch
if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  echo "Squash merging $MILESTONE_BRANCH..."
  git merge --squash "$MILESTONE_BRANCH"
  git commit -m "feat: $MILESTONE_BRANCH for [MILESTONE]"
fi

git checkout "$CURRENT_BRANCH"
```

Report: "Squash merged branches to main"

**If "Merge with history":**

```bash
CURRENT_BRANCH=$(git branch --show-current)
git checkout main

# For stage strategy - merge each stage branch
if [ "$BRANCHING_STRATEGY" = "stage" ]; then
  for branch in $STAGE_BRANCHES; do
    echo "Merging $branch..."
    git merge --no-ff "$branch" -m "Merge branch '$branch' for [MILESTONE]"
  done
fi

# For milestone strategy - merge milestone branch
if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  echo "Merging $MILESTONE_BRANCH..."
  git merge --no-ff "$MILESTONE_BRANCH" -m "Merge branch '$MILESTONE_BRANCH' for [MILESTONE]"
fi

git checkout "$CURRENT_BRANCH"
```

Report: "Merged branches to main with full history"

**If "Delete without merging":**

```bash
if [ "$BRANCHING_STRATEGY" = "stage" ]; then
  for branch in $STAGE_BRANCHES; do
    git branch -d "$branch" 2>/dev/null || git branch -D "$branch"
  done
fi

if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  git branch -d "$MILESTONE_BRANCH" 2>/dev/null || git branch -D "$MILESTONE_BRANCH"
fi
```

Report: "Deleted branches"

**If "Keep branches":**

Report: "Branches preserved for manual handling"

</step>

<step name="git_tag">

Create a local git tag for the milestone.

**Derive tag name from milestone:**

The tag uses the milestone ID and a kebab-cased slug of the milestone name from track.md.

```bash
# Example: milestone ID = M11, milestone name = "Watch Command"
# Tag = M11-watch-command
TAG_NAME="[MILESTONE_ID]-[kebab-slug-of-name]"
```

**Create the annotated tag locally:**

```bash
git tag -a [TAG_NAME] -m "$(cat <<'EOF'
[MILESTONE] [Name]

Delivered: [One sentence]

Key accomplishments:
- [Item 1]
- [Item 2]
- [Item 3]

See .ace/milestones.md for full details.
EOF
)"
```

Confirm: "Tagged locally: [TAG_NAME]"

**Ask whether to push:**

```
Push tag to remote? The commits it points to may or may not be on origin yet.
(yes / no)
```

If yes:

```bash
git push origin [TAG_NAME]
```

If no: Tag stays local. Can be pushed later manually or by `/ace.ship`.

</step>

<step name="git_commit_milestone">

Commit milestone completion including archive files and deletions.

**Check config:**

```bash
COMMIT_PLANNING_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .ace 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

**If `COMMIT_PLANNING_DOCS=false`:** Skip git operations

**If `COMMIT_PLANNING_DOCS=true` (default):**

```bash
# Stage archive files (new)
git add .ace/milestones/[MILESTONE]-track.md
git add .ace/milestones/[MILESTONE]-specs.md
git add .ace/milestones/[MILESTONE]-MILESTONE-AUDIT.md 2>/dev/null || true

# Stage updated files
git add .ace/milestones.md
git add .ace/brief.md
git add .ace/pulse.md

# Stage deletions
git add -u .ace/

# Commit with descriptive message
git commit -m "$(cat <<'EOF'
chore: complete [MILESTONE] milestone

Archived:
- milestones/[MILESTONE]-track.md
- milestones/[MILESTONE]-specs.md
- milestones/[MILESTONE]-MILESTONE-AUDIT.md (if audit was run)

Deleted (fresh for next milestone):
- track.md
- specs.md

Updated:
- milestones.md (new entry)
- brief.md (specs -> Validated)
- pulse.md (reset for next milestone)

Tagged: [TAG_NAME]
EOF
)"
```

Confirm: "Committed: chore: complete [MILESTONE] milestone"

</step>

<step name="offer_next">

```
[MILESTONE] [Name] complete

Shipped:
- [N] stages ([M] runs, [P] tasks)
- [One sentence of what shipped]

Archived:
- milestones/[MILESTONE]-track.md
- milestones/[MILESTONE]-specs.md

Summary: .ace/milestones.md
Tag: [TAG_NAME]

---

## Next Up

**Ship Your Project** -- deploy to a platform

`/ace.ship`

**Start Next Milestone** -- questioning -> research -> specs -> track

`/ace.new-milestone`

<sub>`/clear` first -> fresh context window</sub>

---
```

</step>

</process>

<milestone_naming>

**Milestone IDs use M-format (M01, M02, M03, etc.):**

This is universal across all projects regardless of versioning strategy. ACE milestones are project management markers, not software version numbers.

- **M01** -- First milestone (often MVP)
- **M02, M03** -- Subsequent milestones
- **M10, M11** -- Higher milestones

**Name conventions:**
- M01 MVP
- M02 Security
- M03 Performance
- M04 Redesign
- M05 iOS Launch

Keep names short (1-2 words describing the focus).

**Tag format:**
- `M01-mvp`
- `M02-security`
- `M11-watch-command`

**Why M-format instead of semver:**
- Semver tags (v1.0, v2.0) may be owned by an external version manager (release-please, semantic-release, changesets, etc.)
- M-format never collides with any versioning scheme
- Works identically for greenfield and brownfield projects
- Milestone tags mark planning boundaries; version tags mark software releases -- separate concerns

</milestone_naming>

<what_qualifies>

**Create milestones for:**
- Initial release (M01)
- Public releases
- Major feature sets shipped
- Before archiving planning

**Don't create milestones for:**
- Every stage completion (too granular)
- Work in progress (wait until shipped)
- Internal dev iterations (unless truly shipped internally)

If uncertain, ask: "Is this deployed/usable/shipped in some form?"
If yes -> milestone. If no -> keep working.

</what_qualifies>

<success_criteria>

Milestone completion is successful when:

- [ ] milestones.md entry created with stats and accomplishments
- [ ] brief.md full evolution review completed
- [ ] All shipped specs moved to Validated in brief.md
- [ ] Key Decisions updated with outcomes
- [ ] track.md reorganized with milestone grouping
- [ ] Track archive created (milestones/[MILESTONE]-track.md)
- [ ] Specs archive created (milestones/[MILESTONE]-specs.md)
- [ ] specs.md deleted (fresh for next milestone)
- [ ] pulse.md updated with fresh project reference
- [ ] Git tag created locally ([MILESTONE]-[slug])
- [ ] User asked about pushing tag to remote
- [ ] Milestone commit made (if commit_docs=true)
- [ ] User knows next step (/ace.new-milestone)

</success_criteria>
