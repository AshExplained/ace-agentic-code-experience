---
name: ace.insert-stage
description: Insert urgent work as decimal stage (e.g., 72.1) between existing stages
argument-hint: <after> <description>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Insert a decimal stage for urgent work discovered mid-milestone that must be completed between existing integer stages.

Uses decimal numbering (72.1, 72.2, etc.) to preserve the logical sequence of planned stages while accommodating urgent insertions.

Purpose: Handle urgent work discovered during execution without renumbering entire track.
</objective>

<execution_context>
@.ace/track.md
@.ace/pulse.md
</execution_context>

<process>

<step name="parse_arguments">
Parse the command arguments:
- First argument: integer stage number to insert after
- Remaining arguments: stage description

Example: `/ace.insert-stage 72 Fix critical auth bug`
→ after = 72
→ description = "Fix critical auth bug"

Validation:

```bash
if [ $# -lt 2 ]; then
  echo "ERROR: Both stage number and description required"
  echo "Usage: /ace.insert-stage <after> <description>"
  echo "Example: /ace.insert-stage 72 Fix critical auth bug"
  exit 1
fi
```

Parse first argument as integer:

```bash
after_stage=$1
shift
description="$*"

# Validate after_stage is an integer
if ! [[ "$after_stage" =~ ^[0-9]+$ ]]; then
  echo "ERROR: Stage number must be an integer"
  exit 1
fi
```

</step>

<step name="load_track">
Load the track file:

```bash
if [ -f .ace/track.md ]; then
  TRACK=".ace/track.md"
else
  echo "ERROR: No track found (.ace/track.md)"
  exit 1
fi
```

Read track content for parsing.
</step>

<step name="verify_target_stage">
Verify that the target stage exists in the track:

1. Search for "### Stage {after_stage}:" heading
2. If not found:

   ```
   ERROR: Stage {after_stage} not found in track
   Available stages: [list stage numbers]
   ```

   Exit.

3. Verify stage is in current milestone (not completed/archived)
   </step>

<step name="find_existing_decimals">
Find existing decimal stages after the target stage:

1. Search for all "### Stage {after_stage}.N:" headings
2. Extract decimal suffixes (e.g., for Stage 72: find 72.1, 72.2, 72.3)
3. Find the highest decimal suffix
4. Calculate next decimal: max + 1

Examples:

- Stage 72 with no decimals → next is 72.1
- Stage 72 with 72.1 → next is 72.2
- Stage 72 with 72.1, 72.2 → next is 72.3

Store as: `decimal_stage="$(printf "%02d" $after_stage).${next_decimal}"`
</step>

<step name="generate_slug">
Convert the stage description to a kebab-case slug:

```bash
slug=$(echo "$description" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
```

Stage directory name: `{decimal-stage}-{slug}`
Example: `06.1-fix-critical-auth-bug` (stage 6 insertion)
</step>

<step name="create_stage_directory">
Create the stage directory structure:

```bash
stage_dir=".ace/stages/${decimal_stage}-${slug}"
mkdir -p "$stage_dir"
```

Confirm: "Created directory: $stage_dir"
</step>

<step name="update_track">
Insert the new stage entry into the track:

1. Find insertion point: immediately after Stage {after_stage}'s content (before next stage heading or "---")
2. Insert new stage heading with (INSERTED) marker:

   ```
   ### Stage {decimal_stage}: {Description} (INSERTED)

   **Goal:** [Urgent work - to be planned]
   **Depends on:** Stage {after_stage}
   **Runs:** 0 runs

   Runs:
   - [ ] TBD (run /ace.plan-stage {decimal_stage} to break down)

   **Details:**
   [To be added during planning]
   ```

3. Write updated track back to file

The "(INSERTED)" marker helps identify decimal stages as urgent insertions.

Preserve all other content exactly (formatting, spacing, other stages).
</step>

<step name="update_pulse">
Update pulse.md to reflect the inserted stage:

1. Read `.ace/pulse.md`
2. Under "## Accumulated Context" → "### Track Evolution" add entry:
   ```
   - Stage {decimal_stage} inserted after Stage {after_stage}: {description} (URGENT)
   ```

If "Track Evolution" section doesn't exist, create it.

Add note about insertion reason if appropriate.
</step>

<step name="completion">
Present completion summary:

```
Stage {decimal_stage} inserted after Stage {after_stage}:
- Description: {description}
- Directory: .ace/stages/{decimal-stage}-{slug}/
- Status: Not planned yet
- Marker: (INSERTED) - indicates urgent work

Track updated: {track-path}
Pulse updated: .ace/pulse.md

---

## ▶ Next Up

**Stage {decimal_stage}: {description}** — urgent insertion

`/ace.plan-stage {decimal_stage}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- Review insertion impact: Check if Stage {next_integer} dependencies still make sense
- Review track

---
```
</step>

</process>

<anti_patterns>

- Don't use this for planned work at end of milestone (use /ace.add-stage)
- Don't insert before Stage 1 (decimal 0.1 makes no sense)
- Don't renumber existing stages
- Don't modify the target stage content
- Don't create runs yet (that's /ace.plan-stage)
- Don't commit changes (user decides when to commit)
  </anti_patterns>

<success_criteria>
Stage insertion is complete when:

- [ ] Stage directory created: `.ace/stages/{N.M}-{slug}/`
- [ ] Track updated with new stage entry (includes "(INSERTED)" marker)
- [ ] Stage inserted in correct position (after target stage, before next integer stage)
- [ ] pulse.md updated with track evolution note
- [ ] Decimal number calculated correctly (based on existing decimals)
- [ ] User informed of next steps and dependency implications
      </success_criteria>
