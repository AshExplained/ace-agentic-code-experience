<purpose>
Create executable stage prompts (run.md files) through a research → plan → verify loop.

Use this workflow when planning a stage's runs. Handles research scouting, architect spawning, plan reviewer verification, and revision iterations.
</purpose>

<core_principle>
Fresh context per agent. Orchestrator stays lean (~15%), each subagent gets 100% fresh 200k. Intel.md loaded early and passed to ALL agents to constrain scope.
</core_principle>

<process>

<step name="validate_environment" priority="first">
Validate .ace/ exists and resolve model profile:

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
| ace-designer | opus | sonnet | sonnet |
| ace-design-reviewer | sonnet | sonnet | haiku |

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
ls .ace/stages/${STAGE}-*/*-research.md 2>/dev/null
ls .ace/stages/${STAGE}-*/*-run.md 2>/dev/null
```
</step>

<step name="validate_stage">
```bash
grep -A5 "Stage ${STAGE}:" .ace/track.md 2>/dev/null
```

**If not found:** Error with available stages. **If found:** Extract stage number, name, description.
</step>

<step name="ensure_stage_directory">
```bash
# STAGE is already normalized (08, 02.1, etc.) from parse_arguments
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
</step>

<step name="handle_research">
**If `--gaps` flag:** Skip research (gap closure uses proof.md instead).

**If `--skip-research` flag:** Skip to check_existing_runs.

**Check config for research setting:**

```bash
WORKFLOW_RESEARCH=$(cat .ace/config.json 2>/dev/null | grep -o '"research"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
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
 ACE ► SCOUTING STAGE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning scout...
```

Proceed to spawn scout.

### Spawn ace-stage-scout

Gather additional context for research prompt:

```bash
# Get stage description from track
STAGE_DESC=$(grep -A3 "Stage ${STAGE}:" .ace/track.md)

# Get specs if they exist
SPECS=$(cat .ace/specs.md 2>/dev/null | grep -A100 "## Requirements" | head -50)

# Get prior decisions from pulse.md
DECISIONS=$(grep -A20 "### Decisions Made" .ace/pulse.md 2>/dev/null)

# INTEL_CONTENT already loaded in ensure_stage_directory
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
- Continue to check_existing_runs

**`## RESEARCH BLOCKED`:**
- Display blocker information
- Offer: 1) Provide more context, 2) Skip research and plan anyway, 3) Abort
- Wait for user response
</step>

<step name="handle_design">

**If `--gaps` flag:** Skip handle_design entirely (gap closure does not re-run design).

**If `--skip-research` flag was used AND no research exists:** Design still runs if triggered -- design does not require research.

### UI Detection (PLAN-02)

Define the three keyword lists:

```
STRONG_POSITIVE = [ui, frontend, dashboard, interface, page, screen, layout, form,
                   component, widget, view, display, navigation, sidebar, header,
                   footer, modal, dialog, login, signup, register, onboarding,
                   checkout, wizard, portal, gallery, carousel, menu, toolbar,
                   toast, notification, badge, avatar, card, table, grid]

MODERATE_POSITIVE = [visual, render, prototype, style, theme, responsive, landing,
                     home, profile, settings, account, billing, search, filter,
                     admin, panel]

STRONG_NEGATIVE = [api, backend, cli, migration, database, schema, middleware,
                   config, devops, deploy, test, refactor, security, performance]
```

Detection algorithm:

```
function detect_ui_stage(stage_name, goal_text, intel_content, specs_content):
  strong_pos = 0
  strong_neg = 0
  moderate   = 0

  for keyword in STRONG_POSITIVE:
    if keyword in lower(stage_name): strong_pos++
    if keyword in lower(goal_text):  strong_pos++
  for keyword in MODERATE_POSITIVE:
    if keyword in lower(stage_name): moderate++
    if keyword in lower(goal_text):  moderate++
  for keyword in STRONG_NEGATIVE:
    if keyword in lower(stage_name): strong_neg++
    if keyword in lower(goal_text):  strong_neg++

  if intel_content and has_visual_mentions(intel_content): strong_pos++
  if specs_content and has_ui_requirements(specs_content): strong_pos++

  if strong_pos > 0 and strong_neg == 0: return DESIGN_NEEDED
  if strong_pos > 0 and strong_neg > 0:  return UNCERTAIN
  if moderate > 0:                        return UNCERTAIN
  return NO_DESIGN
```

