---
name: ace.remove-stage
description: Remove a future stage from track and renumber subsequent stages
argument-hint: <stage-number>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

<objective>
Remove an unstarted future stage from the track and renumber all subsequent stages to maintain a clean, linear sequence.

Purpose: Clean removal of work you've decided not to do, without polluting context with cancelled/deferred markers.
Output: Stage deleted, all subsequent stages renumbered, git commit as historical record.
</objective>

<execution_context>
@.ace/track.md
@.ace/pulse.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>

<step name="parse_arguments">
Parse the command arguments:
- Argument is the stage number to remove (integer or decimal)
- Example: `/ace.remove-stage 17` → stage = 17
- Example: `/ace.remove-stage 16.1` → stage = 16.1

If no argument provided:

```
ERROR: Stage number required
Usage: /ace.remove-stage <stage-number>
Example: /ace.remove-stage 17
```

Exit.
</step>

<step name="load_state">
Load project state:

```bash
cat .ace/pulse.md 2>/dev/null
cat .ace/track.md 2>/dev/null
```

Parse current stage number from pulse.md "Current Position" section.
</step>

<step name="validate_stage_exists">
Verify the target stage exists in track.md:

1. Search for `### Stage {target}:` heading
2. If not found:

   ```
   ERROR: Stage {target} not found in track
   Available stages: [list stage numbers]
   ```

   Exit.
</step>

<step name="validate_future_stage">
Verify the stage is a future stage (not started):

1. Compare target stage to current stage from pulse.md
2. Target must be > current stage number

If target <= current stage:

```
ERROR: Cannot remove Stage {target}

Only future stages can be removed:
- Current stage: {current}
- Stage {target} is current or completed

To abandon current work, use /ace.pause instead.
```

Exit.

3. Check for recap.md files in stage directory:

```bash
ls .ace/stages/{target}-*/*-recap.md 2>/dev/null
```

If any recap.md files exist:

```
ERROR: Stage {target} has completed work

Found executed runs:
- {list of recap.md files}

Cannot remove stages with completed work.
```

Exit.
</step>

<step name="gather_stage_info">
Collect information about the stage being removed:

1. Extract stage name from track.md heading: `### Stage {target}: {Name}`
2. Find stage directory: `.ace/stages/{target}-{slug}/`
3. Find all subsequent stages (integer and decimal) that need renumbering

**Subsequent stage detection:**

For integer stage removal (e.g., 17):
- Find all stages > 17 (integers: 18, 19, 20...)
- Find all decimal stages >= 17.0 and < 18.0 (17.1, 17.2...) → these become 16.x
- Find all decimal stages for subsequent integers (18.1, 19.1...) → renumber with their parent

For decimal stage removal (e.g., 17.1):
- Find all decimal stages > 17.1 and < 18 (17.2, 17.3...) → renumber down
- Integer stages unchanged

List all stages that will be renumbered.
</step>

<step name="confirm_removal">
Present removal summary and confirm:

```
Removing Stage {target}: {Name}

This will:
- Delete: .ace/stages/{target}-{slug}/
- Renumber {N} subsequent stages:
  - Stage 18 → Stage 17
  - Stage 18.1 → Stage 17.1
  - Stage 19 → Stage 18
  [etc.]

Proceed? (y/n)
```

Wait for confirmation.
</step>

<step name="delete_stage_directory">
Delete the target stage directory if it exists:

```bash
if [ -d ".ace/stages/{target}-{slug}" ]; then
  rm -rf ".ace/stages/{target}-{slug}"
  echo "Deleted: .ace/stages/{target}-{slug}/"
fi
```

If directory doesn't exist, note: "No directory to delete (stage not yet created)"
</step>

<step name="renumber_directories">
Rename all subsequent stage directories:

For each stage directory that needs renumbering (in reverse order to avoid conflicts):

```bash
# Example: renaming 18-dashboard to 17-dashboard
mv ".ace/stages/18-dashboard" ".ace/stages/17-dashboard"
```

Process in descending order (20→19, then 19→18, then 18→17) to avoid overwriting.

Also rename decimal stage directories:
- `17.1-fix-bug` → `16.1-fix-bug` (if removing integer 17)
- `17.2-hotfix` → `17.1-hotfix` (if removing decimal 17.1)
</step>

<step name="rename_files_in_directories">
Rename run files inside renumbered directories:

For each renumbered directory, rename files that contain the stage number:

```bash
# Inside 17-dashboard (was 18-dashboard):
mv "18-01-run.md" "17-01-run.md"
mv "18-02-run.md" "17-02-run.md"
mv "18-01-recap.md" "17-01-recap.md"  # if exists
# etc.
```

