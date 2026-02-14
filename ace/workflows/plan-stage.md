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

### Design Interview

**If `DESIGN_MODE="screens_only"`: Skip interview entirely.** Preferences are already baked into the existing stylekit.

**If `DESIGN_MODE="full"`:** Run the progressive design interview.

Display banner:

```
ACE > DESIGNING STAGE {X} -- DESIGN INTERVIEW

Before creating your design system, let me understand your vision.
```

If this is a restyle (DESIGN_MODE was set to "full" via the restyle trigger), acknowledge it: "You're restyling. Let me ask about your new direction."

#### Step 1: Analyze Project Context

Read available project context to generate design-relevant gray areas:

1. Read brief.md for project domain and value proposition
2. Read stage goal from track.md for what's being built
3. Read research.md (if exists) for technical context
4. Read intel.md (if exists) for existing decisions

Generate 3-5 gray areas SPECIFIC to this project. These are design decisions that would change the outcome and the user should weigh in on. Examples:

For a "personal dashboard" project:
- "Visual density" -- Dense data tables vs. spacious cards?
- "Brand personality" -- Professional tool feel vs. friendly personal app?
- "Interaction patterns" -- Drag-and-drop? Inline editing? Modal workflows?

For a "documentation site" project:
- "Content hierarchy" -- Hero-focused or content-first?
- "Visual identity" -- Technical/precise or approachable/warm?
- "Navigation density" -- Mega menu? Simple top nav? Sidebar?

NOT generic: "UI layout", "Color scheme", "Typography choices" -- these are categories, not gray areas.

**Map core design questions to gray areas.** Each of the 6 core design preferences should have a natural home in one of the generated gray areas:

| Core Question | Natural Fit Examples |
|---------------|---------------------|
| Visual style (professional/minimal/warm/bold) | Brand personality, Visual identity |
| Color direction (warm/cool/neutral/vibrant) | Brand personality, Visual identity |
| Typography (serif/sans/mono pairing) | Content presentation, Reading experience |
| Layout density (spacious/comfortable/dense) | Content density, Information architecture |
| Dark mode (dark-default/toggle/light-only) | Can be its own area or fit under Technical preferences |
| Responsive (desktop-first/fully-responsive/desktop-only) | Can be its own area or fit under Device strategy |

Track which core questions are mapped to which gray areas.

#### Step 2: Present Gray Areas for Selection

Use AskUserQuestion with multiSelect: true:

```
- header: "Design Direction"
- question: "Which design areas should we discuss for [stage name]?"
- options: [3-5 project-specific gray areas, each with a short description of what questions it covers]
```

Do NOT include a "skip all" option. The user ran design to get design -- give them real choices. Core design questions embedded in unselected areas will be caught by the fallback round (Step 4).

#### Step 3: Deep-Dive Each Selected Area

For each selected area, in order:

1. Announce the area: "Let's talk about [area]."

2. Ask 3-4 questions using AskUserQuestion, each with 2-4 concrete options:
   - Include the core design question(s) mapped to this area as structured AskUserQuestion calls
   - Every question MUST include a "Let Claude decide" option
   - For subjective/brand questions (visual style, color direction): recommend a specific option (label it "(Recommended)")
   - For opinionated/technical questions (typography pairing, spacing rhythm, border radius): recommend "Let Claude decide" (label it "(Recommended)")
   - For mixed questions (layout density, dark mode, responsive): recommend a specific option
   - Each subsequent question informed by previous answers in this area
   - After the core question(s), ask 1-2 project-specific follow-up questions for the gray area

3. After 3-4 questions for the area, offer: "More questions about [area], or move to next?"
   - If "More questions": ask 2-3 more, then check again
   - If "Next area": proceed to next selected area

**Scope guardrail:** If the user suggests something outside the stage domain during discussion:
```
"[Feature] sounds like a new capability -- that belongs in its own stage.
Let's focus on the design direction for [current stage]."
```

**Target 8-15 total questions across all areas.** The interview should take 2-3 minutes, not 10.

