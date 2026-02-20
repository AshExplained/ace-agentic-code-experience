<purpose>
Create executable stage prompts (run.md files) through a research → plan → verify loop.

Use this workflow when planning a stage's runs. Handles research scouting, architect spawning, plan reviewer verification, and revision iterations.
</purpose>

<core_principle>
Fresh context per agent. Orchestrator stays lean (~15%), each subagent gets 100% fresh 200k. Intel.md loaded early and passed to ALL agents to constrain scope.
</core_principle>

<process>

<step name="validate_environment" priority="first">
Validate .renn/ exists and resolve model profile:

```bash
ls .renn/ 2>/dev/null
```

**If not found:** Error - user should run `/renn.start` first.

**Resolve model profile for agent spawning:**

```bash
MODEL_PROFILE=$(cat .renn/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | max | balanced | eco |
|-------|---------|----------|--------|
| renn-stage-scout | opus | sonnet | haiku |
| renn-architect | opus | opus | sonnet |
| renn-plan-reviewer | sonnet | sonnet | haiku |

Store resolved models for use in Task calls below.
</step>

<step name="parse_arguments">
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
ls .renn/stages/${STAGE}-*/*-research.md 2>/dev/null
ls .renn/stages/${STAGE}-*/*-run.md 2>/dev/null
```
</step>

<step name="validate_stage">
```bash
# Strip leading zeros for track.md lookup (track uses "Stage 1:", not "Stage 01:")
STAGE_UNPADDED=$(echo "$STAGE" | sed 's/^0\+\([0-9]\)/\1/')
grep -A5 "^### Stage ${STAGE_UNPADDED}:" .renn/track.md 2>/dev/null
```

**If not found:** Error with available stages. **If found:** Extract stage number, name, description.
</step>

<step name="ensure_stage_directory">
```bash
# STAGE is already normalized (08, 02.1, etc.) from parse_arguments
STAGE_DIR=$(ls -d .renn/stages/${STAGE}-* 2>/dev/null | head -1)
if [ -z "$STAGE_DIR" ]; then
  # Create stage directory from track name
  # Anchor to ### headings to avoid matching list items (which contain markdown ** and descriptions)
  STAGE_UNPADDED=$(echo "$STAGE" | sed 's/^0\+\([0-9]\)/\1/')
  STAGE_NAME=$(grep "^### Stage ${STAGE_UNPADDED}:" .renn/track.md | head -1 | sed 's/^### Stage [0-9]*: //' | sed 's/ \[UI\]$//' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  mkdir -p ".renn/stages/${STAGE}-${STAGE_NAME}"
  STAGE_DIR=".renn/stages/${STAGE}-${STAGE_NAME}"
fi

# Load intel.md immediately - this informs ALL downstream agents
INTEL_CONTENT=$(cat "${STAGE_DIR}"/*-intel.md 2>/dev/null)

# Extract project name from brief.md heading (used in designer spawn)
PROJECT_NAME=$(head -1 .renn/brief.md 2>/dev/null | sed 's/^# //')
```

