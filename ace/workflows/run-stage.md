<purpose>
Execute all runs in a stage using batch-based parallel execution. Orchestrator stays lean by delegating plan execution to subagents.
</purpose>

<core_principle>
The orchestrator's job is coordination, not execution. Each subagent loads the full execute-plan context itself. Orchestrator discovers plans, analyzes dependencies, groups into batchs, spawns agents, handles checkpoints, collects results.
</core_principle>

<required_reading>
Read PULSE.md before any operation to load project context.
Read config.json for planning behavior settings.
</required_reading>

<process>

<step name="resolve_horsepower" priority="first">
Read model profile for agent spawning:

```bash
MODEL_PROFILE=$(cat .ace/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| ace-runner | opus | sonnet | sonnet |
| ace-auditor | sonnet | sonnet | haiku |
| general-purpose | — | — | — |

Store resolved models for use in Task calls below.
</step>

<step name="load_project_state">
Before any operation, read project state:

```bash
cat .ace/PULSE.md 2>/dev/null
```

**If file exists:** Parse and internalize:
- Current position (stage, run, status)
- Accumulated decisions (constraints on this execution)
- Blockers/concerns (things to watch for)

**If file missing but .ace/ exists:**
```
PULSE.md missing but planning artifacts exist.
Options:
1. Reconstruct from existing artifacts
2. Continue without project state (may lose accumulated context)
```

**If .ace/ doesn't exist:** Error - project not initialized.

**Load planning config:**

```bash
# Check if planning docs should be committed (default: true)
COMMIT_PLANNING_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
# Auto-detect gitignored (overrides config)
git check-ignore -q .planning 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

Store `COMMIT_PLANNING_DOCS` for use in git operations.

**Load parallelization config:**

```bash
# Check if parallelization is enabled (default: true)
PARALLELIZATION=$(cat .ace/config.json 2>/dev/null | grep -o '"parallelization"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
```

Store `PARALLELIZATION` for use in batch execution step. When `false`, plans within a batch execute sequentially instead of in parallel.

**Load git branching config:**

```bash
# Get branching strategy (default: none)
BRANCHING_STRATEGY=$(cat .ace/config.json 2>/dev/null | grep -o '"branching_strategy"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/' || echo "none")

# Get templates
STAGE_BRANCH_TEMPLATE=$(cat .ace/config.json 2>/dev/null | grep -o '"stage_branch_template"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/' || echo "ace/stage-{stage}-{slug}")
MILESTONE_BRANCH_TEMPLATE=$(cat .ace/config.json 2>/dev/null | grep -o '"milestone_branch_template"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/' || echo "ace/{milestone}-{slug}")
```

Store `BRANCHING_STRATEGY` and templates for use in branch creation step.
</step>

<step name="handle_branching">
Create or switch to appropriate branch based on branching strategy.

**Skip if strategy is "none":**

```bash
if [ "$BRANCHING_STRATEGY" = "none" ]; then
  # No branching, continue on current branch
  exit 0
fi
```

**For "stage" strategy — create stage branch:**

```bash
if [ "$BRANCHING_STRATEGY" = "stage" ]; then
  # Get stage name from directory (e.g., "03-authentication" → "authentication")
  STAGE_NAME=$(basename "$STAGE_DIR" | sed 's/^[0-9]*-//')

  # Create slug from stage name
  STAGE_SLUG=$(echo "$STAGE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')

  # Apply template
  BRANCH_NAME=$(echo "$STAGE_BRANCH_TEMPLATE" | sed "s/{stage}/$PADDED_STAGE/g" | sed "s/{slug}/$STAGE_SLUG/g")

  # Create or switch to branch
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

  echo "Branch: $BRANCH_NAME (stage branching)"
fi
```

**For "milestone" strategy — create/switch to milestone branch:**