#### Step 4: Core Question Fallback

After all selected gray areas are discussed, check which core design questions were NOT asked (because their containing gray area was deselected or no gray area naturally contained them).

```
CORE_QUESTIONS = [visual_style, color_direction, typography, layout_density, dark_mode, responsive]
ASKED_QUESTIONS = [questions already embedded in gray area discussions]
REMAINING = CORE_QUESTIONS - ASKED_QUESTIONS
```

If REMAINING is not empty, present: "A few more design essentials:"

For each remaining core question, use AskUserQuestion with the standard options:

- **Visual style:** Professional/minimal, Clean/modern, Warm/editorial, Bold/expressive, Let Claude decide
- **Color direction:** Warm tones, Cool tones, Neutral/monochrome, Vibrant/saturated, Let Claude decide (Recommended)
- **Typography:** Sans-serif (modern), Serif (editorial), Mono (technical), Mixed pairing, Let Claude decide (Recommended)
- **Layout density:** Spacious (lots of whitespace), Comfortable (balanced), Dense (information-heavy), Let Claude decide (Recommended)
- **Dark mode:** Dark by default, Light with dark toggle, Light only, Let Claude decide
- **Responsive:** Desktop-first (responsive down), Fully responsive (mobile-first), Desktop only, Let Claude decide

#### Step 5: Pexels API Key Collection

After all design questions are answered, collect the Pexels API key as part of the same flow.

```bash
PEXELS_KEY=$(cat .ace/secrets.json 2>/dev/null | grep -o '"pexels_api_key"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "")
```

If key already exists in secrets.json: read silently, no prompt. Display: "Pexels key found."

If empty or missing, present as AskUserQuestion:

```
- header: "One last thing"
- question: "Pexels API key enables real stock images in prototypes. Get a free key at https://www.pexels.com/api/"
- options:
  - "Paste my key" -- I have a key ready
  - "Skip" -- Use placeholder images instead
```

If user selects "Paste my key", prompt for the key value. Then:
1. Read existing `.ace/secrets.json` content (if file exists) to preserve other fields
2. Merge `{"pexels_api_key": "{user_input}"}` into the existing JSON object
3. Write merged JSON back to `.ace/secrets.json`
4. Set `PEXELS_KEY` to the provided value
5. Display: "Pexels API key saved."

If user selects "Skip":
1. Set `PEXELS_KEY="NOT_AVAILABLE"`
2. Display: "Using placeholder images."
3. Do NOT create or modify secrets.json

Ensure `.ace/secrets.json` is gitignored:

```bash
grep -q "secrets.json" .gitignore 2>/dev/null || echo ".ace/secrets.json" >> .gitignore
```

#### Step 6: Compile Design Preferences

Compile all collected answers into a `DESIGN_PREFERENCES` variable using this format:

```xml
<design_preferences>

## Design Direction

### Visual Style
Pick: {user's choice OR "Designer's choice"}
Context: {any elaboration from follow-up questions}

### Color Direction
Pick: {user's choice OR "Designer's choice"}
Context: {any elaboration}

### Typography
Pick: {user's choice OR "Designer's choice"}
Context: {any elaboration}

### Layout
Pick: {user's choice OR "Designer's choice"}
Context: {any elaboration}

### Dark Mode
Pick: {user's choice OR "Designer's choice"}

### Responsive
Pick: {user's choice OR "Designer's choice"}

## Project-Specific Insights

### [Gray Area 1 that was discussed]
- {Decision or preference captured}
- {Another decision}

### [Gray Area 2 that was discussed]
- {Decision or preference captured}

## Designer Autonomy

The following aspects are marked as "Designer's choice" -- you have creative autonomy:
- {list of items where user picked "Let Claude decide"}

For these items, make opinionated choices that serve the project's domain and stage goals. Explain your reasoning in the design return.

</design_preferences>
```

Store in `DESIGN_PREFERENCES` for use in the Phase 1 spawn template.

Display: "Design preferences captured. Proceeding to design system creation..."

