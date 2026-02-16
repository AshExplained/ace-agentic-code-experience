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
- `--skip-ux-interview` flag to skip UX interview

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

# Read UX.md for scout (if exists)
UX_CONTENT_FOR_SCOUT=$(cat .ace/research/UX.md 2>/dev/null)
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

<step name="detect_ui_stage">
**If `--gaps` flag:** Set `UI_STAGE=false`. Skip to handle_design.

Run UI detection ONCE. Both handle_ux_interview and handle_design use this result.

### UI Detection (moved from handle_design)

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

- `NO_DESIGN`: Set `UI_STAGE=false`. No side effects.

- `UNCERTAIN`: Present a `checkpoint:decision`:

```
This stage may need UX research and design. Include design pipeline?

Context:
  Stage: {stage_name}
  Goal: {goal text from track.md}
  Signals found: {list of matched keywords and sources}

Options:
  Yes - Run UX interview + design phase
  No  - Skip UX interview and design, proceed to architect
```

User selects No -> set `UI_STAGE=false`.
User selects Yes -> set `UI_STAGE=true`.

- `DESIGN_NEEDED`: Set `UI_STAGE=true`.

Store `UI_STAGE` for use by handle_ux_interview and handle_design.
</step>

<step name="handle_ux_interview">
**Skip conditions (check in order):**
1. `--gaps` flag set -> skip (gap closure does not re-run interviews)
2. `UI_STAGE` is false -> skip
3. UX.md does not exist -> skip (display: "No UX.md found. Skipping UX interview. Run /ace.start or /ace.new-milestone to generate UX research.")
4. `--skip-ux-interview` flag set -> skip

**Read UX context:**

```bash
UX_CONTENT=$(cat .ace/research/UX.md 2>/dev/null)
if [ -z "$UX_CONTENT" ]; then
  echo "No UX.md found. Skipping UX interview."
  UX_INTERVIEW_ANSWERS=""
  UX_QUESTIONS_ASKED=0
fi

RESEARCH_UX_SECTION=""
if [ -f "${STAGE_DIR}"/*-research.md ]; then
  RESEARCH_UX_SECTION=$(sed -n '/## Stage UX Patterns/,/^## [^S]/p' "${STAGE_DIR}"/*-research.md 2>/dev/null)
fi
```

**Display banner:**

```
ACE > UX INTERVIEW FOR STAGE {X}

Before visual design, let's discuss how users should experience this stage.
```

**Generate 4-6 questions dynamically from UX.md findings (UXIN-04):**

Read UX.md content and extract questions from these categories:

1. **Critical Flows (1-2 questions):** For each critical flow with LOW or MEDIUM friction tolerance in UX.md, generate a question about how that flow should behave in this stage. Use third-person framing (UXIN-05):
   - "When a user reaches [flow_name] for the first time, should the experience prioritize [option A] or [option B]?"

2. **Proven Patterns (1-2 questions):** For proven patterns from UX.md that apply to this stage's features, ask whether to adopt the pattern. Direct framing acceptable for preference questions:
   - "Research shows [pattern] works well in [domain]. Should this stage use [pattern implementation]?"

3. **Anti-Pattern Awareness (0-1 questions):** If UX.md identifies anti-patterns relevant to this stage, generate one awareness question. Third-person framing:
   - "UX research flagged [anti_pattern] as common in [domain]. When a user encounters [scenario], how should we handle it?"

4. **Emotional Design (1 question):** Generate one emotional calibration question from UX.md emotional design goals. Direct framing:
   - "UX research targets '[emotion]' as the primary user feeling. For this stage, which approach better achieves that?"

**Question format (UXIN-02, UXIN-03):**

Every question presented via AskUserQuestion:
- 2-4 concrete options informed by UX.md findings
- EVERY question includes a "Let Claude decide" option with research-backed default: "(Research suggests: [UX.md recommendation])"
- Third-person framing for interaction/flow questions (UXIN-05); direct framing for preference/calibration questions
- Track `UX_QUESTIONS_ASKED` count (target 4-6)

**Compile answers:**