```bash
if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  # Get current milestone info from TRACK.md
  MILESTONE_VERSION=$(grep -oE 'v[0-9]+\.[0-9]+' .ace/TRACK.md | head -1 || echo "v1.0")
  MILESTONE_NAME=$(grep -A1 "## .*$MILESTONE_VERSION" .ace/TRACK.md | tail -1 | sed 's/.*- //' | cut -d'(' -f1 | tr -d ' ' || echo "milestone")

  # Create slug
  MILESTONE_SLUG=$(echo "$MILESTONE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')

  # Apply template
  BRANCH_NAME=$(echo "$MILESTONE_BRANCH_TEMPLATE" | sed "s/{milestone}/$MILESTONE_VERSION/g" | sed "s/{slug}/$MILESTONE_SLUG/g")

  # Create or switch to branch (same branch for all stages in milestone)
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

  echo "Branch: $BRANCH_NAME (milestone branching)"
fi
```

**Report branch status:**

```
Branching: {strategy} → {branch_name}
```

**Note:** All subsequent plan commits go to this branch. User handles merging based on their workflow.
</step>

<step name="validate_stage">
Confirm stage exists and has runs:

```bash
# Match both zero-padded (05-*) and unpadded (5-*) folders
PADDED_STAGE=$(printf "%02d" ${STAGE_ARG} 2>/dev/null || echo "${STAGE_ARG}")
STAGE_DIR=$(ls -d .ace/stages/${PADDED_STAGE}-* .ace/stages/${STAGE_ARG}-* 2>/dev/null | head -1)
if [ -z "$STAGE_DIR" ]; then
  echo "ERROR: No stage directory matching '${STAGE_ARG}'"
  exit 1
fi

PLAN_COUNT=$(ls -1 "$STAGE_DIR"/*-RUN.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$PLAN_COUNT" -eq 0 ]; then
  echo "ERROR: No plans found in $STAGE_DIR"
  exit 1
fi
```

Report: "Found {N} plans in {stage_dir}"
</step>

<step name="discover_plans">
List all plans and extract metadata:

```bash
# Get all plans
ls -1 "$STAGE_DIR"/*-RUN.md 2>/dev/null | sort

# Get completed plans (have RECAP.md)
ls -1 "$STAGE_DIR"/*-RECAP.md 2>/dev/null | sort
```

For each plan, read frontmatter to extract:
- `batch: N` - Execution batch (pre-computed)
- `autonomous: true/false` - Whether plan has checkpoints
- `gap_closure: true/false` - Whether plan closes gaps from verification/UAT

Build plan inventory:
- Plan path
- Plan ID (e.g., "03-01")
- Batch number
- Autonomous flag
- Gap closure flag
- Completion status (RECAP exists = complete)

**Filtering:**
- Skip completed plans (have RECAP.md)
- If `--gaps-only` flag: also skip plans where `gap_closure` is not `true`

If all plans filtered out, report "No matching incomplete plans" and exit.
</step>

<step name="group_by_batch">
Read `batch` from each plan's frontmatter and group by batch number:

```bash
# For each plan, extract batch from frontmatter
for plan in $STAGE_DIR/*-RUN.md; do
  batch=$(grep "^batch:" "$plan" | cut -d: -f2 | tr -d ' ')
  autonomous=$(grep "^autonomous:" "$plan" | cut -d: -f2 | tr -d ' ')
  echo "$plan:$batch:$autonomous"
done
```

**Group plans:**
```
batchs = {
  1: [plan-01, plan-02],
  2: [plan-03, plan-04],
  3: [plan-05]
}
```

**No dependency analysis needed.** Batch numbers are pre-computed during `/ace.plan-stage`.

Report batch structure with context:
```
## Execution Plan

**Stage {X}: {Name}** — {total_plans} runs across {batch_count} batchs

| Batch | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | {from plan objectives} |
| 2 | 01-03 | {from plan objectives} |
| 3 | 01-04 [checkpoint] | {from plan objectives} |

```

The "What it builds" column comes from skimming plan names/objectives. Keep it brief (3-8 words).
</step>

