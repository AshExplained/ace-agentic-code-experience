---
name: ace.add-stage
description: Add stage to end of current milestone in track
argument-hint: <description>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Add a new integer stage to the end of the current milestone in the track.

This command appends sequential stages to the current milestone's stage list, automatically calculating the next stage number based on existing stages.

Purpose: Add planned work discovered during execution that belongs at the end of current milestone.
</objective>

<execution_context>
@.ace/track.md
@.ace/pulse.md
</execution_context>

<process>

<step name="parse_arguments">
Parse the command arguments:
- All arguments become the stage description
- Example: `/ace.add-stage Add authentication` → description = "Add authentication"
- Example: `/ace.add-stage Fix critical performance issues` → description = "Fix critical performance issues"

If no arguments provided:

```
ERROR: Stage description required
Usage: /ace.add-stage <description>
Example: /ace.add-stage Add authentication system
```

Exit.
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

<step name="find_current_milestone">
Parse the track to find the current milestone section:

1. Locate the "## Current Milestone:" heading
2. Extract milestone name and version
3. Identify all stages under this milestone (before next "---" separator or next milestone heading)
4. Parse existing stage numbers (including decimals if present)

Example structure:

```
## Current Milestone: v1.0 Foundation

### Stage 4: Focused Command System
### Stage 5: Path Routing & Validation
### Stage 6: Documentation & Distribution
```

</step>

<step name="calculate_next_stage">
Find the highest integer stage number in the current milestone:

1. Extract all stage numbers from stage headings (### Stage N:)
2. Filter to integer stages only (ignore decimals like 4.1, 4.2)
3. Find the maximum integer value
4. Add 1 to get the next stage number

Example: If stages are 4, 5, 5.1, 6 → next is 7

Format as two-digit: `printf "%02d" $next_stage`
</step>

<step name="generate_slug">
Convert the stage description to a kebab-case slug:

```bash
# Example transformation:
# "Add authentication" → "add-authentication"
# "Fix critical performance issues" → "fix-critical-performance-issues"

slug=$(echo "$description" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
```

Stage directory name: `{two-digit-stage}-{slug}`
Example: `07-add-authentication`
</step>

<step name="create_stage_directory">
Create the stage directory structure:

```bash
stage_dir=".ace/stages/${stage_num}-${slug}"
mkdir -p "$stage_dir"
```

Confirm: "Created directory: $stage_dir"
</step>

<step name="update_track">
Add the new stage entry to the track:

1. Find the insertion point (after last stage in current milestone, before "---" separator)
2. Insert new stage heading:

   ```
   ### Stage {N}: {Description}

   **Goal:** [To be planned]
   **Depends on:** Stage {N-1}
   **Runs:** 0 runs

   Runs:
   - [ ] TBD (run /ace.plan-stage {N} to break down)

   **Details:**
   [To be added during planning]
   ```

3. Write updated track back to file

Preserve all other content exactly (formatting, spacing, other stages).
</step>

<step name="update_pulse">
Update pulse.md to reflect the new stage:

1. Read `.ace/pulse.md`
2. Under "## Current Position" → "**Next Stage:**" add reference to new stage
3. Under "## Accumulated Context" → "### Track Evolution" add entry:
   ```
   - Stage {N} added: {description}
   ```

If "Track Evolution" section doesn't exist, create it.
</step>

<step name="completion">
Present completion summary:

```
Stage {N} added to current milestone:
- Description: {description}
- Directory: .ace/stages/{stage-num}-{slug}/
- Status: Not planned yet

Track updated: {track-path}
Pulse updated: .ace/pulse.md

---

## ▶ Next Up

**Stage {N}: {description}**

`/ace.plan-stage {N}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.add-stage <description>` — add another stage
- Review track

---
```
</step>

</process>

<anti_patterns>

- Don't modify stages outside current milestone
- Don't renumber existing stages
- Don't use decimal numbering (that's /ace.insert-stage)
- Don't create runs yet (that's /ace.plan-stage)
- Don't commit changes (user decides when to commit)
  </anti_patterns>

<success_criteria>
Stage addition is complete when:

- [ ] Stage directory created: `.ace/stages/{NN}-{slug}/`
- [ ] Track updated with new stage entry
- [ ] pulse.md updated with track evolution note
- [ ] New stage appears at end of current milestone
- [ ] Next stage number calculated correctly (ignoring decimals)
- [ ] User informed of next steps
      </success_criteria>