### Initialize Counters

```
auto_revision_count = 0
user_revision_count = 0
```

### Two-Phase Design Orchestration

The design workflow runs in two phases with an approval gate between them. Each phase has its own designer spawn, reviewer spawn, auto-revision loop, approval gate, and user revision loop.

- **Full mode:** Phase 1 (stylekit) then Phase 2 (screens)
- **screens_only mode:** Phase 2 only (stylekit already approved from a prior stage)

---

### Phase 1: Design System (ONLY when DESIGN_MODE="full")

**If `DESIGN_MODE="screens_only"`: Skip Phase 1 entirely. Jump to Phase 2.**

#### Phase 1 -- Assemble Designer Context and Spawn

9 context variables (plus `phase`):

| Variable | Source |
|----------|--------|
| `design_mode` | "full" (always full in Phase 1) |
| `phase` | "stylekit" |
| `stage_name` | parse_args |
| `stage_goal` | track.md stage details |
| `research_content` | `${STAGE_DIR}/research.md` content |
| `intel_content` | INTEL_CONTENT (loaded in ensure_stage_directory) |
| `pexels_key` | Pexels API key check result |
| `stage_dir` | STAGE_DIR path |

Note: `stylekit_content` and `component_names` are NOT passed in Phase 1 (they don't exist yet).

Phase 1 designer spawn template:

```
First, read ./.claude/agents/ace-designer.md for your role and instructions.

<design_context>

**Mode:** full
**Phase:** stylekit
**Stage:** {stage_name}
**Goal:** {stage_goal}

**Research:**
{research_content}

**Intel (raw -- extract design-relevant decisions yourself):**
{intel_content}

**Token Schema Reference:** Follow the 3-layer architecture (primitive, semantic, component) from the design token specification. W3C DTCG $type/$value structure. Namespace mapping: primitive.color.* -> --color-*, primitive.typography.family.* -> --font-*, primitive.typography.size.* -> --text-*, etc. All :root values resolved to concrete CSS (no var() references inside :root block). Stylekit.css uses plain :root {} custom properties, not Tailwind v4 @theme syntax. HTML boilerplate uses Tailwind v3 CDN with inline tailwind.config mapping tokens to theme extensions.
**Component Schema Reference:** Follow the component inventory format: required fields are name, description, category, properties, tokens, states, responsive, accessibility, preview. State vocabulary fixed at 8: default, hover, active, focus, disabled, loading, error, empty. Token-driven preview using semantic Tailwind classes.

**Pexels API Key:** {pexels_key}

**Output Directories:**
- Stylekit: .ace/design/
- Components: .ace/design/components/
- Preview: .ace/design/stylekit-preview.html

</design_context>
```

For Phase 1 revisions, append a `<revision_context>` block:

```
<revision_context>

**Revision:** {N} of 3
**Phase:** stylekit
**Source:** {reviewer | user}
**Feedback:**
{feedback_text}

**Current artifacts on disk:**
{list of existing artifact paths}

Revise the design system based on the feedback above. When changing tokens, cascade changes to all affected components and the preview (see Cascading Token Revisions rule). Overwrite files in place (git tracks previous versions).
Return ## DESIGN REVISION (not ## DESIGN COMPLETE) to signal this is a revision.

</revision_context>
```

Display banner before spawning:

```
ACE > DESIGNING STAGE {X} -- PHASE 1: DESIGN SYSTEM

Spawning designer (mode: full, phase: stylekit)...
```

Spawn:

```
Task(
  prompt=designer_prompt,
  subagent_type="general-purpose",
  model="{designer_model}",
  description="Design Stage {stage} - Phase 1 (stylekit)"
)
```

Parse designer return: `## DESIGN COMPLETE` or `## DESIGN REVISION`. Verify `**Phase:** stylekit` in the return.

#### Phase 1 -- Spawn Reviewer

Reviewer spawn template:

```
First, read ./.claude/agents/ace-design-reviewer.md for your role and instructions.

<review_context>

**Mode:** full
**Phase:** stylekit
**Designer Output:**
{designer_return}

**Artifact Paths:**
{artifact_paths}

Review stylekit, components, and preview for spec compliance, anti-generic aesthetics, and overall quality.
Phase scope: token structure, component YAML, preview HTML, full anti-generic checklist, component consistency.
Return REVIEW PASSED or ISSUES FOUND with actionable feedback.

</review_context>
```

```
Task(
  prompt=reviewer_prompt,
  subagent_type="general-purpose",
  model="{reviewer_model}",
  description="Review design Phase 1 (stylekit) for Stage {stage}"
)
```

#### Phase 1 -- Auto-Revision Loop

Same logic as the standard auto-revision pattern, using the shared `auto_revision_count`:

If `## ISSUES FOUND`:
1. Increment `auto_revision_count`
2. If `auto_revision_count <= 2`:
   - Display: "Reviewer found issues. Auto-revising... (attempt {auto_revision_count}/2)"
   - Re-spawn designer with Phase 1 context + revision_context (source: "reviewer", feedback: reviewer's issue list)
   - After designer returns: re-spawn reviewer (phase: stylekit)
   - Loop back to check reviewer return
3. If `auto_revision_count > 2`:
   - Display: "Auto-revision limit reached. Escalating to user."
   - Present Phase 1 escalation (see Phase 1 Escalation below)

If `## REVIEW PASSED`:
- Reset `auto_revision_count = 0`
- Proceed to Phase 1 Approval Gate

#### Phase 1 -- Approval Gate

**Step 1 -- Auto-open preview in browser:**

Build the file list for Phase 1: `.ace/design/stylekit-preview.html` ONLY.

```bash
# EXECUTE THIS NOW -- open Phase 1 preview before showing gate
GATE_FILES=".ace/design/stylekit-preview.html"
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

**Step 2 -- Present checkpoint:human-verify:**

```
what-built: "Design system for Stage {N}: {stage_name}"
how-to-verify:
  1. Review design system preview in browser (auto-opened):
     - .ace/design/stylekit-preview.html (colors, typography, spacing, components)
  2. Check that color palette matches your brand vision
  3. Verify typography feels right for your project
  4. Review component styling (buttons, cards, inputs, etc.)
  Note: Screen layouts are created in the next phase after you approve this design system.
resume-signal: Type "approved" or describe what to change (e.g., "make primary color darker", "switch to a serif font")
```

#### Phase 1 -- User Revision Loop

If user types "approved": Proceed to Phase 1 -> Phase 2 transition.

If user provides feedback:
1. Increment `user_revision_count`
2. If `user_revision_count <= 3`:
   - Re-spawn designer with Phase 1 context + revision_context (source: "user", feedback: user's text). Note: revision_context includes the cascade instruction.
   - After designer returns: re-spawn reviewer (phase: stylekit)
   - If reviewer passes: present updated Phase 1 gate
   - If reviewer fails: enter Phase 1 auto-revision loop, then present to user
3. If `user_revision_count > 3`: Present Phase 1 escalation

#### Phase 1 -- Escalation

Present `checkpoint:decision`:

```
Design system has reached the revision limit.

Current state: {summary of latest designer output}
{IF reviewer issues exist:} Reviewer concerns: {summary of latest issues}

Options:
  Accept - Use current design system as-is (proceed to screen design)
  Restart - Start over with a completely new design direction
  Skip - Skip ALL design for this stage (no screens will be created)

Select: accept, restart, or skip
```

Behavior:
- `accept`: Proceed to Phase 2 with current stylekit (treated as approved).
- `restart`: Delete `.ace/design/` contents (stylekit, CSS, components, preview). Reset both counters to 0. Re-run Phase 1 from designer spawn.
- `skip`: Delete `.ace/design/` contents. Set `HAS_DESIGN=false`. Skip Phase 2. Continue to check_existing_runs.

**CRITICAL:** Phase 1 skip aborts BOTH phases. There is no path where Phase 1 is skipped but Phase 2 runs.

#### Phase 1 -> Phase 2 Transition

After Phase 1 approval (or accept-as-is):

1. Reset counters for Phase 2:
   ```
   auto_revision_count = 0
   user_revision_count = 0
   ```

2. Store Phase 1 artifacts for Phase 2 context:
   ```
   APPROVED_STYLEKIT_PATH=".ace/design/stylekit.yaml"
   APPROVED_COMPONENT_NAMES=$(ls .ace/design/components/ 2>/dev/null)
   ```

3. Proceed to Phase 2.

---

### Phase 2: Screen Prototypes (runs for BOTH full and screens_only modes)

#### Phase 2 -- Assemble Designer Context and Spawn

| Variable | Source |
|----------|--------|
| `design_mode` | Original mode determination result (full or screens_only) |
| `phase` | "screens" |
| `stage_name` | parse_args |
| `stage_goal` | track.md stage details |
| `research_content` | `${STAGE_DIR}/research.md` content |
| `intel_content` | INTEL_CONTENT |
| `stylekit_content` | Content of `.ace/design/stylekit.yaml` (read now -- locked, do not modify) |
| `component_names` | `ls .ace/design/components/` directory listing |
| `pexels_key` | Pexels API key check result |
| `stage_dir` | STAGE_DIR path |

Phase 2 designer spawn template:

```
First, read ./.claude/agents/ace-designer.md for your role and instructions.

<design_context>

**Mode:** {design_mode}
**Phase:** screens
**Stage:** {stage_name}
**Goal:** {stage_goal}

**Research:**
{research_content}

**Intel (raw -- extract design-relevant decisions yourself):**
{intel_content}

**Approved Stylekit:** (locked -- do not modify)
{stylekit_content}

**Available Components:**
{component_names}

**Pexels API Key:** {pexels_key}

**Output Directories:**
- Screen specs: {stage_dir}/design/
- Screen prototypes: {stage_dir}/design/

</design_context>
```

For Phase 2 revisions, append:

```
<revision_context>

**Revision:** {N} of 3
**Phase:** screens
**Source:** {reviewer | user}
**Feedback:**
{feedback_text}

**Current artifacts on disk:**
{list of existing artifact paths}

Revise screen prototypes based on the feedback above. The design system (stylekit, components) is locked -- do not modify tokens or existing components. Overwrite prototype files in place (git tracks previous versions).
Return ## DESIGN REVISION (not ## DESIGN COMPLETE) to signal this is a revision.

</revision_context>
```

Display banner:

```
ACE > DESIGNING STAGE {X} -- PHASE 2: SCREEN PROTOTYPES

Spawning designer (mode: {design_mode}, phase: screens)...
```

Spawn:

```
Task(
  prompt=designer_prompt,
  subagent_type="general-purpose",
  model="{designer_model}",
  description="Design Stage {stage} - Phase 2 (screens)"
)
```

Parse designer return: `## DESIGN COMPLETE` or `## DESIGN REVISION`. Verify `**Phase:** screens` in the return.

#### Phase 2 -- Spawn Reviewer

```
First, read ./.claude/agents/ace-design-reviewer.md for your role and instructions.

<review_context>

**Mode:** {design_mode}
**Phase:** screens
**Designer Output:**
{designer_return}

**Artifact Paths:**
{artifact_paths}

Review screen specs and prototypes for spec compliance and overall quality.
Phase scope: screen spec YAML, screen prototype HTML, layout coherence, responsive overrides, images. Skip stylekit/component checks (already approved).
Return REVIEW PASSED or ISSUES FOUND with actionable feedback.

</review_context>
```

```
Task(
  prompt=reviewer_prompt,
  subagent_type="general-purpose",
  model="{reviewer_model}",
  description="Review design Phase 2 (screens) for Stage {stage}"
)
```

#### Phase 2 -- Auto-Revision Loop

Same logic as Phase 1, using the reset `auto_revision_count`:

If `## ISSUES FOUND`:
1. Increment `auto_revision_count`
2. If `auto_revision_count <= 2`:
   - Display: "Reviewer found issues. Auto-revising... (attempt {auto_revision_count}/2)"
   - Re-spawn designer with Phase 2 context + revision_context (source: "reviewer", feedback: reviewer's issue list)
   - After designer returns: re-spawn reviewer (phase: screens)
   - Loop back to check reviewer return
3. If `auto_revision_count > 2`:
   - Display: "Auto-revision limit reached. Escalating to user."
   - Present Phase 2 escalation (see Phase 2 Escalation below)

If `## REVIEW PASSED`:
- Reset `auto_revision_count = 0`
- Proceed to Phase 2 Approval Gate

#### Phase 2 -- Approval Gate

**Step 1 -- Auto-open prototypes in browser:**

Build the file list for Phase 2: `{stage_dir}/design/*.html` ONLY (screen prototypes, not stylekit-preview.html).

```bash
# EXECUTE THIS NOW -- open Phase 2 prototypes before showing gate
GATE_FILES=$(ls ${STAGE_DIR}/design/*.html 2>/dev/null)
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

**Step 2 -- Present checkpoint:human-verify:**

```
what-built: "Screen prototypes for Stage {N}: {stage_name}"
how-to-verify:
  1. Review screen prototypes in browser (auto-opened):
     - {list screen prototype .html files from {stage_dir}/design/}
  2. Check that layouts match your vision for each screen
  3. Verify components are used consistently across screens
  4. Review responsive behavior if applicable
  Note: The design system (colors, fonts, spacing) was approved in the previous phase. Screen feedback should be about layout and content, not colors/fonts.
  {IF DESIGN_MODE is screens_only:}
  Note: Using existing design system from a prior stage. If you want to change the visual identity, restart with a restyle.
resume-signal: Type "approved" or describe what to change
```

#### Phase 2 -- User Revision Loop

If user types "approved": Store design output. Continue to check_existing_runs.

If user provides feedback:
1. Increment `user_revision_count`
2. If `user_revision_count <= 3`:
   - Re-spawn designer with Phase 2 context + revision_context (source: "user", feedback: user's text)
   - After designer returns: re-spawn reviewer (phase: screens)
   - If reviewer passes: present updated Phase 2 gate
   - If reviewer fails: enter Phase 2 auto-revision loop, then present to user
3. If `user_revision_count > 3`: Present Phase 2 escalation

#### Phase 2 -- Escalation

Present `checkpoint:decision`:

```
Screen prototypes have reached the revision limit.

Current state: {summary of latest designer output}
{IF reviewer issues exist:} Reviewer concerns: {summary of latest issues}

Options:
  Accept - Use current screen prototypes as-is (proceed to architect)
  Restart - Start over with new screen layouts (design system stays locked)
  Skip - Skip screen design (stylekit exists but no screen specs for this stage)

Select: accept, restart, or skip
```

Behavior:
- `accept`: Store current screen artifacts as approved. Continue to Store Design Output.
- `restart`: Delete `{stage_dir}/design/` contents only (NOT .ace/design/ -- stylekit stays). Reset Phase 2 counters to 0. Re-run Phase 2 from designer spawn.
- `skip`: Delete `{stage_dir}/design/` contents. Stylekit remains. Continue to Store Design Output (HAS_DESIGN still true since stylekit exists, but no screen specs for this stage).

---

### Store Design Output

After Phase 2 approval (or accept-as-is escalation), store the design output paths for `read_context_files`:

```
DESIGN_SCREEN_SPECS=$(ls ${STAGE_DIR}/design/*.yaml 2>/dev/null)
DESIGN_STYLEKIT_PATH=".ace/design/stylekit.yaml"
DESIGN_STAGE_DIR="${STAGE_DIR}/design"
HAS_DESIGN=true
```

If Phase 2 was skipped but Phase 1 completed (Phase 2 skip escalation):

```
DESIGN_SCREEN_SPECS=""
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