**CRITICAL:** Store `INTEL_CONTENT` now. It must be passed to:
- **Scout** — constrains what to research (locked decisions vs Claude's discretion)
- **Architect** — locked decisions must be honored, not revisited
- **Reviewer** — verifies runs respect user's stated vision
- **Revision** — context for targeted fixes

If intel.md exists, display: `Using stage context from: ${STAGE_DIR}/*-intel.md`
</step>

<step name="handle_research">
**If `--gaps` flag:** Skip research (gap closure uses proof.md instead).

**If `--skip-research` flag:** Skip to check_existing_runs.

**Check config for research setting:**

```bash
WORKFLOW_RESEARCH=$(cat .renn/config.json 2>/dev/null | grep -o '"research"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
```

**If `checks.research` is `false` AND `--research` flag NOT set:** Skip to check_existing_runs.

**Otherwise:**

Check for existing research:

```bash
ls "${STAGE_DIR}"/*-research.md 2>/dev/null
```

**If research.md exists AND `--research` flag NOT set:**
- Display: `Using existing research: ${STAGE_DIR}/${STAGE}-research.md`
- Skip to check_existing_runs

**If research.md missing OR `--research` flag set:**

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RENN ► SCOUTING STAGE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning scout...
```

Proceed to spawn scout.

### Spawn renn-stage-scout

Gather additional context for research prompt:

```bash
# Get stage description from track (use STAGE_UNPADDED from validate_stage)
STAGE_DESC=$(grep -A5 "^### Stage ${STAGE_UNPADDED}:" .renn/track.md)

# Get specs if they exist
SPECS=$(cat .renn/specs.md 2>/dev/null | grep -A100 "## Requirements" | head -50)

# Get prior decisions from pulse.md
DECISIONS=$(grep -A20 "### Decisions Made" .renn/pulse.md 2>/dev/null)

# INTEL_CONTENT already loaded in ensure_stage_directory

# Read UX.md for scout (if exists)
UX_CONTENT_FOR_SCOUT=$(cat .renn/research/UX.md 2>/dev/null)
```

Fill research prompt and spawn:

```markdown
<objective>
Research how to implement Stage {stage_number}: {stage_name}

Answer: "What do I need to know to PLAN this stage well?"
</objective>

<stage_context>
**IMPORTANT:** If intel.md exists below, it contains user decisions from /renn.discuss-stage.

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

<ux_context>
**UX.md content (if exists -- use for Stage UX Patterns section):**

If UX.md content is present below, generate a ## Stage UX Patterns section in your research.md output. Cross-reference these project-level findings with the specific stage being researched. If no UX.md content below, omit the Stage UX Patterns section.

{ux_content_for_scout}
</ux_context>

<output>
Write research findings to: {stage_dir}/{stage}-research.md
</output>
```

```
Task(
  prompt=research_prompt,
  subagent_type="renn-stage-scout",
  model="{scout_model}",
  description="Research Stage {stage}"
)
```

### Handle Scout Return

**`## RESEARCH COMPLETE`:**
- Display: `Research complete. Proceeding to planning...`
- Continue to check_existing_runs

**`## RESEARCH BLOCKED`:**
- Display blocker information
- Offer: 1) Provide more context, 2) Skip research and plan anyway, 3) Abort
- Wait for user response
</step>

<step name="handle_ui_stage_redirect">
**If `--gaps` flag:** Set `UI_STAGE=false`. Skip to check_existing_runs.

Check the stage heading from track.md for a [UI] tag:

```bash
STAGE_HEADING=$(grep "^### Stage ${STAGE_UNPADDED}:" .renn/track.md | head -1)
```

If the heading contains `[UI]` -> set `UI_STAGE=true`.
If the heading does NOT contain `[UI]` -> set `UI_STAGE=false`. Continue to check_existing_runs.

No keyword matching. No UNCERTAIN state. The [UI] tag is authoritative.

### Design Artifact Check (only when UI_STAGE=true)

```bash
UX_BRIEF_FILE=".renn/design/ux-brief.md"
if [ ! -f "$UX_BRIEF_FILE" ]; then
  UX_BRIEF_FILE="${STAGE_DIR}/${STAGE}-ux-brief.md"
fi
if [ -f "$UX_BRIEF_FILE" ]; then
  echo "Design artifacts found. Loading UX brief..."
  UX_BRIEF=$(cat "$UX_BRIEF_FILE")
else
  echo ""
  echo "Stage ${STAGE} is a UI stage but has no design artifacts."
  echo "Run /renn.design-system first to create the design system."
  echo "Then run /renn.design-screens ${STAGE} to create screen prototypes."
  echo "Then re-run /renn.plan-stage ${STAGE}."
  echo ""
  exit 1
fi
```

Store `UI_STAGE` and `UX_BRIEF` for downstream use.
</step>