```xml
<ux_interview_answers>
### [Question Topic 1]
Question: {question text}
Answer: {user's choice or "Let Claude decide"}
Research default: {what UX.md recommends}

### [Question Topic 2]
Question: {question text}
Answer: {user's choice or "Let Claude decide"}
Research default: {what UX.md recommends}

...
</ux_interview_answers>
```

**Store for downstream:**
- `UX_INTERVIEW_ANSWERS` -- compiled answers
- `UX_QUESTIONS_ASKED` -- count for visual interview budget
- `UX_CONTENT` -- original UX.md content for synthesis
- `RESEARCH_UX_SECTION` -- stage-specific UX section for synthesis
</step>

<step name="ux_synthesis">
**Skip conditions:**
1. handle_ux_interview was skipped -> skip (`UX_INTERVIEW_ANSWERS` is empty)
2. `UI_STAGE` is false -> skip

**Synthesize inline (UXSY-03: no agent spawn):**

Read:
- `UX_CONTENT` (project-level UX.md research)
- `RESEARCH_UX_SECTION` (stage-specific UX patterns from research.md)
- `UX_INTERVIEW_ANSWERS` (user decisions from UX interview)

Produce `UX_BRIEF` by combining all three sources into concrete design implications:

```xml
<ux_brief>

## UX Direction for Stage {X}: {Name}

### Interaction Model
- [Concrete decisions from interview answers, e.g., "Inline form validation with debounced checks"]
- [Research-backed defaults for "Let Claude decide" answers, e.g., "Toast notifications for async operations, auto-dismiss 5s"]

### Spacing and Density
- [Implied from adopted patterns, e.g., "Comfortable density -- 16px base padding, 24px section gaps"]
- [From UX.md emotional design implications, e.g., "Generous whitespace to achieve calm emotion"]

### Component Implications
- [From adopted patterns + interview answers, e.g., "Data tables with sortable headers per UX.md proven pattern"]
- [From anti-pattern avoidance, e.g., "No infinite scroll -- paginate with clear page numbers per UX.md anti-pattern guidance"]

### Flow Design
- [From critical flow decisions, e.g., "Onboarding: 3-step wizard with skip option and progress indicator"]
- [From friction tolerance, e.g., "Checkout: minimal friction -- single page, no account required"]

### Emotional Guardrails
- Primary: [from UX.md + calibration answer, e.g., "confident -- clear feedback at every step"]
- Avoid: [from UX.md anti-emotion, e.g., "overwhelmed -- progressive disclosure, max 5 options per screen"]

### Research References
- [Cross-references to UX.md sections that informed decisions]
- [Pattern names and confidence levels from research]

</ux_brief>
```

**Rules for synthesis:**
- For answers where user made a choice: use the user's choice verbatim
- For "Let Claude decide" answers: use the research-backed default from UX.md
- Translate abstract UX principles into concrete design implications (spacing values, component types, flow structures)
- If all answers were "Let Claude decide": produce ux_brief entirely from UX.md research defaults
- Keep ux_brief concise (30-50 lines). This is a digest, not a research report

**Store:** `UX_BRIEF` variable for read_context_files and architect context.

Display: "UX brief synthesized. Proceeding to design..."
</step>

<step name="handle_design">

**If `--gaps` flag:** Skip handle_design entirely (gap closure does not re-run design).

**If `--skip-research` flag was used AND no research exists:** Design still runs if triggered -- design does not require research.

### UI Detection (PLAN-02)

UI detection has already run in detect_ui_stage. Check the stored result:

- `UI_STAGE=false`: Skip handle_design entirely. Zero side effects.
- `UI_STAGE=true`: Continue to Existing Design Detection.

### Existing Design Detection (PLAN-03 partial)

```bash
# Check if screens for this stage already exist in global location
# This requires checking if the stage previously ran Phase 2 and produced screens
# Look for design output markers in recap files
grep -l "Screen Specs" "${STAGE_DIR}"/*-recap.md 2>/dev/null
```

If a recap references screen specs and no `--force` flag: Display "Using existing design from prior run.". Store design paths for read_context. Skip to check_existing_runs.

### Mode Determination (PLAN-03)