`has_visual_mentions()` scans intel for layout/screen/style/component terms. `has_ui_requirements()` scans specs for component/screen/UI/layout/visual/prototype terms.

### Routing by Detection Result

- `NO_DESIGN`: Skip to check_existing_runs. Zero side effects -- no directory creation, no file reads beyond detection, no state changes, no messages emitted.

- `UNCERTAIN`: Present a `checkpoint:decision`:

```
This stage may need design. Include design phase?

Context:
  Stage: {stage_name}
  Goal: {goal text from track.md}
  Signals found: {list of matched keywords and sources}

Options:
  Yes - Run design phase (stylekit + screen specs)
  No  - Skip design, proceed to architect
```

User selects No -> skip to check_existing_runs. User selects Yes -> proceed as DESIGN_NEEDED.

- `DESIGN_NEEDED`: Continue to existing design detection.

### Existing Design Detection (PLAN-03 partial)

```bash
ls "${STAGE_DIR}"/design/*.yaml 2>/dev/null
```

If files exist and no `--force` flag: Display "Using existing design: ${STAGE_DIR}/design/". Store design paths for read_context. Skip to check_existing_runs.

### Mode Determination (PLAN-03)

```bash
ls .ace/design/stylekit.yaml 2>/dev/null
```

If stylekit does NOT exist: `DESIGN_MODE="full"` (first UI stage).
If stylekit exists: `DESIGN_MODE="screens_only"` (subsequent UI stage).

### Restyle Trigger (PLAN-07)

Only when `DESIGN_MODE="screens_only"` (existing stylekit detected):

Present `checkpoint:decision`:

```
Existing stylekit found at .ace/design/stylekit.yaml

Options:
  Use existing - Create new screens using current design system
  Restyle - Create a new visual direction (replaces current stylekit)

Select: use-existing or restyle
```

If `use-existing`: Continue with `DESIGN_MODE="screens_only"`.
If `restyle`: Set `DESIGN_MODE="full"`. Designer receives existing stylekit as reference context.

### Pexels API Key Check

```bash
PEXELS_KEY=$(cat .ace/secrets.json 2>/dev/null | grep -o '"pexels_api_key"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "")
```

If empty or missing, use the subagent's interactive prompt (AskUserQuestion tool or equivalent) to present:

```
Pexels API key not found.

This key enables real stock images in design prototypes.
Get a free key at: https://www.pexels.com/api/

Paste your API key below, or type 'skip' to use placeholder images:
```

If the user provides a key (non-empty string that is not "skip"):
1. Read existing `.ace/secrets.json` content (if file exists) to preserve other fields
2. Merge `{"pexels_api_key": "{user_input}"}` into the existing JSON object
3. Write merged JSON back to `.ace/secrets.json`
4. Set `PEXELS_KEY` to the provided value
5. Display: "Pexels API key saved to .ace/secrets.json"

If the user types "skip":
1. Set `PEXELS_KEY="NOT_AVAILABLE"`
2. Display: "Skipping Pexels -- using placeholder images."
3. Do NOT create or modify secrets.json

This prompt appears only when no key exists. On subsequent UI stages where secrets.json already has the key, it is read silently (no prompt).

Ensure `.ace/secrets.json` is gitignored:

```bash
grep -q "secrets.json" .gitignore 2>/dev/null || echo ".ace/secrets.json" >> .gitignore
```

If key is present: `PEXELS_KEY` holds the value. If absent after prompt: `PEXELS_KEY="NOT_AVAILABLE"`.

### Initialize Counters

