---
name: ace.plan-stage
description: Create detailed execution run for a stage (run.md) with verification loop
argument-hint: "[stage] [--research] [--skip-research] [--gaps] [--skip-verify]"
agent: ace-architect
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - mcp__context7__*
---

<objective>
Create executable stage prompts (run.md files) for a track stage with integrated research and verification.

**Default flow:** Research (if needed) → Plan → Verify → Done

**Orchestrator role:** Parse arguments, validate stage, research domain (unless skipped or exists), spawn ace-architect agent, verify runs with ace-plan-reviewer, iterate until runs pass or max iterations reached, present results.

**Why subagents:** Research and planning burn context fast. Verification uses fresh context. User sees the flow between agents in main context.
</objective>

<execution_context>
@~/.claude/ace/references/ui-brand.md
</execution_context>

<context>
Stage number: $ARGUMENTS (optional - auto-detects next unplanned stage if not provided)

**Flags:**
- `--research` — Force re-research even if research.md exists
- `--skip-research` — Skip research entirely, go straight to planning
- `--gaps` — Gap closure mode (reads proof.md, skips research)
- `--skip-verify` — Skip architect → reviewer verification loop

Normalize stage input in step 2 before any directory lookups.
</context>

<process>

## 1. Validate Environment and Resolve Model Profile

```bash
ls .ace/ 2>/dev/null
```

**If not found:** Error - user should run `/ace.start` first.

**Resolve model profile for agent spawning:**

```bash
MODEL_PROFILE=$(cat .ace/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | max | balanced | eco |
|-------|---------|----------|--------|
| ace-stage-scout | opus | sonnet | haiku |
| ace-architect | opus | opus | sonnet |
| ace-plan-reviewer | sonnet | sonnet | haiku |

Store resolved models for use in Task calls below.

## 2. Parse and Normalize Arguments

Extract from $ARGUMENTS:

- Stage number (integer or decimal like `2.1`)
- `--research` flag to force re-research
- `--skip-research` flag to skip research
- `--gaps` flag for gap closure mode
- `--skip-verify` flag to bypass verification loop

**If no stage number:** Detect next unplanned stage from track.

**Normalize stage to zero-padded format:**

```bash
# Normalize stage number (8 → 08, but preserve decimals like 2.1 → 02.1)
if [[ "$STAGE" =~ ^[0-9]+$ ]]; then
  STAGE=$(printf "%02d" "$STAGE")