```bash
ls .ace/design/stylekit.yaml 2>/dev/null
ls .ace/codebase/DESIGN.md 2>/dev/null
```

Priority order (check in this sequence):
1. If stylekit.yaml exists: `DESIGN_MODE="screens_only"` (approved design system takes precedence)
2. Else if .ace/codebase/DESIGN.md exists: `DESIGN_MODE="translate"` (brownfield design detected)
3. Else: `DESIGN_MODE="full"` (greenfield, no existing design)

### Translate Mode Checkpoint (only when DESIGN_MODE="translate")

**If `DESIGN_MODE` is NOT "translate": Skip this subsection.**

Present `checkpoint:decision`:

```
Existing design patterns detected in .ace/codebase/DESIGN.md

Your project already has a visual design system. How should ACE handle it?

Options:
  Absorb - Extract existing patterns into ACE stylekit as-is (fastest, no interview)
  Extend - Extract existing patterns + discuss enhancements (balanced)
  Replace - Ignore existing patterns, create fresh design system (full interview)

Select: absorb, extend, or replace
```

Routing:
- `absorb`: Set `TRANSLATE_STRATEGY="absorb"`. Skip the design interview entirely. Read `.ace/codebase/DESIGN.md` content into `TRANSLATION_CONTEXT`. Display: "Absorbing existing design. Skipping interview..."
- `extend`: Set `TRANSLATE_STRATEGY="extend"`. Read `.ace/codebase/DESIGN.md` content into `TRANSLATION_CONTEXT`. Continue to the scoped interview (see Scoped Interview below).
- `replace`: Set `DESIGN_MODE="full"`. Display: "Replacing existing design. Running full interview..." Continue to existing greenfield flow (design interview, Phase 1, etc.) as if DESIGN.md did not exist.

### Scoped Interview (only when TRANSLATE_STRATEGY="extend")

**If `TRANSLATE_STRATEGY` is NOT "extend": Skip this subsection.**

This is a shortened version of the full design interview, focused on gaps in the existing design.

#### Step 1: Analyze DESIGN.md for Gaps

Read TRANSLATION_CONTEXT (the DESIGN.md content). For each core design question, determine if DESIGN.md already answers it:

| Core Question | Already Answered If |
|---------------|---------------------|
| Visual style | DESIGN.md describes a clear visual personality |
| Color direction | Color System section has a defined palette |
| Typography | Typography section has specific font families |
| Layout density | Component Inventory shows consistent spacing patterns |
| Dark mode | Dark Mode section has a strategy other than "not implemented" |
| Responsive | Component Inventory or Visual Patterns show responsive behavior |

Track which questions are UNANSWERED (gaps).

#### Step 2: Generate Extension Gray Areas

Generate 2-3 gray areas based on what DESIGN.md is MISSING. These are aspects where the existing design has no clear direction and the user should weigh in.

Example: If DESIGN.md has colors and fonts but no dark mode and no spacing scale:
- "Dark mode strategy" -- Should we add dark mode support?
- "Spacing refinement" -- Your current spacing seems ad-hoc. Standardize to a scale?

#### Step 3: Deep-Dive Gaps

For each unanswered core question and generated gray area, use AskUserQuestion with 2-4 options (following the same pattern as the full interview):
- Include "Let Claude decide" option on every question
- Follow the same recommendation guidelines (subjective = recommend specific, technical = recommend "Let Claude decide")