<step name="handle_dx_interview">
**Skip conditions (check in order):**
1. `--gaps` flag set -> skip (gap closure does not re-run interviews)
2. `UI_STAGE` is true -> skip (UX handled by design-system/design-screens)
3. UX.md does not exist -> skip (display: "No UX.md found. Skipping DX interview.")
4. UX.md has no DX content -> skip

**Check for DX content in UX.md:**

```bash
DX_CONTENT=""
if [ -f ".renn/research/UX.md" ]; then
  if grep -q "Proven DX Patterns\|Project Type: CLI\|Project Type: API\|Project Type: Library" .renn/research/UX.md; then
    DX_CONTENT=$(cat .renn/research/UX.md)
  fi
fi
if [ -z "$DX_CONTENT" ]; then
  echo "No DX patterns found in UX.md. Skipping DX interview."
  DX_INTERVIEW_ANSWERS=""
  DX_QUESTIONS_ASKED=0
  # Skip to check_existing_runs
fi
```

**Display banner:**

```
RENN > DX INTERVIEW FOR STAGE {X}

Before planning, let's discuss the developer experience for this stage.
```

**Generate 3-5 questions dynamically from UX.md DX findings:**

Read DX_CONTENT and generate questions from these categories.

**Plain-language rule:** Even though the user is likely a developer, prefer concrete descriptions over pattern names. Say "show a helpful suggestion with the error" instead of "actionable error messages." Describe the experience, not the design principle.

1. **Proven DX Patterns (1-2 questions):** From the "Proven DX Patterns" table, generate questions about which patterns to adopt for this stage's specific functionality.
   - Template: "Similar tools do [concrete behavior]. Should this work the same way?"
   - Options: 2-3 concrete implementations + "Let Claude decide (Research suggests: [recommendation])"

2. **Anti-Patterns (0-1 questions):** From the "Anti-Patterns" table, generate an awareness question if a relevant anti-pattern exists.
   - Template: "A common frustration with [domain] tools is [description of bad experience]. When that happens here, how should we handle it?"
   - Options: 2-3 alternatives + "Let Claude decide"

3. **Critical DX Flows (1-2 questions):** From the "Critical Flows" table, generate questions about high-friction flows in this stage.
   - Template: "When a developer [flow description], should it [option A] or [option B]?"
   - Options: 2-3 DX approaches + "Let Claude decide"

4. **Emotional Design (1 question):** From the "Emotional Design Goals" section, generate one calibration question.
   - Template: "We want developers to feel [emotion] when using this. Which approach gets closer to that?"
   - Options: 2-3 concrete approaches + "Let Claude decide"