elif [[ "$STAGE" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
  STAGE=$(printf "%02d.%s" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}")
fi
```

**Check for existing research and runs:**

```bash
ls .ace/stages/${STAGE}-*/*-research.md 2>/dev/null
ls .ace/stages/${STAGE}-*/*-run.md 2>/dev/null
```

## 3. Validate Stage

```bash
grep -A5 "Stage ${STAGE}:" .ace/track.md 2>/dev/null
```

**If not found:** Error with available stages. **If found:** Extract stage number, name, description.

## 4. Ensure Stage Directory Exists and Load intel.md

```bash
# STAGE is already normalized (08, 02.1, etc.) from step 2
STAGE_DIR=$(ls -d .ace/stages/${STAGE}-* 2>/dev/null | head -1)
if [ -z "$STAGE_DIR" ]; then
  # Create stage directory from track name
  STAGE_NAME=$(grep "Stage ${STAGE}:" .ace/track.md | sed 's/.*Stage [0-9]*: //' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  mkdir -p ".ace/stages/${STAGE}-${STAGE_NAME}"
  STAGE_DIR=".ace/stages/${STAGE}-${STAGE_NAME}"
fi

# Load intel.md immediately - this informs ALL downstream agents
INTEL_CONTENT=$(cat "${STAGE_DIR}"/*-intel.md 2>/dev/null)
```

**CRITICAL:** Store `INTEL_CONTENT` now. It must be passed to:
- **Scout** — constrains what to research (locked decisions vs Claude's discretion)
- **Architect** — locked decisions must be honored, not revisited
- **Reviewer** — verifies runs respect user's stated vision
- **Revision** — context for targeted fixes

If intel.md exists, display: `Using stage context from: ${STAGE_DIR}/*-intel.md`

## 5. Handle Research

**If `--gaps` flag:** Skip research (gap closure uses proof.md instead).

**If `--skip-research` flag:** Skip to step 6.

**Check config for research setting:**

```bash
WORKFLOW_RESEARCH=$(cat .ace/config.json 2>/dev/null | grep -o '"research"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
```

**If `checks.research` is `false` AND `--research` flag NOT set:** Skip to step 6.

**Otherwise:**

Check for existing research:

```bash
ls "${STAGE_DIR}"/*-research.md 2>/dev/null
```

**If research.md exists AND `--research` flag NOT set:**
- Display: `Using existing research: ${STAGE_DIR}/${STAGE}-research.md`
- Skip to step 6

**If research.md missing OR `--research` flag set:**

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► SCOUTING STAGE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning scout...
```

Proceed to spawn scout

### Spawn ace-stage-scout

Gather additional context for research prompt:

```bash
# Get stage description from track
STAGE_DESC=$(grep -A3 "Stage ${STAGE}:" .ace/track.md)

# Get specs if they exist
SPECS=$(cat .ace/specs.md 2>/dev/null | grep -A100 "## Requirements" | head -50)

# Get prior decisions from pulse.md
DECISIONS=$(grep -A20 "### Decisions Made" .ace/pulse.md 2>/dev/null)

# INTEL_CONTENT already loaded in step 4
```

Fill research prompt and spawn:

```markdown
<objective>
Research how to implement Stage {stage_number}: {stage_name}

Answer: "What do I need to know to PLAN this stage well?"
</objective>

<stage_context>
**IMPORTANT:** If intel.md exists below, it contains user decisions from /ace.discuss-stage.

- **Decisions section** = Locked choices — research THESE deeply, don't explore alternatives
- **Claude's Discretion section** = Your freedom areas — research options, make recommendations
- **Deferred Ideas section** = Out of scope — ignore completely

{intel_content}
</stage_context>

<additional_context>
**Stage description:**
{stage_description}

**Specs (if any):**
{specs}

**Prior decisions from pulse.md:**
{decisions}
</additional_context>

<output>
Write research findings to: {stage_dir}/{stage}-research.md
</output>
```

```
Task(
  prompt="First, read ~/.claude/agents/ace-stage-scout.md for your role and instructions.\n\n" + research_prompt,
  subagent_type="general-purpose",
  model="{scout_model}",
  description="Research Stage {stage}"
)
```

### Handle Scout Return

**`## RESEARCH COMPLETE`:**
- Display: `Research complete. Proceeding to planning...`
- Continue to step 6

**`## RESEARCH BLOCKED`:**
- Display blocker information
- Offer: 1) Provide more context, 2) Skip research and plan anyway, 3) Abort
- Wait for user response

## 6. Check Existing Runs

```bash
ls "${STAGE_DIR}"/*-run.md 2>/dev/null
```

**If exists:** Offer: 1) Continue planning (add more runs), 2) View existing, 3) Replan from scratch. Wait for response.

## 7. Read Context Files

Read and store context file contents for the architect agent. The `@` syntax does not work across Task() boundaries - content must be inlined.

```bash
# Read required files
PULSE_CONTENT=$(cat .ace/pulse.md)
TRACK_CONTENT=$(cat .ace/track.md)

# Read optional files (empty string if missing)
SPECS_CONTENT=$(cat .ace/specs.md 2>/dev/null)
# INTEL_CONTENT already loaded in step 4
RESEARCH_CONTENT=$(cat "${STAGE_DIR}"/*-research.md 2>/dev/null)

# Gap closure files (only if --gaps mode)
PROOF_CONTENT=$(cat "${STAGE_DIR}"/*-proof.md 2>/dev/null)
UAT_CONTENT=$(cat "${STAGE_DIR}"/*-uat.md 2>/dev/null)
```

## 8. Spawn ace-architect Agent

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► PLANNING STAGE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning architect...
```

Fill prompt with inlined content and spawn:

```markdown
<planning_context>

**Stage:** {stage_number}
**Mode:** {standard | gap_closure}

**Project Pulse:**
{pulse_content}

**Track:**
{track_content}

**Specs (if exists):**
{specs_content}

**Stage Intel (if exists):**

IMPORTANT: If stage intel exists below, it contains USER DECISIONS from /ace.discuss-stage.
- **Decisions** = LOCKED — honor these exactly, do not revisit or suggest alternatives
- **Claude's Discretion** = Your freedom — make implementation choices here
- **Deferred Ideas** = Out of scope — do NOT include in this stage

{intel_content}

**Research (if exists):**
{research_content}

**Gap Closure (if --gaps mode):**
{proof_content}
{uat_content}

</planning_context>

<downstream_consumer>
Output consumed by /ace.run-stage
Runs must be executable prompts with:

- Frontmatter (batch, depends_on, files_modified, autonomous)
- Tasks in XML format
- Verification criteria
- must_haves for goal-backward verification
</downstream_consumer>

<quality_gate>
Before returning ARCHITECTING COMPLETE:

- [ ] run.md files created in stage directory
- [ ] Each run has valid frontmatter
- [ ] Tasks are specific and actionable
- [ ] Dependencies correctly identified
- [ ] Batches assigned for parallel execution
- [ ] must_haves derived from stage goal
</quality_gate>
```

```
Task(
  prompt="First, read ~/.claude/agents/ace-architect.md for your role and instructions.\n\n" + filled_prompt,
  subagent_type="general-purpose",
  model="{architect_model}",
  description="Plan Stage {stage}"
)
```

## 9. Handle Architect Return

Parse architect output:

**`## ARCHITECTING COMPLETE`:**
- Display: `Architect created {N} run(s). Files on disk.`
- If `--skip-verify`: Skip to step 13
- Check config: `WORKFLOW_REVIEW=$(cat .ace/config.json 2>/dev/null | grep -o '"review"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")`
- If `checks.review` is `false`: Skip to step 13
- Otherwise: Proceed to step 10

**`## GATE REACHED`:**
- Present to user, get response, spawn continuation (see step 12)

**`## ARCHITECTING INCONCLUSIVE`:**
- Show what was attempted
- Offer: Add context, Retry, Manual
- Wait for user response

## 10. Spawn ace-plan-reviewer Agent

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► VERIFYING RUNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning plan reviewer...
```

Read runs for the reviewer:

```bash
# Read all runs in stage directory
RUNS_CONTENT=$(cat "${STAGE_DIR}"/*-run.md 2>/dev/null)

# INTEL_CONTENT already loaded in step 4
# SPECS_CONTENT already loaded in step 7
```

Fill reviewer prompt with inlined content and spawn:

```markdown
<verification_context>

**Stage:** {stage_number}
**Stage Goal:** {goal from TRACK}

**Runs to verify:**
{runs_content}

**Specs (if exists):**
{specs_content}

**Stage Intel (if exists):**

IMPORTANT: If stage intel exists below, it contains USER DECISIONS from /ace.discuss-stage.
Runs MUST honor these decisions. Flag as issue if runs contradict user's stated vision.

- **Decisions** = LOCKED — runs must implement these exactly
- **Claude's Discretion** = Freedom areas — runs can choose approach
- **Deferred Ideas** = Out of scope — runs must NOT include these

{intel_content}

</verification_context>

<expected_output>
Return one of:
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>
```

```
Task(
  prompt=reviewer_prompt,
  subagent_type="ace-plan-reviewer",
  model="{reviewer_model}",
  description="Verify Stage {stage} runs"
)
```

## 11. Handle Reviewer Return

**If `## VERIFICATION PASSED`:**
- Display: `Runs verified. Ready for execution.`
- Proceed to step 13

**If `## ISSUES FOUND`:**
- Display: `Reviewer found issues:`
- List issues from reviewer output
- Check iteration count
- Proceed to step 12

## 12. Revision Loop (Max 3 Iterations)

Track: `iteration_count` (starts at 1 after initial plan + check)

**If iteration_count < 3:**

Display: `Sending back to architect for revision... (iteration {N}/3)`

Read current runs for revision context:

```bash
RUNS_CONTENT=$(cat "${STAGE_DIR}"/*-run.md 2>/dev/null)
# INTEL_CONTENT already loaded in step 4
```

Spawn ace-architect with revision prompt:

```markdown
<revision_context>

**Stage:** {stage_number}
**Mode:** revision

**Existing runs:**
{runs_content}

**Reviewer issues:**
{structured_issues_from_reviewer}

**Stage Intel (if exists):**

IMPORTANT: If stage intel exists, revisions MUST still honor user decisions.

{intel_content}

</revision_context>

<instructions>
Make targeted updates to address reviewer issues.
Do NOT replan from scratch unless issues are fundamental.
Revisions must still honor all locked decisions from Stage Intel.
Return what changed.
</instructions>
```

```
Task(
  prompt="First, read ~/.claude/agents/ace-architect.md for your role and instructions.\n\n" + revision_prompt,
  subagent_type="general-purpose",
  model="{architect_model}",
  description="Revise Stage {stage} runs"
)
```

- After architect returns → spawn reviewer again (step 10)
- Increment iteration_count

**If iteration_count >= 3:**

Display: `Max iterations reached. {N} issues remain:`
- List remaining issues

Offer options:
1. Force proceed (execute despite issues)
2. Provide guidance (user gives direction, retry)
3. Abandon (exit planning)

Wait for user response.

## 13. Present Final Status

Route to `<offer_next>`.

</process>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► STAGE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Stage {X}: {Name}** — {N} run(s) in {M} batch(es)

| Batch | Runs | What it builds |
|------|-------|----------------|
| 1    | 01, 02 | [objectives] |
| 2    | 03     | [objective]  |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute Stage {X}** — run all {N} runs

/ace.run-stage {X}

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .ace/stages/{stage-dir}/*-run.md — review runs
- /ace.plan-stage {X} --research — re-research first

───────────────────────────────────────────────────────────────
</offer_next>

<success_criteria>
- [ ] .ace/ directory validated
- [ ] Stage validated against track
- [ ] Stage directory created if needed
- [ ] intel.md loaded early (step 4) and passed to ALL agents
- [ ] Research completed (unless --skip-research or --gaps or exists)
- [ ] ace-stage-scout spawned with intel.md (constrains research scope)
- [ ] Existing runs checked
- [ ] ace-architect spawned with context (intel.md + research.md)
- [ ] Runs created (ARCHITECTING COMPLETE or GATE handled)
- [ ] ace-plan-reviewer spawned with intel.md (verifies intel compliance)
- [ ] Verification passed OR user override OR max iterations with user decision
- [ ] User sees status between agent spawns
- [ ] User knows next steps (execute or review)
</success_criteria>