```
auto_revision_count = 0
user_revision_count = 0
```

### Assemble Designer Context and Spawn (PLAN-04)

9 context variables:

| Variable | Source |
|----------|--------|
| `design_mode` | Mode determination / restyle trigger result |
| `stage_name` | parse_args |
| `stage_goal` | track.md stage details |
| `research_content` | `${STAGE_DIR}/research.md` content |
| `intel_content` | INTEL_CONTENT (loaded in ensure_stage_directory) |
| `stylekit_content` | `.ace/design/stylekit.yaml` content (screens_only mode only; omit in full mode) |
| `component_names` | `ls .ace/design/components/` directory listing (screens_only mode only) |
| `pexels_key` | Pexels API key check result |
| `stage_dir` | STAGE_DIR path |

Designer spawn template:

```
First, read ./.claude/agents/ace-designer.md for your role and instructions.

<design_context>

**Mode:** {design_mode}
**Stage:** {stage_name}
**Goal:** {stage_goal}

**Research:**
{research_content}

**Intel (raw -- extract design-relevant decisions yourself):**
{intel_content}

{IF screens_only mode:}
**Existing Stylekit:**
{stylekit_content}

**Existing Components:**
{component_names}

{IF full mode:}
**Token Schema Reference:** Follow the 3-layer architecture (primitive, semantic, component) from the design token specification. W3C DTCG $type/$value structure. Namespace mapping: primitive.color.* -> --color-*, primitive.typography.family.* -> --font-*, primitive.typography.size.* -> --text-*, etc. All :root values resolved to concrete CSS (no var() references inside :root block). Stylekit.css uses plain :root {} custom properties, not Tailwind v4 @theme syntax. HTML boilerplate uses Tailwind v3 CDN with inline tailwind.config mapping tokens to theme extensions.
**Component Schema Reference:** Follow the component inventory format: required fields are name, description, category, properties, tokens, states, responsive, accessibility, preview. State vocabulary fixed at 8: default, hover, active, focus, disabled, loading, error, empty. Token-driven preview using semantic Tailwind classes.

**Pexels API Key:** {pexels_key}

**Output Directories:**
- Stylekit (full mode only): .ace/design/
- Components (full mode only): .ace/design/components/
- Screen specs: {stage_dir}/design/

</design_context>
```

For revisions, append a `<revision_context>` block:

```
<revision_context>

**Revision:** {N} of 3
**Source:** {reviewer | user}
**Feedback:**
{feedback_text}

**Current artifacts on disk:**
{list of existing artifact paths}

Revise the design based on the feedback above. Overwrite prototype files in place (git tracks previous versions).
Return ## DESIGN REVISION (not ## DESIGN COMPLETE) to signal this is a revision.

</revision_context>
```

Display stage banner before spawning:

```
ACE > DESIGNING STAGE {X}

Spawning designer (mode: {design_mode})...
```

Spawn:

```
Task(
  prompt=designer_prompt,
  subagent_type="general-purpose",
  model="{designer_model}",
  description="Design Stage {stage}"
)
```

Parse designer return: `## DESIGN COMPLETE` or `## DESIGN REVISION` as the completion marker. Extract artifact paths from the "Artifacts Created" section.

### Spawn Reviewer (PLAN-04)

Reviewer spawn template:

```
First, read ./.claude/agents/ace-design-reviewer.md for your role and instructions.

<review_context>

**Mode:** {design_mode}
**Designer Output:**
{designer_return}

**Artifact Paths:**
{artifact_paths}

Review all listed artifacts for spec compliance, anti-generic aesthetics, and overall quality.
Return REVIEW PASSED or ISSUES FOUND with actionable feedback.

</review_context>
```

```
Task(
  prompt=reviewer_prompt,
  subagent_type="general-purpose",
  model="{reviewer_model}",
  description="Review design for Stage {stage}"
)
```

Parse reviewer return: `## REVIEW PASSED` or `## ISSUES FOUND`.

