<purpose>
Run the full design pipeline for a UI stage independently of plan-stage.

Use this workflow when a stage involves visual UI work and needs design artifacts (stylekit, screen prototypes, implementation guide) before architecture planning. Handles UI detection, UX interview, UX synthesis, design interview, Phase 1 (stylekit), Phase 2 (screens), implementation guide generation, and design artifact commits.
</purpose>

<core_principle>
Fresh context per agent. Orchestrator stays lean (~15%), each subagent gets 100% fresh 200k. Intel.md loaded early and passed to ALL agents to constrain scope. This is an extraction of plan-stage's design pipeline into a standalone command -- spawn templates and design logic are preserved verbatim to maintain artifact parity.
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
- `--skip-ux-interview` flag to skip UX interview

**If no stage number:** Detect next unplanned stage from track.

**Normalize stage to zero-padded format:**

```bash
# Normalize stage number (8 -> 08, but preserve decimals like 2.1 -> 02.1)
if [[ "$STAGE" =~ ^[0-9]+$ ]]; then
  STAGE=$(printf "%02d" "$STAGE")
elif [[ "$STAGE" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
  STAGE=$(printf "%02d.%s" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}")
fi
```

**Check for existing research:**

```bash
ls .ace/stages/${STAGE}-*/*-research.md 2>/dev/null
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

# Extract project name from brief.md heading (used in designer spawn)
PROJECT_NAME=$(head -1 .ace/brief.md 2>/dev/null | sed 's/^# //')
```

**CRITICAL:** Store `INTEL_CONTENT` now. It must be passed to:
- **Scout** -- constrains what to research (locked decisions vs Claude's discretion)
- **Designer** -- locked decisions must be honored, not revisited
- **Reviewer** -- verifies design respects user's stated vision

If intel.md exists, display: `Using stage context from: ${STAGE_DIR}/*-intel.md`
</step>

<step name="handle_research">
Check config for research setting:

```bash
WORKFLOW_RESEARCH=$(cat .ace/config.json 2>/dev/null | grep -o '"research"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
```

**If `checks.research` is `false`:** Skip to detect_ui_stage.

**Otherwise:**

Check for existing research:

```bash
ls "${STAGE_DIR}"/*-research.md 2>/dev/null
```

**If research.md exists:**
- Display: `Using existing research: ${STAGE_DIR}/${STAGE}-research.md`
- Set `RESEARCH_CONTENT` from the file
- Skip to detect_ui_stage

**If research.md missing:**

Use AskUserQuestion to offer:

```
No research found for this stage. Research first?

Options:
  Yes - Spawn scout to research before designing
  No  - Proceed to design without research
```

**If "Yes":**

Display stage banner:
```
ACE > SCOUTING STAGE {X}

Spawning scout...
```

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

- **Decisions section** = Locked choices -- research THESE deeply, don't explore alternatives
- **Claude's Discretion section** = Your freedom areas -- research options, make recommendations
- **Deferred Ideas section** = Out of scope -- ignore completely

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
  subagent_type="ace-stage-scout",
  model="{scout_model}",
  description="Research Stage {stage}"
)
```

### Handle Scout Return

**`## RESEARCH COMPLETE`:**
- Display: `Research complete. Proceeding to design...`
- Set `RESEARCH_CONTENT` from the research file
- Continue to detect_ui_stage

**`## RESEARCH BLOCKED`:**
- Display blocker information
- Offer: 1) Provide more context, 2) Skip research and design anyway, 3) Abort
- Wait for user response

**If "No" (skip research):**
- Set `RESEARCH_CONTENT=""`
- Continue to detect_ui_stage
</step>

<step name="detect_ui_stage">
Run UI detection ONCE. Both handle_ux_interview and handle_design use this result.

### UI Detection

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

- `NO_DESIGN`: **ERROR and exit.** Display:

```
Stage {N} is not a UI stage. Design pipeline is for UI stages only.

Use /ace.plan-stage {N} directly.
```

- `UNCERTAIN`: Present a `checkpoint:decision`:

```
This stage may need UX research and design. Include design pipeline?

Context:
  Stage: {stage_name}
  Goal: {goal text from track.md}
  Signals found: {list of matched keywords and sources}

Options:
  Yes - Run UX interview + design phase
  No  - Skip design, proceed to plan-stage instead
```

User selects No -> **ERROR and exit.** Display: `Stage {N} does not need design. Use /ace.plan-stage {N} directly.`
User selects Yes -> set `UI_STAGE=true`.

- `DESIGN_NEEDED`: Set `UI_STAGE=true`.

Store `UI_STAGE` for use by handle_ux_interview and handle_design.
</step>

<step name="handle_ux_interview">
**Skip conditions (check in order):**
1. UX.md does not exist -> skip (display: "No UX.md found. Skipping UX interview. Run /ace.start or /ace.new-milestone to generate UX research.")
2. `--skip-ux-interview` flag set -> skip

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

**Persist UX_BRIEF to file (EXTR-02):**

Write the UX_BRIEF content to `${STAGE_DIR}/${STAGE}-ux-brief.md` as plain markdown. The file contains the synthesized UX brief sections WITHOUT XML tags -- just the markdown content between `<ux_brief>` and `</ux_brief>`.

This file survives `/clear` and is loaded by plan-stage in its read_context_files step.

The file format:

```markdown
## UX Direction for Stage {X}: {Name}

### Interaction Model
- ...

### Spacing and Density
- ...

### Component Implications
- ...

### Flow Design
- ...

### Emotional Guardrails
- ...

### Research References
- ...
```

Display: `UX brief synthesized and saved to ${STAGE_DIR}/${STAGE}-ux-brief.md. Proceeding to design...`

**Store:** `UX_BRIEF` variable for handle_design and designer context.
</step>

<!-- Steps 9-11 (handle_design, generate_implementation_guide, present_final_status) are added by Run 02 -->

</process>