Also handle intel.md and research.md (these don't have stage prefixes, so no rename needed).
</step>

<step name="update_track">
Update track.md:

1. **Remove the stage section entirely:**
   - Delete from `### Stage {target}:` to the next stage heading (or section end)

2. **Remove from stage list:**
   - Delete line `- [ ] **Stage {target}: {Name}**` or similar

3. **Remove from Progress table:**
   - Delete the row for Stage {target}

4. **Renumber all subsequent stages:**
   - `### Stage 18:` → `### Stage 17:`
   - `- [ ] **Stage 18:` → `- [ ] **Stage 17:`
   - Table rows: `| 18. Dashboard |` → `| 17. Dashboard |`
   - Run references: `18-01:` → `17-01:`

5. **Update dependency references:**
   - `**Depends on:** Stage 18` → `**Depends on:** Stage 17`
   - For the stage that depended on the removed stage:
     - `**Depends on:** Stage 17` (removed) → `**Depends on:** Stage 16`

6. **Renumber decimal stages:**
   - `### Stage 17.1:` → `### Stage 16.1:` (if integer 17 removed)
   - Update all references consistently

Write updated track.md.
</step>

<step name="update_pulse">
Update pulse.md:

1. **Update total stage count:**
   - `Stage: 16 of 20` → `Stage: 16 of 19`

2. **Recalculate progress percentage:**
   - New percentage based on completed runs / new total runs

Do NOT add a "Track Evolution" note - the git commit is the record.

Write updated pulse.md.
</step>

<step name="update_file_contents">
Search for and update stage references inside run files:

```bash
# Find files that reference the old stage numbers
grep -r "Stage 18" .ace/stages/17-*/ 2>/dev/null
grep -r "Stage 19" .ace/stages/18-*/ 2>/dev/null
# etc.
```

Update any internal references to reflect new numbering.
</step>

<step name="commit">
Stage and commit the removal:

**Check config:**

```bash
COMMIT_PLANNING_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .ace 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

**If `COMMIT_PLANNING_DOCS=false`:** Skip git operations

**If `COMMIT_PLANNING_DOCS=true` (default):**

```bash
git add .ace/
git commit -m "chore: remove stage {target} ({original-stage-name})"
```

The commit message preserves the historical record of what was removed.
</step>

<step name="completion">
Present completion summary:

```
Stage {target} ({original-name}) removed.

Changes:
- Deleted: .ace/stages/{target}-{slug}/
- Renumbered: Stages {first-renumbered}-{last-old} → {first-renumbered-1}-{last-new}
- Updated: track.md, pulse.md
- Committed: chore: remove stage {target} ({original-name})

Current track: {total-remaining} stages
Current position: Stage {current} of {new-total}

---

## What's Next

Would you like to:
- `/ace.status` — see updated track status
- Continue with current stage
- Review track

---
```
</step>

</process>

<anti_patterns>

- Don't remove completed stages (have recap.md files)
- Don't remove current or past stages
- Don't leave gaps in numbering - always renumber
- Don't add "removed stage" notes to pulse.md - git commit is the record
- Don't ask about each decimal stage - just renumber them
- Don't modify completed stage directories
</anti_patterns>

<edge_cases>

**Removing a decimal stage (e.g., 17.1):**
- Only affects other decimals in same series (17.2 → 17.1, 17.3 → 17.2)
- Integer stages unchanged
- Simpler operation

**No subsequent stages to renumber:**
- Removing the last stage (e.g., Stage 20 when that's the end)
- Just delete and update track.md, no renumbering needed

**Stage directory doesn't exist:**
- Stage may be in track.md but directory not created yet
- Skip directory deletion, proceed with track.md updates

**Decimal stages under removed integer:**
- Removing Stage 17 when 17.1, 17.2 exist
- 17.1 → 16.1, 17.2 → 16.2
- They maintain their position in execution order (after current last integer)

</edge_cases>

<success_criteria>
Stage removal is complete when:

- [ ] Target stage validated as future/unstarted
- [ ] Stage directory deleted (if existed)
- [ ] All subsequent stage directories renumbered
- [ ] Files inside directories renamed ({old}-01-run.md → {new}-01-run.md)
- [ ] track.md updated (section removed, all references renumbered)
- [ ] pulse.md updated (stage count, progress percentage)
- [ ] Dependency references updated in subsequent stages
- [ ] Changes committed with descriptive message
- [ ] No gaps in stage numbering
- [ ] User informed of changes
</success_criteria>