### Auto-Revision Loop (PLAN-05)

If `## ISSUES FOUND`:
1. Increment `auto_revision_count`
2. If `auto_revision_count <= 2`:
   - Display: "Reviewer found issues. Auto-revising... (attempt {auto_revision_count}/2)"
   - Re-spawn designer with standard design_context + `<revision_context>` block (source: "reviewer", feedback: reviewer's issue list)
   - After designer returns: re-spawn reviewer on revised output
   - Loop back to check reviewer return
3. If `auto_revision_count > 2`:
   - Display: "Auto-revision limit reached. Escalating to user."
   - Present escalation gate (see Escalation Flow below)

If `## REVIEW PASSED`:
- Reset `auto_revision_count = 0`
- Proceed to approval gate

### Auto-Open Prototypes in Browser

Before displaying the approval gate, open all review-listed HTML files in the user's default browser.

Build the file list based on mode:
- Full mode: `.ace/design/stylekit-preview.html` + all `{stage_dir}/design/*.html` files
- Screens-only mode: all `{stage_dir}/design/*.html` files only

Open each file using platform-detected commands:

```bash
# Platform-specific browser open (best-effort, non-blocking)
for file in $GATE_FILES; do
  if [[ -f "$file" ]]; then
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
      start "" "$file"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
      open "$file"
    elif command -v xdg-open &>/dev/null; then
      xdg-open "$file" &>/dev/null &
    elif command -v cmd.exe &>/dev/null; then
      cmd.exe /c start "" "$file"
    fi
    sleep 0.5
  fi
done
```

Important:
- Open files BEFORE displaying the gate prompt (user sees prototypes while reading the gate text)
- Use `sleep 0.5` between opens to avoid overwhelming the browser with simultaneous tab opens
- Wrap in best-effort pattern -- if open fails (headless environment, missing command), proceed silently
- The `start ""` pattern on Windows is required because `start` interprets the first quoted argument as a window title
- The `cmd.exe` fallback handles WSL and native Windows PowerShell where `$OSTYPE` may not be `msys`

### Human-Verify Approval Gate (PLAN-06)

Present `checkpoint:human-verify`:

Full mode gate:
```
what-built: "Design system and screen prototypes for Stage {N}: {stage_name}"
how-to-verify:
  1. Review design preview in browser (auto-opened):
     - .ace/design/stylekit-preview.html (design system overview: colors, typography, spacing, components)
     - {list only screen prototype .html files from {stage_dir}/design/ -- NOT component HTMLs from .ace/design/components/}
  2. Check that layout matches your vision
  3. Verify components look intentional (not generic AI defaults)
  4. Review stylekit token choices (colors, typography, spacing)
  {IF revision exists:}
  5. Compare with previous version using git diff or browser tab comparison
resume-signal: Type "approved" or describe what to change
```

Screens-only mode gate:
```
what-built: "Screen prototypes for Stage {N}: {stage_name}"
how-to-verify:
  1. Review screen prototypes in browser (auto-opened):
     - {list only screen prototype .html files from {stage_dir}/design/}
  2. Check screens use existing design system consistently
  3. Verify new components (if any) match existing style
  {IF revision exists:}
  4. Compare with previous version using git diff or browser tab comparison
resume-signal: Type "approved" or describe what to change
```

### User Revision Loop (PLAN-06)

If user types "approved": Store design output paths. Continue to check_existing_runs.

If user provides feedback (anything other than "approved"):
1. Increment `user_revision_count`
2. If `user_revision_count <= 3`:
   - Re-spawn designer with standard design_context + `<revision_context>` block (source: "user", feedback: user's text)
   - After designer returns: re-spawn reviewer on revised output
   - If reviewer passes: present updated approval gate to user
   - If reviewer fails: enter auto-revision loop, then present to user
3. If `user_revision_count > 3`:
   - Present escalation gate

### Escalation Flow (PLAN-06)

Present `checkpoint:decision`:

```
Design has reached the revision limit.

Current state: {summary of latest designer output}
{IF reviewer issues exist:} Reviewer concerns: {summary of latest issues}

Options:
  Accept - Use current design as-is (proceed to architect)
  Restart - Start over with a completely new design direction
  Skip - Skip design for this stage (proceed to architect without screen specs)

Select: accept, restart, or skip
```

Behavior:
- `accept`: Store current design artifacts as approved. Continue to check_existing_runs.
- `restart`: Delete `{stage_dir}/design/` contents. Reset both counters to 0. Re-run from designer spawn. Stylekit NOT deleted if from a previous stage.
- `skip`: Delete `{stage_dir}/design/` contents. Continue to check_existing_runs without design context.

### Store Design Output

After approval (or accept-as-is escalation), store the design output paths for `read_context_files`:

```
DESIGN_SCREEN_SPECS=$(ls ${STAGE_DIR}/design/*.yaml 2>/dev/null)
DESIGN_STYLEKIT_PATH=".ace/design/stylekit.yaml"
DESIGN_STAGE_DIR="${STAGE_DIR}/design"
HAS_DESIGN=true
```

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
PULSE_CONTENT=$(cat .ace/pulse.md)
TRACK_CONTENT=$(cat .ace/track.md)

# Read optional files (empty string if missing)
SPECS_CONTENT=$(cat .ace/specs.md 2>/dev/null)
# INTEL_CONTENT already loaded in ensure_stage_directory
RESEARCH_CONTENT=$(cat "${STAGE_DIR}"/*-research.md 2>/dev/null)

# Design context (only if handle_design produced approved artifacts)
if [ "$HAS_DESIGN" = "true" ]; then
  # Read screen spec YAML files to build summaries
  DESIGN_SCREEN_SPECS=$(ls "${STAGE_DIR}"/design/*.yaml 2>/dev/null)
  DESIGN_SUMMARIES=""
  for spec in $DESIGN_SCREEN_SPECS; do
    screen_name=$(grep -m1 "^screen:" "$spec" | sed 's/screen: //')
    description=$(grep -m1 "^description:" "$spec" | sed 's/description: //')
    DESIGN_SUMMARIES="${DESIGN_SUMMARIES}\n- ${screen_name}: ${description} (${spec})"
  done
  DESIGN_STYLEKIT_PATH=".ace/design/stylekit.yaml"
fi

# Gap closure files (only if --gaps mode)
PROOF_CONTENT=$(cat "${STAGE_DIR}"/*-proof.md 2>/dev/null)
UAT_CONTENT=$(cat "${STAGE_DIR}"/*-uat.md 2>/dev/null)
```

The `HAS_DESIGN` variable is set by `handle_design`. If design was skipped (NO_DESIGN, user declined, or --gaps mode), `HAS_DESIGN` is unset and no design context is loaded.
</step>

<step name="spawn_architect">
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

{IF HAS_DESIGN is true:}

**Design:**
Global stylekit: .ace/design/stylekit.yaml
Screen specs for this stage: {stage_dir}/design/

Screen summary:
{design_summaries}

IMPORTANT: Every UI implementation task MUST reference the specific screen spec
it implements. Include the screen spec path in the task's <context> section as an
@ reference. Example:

  <context>
  @.ace/design/stylekit.yaml
  @.ace/stages/{NN}-{stage-name}/design/{screen-name}.yaml
  </context>

Tasks that implement UI without referencing their screen spec will produce
output inconsistent with the approved design.

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

When design was not triggered (non-UI stage), the `**Design:**` section is omitted entirely. The planning_context remains unchanged from the current template.
</step>

<step name="handle_architect_return">
Parse architect output:

**`## ARCHITECTING COMPLETE`:**
- Display: `Architect created {N} run(s). Files on disk.`
- If `--skip-verify`: Skip to present_final_status
- Check config: `WORKFLOW_REVIEW=$(cat .ace/config.json 2>/dev/null | grep -o '"review"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")`
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
 ACE ► VERIFYING RUNS
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