<step name="execute_batchs">
Execute each batch in sequence. Autonomous plans within a batch run in parallel **only if `PARALLELIZATION=true`**.

**If `PARALLELIZATION=false`:** Execute plans within each batch sequentially (one at a time). This prevents side effects from concurrent operations like tests, linting, and code generation.

**For each batch:**

1. **Describe what's being built (BEFORE spawning):**

   Read each plan's `<objective>` section. Extract what's being built and why it matters.

   **Output:**
   ```
   ---

   ## Batch {N}

   **{Plan ID}: {Plan Name}**
   {2-3 sentences: what this builds, key technical approach, why it matters in context}

   **{Plan ID}: {Plan Name}** (if parallel)
   {same format}

   Spawning {count} agent(s)...

   ---
   ```

   **Examples:**
   - Bad: "Executing terrain generation plan"
   - Good: "Procedural terrain generator using Perlin noise — creates height maps, biome zones, and collision meshes. Required before vehicle physics can interact with ground."

2. **Read files and spawn agents:**

   Before spawning, read file contents. The `@` syntax does not work across Task() boundaries - content must be inlined.

   ```bash
   # Read each plan in the batch
   PLAN_CONTENT=$(cat "{plan_path}")
   STATE_CONTENT=$(cat .ace/PULSE.md)
   CONFIG_CONTENT=$(cat .ace/config.json 2>/dev/null)
   ```

   **If `PARALLELIZATION=true` (default):** Use Task tool with multiple parallel calls.

   **If `PARALLELIZATION=false`:** Spawn agents one at a time, waiting for each to complete before starting the next. This ensures no concurrent file modifications or build operations.

   Each agent gets prompt with inlined content:

   ```
   <objective>
   Execute plan {plan_number} of stage {stage_number}-{stage_name}.

   Commit each task atomically. Create RECAP.md. Update PULSE.md.
   </objective>

   <execution_context>
   @~/.claude/ace/workflows/run-plan.md
   @~/.claude/ace/templates/RECAP.md
   @~/.claude/ace/references/gates.md
   @~/.claude/ace/references/tdd.md
   </execution_context>

   <context>
   Plan:
   {plan_content}

   Project state:
   {state_content}

   Config (if exists):
   {config_content}
   </context>

   <success_criteria>
   - [ ] All tasks executed
   - [ ] Each task committed individually
   - [ ] RECAP.md created in plan directory
   - [ ] PULSE.md updated with position and decisions
   </success_criteria>
   ```

2. **Wait for all agents in batch to complete:**

   Task tool blocks until each agent finishes. All parallel agents return together.

3. **Report completion and what was built:**

   For each completed agent:
   - Verify RECAP.md exists at expected path
   - Read RECAP.md to extract what was built
   - Note any issues or deviations

   **Output:**
   ```
   ---

   ## Batch {N} Complete

   **{Plan ID}: {Plan Name}**
   {What was built — from RECAP.md deliverables}
   {Notable deviations or discoveries, if any}

   **{Plan ID}: {Plan Name}** (if parallel)
   {same format}

   {If more batchs: brief note on what this enables for next batch}

   ---
   ```

   **Examples:**
   - Bad: "Batch 2 complete. Proceeding to Batch 3."
   - Good: "Terrain system complete — 3 biome types, height-based texturing, physics collision meshes. Vehicle physics (Batch 3) can now reference ground surfaces."

4. **Handle failures:**

   If any agent in batch fails:
   - Report which plan failed and why
   - Ask user: "Continue with remaining batchs?" or "Stop execution?"
   - If continue: proceed to next batch (dependent plans may also fail)
   - If stop: exit with partial completion report

5. **Execute checkpoint plans between batchs:**

   See `<checkpoint_handling>` for details.

6. **Proceed to next batch**

</step>

<step name="checkpoint_handling">
Plans with `autonomous: false` require user interaction.

**Detection:** Check `autonomous` field in frontmatter.