**Question format (same AskUserQuestion conventions as UX interview):**
- 2-4 concrete options per question
- EVERY question includes "Let Claude decide" with research-backed default
- Third-person framing for flow questions, direct framing for preference questions
- Target 3-5 total questions (shorter than UX interview's 4-6)
- Track `DX_QUESTIONS_ASKED` count

**Compile answers:**

```xml
<dx_interview_answers>
### [Question Topic 1]
Question: {question text}
Answer: {user's choice or "Let Claude decide"}
Research default: {what UX.md recommends}

### [Question Topic 2]
Question: {question text}
Answer: {user's choice or "Let Claude decide"}
Research default: {what UX.md recommends}

...
</dx_interview_answers>
```

**Store for downstream:**
- `DX_INTERVIEW_ANSWERS` -- compiled answers
- `DX_QUESTIONS_ASKED` -- count
- `DX_CONTENT` -- original UX.md DX content for synthesis
</step>

<step name="dx_synthesis">
**Skip conditions:**
1. handle_dx_interview was skipped (`DX_INTERVIEW_ANSWERS` is empty) -> skip
2. `UI_STAGE` is true -> skip

**Synthesize inline (no agent spawn):**

Read:
- `DX_CONTENT` (DX sections from UX.md)
- `DX_INTERVIEW_ANSWERS` (user decisions from DX interview)

Produce `DX_BRIEF` by combining both sources into concrete DX implications:

```markdown
## DX Direction for Stage {X}: {Name}

### Developer Workflow
- [From interview answers, e.g., "CLI commands use consistent --flag naming per clig.dev"]
- [Research defaults for "Let Claude decide" answers]

### Error Handling
- [From adopted patterns, e.g., "Errors write to stderr with actionable suggestions"]
- [From anti-pattern avoidance, e.g., "No stack traces unless --verbose"]

### API/Interface Design
- [From adopted patterns + interview answers]
- [From critical flow decisions]

### Emotional Guardrails
- Primary: [from DX emotional design, e.g., "productive -- fast startup, minimal config"]
- Avoid: [from DX anti-emotion, e.g., "lost -- clear help text, discoverable commands"]

### Research References
- [Cross-references to UX.md DX sections that informed decisions]
```

**Rules for synthesis:**
- For answers where user made a choice: use the user's choice verbatim
- For "Let Claude decide" answers: use the research-backed default from UX.md
- Translate abstract DX principles into concrete implementation guidance
- If all answers were "Let Claude decide": produce DX_BRIEF entirely from UX.md research defaults
- Keep DX_BRIEF concise (20-40 lines). Digest, not report.

**Persist DX_BRIEF to file:**

Write DX_BRIEF to `${STAGE_DIR}/${STAGE}-dx-brief.md` as plain markdown (no XML tags, no frontmatter). Same convention as ux-brief.md.

Display: "DX brief synthesized and saved to ${STAGE_DIR}/${STAGE}-dx-brief.md."

**Store:** `DX_BRIEF` variable for read_context_files and architect context.
</step>

<step name="check_existing_runs">
```bash
ls "${STAGE_DIR}"/*-run.md 2>/dev/null
```

**If exists:** Offer: 1) Continue planning (add more runs), 2) View existing, 3) Replan from scratch. Wait for response.
</step>

<step name="read_context_files">
Read and store context file contents for the architect agent. The `@` syntax does not work across Task() boundaries - content must be inlined.

```bash
# Read required files
PULSE_CONTENT=$(cat .renn/pulse.md)
TRACK_CONTENT=$(cat .renn/track.md)

# Read optional files (empty string if missing)
SPECS_CONTENT=$(cat .renn/specs.md 2>/dev/null)
# INTEL_CONTENT already loaded in ensure_stage_directory
RESEARCH_CONTENT=$(cat "${STAGE_DIR}"/*-research.md 2>/dev/null)

# Load UX brief from design-stage output (if UI stage with completed design)
# UX_BRIEF may already be loaded from handle_ui_stage_redirect
if [ -z "$UX_BRIEF" ]; then
  UX_BRIEF=$(cat .renn/design/ux-brief.md 2>/dev/null)
fi
if [ -z "$UX_BRIEF" ]; then
  UX_BRIEF=$(cat "${STAGE_DIR}"/${STAGE}-ux-brief.md 2>/dev/null)
fi

# Load DX brief from dx_synthesis output (if non-UI stage with DX interview)
# DX_BRIEF may already be loaded from dx_synthesis step
if [ -z "$DX_BRIEF" ]; then
  DX_BRIEF=$(cat "${STAGE_DIR}"/${STAGE}-dx-brief.md 2>/dev/null)
fi

# Detect design artifacts (created by design-stage, not plan-stage)
HAS_DESIGN=false
if [ -f ".renn/design/stylekit.yaml" ] && ls .renn/design/screens/*.yaml 2>/dev/null >/dev/null; then
  HAS_DESIGN=true
fi

# Design context (only if design artifacts exist on disk)
if [ "$HAS_DESIGN" = "true" ]; then
  DESIGN_SCREEN_SPECS=$(ls .renn/design/screens/*.yaml 2>/dev/null)
  DESIGN_SUMMARIES=""
  for spec in $DESIGN_SCREEN_SPECS; do
    [ -f "$spec" ] || continue
    screen_name=$(grep -m1 "^screen:" "$spec" | sed 's/screen: //')
    description=$(grep -m1 "^description:" "$spec" | sed 's/description: //')
    DESIGN_SUMMARIES="${DESIGN_SUMMARIES}\n- ${screen_name}: ${description} (@.renn/design/screens/${screen_name}.yaml)"
  done
  DESIGN_STYLEKIT_PATH=".renn/design/stylekit.yaml"
  IMPLEMENTATION_GUIDE=$(cat .renn/design/implementation-guide.md 2>/dev/null)
fi

# Gap closure files (only if --gaps mode)
PROOF_CONTENT=$(cat "${STAGE_DIR}"/*-proof.md 2>/dev/null)
UAT_CONTENT=$(cat "${STAGE_DIR}"/*-uat.md 2>/dev/null)
```
</step>