Target: 3-7 total questions (shorter than the full interview's 8-15).

#### Step 4: Compile Extension Preferences

Compile answers into `DESIGN_EXTENSION_PREFERENCES` using this format:

```xml
<design_extension_preferences>

## Extension Direction

### Aspects Preserved from Existing Design
- Color system: {summary from DESIGN.md}
- Typography: {summary from DESIGN.md}
- {other preserved aspects}

### Aspects Extended
{For each gap where user answered:}
### [Gap Area]
Pick: {user's choice OR "Designer's choice"}
Context: {any elaboration}

### Designer Autonomy
The following aspects are marked as "Designer's choice":
- {list of "Let Claude decide" items}

</design_extension_preferences>
```

Display: "Extension preferences captured. Proceeding to design system creation..."

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

**If `DESIGN_MODE="translate"` and `TRANSLATE_STRATEGY="absorb"`: Skip interview entirely.** Designer will extract existing patterns as-is.

**If `DESIGN_MODE="translate"` and `TRANSLATE_STRATEGY="extend"`: Skip this section.** The scoped interview above already captured extension preferences.

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

**Target up to {VISUAL_BUDGET} questions across all areas, where VISUAL_BUDGET = 15 - UX_QUESTIONS_ASKED.** If UX interview was skipped (UX_QUESTIONS_ASKED=0), target 8-15. The combined interview (UX + visual) should take 2-3 minutes, not 10.

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
| `design_mode` | DESIGN_MODE ("full" or "translate") |
| `phase` | "stylekit" |
| `stage_name` | parse_args |
| `stage_goal` | track.md stage details |
| `research_content` | `${STAGE_DIR}/research.md` content |
| `intel_content` | INTEL_CONTENT (loaded in ensure_stage_directory) |
| `design_preferences` | DESIGN_PREFERENCES (compiled from design interview Step 6) |
| `pexels_key` | Pexels API key check result |
| `stage_dir` | STAGE_DIR path |
| `translation_context` | TRANSLATION_CONTEXT (DESIGN.md content, only when DESIGN_MODE="translate") |
| `translation_strategy` | TRANSLATE_STRATEGY ("absorb" or "extend", only when DESIGN_MODE="translate") |
| `design_extension_preferences` | DESIGN_EXTENSION_PREFERENCES (only when TRANSLATE_STRATEGY="extend") |
| `ux_brief` | UX_BRIEF (from ux_synthesis step, if non-empty) |

Note: `stylekit_content` and `component_names` are NOT passed in Phase 1 (they don't exist yet).

Phase 1 designer spawn template:

```
First, read ./.claude/agents/ace-designer.md for your role and instructions.

<design_context>

**Mode:** {DESIGN_MODE}
**Phase:** stylekit
**Stage:** {stage_name}
**Goal:** {stage_goal}

{DESIGN_PREFERENCES}

{IF UX_BRIEF is non-empty:}

**UX Brief (from UX research + interview):**
{UX_BRIEF}

This ux_brief provides concrete UX direction based on research and user interview answers.
Use it to inform spacing/density decisions, component selection, and interaction patterns.
The ux_brief is INFORMATIONAL -- it supplements design preferences but does not override them.

{END IF}

{IF DESIGN_MODE == "translate":}

**Translation Mode:**
**Strategy:** {TRANSLATE_STRATEGY}

<translation_context>
{TRANSLATION_CONTEXT}
</translation_context>

{IF TRANSLATE_STRATEGY == "extend":}
{DESIGN_EXTENSION_PREFERENCES}
{END IF}

**Translation Instructions:**
- Extract concrete values from the existing design into the three-layer token architecture
- Map colors, fonts, spacing, shadows, border radii to proper primitive/semantic/component tokens
- For absorb: reproduce existing design faithfully, fill gaps with sensible defaults based on the extracted palette
- For extend: reproduce existing design, then enhance using the extension preferences above
- SKIP the anti-generic checklist (existing design is intentional, not AI-generated)
- Generate stylekit-preview.html for user verification: "Does this represent your existing design?"

{END IF}

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
{IF DESIGN_MODE == "translate":}
Spawning designer (mode: translate, strategy: {TRANSLATE_STRATEGY}, phase: stylekit)...
{ELSE:}
Spawning designer (mode: full, phase: stylekit)...
{END IF}
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
| `existing_screens` | `ls .ace/design/screens/*.yaml 2>/dev/null` with name + description for each |
| `ux_brief` | UX_BRIEF (from ux_synthesis step, if non-empty) |

**Assemble existing screen context:**

```bash
EXISTING_SCREENS=""
for spec in .ace/design/screens/*.yaml; do
  [ -f "$spec" ] || continue
  screen_name=$(grep -m1 "^screen:" "$spec" | sed 's/screen: //')
  description=$(grep -m1 "^description:" "$spec" | sed 's/description: //')
  EXISTING_SCREENS="${EXISTING_SCREENS}\n- ${screen_name}: ${description}"
done
```

If `EXISTING_SCREENS` is empty, the designer creates all screens as new. If populated, the designer reads each relevant existing screen before deciding whether to create new or update.

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

{IF UX_BRIEF is non-empty:}

**UX Brief (from UX research + interview):**
{UX_BRIEF}

This ux_brief provides concrete UX direction. Reference it for flow design,
component density, and interaction patterns when creating screen layouts.
The ux_brief is INFORMATIONAL -- it supplements intel decisions.

{END IF}

**Approved Stylekit:** (locked -- do not modify)
{stylekit_content}

**Available Components:**
{component_names}

**Pexels API Key:** {pexels_key}

**Existing Screens** (at .ace/design/screens/ -- read before creating):
{EXISTING_SCREENS}

**Output Directory:**
- Screen specs and prototypes: .ace/design/screens/

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

Build the file list for Phase 2: `.ace/design/screens/*.html` ONLY (screen prototypes created or modified this session, not stylekit-preview.html).

```bash
# EXECUTE THIS NOW -- open Phase 2 prototypes before showing gate
# Use the designer's structured return to get only new/modified screen files
# The designer return lists artifacts with [NEW] and [MODIFIED] markers
# Parse the artifact list from the designer's last return to get specific files
GATE_FILES=""
for f in .ace/design/screens/*.html; do
  [ -f "$f" ] || continue
  # Only include screens that the designer created or modified this session
  # The designer's structured return lists specific files -- parse them
  GATE_FILES="$GATE_FILES $f"
done
# NOTE: The orchestrator should filter GATE_FILES using the artifact paths
# from the designer's ## DESIGN COMPLETE return (new + modified only).
# If the designer return is not parseable, fall back to opening all screens
# in .ace/design/screens/ (user can identify which are relevant).
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
     {For each [NEW] screen from designer return:}
     - .ace/design/screens/{screen-name}.html [NEW] -- {description}
     {For each [MODIFIED] screen from designer return:}
     - .ace/design/screens/{screen-name}.html [MODIFIED] -- {modification summary}
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
- `restart`: Revert current session's screen changes only (NOT all screens in .ace/design/screens/):
  - For screens marked [NEW] in the designer's return: delete the .yaml and .html files from .ace/design/screens/
  - For screens marked [MODIFIED] in the designer's return: `git checkout .ace/design/screens/{screen-name}.yaml .ace/design/screens/{screen-name}.html` to restore pre-session state
  - The stylekit and screens from prior stages are untouched.
  Reset Phase 2 counters to 0. Re-run Phase 2 from designer spawn.
- `skip`: Revert current session's screen changes (same scoped approach as restart). Stylekit remains. Continue to Store Design Output (HAS_DESIGN still true since stylekit exists, but no new/modified screen specs for this stage).

---

### Store Design Output

After Phase 2 approval (or accept-as-is escalation), store the design output paths for `read_context_files`:

```
# Screen specs are now at the global location
# Use the designer's return to know which screens belong to this stage
DESIGN_SCREEN_SPECS=$(ls .ace/design/screens/*.yaml 2>/dev/null)
DESIGN_STYLEKIT_PATH=".ace/design/stylekit.yaml"
HAS_DESIGN=true
```

If Phase 2 was skipped but Phase 1 completed (Phase 2 skip escalation):

```
DESIGN_SCREEN_SPECS=""
DESIGN_STYLEKIT_PATH=".ace/design/stylekit.yaml"
HAS_DESIGN=true
```

</step>

<step name="generate_implementation_guide">
**Trigger:** `HAS_DESIGN=true` (design phase completed and approved).

**Skip if:** `.ace/design/implementation-guide.md` already exists AND no design artifacts have changed since last generation:

```bash
if [ "$HAS_DESIGN" != "true" ]; then
  # No design -- skip entirely
  :
elif [ -f ".ace/design/implementation-guide.md" ]; then
  # Guide exists -- check if design artifacts changed since guide was generated
  GUIDE_MTIME=$(stat -c %Y .ace/design/implementation-guide.md 2>/dev/null || stat -f %m .ace/design/implementation-guide.md 2>/dev/null)
  DESIGN_CHANGED=false
  for f in .ace/design/screens/*.html .ace/design/stylekit.yaml .ace/design/stylekit.css; do
    [ -f "$f" ] || continue
    FILE_MTIME=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null)
    if [ "$FILE_MTIME" -gt "$GUIDE_MTIME" ] 2>/dev/null; then
      DESIGN_CHANGED=true
      break
    fi
  done
  if [ "$DESIGN_CHANGED" = "false" ]; then
    echo "Implementation guide up to date. Skipping regeneration."
    # Skip to check_existing_runs
  fi
fi
```

If skip conditions are not met, proceed with generation:

### 1. Detect CSS Framework

```bash
# Check for Tailwind
TAILWIND_VERSION=""
if grep -q '"tailwindcss"' package.json 2>/dev/null; then
  TAILWIND_VERSION=$(grep '"tailwindcss"' package.json | grep -oE '[0-9]+\.[0-9]+')
fi

# Determine CSS framework
CSS_FRAMEWORK="unknown"
if [ -n "$TAILWIND_VERSION" ]; then
  if echo "$TAILWIND_VERSION" | grep -qE '^4\.'; then
    CSS_FRAMEWORK="tailwind-v4"
  else
    CSS_FRAMEWORK="tailwind-v3"
  fi
elif grep -q '"styled-components"' package.json 2>/dev/null; then
  CSS_FRAMEWORK="styled-components"
elif ls src/**/*.module.css 2>/dev/null | head -1; then
  CSS_FRAMEWORK="css-modules"
else
  CSS_FRAMEWORK="vanilla-css"
fi

echo "Detected CSS framework: $CSS_FRAMEWORK"
```

### 2. Read Prototype HTML File List

```bash
PROTOTYPE_FILES=$(ls .ace/design/screens/*.html 2>/dev/null)
STYLEKIT_YAML=".ace/design/stylekit.yaml"
STYLEKIT_CSS=".ace/design/stylekit.css"
```

### 3. Spawn Implementation Guide Generator

Display:
```
ACE > GENERATING IMPLEMENTATION GUIDE

Detected CSS framework: {CSS_FRAMEWORK}
Spawning guide generator...
```

Spawn a focused Task call (uses designer_model tier -- no new agent needed):

```
Task(
  prompt="You are generating a design implementation guide that bridges HTML prototypes (Tailwind v3 CDN) to the project's actual CSS framework.\n\n" +
    "<guide_context>\n" +
    "**Project CSS Framework:** " + CSS_FRAMEWORK + "\n" +
    "**Stylekit YAML:** Read @.ace/design/stylekit.yaml\n" +
    "**Stylekit CSS:** Read @.ace/design/stylekit.css\n" +
    "**HTML Prototypes:** Read each file in .ace/design/screens/*.html\n\n" +
    "Generate .ace/design/implementation-guide.md with these 5 sections:\n\n" +
    "## Framework Detection\n" +
    "- CSS framework: {detected}\n" +
    "- Version: {detected}\n" +
    "- Configuration approach: {e.g., 'Tailwind v4 CSS-first config' or 'CSS custom properties in :root'}\n\n" +
    "## Token System Translation\n" +
    "- How to implement stylekit.yaml tokens in the project's framework\n" +
    "- Exact file path and syntax for the project's CSS system\n" +
    "- Token namespace mapping (stylekit token names -> project CSS custom properties or framework equivalents)\n" +
    "- For vanilla CSS: map to CSS custom properties in :root {} (stylekit.css is directly usable)\n" +
    "- For Tailwind v3: map to tailwind.config theme extensions\n" +
    "- For Tailwind v4: map to CSS-first @theme declarations in the project's CSS entry point\n" +
    "- For CSS Modules: map to shared CSS custom properties imported in each module\n" +
    "- For styled-components: map to a theme object with token values\n\n" +
    "## Icon System\n" +
    "- Icon library used in prototypes: {detect from HTML -- typically Material Symbols Rounded}\n" +
    "- npm install command for the project\n" +
    "- Import pattern for the project's framework\n" +
    "- Usage syntax (component vs font vs SVG)\n\n" +
    "## Animation Patterns\n" +
    "- List each @keyframes animation found in prototypes and stylekit.css\n" +
    "- Where to define them in the project (globals.css, tailwind config, CSS module)\n" +
    "- How to reference them (utility class, CSS class name, animation property)\n\n" +
    "## Component Class Mapping\n" +
    "- For each screen prototype: list key visual sections\n" +
    "- For each section: the Tailwind v3 CDN classes used and their project-framework equivalent\n" +
    "- Focus on classes that DIFFER between v3 CDN and the project framework\n" +
    "- Skip structural classes (flex, grid, items-center) that are identical across frameworks\n\n" +
    "**Target:** 100-200 lines. Summary document, not full prototype inline.\n" +
    "**Output:** Write to .ace/design/implementation-guide.md\n" +
    "</guide_context>",
  subagent_type="general-purpose",
  model="{designer_model}",
  description="Generate implementation guide for CSS framework: " + CSS_FRAMEWORK
)
```

### 4. Verify Guide Was Created

```bash
if [ ! -f ".ace/design/implementation-guide.md" ]; then
  echo "WARNING: Implementation guide was not created. Continuing without guide."
fi
```

Display: `Implementation guide generated at .ace/design/implementation-guide.md`
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
  # Read screen spec YAML files from global location to build summaries
  # Include new/modified status from designer's return when available
  DESIGN_SCREEN_SPECS=$(ls .ace/design/screens/*.yaml 2>/dev/null)
  DESIGN_SUMMARIES=""
  for spec in $DESIGN_SCREEN_SPECS; do
    [ -f "$spec" ] || continue
    screen_name=$(grep -m1 "^screen:" "$spec" | sed 's/screen: //')
    description=$(grep -m1 "^description:" "$spec" | sed 's/description: //')
    DESIGN_SUMMARIES="${DESIGN_SUMMARIES}\n- ${screen_name}: ${description} (@.ace/design/screens/${screen_name}.yaml)"
  done
  DESIGN_STYLEKIT_PATH=".ace/design/stylekit.yaml"

  # Load implementation guide (generated by generate_implementation_guide step)
  IMPLEMENTATION_GUIDE=$(cat .ace/design/implementation-guide.md 2>/dev/null)
fi

# UX brief (only if ux_synthesis produced one)
# UX_BRIEF already stored from ux_synthesis step
# Will be inlined into architect planning_context if non-empty

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

{IF UX_BRIEF is non-empty:}

**UX Brief (if exists):**
{UX_BRIEF}

This ux_brief was produced by inline synthesis of UX.md research + UX interview answers.
It provides concrete UX direction for this stage. When planning UI tasks, reference these
interaction patterns, spacing guidelines, component choices, and emotional guardrails.
The ux_brief is INFORMATIONAL context for the architect -- it does NOT override user
decisions from intel.md.

{END IF}

**Gap Closure (if --gaps mode):**
{proof_content}
{uat_content}

{IF HAS_DESIGN is true:}

**Design:**
Global stylekit: .ace/design/stylekit.yaml
All screen specs: .ace/design/screens/
Implementation guide: .ace/design/implementation-guide.md

Screen summary (all screens -- [NEW] = created this stage, [EXISTING] = from prior stages):
{design_summaries}

**Implementation Guide (framework translation):**
{IMPLEMENTATION_GUIDE}

IMPORTANT: Every UI implementation task MUST include these @ references in
the task's <context> section. The paths are STABLE across stages:

  <context>
  @.ace/design/stylekit.yaml
  @.ace/design/screens/{screen-name}.yaml  (structure spec)
  @.ace/design/screens/{screen-name}.html  (visual source of truth)
  @.ace/design/implementation-guide.md     (framework translation)
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
For screens from prior stages that this stage modifies: task modifies the existing implementation to match updated screen spec. Use `git diff .ace/design/screens/{screen-name}.yaml` to see what changed.

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