**Execution flow for checkpoint plans:**

1. **Spawn agent for checkpoint plan:**
   ```
   Task(prompt="{subagent-task-prompt}", subagent_type="ace-runner", model="{executor_model}")
   ```

2. **Agent runs until checkpoint:**
   - Executes auto tasks normally
   - Reaches checkpoint task (e.g., `type="checkpoint:human-verify"`) or auth gate
   - Agent returns with structured checkpoint (see checkpoint-return.md template)

3. **Agent return includes (structured format):**
   - Completed Tasks table with commit hashes and files
   - Current task name and blocker
   - Checkpoint type and details for user
   - What's awaited from user

4. **Orchestrator presents checkpoint to user:**

   Extract and display the "Checkpoint Details" and "Awaiting" sections from agent return:
   ```
   ## Checkpoint: [Type]

   **Plan:** 03-03 Dashboard Layout
   **Progress:** 2/3 tasks complete

   [Checkpoint Details section from agent return]

   [Awaiting section from agent return]
   ```

5. **User responds:**
   - "approved" / "done" → spawn continuation agent
   - Description of issues → spawn continuation agent with feedback
   - Decision selection → spawn continuation agent with choice

6. **Spawn continuation agent (NOT resume):**

   Use the continuation-prompt.md template:
   ```
   Task(
     prompt=filled_continuation_template,
     subagent_type="ace-runner",
     model="{executor_model}"
   )
   ```

   Fill template with:
   - `{completed_tasks_table}`: From agent's checkpoint return
   - `{resume_task_number}`: Current task from checkpoint
   - `{resume_task_name}`: Current task name from checkpoint
   - `{user_response}`: What user provided
   - `{resume_instructions}`: Based on checkpoint type (see continuation-prompt.md)

7. **Continuation agent executes:**
   - Verifies previous commits exist
   - Continues from resume point
   - May hit another checkpoint (repeat from step 4)
   - Or completes plan

8. **Repeat until plan completes or user stops**

**Why fresh agent instead of resume:**
Resume relies on Claude Code's internal serialization which breaks with parallel tool calls.
Fresh agents with explicit state are more reliable and maintain full context.

**Checkpoint in parallel context:**
If a plan in a parallel batch has a checkpoint:
- Spawn as normal
- Agent pauses at checkpoint and returns with structured state
- Other parallel agents may complete while waiting
- Present checkpoint to user
- Spawn continuation agent with user response
- Wait for all agents to finish before next batch
</step>

<step name="aggregate_results">
After all batchs complete, aggregate results:

```markdown
## Stage {X}: {Name} Execution Complete

**Batchs executed:** {N}
**Plans completed:** {M} of {total}

### Batch Summary

| Batch | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Complete |
| CP | plan-03 | ✓ Verified |
| 2 | plan-04 | ✓ Complete |
| 3 | plan-05 | ✓ Complete |

### Plan Details

1. **03-01**: [one-liner from RECAP.md]
2. **03-02**: [one-liner from RECAP.md]
...

### Issues Encountered
[Aggregate from all RECAPs, or "None"]
```
</step>

<step name="verify_stage_goal">
Verify stage achieved its GOAL, not just completed its TASKS.

**Spawn auditor:**

```
Task(
  prompt="Verify stage {stage_number} goal achievement.

Stage directory: {stage_dir}
Stage goal: {goal from TRACK.md}

Check must_haves against actual codebase. Create PROOF.md.
Verify what actually exists in the code.",
  subagent_type="ace-auditor",
  model="{auditor_model}"
)
```

**Read verification status:**

```bash
grep "^status:" "$STAGE_DIR"/*-PROOF.md | cut -d: -f2 | tr -d ' '
```

**Route by status:**

| Status | Action |
|--------|--------|
| `passed` | Continue to update_roadmap |
| `human_needed` | Present items to user, get approval or feedback |
| `gaps_found` | Present gap summary, offer `/ace.plan-stage {stage} --gaps` |