<step name="spawn_architect">
Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RENN ► PLANNING STAGE {X}
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

IMPORTANT: If stage intel exists below, it contains USER DECISIONS from /renn.discuss-stage.
- **Decisions** = LOCKED — honor these exactly, do not revisit or suggest alternatives
- **Claude's Discretion** = Your freedom — make implementation choices here
- **Deferred Ideas** = Out of scope — do NOT include in this stage

{intel_content}

**Research (if exists):**
{research_content}

{IF UX_BRIEF is non-empty:}

**UX Brief (if exists):**
{UX_BRIEF}

This ux_brief was produced by inline synthesis of UX.md research + UX interview answers.
It provides concrete UX direction for this stage. When planning UI tasks, reference these
interaction patterns, spacing guidelines, component choices, and emotional guardrails.
The ux_brief is INFORMATIONAL context for the architect -- it does NOT override user
decisions from intel.md.

{END IF}

{IF DX_BRIEF is non-empty:}

**DX Brief (if exists):**
{DX_BRIEF}

This dx_brief was produced by inline synthesis of UX.md DX research + DX interview answers.
It provides concrete DX direction for this stage. When planning implementation tasks,
reference these developer workflow patterns, error handling guidelines, and interface
design principles. The dx_brief is INFORMATIONAL context for the architect -- it does
NOT override user decisions from intel.md.

{END IF}

**Gap Closure (if --gaps mode):**
{proof_content}
{uat_content}

{IF HAS_DESIGN is true:}

**Design:**
Global stylekit: .renn/design/stylekit.yaml
All screen specs: .renn/design/screens/
Implementation guide: .renn/design/implementation-guide.md

Screen summary (all screens -- [NEW] = created this stage, [EXISTING] = from prior stages):
{design_summaries}

**Implementation Guide (framework translation):**
{IMPLEMENTATION_GUIDE}

IMPORTANT: Every UI implementation task MUST include these @ references in
the task's <context> section. The paths are STABLE across stages:

  <context>
  @.renn/design/stylekit.yaml
  @.renn/design/screens/{screen-name}.yaml  (structure spec)
  @.renn/design/screens/{screen-name}.html  (visual source of truth)
  @.renn/design/implementation-guide.md     (framework translation)
  </context>

The HTML prototype is the VISUAL SOURCE OF TRUTH. The YAML spec describes
structure. The implementation guide provides framework-specific translation.

Task actions must NOT pre-translate design into approximate CSS classes.
Reference the implementation guide for framework-specific patterns and the
HTML prototype for visual specification. Do NOT approximate styling in task
action text -- let the runner read the prototype and guide directly.

**Context budget:** Limit each task to at most 1-2 HTML prototype @ references
to manage runner context budget. Multi-screen runs should split screen
implementations across tasks.

For screens marked [NEW]: task implements the full screen from scratch.
For screens from prior stages that this stage modifies: task modifies the existing implementation to match updated screen spec. Use `git diff .renn/design/screens/{screen-name}.yaml` to see what changed.

Tasks that implement UI without referencing their screen spec and HTML
prototype will produce output inconsistent with the approved design.

**Design-fidelity must_haves:** When a run touches UI, include these
design-fidelity truths in the run's must_haves alongside functional truths:

```yaml
must_haves:
  truths:
    # Functional truths (stage-specific)
    - "..."
    # Design-fidelity truths (add for UI-touching runs)
    - "All stylekit semantic tokens implemented in project CSS system"
    - "Icon system uses {icon-library-from-guide} not hand-drawn SVGs"
    - "Dark mode uses token overrides not per-component hardcoded values"
  artifacts:
    - path: "{project-globals-css}"
      provides: "Design token system"
      contains: "semantic color tokens from stylekit.yaml"
  key_links:
    - from: "{globals-css}"
      to: "stylekit.yaml"
      via: "CSS custom properties matching token names"
      pattern: "--color-primary|--color-secondary|--color-background"
```

Omit dark mode truth if stylekit has no dark theme. Replace
`{icon-library-from-guide}` with the actual icon library from the
implementation guide. Replace `{project-globals-css}` with the project's
actual CSS entry point.

</planning_context>

<downstream_consumer>
Output consumed by /renn.run-stage
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
  prompt=filled_prompt,
  subagent_type="renn-architect",
  model="{architect_model}",
  description="Plan Stage {stage}"
)
```

</step>

<step name="handle_architect_return">
Parse architect output:

**`## ARCHITECTING COMPLETE`:**
- Display: `Architect created {N} run(s). Files on disk.`
- If `--skip-verify`: Skip to present_final_status
- Check config: `WORKFLOW_REVIEW=$(cat .renn/config.json 2>/dev/null | grep -o '"review"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")`
- If `checks.review` is `false`: Skip to present_final_status
- Otherwise: Proceed to spawn_reviewer

**`## GATE REACHED`:**
- Present to user, get response, spawn continuation (see revision_loop)

**`## ARCHITECTING INCONCLUSIVE`:**
- Show what was attempted
- Offer: Add context, Retry, Manual
- Wait for user response
</step>

<step name="spawn_reviewer">
Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RENN ► VERIFYING RUNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning plan reviewer...
```

Read runs for the reviewer:

```bash
# Read all runs in stage directory
RUNS_CONTENT=$(cat "${STAGE_DIR}"/*-run.md 2>/dev/null)

# INTEL_CONTENT already loaded in ensure_stage_directory
# SPECS_CONTENT already loaded in read_context_files
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

IMPORTANT: If stage intel exists below, it contains USER DECISIONS from /renn.discuss-stage.
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
  subagent_type="renn-plan-reviewer",
  model="{reviewer_model}",
  description="Verify Stage {stage} runs"
)
```
</step>

<step name="handle_reviewer_return">
**If `## VERIFICATION PASSED`:**
- Display: `Runs verified. Ready for execution.`
- Proceed to present_final_status

**If `## ISSUES FOUND`:**
- Display: `Reviewer found issues:`
- List issues from reviewer output
- Check iteration count
- Proceed to revision_loop
</step>

<step name="revision_loop">
Track: `iteration_count` (starts at 1 after initial plan + check)

**If iteration_count < 3:**

Display: `Sending back to architect for revision... (iteration {N}/3)`

Read current runs for revision context:

```bash
RUNS_CONTENT=$(cat "${STAGE_DIR}"/*-run.md 2>/dev/null)
# INTEL_CONTENT already loaded in ensure_stage_directory
```

Spawn renn-architect with revision prompt:

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
  prompt=revision_prompt,
  subagent_type="renn-architect",
  model="{architect_model}",
  description="Revise Stage {stage} runs"
)
```

- After architect returns → spawn reviewer again (spawn_reviewer)
- Increment iteration_count

**If iteration_count >= 3:**

Display: `Max iterations reached. {N} issues remain:`
- List remaining issues

Offer options:
1. Force proceed (execute despite issues)
2. Provide guidance (user gives direction, retry)
3. Abandon (exit planning)

Wait for user response.
</step>

<step name="present_final_status">
Route to the command's `<offer_next>` section.
</step>

</process>