**If passed:**

Stage goal verified. Proceed to update_track.

**If human_needed:**

```markdown
## ✓ Stage {X}: {Name} — Human Verification Required

All automated checks passed. {N} items need human testing:

### Human Verification Checklist

{Extract from PROOF.md human_verification section}

---

**After testing:**
- "approved" → continue to update_roadmap
- Report issues → will route to gap closure planning
```

If user approves → continue to update_roadmap.
If user reports issues → treat as gaps_found.

**If gaps_found:**

Present gaps and offer next command:

```markdown
## ⚠ Stage {X}: {Name} — Gaps Found

**Score:** {N}/{M} must-haves verified
**Report:** {stage_dir}/{stage}-PROOF.md

### What's Missing

{Extract gap summaries from PROOF.md gaps section}

---

## ▶ Next Up

**Plan gap closure** — create additional plans to complete the stage

`/ace.plan-stage {X} --gaps`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `cat {stage_dir}/{stage}-PROOF.md` — see full report
- `/ace.audit {X}` — manual testing before planning
```

User runs `/ace.plan-stage {X} --gaps` which:
1. Reads PROOF.md gaps
2. Creates additional plans (04, 05, etc.) with `gap_closure: true` to close gaps
3. User then runs `/ace.run-stage {X} --gaps-only`
4. Run-stage runs only gap closure plans (04-05)
5. Auditor runs again after new runs complete

User stays in control at each decision point.
</step>

<step name="update_roadmap">
Update TRACK.md to reflect stage completion:

```bash
# Mark stage complete
# Update completion date
# Update status
```

**Check planning config:**

If `COMMIT_PLANNING_DOCS=false` (set in load_project_state):
- Skip all git operations for .ace/ files
- Planning docs exist locally but are gitignored
- Log: "Skipping planning docs commit (commit_docs: false)"
- Proceed to offer_next step

If `COMMIT_PLANNING_DOCS=true` (default):
- Continue with git operations below

Commit stage completion (roadmap, state, verification):
```bash
git add .ace/TRACK.md .ace/PULSE.md .ace/stages/{stage_dir}/*-PROOF.md
git add .ace/REQUIREMENTS.md  # if updated
git commit -m "docs(stage-{X}): complete stage execution"
```
</step>

<step name="offer_next">
Present next steps based on milestone status:

**If more stages remain:**
```
## Next Up

**Stage {X+1}: {Name}** — {Goal}

`/ace.plan-stage {X+1}`

<sub>`/clear` first for fresh context</sub>
```

**If milestone complete:**
```
MILESTONE COMPLETE!

All {N} stages executed.

`/ace.complete-milestone`
```
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context (frontmatter, spawning, results).
Subagents: Fresh 200k each (full workflow + execution).
No polling (Task blocks). No context bleed.
</context_efficiency>

<failure_handling>
**Subagent fails mid-plan:**
- RECAP.md won't exist
- Orchestrator detects missing RECAP
- Reports failure, asks user how to proceed

**Dependency chain breaks:**
- Batch 1 plan fails
- Batch 2 plans depending on it will likely fail
- Orchestrator can still attempt them (user choice)
- Or skip dependent plans entirely

**All agents in batch fail:**
- Something systemic (git issues, permissions, etc.)
- Stop execution
- Report for manual investigation

**Checkpoint fails to resolve:**
- User can't approve or provides repeated issues
- Ask: "Skip this plan?" or "Abort stage execution?"
- Record partial progress in PULSE.md
</failure_handling>

<resumption>
**Resuming interrupted execution:**

If stage execution was interrupted (context limit, user exit, error):

1. Run `/ace.run-stage {stage}` again
2. discover_plans finds completed RECAPs
3. Skips completed plans
4. Resumes from first incomplete plan
5. Continues batch-based execution

**PULSE.md tracks:**
- Last completed plan
- Current batch
- Any pending checkpoints
</resumption>
