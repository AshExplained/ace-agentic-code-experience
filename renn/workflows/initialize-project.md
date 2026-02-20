<purpose>
Initialize a new project through unified flow: questioning → research (optional) → requirements → track.

Use this workflow for greenfield project initialization. Handles setup, brownfield detection, deep questioning, brief creation, workflow preferences, research scouting, requirements definition, and track creation.
</purpose>

<core_principle>
This is the most leveraged moment in any project. Deep questioning here means better runs, better execution, better outcomes. One command takes you from idea to ready-for-planning.
</core_principle>

<process>

<step name="setup" priority="first">
**MANDATORY FIRST STEP — Execute these checks before ANY user interaction:**

1. **Abort if project exists:**
   ```bash
   [ -f .ace/brief.md ] && echo "ERROR: Project already initialized. Use /ace.status" && exit 1
   ```

2. **Initialize git repo in THIS directory** (required even if inside a parent repo):
   ```bash
   if [ -d .git ] || [ -f .git ]; then
       echo "Git repo exists in current directory"
   else
       git init
       echo "Initialized new git repo"
   fi
   ```

3. **Detect existing code (brownfield detection):**
   ```bash
   CODE_FILES=$(find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.swift" -o -name "*.java" 2>/dev/null | grep -v node_modules | grep -v .git | head -20)
   HAS_PACKAGE=$([ -f package.json ] || [ -f requirements.txt ] || [ -f Cargo.toml ] || [ -f go.mod ] || [ -f Package.swift ] && echo "yes")
   HAS_CODEBASE_MAP=$([ -d .ace/codebase ] && echo "yes")
   ```

   **You MUST run all bash commands above using the Bash tool before proceeding.**
</step>

<step name="brownfield_offer">
**If existing code detected and .ace/codebase/ doesn't exist:**

Check the results from setup step:
- If `CODE_FILES` is non-empty OR `HAS_PACKAGE` is "yes"
- AND `HAS_CODEBASE_MAP` is NOT "yes"

Use AskUserQuestion:
- header: "Existing Code"
- question: "I detected existing code in this directory. Would you like to map the codebase first?"
- options:
  - "Map codebase first" — Run /ace.map-codebase to understand existing architecture (Recommended)
  - "Skip mapping" — Proceed with project initialization

**If "Map codebase first":**
```
Run `/ace.map-codebase` first, then return to `/ace.start`
```
Exit command.

**If "Skip mapping":** Continue to deep_questioning.

**If no existing code detected OR codebase already mapped:** Continue to deep_questioning.
</step>

<step name="deep_questioning">
**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► QUESTIONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Open the conversation:**

Ask inline (freeform, NOT AskUserQuestion):

"What do you want to build?"

Wait for their response. This gives you the context needed to ask intelligent follow-up questions.

**Follow the thread:**

Based on what they said, ask follow-up questions that dig into their response. Use AskUserQuestion with options that probe what they mentioned — interpretations, clarifications, concrete examples.

Keep following threads. Each answer opens new threads to explore. Ask about:
- What excited them
- What problem sparked this
- What they mean by vague terms
- What it would actually look like
- What's already decided

Consult `questioning.md` for techniques:
- Challenge vagueness
- Make abstract concrete
- Surface assumptions
- Find edges
- Reveal motivation

**Platform and viewport capture:**

During the conversation, if the user mentions building for a non-web surface (mobile app, wearable, TV, fixed-dimension display, print, desktop app, etc.), capture the target platform and viewport dimensions. This information flows into brief.md's Context section as Platform and Viewport fields.

Detection triggers (in the user's responses):
- Mobile: "mobile app", "iOS app", "Android app", "iPhone", "React Native", "Flutter", "Swift", "Kotlin"
- Tablet: "iPad", "tablet app"
- Wearable: "watch app", "watchOS", "Wear OS", "wearable"
- TV: "TV app", "tvOS", "Android TV", "smart TV"
- Desktop: "desktop app", "Electron", "Tauri"
- Fixed: "kiosk", "POS", "point of sale", "embedded display", "digital signage"
- Print: "print layout", "PDF", "A4", "letter"

When a trigger is detected, ask ONE follow-up question using AskUserQuestion:

- header: "Target Device"
- question: "What device/screen size should the design target?"
- options: [device-specific options based on platform detected]
  - For mobile: "iPhone 15 Pro (393x852)", "iPhone SE (375x667)", "Pixel 8 (412x892)", "Galaxy S24 (360x780)", "Let Claude pick based on platform"
  - For tablet: "iPad Pro 11\" (834x1194)", "iPad mini (768x1024)", "iPad Pro 13\" (1024x1366)", "Let Claude pick"
  - For wearable: "Apple Watch 41mm (176x215)", "Apple Watch Ultra (205x251)", "Galaxy Watch (170x170)", "Let Claude pick"
  - For TV: "1080p (1920x1080)"
  - For fixed: Ask inline (freeform) "What are the display dimensions in pixels?"

If no non-web trigger is detected during the entire conversation, the Platform defaults to "web" and the Viewport field is omitted from brief.md.

This is a single question added to the natural flow -- not a separate questionnaire. It only fires when the user's responses indicate a non-web target.

**Check context (background, not out loud):**

As you go, mentally check the context checklist from `questioning.md`. If gaps remain, weave questions naturally. Don't suddenly switch to checklist mode.

**Decision gate:**

When you could write a clear brief.md, use AskUserQuestion:

- header: "Ready?"
- question: "I think I understand what you're after. Ready to create brief.md?"
- options:
  - "Create brief.md" — Let's move forward
  - "Keep exploring" — I want to share more / ask me more

If "Keep exploring" — ask what they want to add, or identify gaps and probe naturally.

Loop until "Create brief.md" selected.
</step>

<step name="write_brief">
Synthesize all context into `.ace/brief.md` using the template from `templates/brief.md`.

When populating the Context section, include:
- **Platform:** [detected platform from questioning, defaults to "web"]
- **Viewport:** [target dimensions if non-web, e.g., "iPhone 15 Pro (393x852)". Omit for web.]

**For greenfield projects:**

Initialize requirements as hypotheses:

```markdown
## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] [Requirement 1]
- [ ] [Requirement 2]
- [ ] [Requirement 3]

### Out of Scope

- [Exclusion 1] — [why]
- [Exclusion 2] — [why]
```

All Active requirements are hypotheses until shipped and validated.

**For brownfield projects (codebase map exists):**

Infer Validated requirements from existing code:

1. Read `.ace/codebase/ARCHITECTURE.md` and `STACK.md`
2. Identify what the codebase already does
3. These become the initial Validated set

```markdown
## Requirements

### Validated

- ✓ [Existing capability 1] — existing
- ✓ [Existing capability 2] — existing
- ✓ [Existing capability 3] — existing

### Active

- [ ] [New requirement 1]
- [ ] [New requirement 2]

### Out of Scope

- [Exclusion 1] — [why]
```

**Key Decisions:**

Initialize with any decisions made during questioning:

```markdown
## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| [Choice from questioning] | [Why] | — Pending |
```

**Last updated footer:**

```markdown
---
*Last updated: [date] after initialization*
```

Do not compress. Capture everything gathered.

**Commit brief.md:**

```bash
mkdir -p .ace
git add .ace/brief.md
git commit -m "$(cat <<'EOF'
docs: initialize project

[One-liner from brief.md What This Is section]
EOF
)"
```
</step>

<step name="workflow_preferences">
**Round 1 — Core workflow settings (4 questions):**

```
questions: [
  {
    header: "Style",
    question: "How do you want to work?",
    multiSelect: false,
    options: [
      { label: "Turbo (Recommended)", description: "Auto-approve, just execute" },
      { label: "Guided", description: "Confirm at each step" }
    ]
  },
  {
    header: "Depth",
    question: "How thorough should planning be?",
    multiSelect: false,
    options: [
      { label: "Quick", description: "Ship fast (3-5 stages, 1-3 runs each)" },
      { label: "Standard", description: "Balanced scope and speed (5-8 stages, 3-5 runs each)" },
      { label: "Comprehensive", description: "Thorough coverage (8-12 stages, 5-10 runs each)" }
    ]
  },
  {
    header: "Execution",
    question: "Run batches in parallel?",
    multiSelect: false,
    options: [
      { label: "Parallel (Recommended)", description: "Independent runs execute simultaneously" },
      { label: "Sequential", description: "One run at a time" }
    ]
  },
  {
    header: "Git Tracking",
    question: "Commit planning docs to git?",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Planning docs tracked in version control" },
      { label: "No", description: "Keep .ace/ local-only (add to .gitignore)" }
    ]
  }
]
```

**Round 2 — Workflow agents:**

These spawn additional agents during planning/execution. They add tokens and time but improve quality.

| Agent | When it runs | What it does |
|-------|--------------|--------------|
| **Scout** | Before planning each stage | Investigates domain, finds patterns, surfaces gotchas |
| **Run Reviewer** | After run is created | Verifies run actually achieves the stage goal |
| **Auditor** | After stage execution | Confirms must-haves were delivered |

All recommended for important projects. Skip for quick experiments.

```
questions: [
  {
    header: "Research",
    question: "Research before planning each stage? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Investigate domain, find patterns, surface gotchas" },
      { label: "No", description: "Plan directly from requirements" }
    ]
  },
  {
    header: "Run Review",
    question: "Verify runs will achieve their goals? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Catch gaps before execution starts" },
      { label: "No", description: "Execute runs without verification" }
    ]
  },
  {
    header: "Auditor",
    question: "Verify work satisfies requirements after each stage? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Confirm deliverables match stage goals" },
      { label: "No", description: "Trust execution, skip verification" }
    ]
  },
  {
    header: "Horsepower",
    question: "Which AI models for planning agents?",
    multiSelect: false,
    options: [
      { label: "Balanced (Recommended)", description: "Sonnet for most agents — good quality/cost ratio" },
      { label: "Max", description: "Opus for research/navigator — higher cost, deeper analysis" },
      { label: "Eco", description: "Haiku where possible — fastest, lowest cost" }
    ]
  }
]
```

Create `.ace/config.json` with all settings:

```json
{
  "style": "turbo|guided",
  "depth": "quick|standard|comprehensive",
  "parallelization": true|false,
  "commit_docs": true|false,
  "horsepower": "max|balanced|eco",
  "checks": {
    "research": true|false,
    "review": true|false,
    "auditor": true|false
  }
}
```

**If commit_docs = No:**
- Set `commit_docs: false` in config.json
- Add `.ace/` to `.gitignore` (create if needed)

**If commit_docs = Yes:**
- No additional gitignore entries needed

**Commit config.json:**

```bash
git add .ace/config.json
git commit -m "$(cat <<'EOF'
chore: add project config

Style: [chosen style]
Depth: [chosen depth]
Parallelization: [enabled/disabled]
Workflow agents: research=[on/off], review=[on/off], auditor=[on/off]
EOF
)"
```

**Note:** Run `/ace.settings` anytime to update these preferences.
</step>

<step name="resolve_horsepower">
Read horsepower setting for agent spawning:

```bash
HORSEPOWER=$(cat .ace/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | max | balanced | eco |
|-------|-----|----------|-----|
| ace-project-scout | opus | sonnet | haiku |
| ace-synthesizer | sonnet | sonnet | haiku |
| ace-navigator | opus | sonnet | sonnet |

Store resolved models for use in Task calls below.
</step>

<step name="research_decision">
Use AskUserQuestion:
- header: "Research"
- question: "Research the domain ecosystem before defining requirements?"
- options:
  - "Research first (Recommended)" — Discover standard stacks, expected features, architecture patterns
  - "Skip research" — I know this domain well, go straight to requirements

**If "Research first":**

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► RESEARCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Researching [domain] ecosystem...
```

Create research directory:
```bash
mkdir -p .ace/research
```

**Determine milestone context:**

Check if this is greenfield or subsequent milestone:
- If no "Validated" requirements in brief.md → Greenfield (building from scratch)
- If "Validated" requirements exist → Subsequent milestone (adding to existing app)

Display spawning indicator:
```
◆ Spawning 5 scouts in parallel...
  → Stack research
  → Features research
  → Architecture research
  → Pitfalls research
  → UX/DX research
```

Spawn 5 parallel ace-project-scout agents with rich context:

```
Task(prompt="<research_type>
Project Research — Stack dimension for [domain].
</research_type>

<milestone_context>
[greenfield OR subsequent]

Greenfield: Research the standard stack for building [domain] from scratch.
Subsequent: Research what's needed to add [target features] to an existing [domain] app. Don't re-research the existing system.
</milestone_context>

<question>
What's the standard 2025 stack for [domain]?
</question>

<project_context>
[brief.md summary - core value, constraints, what they're building]
</project_context>

<downstream_consumer>
Your STACK.md feeds into track creation. Be prescriptive:
- Specific libraries with versions
- Clear rationale for each choice
- What NOT to use and why
</downstream_consumer>

<quality_gate>
- [ ] Versions are current (verify with Context7/official docs, not training data)
- [ ] Rationale explains WHY, not just WHAT
- [ ] Confidence levels assigned to each recommendation
</quality_gate>

<output>
Write to: .ace/research/stack.md
Use template: ~/.claude/ace/templates/research/stack.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Stack research")

Task(prompt="<research_type>
Project Research — Features dimension for [domain].
</research_type>

<milestone_context>
[greenfield OR subsequent]

Greenfield: What features do [domain] products have? What's table stakes vs differentiating?
Subsequent: How do [target features] typically work? What's expected behavior?
</milestone_context>

<question>
What features do [domain] products have? What's table stakes vs differentiating?
</question>

<project_context>
[brief.md summary]
</project_context>

<downstream_consumer>
Your FEATURES.md feeds into requirements definition. Categorize clearly:
- Table stakes (must have or users leave)
- Differentiators (competitive advantage)
- Anti-features (things to deliberately NOT build)
</downstream_consumer>

<quality_gate>
- [ ] Categories are clear (table stakes vs differentiators vs anti-features)
- [ ] Complexity noted for each feature
- [ ] Dependencies between features identified
</quality_gate>

<output>
Write to: .ace/research/features.md
Use template: ~/.claude/ace/templates/research/features.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Features research")

Task(prompt="<research_type>
Project Research — Architecture dimension for [domain].
</research_type>

<milestone_context>
[greenfield OR subsequent]

Greenfield: How are [domain] systems typically structured? What are major components?
Subsequent: How do [target features] integrate with existing [domain] architecture?
</milestone_context>

<question>
How are [domain] systems typically structured? What are major components?
</question>

<project_context>
[brief.md summary]
</project_context>

<downstream_consumer>
Your ARCHITECTURE.md informs stage structure in track. Include:
- Component boundaries (what talks to what)
- Data flow (how information moves)
- Suggested build order (dependencies between components)
</downstream_consumer>

<quality_gate>
- [ ] Components clearly defined with boundaries
- [ ] Data flow direction explicit
- [ ] Build order implications noted
</quality_gate>

<output>
Write to: .ace/research/architecture.md
Use template: ~/.claude/ace/templates/research/architecture.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Architecture research")

Task(prompt="<research_type>
Project Research — Pitfalls dimension for [domain].
</research_type>

<milestone_context>
[greenfield OR subsequent]

Greenfield: What do [domain] projects commonly get wrong? Critical mistakes?
Subsequent: What are common mistakes when adding [target features] to [domain]?
</milestone_context>

<question>
What do [domain] projects commonly get wrong? Critical mistakes?
</question>

<project_context>
[brief.md summary]
</project_context>

<downstream_consumer>
Your PITFALLS.md prevents mistakes in track/planning. For each pitfall:
- Warning signs (how to detect early)
- Prevention strategy (how to avoid)
- Which stage should address it
</downstream_consumer>

<quality_gate>
- [ ] Pitfalls are specific to this domain (not generic advice)
- [ ] Prevention strategies are actionable
- [ ] Stage mapping included where relevant
</quality_gate>

<output>
Write to: .ace/research/pitfalls.md
Use template: ~/.claude/ace/templates/research/pitfalls.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Pitfalls research")

Task(prompt="<research_type>
Project Research — UX/DX dimension for [domain].

**Project type detection:**
- If the project involves user-facing screens (web app, mobile app, dashboard, website):
  Research UX patterns — competitor UX analysis, proven UX patterns, anti-patterns, emotional design, critical flows
- If the project is a CLI tool:
  Research DX patterns — CLI conventions from clig.dev, help text, error messages, output formatting, flag design
- If the project is an API:
  Research DX patterns — API design principles, endpoint naming, error responses, documentation, versioning
- If the project is a library/package:
  Research DX patterns — API surface design, naming conventions, error handling, documentation, tree-shaking
- If unclear, default to DX research unless screens/pages are explicitly mentioned.
</research_type>

<milestone_context>
[greenfield OR subsequent]

Greenfield: What UX/DX patterns are standard for [domain]? What do users expect from the experience?
Subsequent: What UX/DX patterns apply to [target features]? What experience improvements are needed?
</milestone_context>

<question>
What UX/DX patterns should [domain] follow? Identify competitors, proven patterns, anti-patterns, emotional design goals, and critical flows with friction tolerance.
</question>

<project_context>
[brief.md summary - core value, constraints, project type, what they're building]
</project_context>

<downstream_consumer>
Your UX.md feeds into:
1. Stage-specific UX refinement by the stage scout
2. UX interview question generation during plan-stage
3. UX synthesis (ux_brief) for the designer
4. DX pattern flow to architect and runner (non-UI projects)

Structure matters — use the template headings exactly.
</downstream_consumer>

<quality_gate>
- [ ] Project type correctly identified (UI vs CLI vs API vs Library)
- [ ] Competitor analysis uses REAL products, not placeholders
- [ ] Patterns cite evidence (source URL or competitor name)
- [ ] Emotional design goals are specific to this domain, not generic
- [ ] Critical flows have friction tolerance levels (LOW/MEDIUM/HIGH)
- [ ] Confidence levels assigned to all findings
</quality_gate>

<output>
Write to: .ace/research/UX.md
Use template: ~/.claude/ace/templates/research/ux.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="UX/DX research")
```

After all 5 agents complete, spawn synthesizer to create recap.md:

```
Task(prompt="
<task>
Synthesize research outputs into recap.md.
</task>

<research_files>
Read these files:
- .ace/research/stack.md
- .ace/research/features.md
- .ace/research/architecture.md
- .ace/research/pitfalls.md
- .ace/research/UX.md
</research_files>

<output>
Write to: .ace/research/recap.md
Use template: ~/.claude/ace/templates/research/recap.md
Commit after writing.
</output>
", subagent_type="ace-synthesizer", model="{synthesizer_model}", description="Synthesize research")
```

Display research complete banner and key findings:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► RESEARCH COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Key Findings

**Stack:** [from recap.md]
**Table Stakes:** [from recap.md]
**Watch Out For:** [from recap.md]

Files: `.ace/research/`
```

**If "Skip research":** Continue to define_requirements.
</step>

<step name="define_requirements">
Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► DEFINING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Load context:**

Read brief.md and extract:
- Core value (the ONE thing that must work)
- Stated constraints (budget, timeline, tech limitations)
- Any explicit scope boundaries

**If research exists:** Read research/features.md and extract feature categories.

**Present features by category:**

```
Here are the features for [domain]:

## Authentication
**Table stakes:**
- Sign up with email/password
- Email verification
- Password reset
- Session management

**Differentiators:**
- Magic link login
- OAuth (Google, GitHub)
- 2FA

**Research notes:** [any relevant notes]

---

## [Next Category]
...
```

**If no research:** Gather requirements through conversation instead.

Ask: "What are the main things users need to be able to do?"

For each capability mentioned:
- Ask clarifying questions to make it specific
- Probe for related capabilities
- Group into categories

**Scope each category:**

For each category, use AskUserQuestion:

- header: "[Category name]"
- question: "Which [category] features are in v1?"
- multiSelect: true
- options:
  - "[Feature 1]" — [brief description]
  - "[Feature 2]" — [brief description]
  - "[Feature 3]" — [brief description]
  - "None for v1" — Defer entire category

Track responses:
- Selected features → v1 requirements
- Unselected table stakes → v2 (users expect these)
- Unselected differentiators → out of scope

**Identify gaps:**

Use AskUserQuestion:
- header: "Additions"
- question: "Any requirements research missed? (Features specific to your vision)"
- options:
  - "No, research covered it" — Proceed
  - "Yes, let me add some" — Capture additions

**Validate core value:**

Cross-check requirements against Core Value from brief.md. If gaps detected, surface them.

**Generate specs.md:**

Create `.ace/specs.md` with:
- v1 Requirements grouped by category (checkboxes, REQ-IDs)
- v2 Requirements (deferred)
- Out of Scope (explicit exclusions with reasoning)
- Traceability section (empty, filled by track)

**REQ-ID format:** `[CATEGORY]-[NUMBER]` (AUTH-01, CONTENT-02)

**Requirement quality criteria:**

Good requirements are:
- **Specific and testable:** "User can reset password via email link" (not "Handle password reset")
- **User-centric:** "User can X" (not "System does Y")
- **Atomic:** One capability per requirement (not "User can login and manage profile")
- **Independent:** Minimal dependencies on other requirements

Reject vague requirements. Push for specificity:
- "Handle authentication" → "User can log in with email/password and stay logged in across sessions"
- "Support sharing" → "User can share post via link that opens in recipient's browser"

**Present full requirements list:**

Show every requirement (not counts) for user confirmation:

```
## v1 Requirements

### Authentication
- [ ] **AUTH-01**: User can create account with email/password
- [ ] **AUTH-02**: User can log in and stay logged in across sessions
- [ ] **AUTH-03**: User can log out from any page

### Content
- [ ] **CONT-01**: User can create posts with text
- [ ] **CONT-02**: User can edit their own posts

[... full list ...]

---

Does this capture what you're building? (yes / adjust)
```

If "adjust": Return to scoping.

**Commit requirements:**

```bash
git add .ace/specs.md
git commit -m "$(cat <<'EOF'
docs: define v1 requirements

[X] requirements across [N] categories
[Y] requirements deferred to v2
EOF
)"
```
</step>

<step name="create_track">
Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► CREATING TRACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning navigator...
```

Spawn ace-navigator agent with context:

```
Task(prompt="
<planning_context>

**Project:**
@.ace/brief.md

**Requirements:**
@.ace/specs.md

**Research (if exists):**
@.ace/research/recap.md

**Config:**
@.ace/config.json

</planning_context>

<instructions>
Create track:
1. Derive stages from requirements (don't impose structure)
2. Map every v1 requirement to exactly one stage
3. Derive 2-5 success criteria per stage (observable user behaviors)
4. Validate 100% coverage
5. Write files immediately (track.md, pulse.md, update specs.md traceability)
6. Return TRACK CREATED with summary

Write files first, then return. This ensures artifacts persist even if context is lost.
</instructions>
", subagent_type="ace-navigator", model="{navigator_model}", description="Create track")
```

**Handle navigator return:**

**If `## TRACK BLOCKED`:**
- Present blocker information
- Work with user to resolve
- Re-spawn when resolved

**If `## TRACK CREATED`:**

Read the created track.md and present it nicely inline:

```
---

## Proposed Track

**[N] stages** | **[X] requirements mapped** | All v1 requirements covered ✓

| # | Stage | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | [Name] | [Goal] | [REQ-IDs] | [count] |
| 2 | [Name] | [Goal] | [REQ-IDs] | [count] |
| 3 | [Name] | [Goal] | [REQ-IDs] | [count] |
...

### Stage Details

**Stage 1: [Name]**
Goal: [goal]
Requirements: [REQ-IDs]
Success criteria:
1. [criterion]
2. [criterion]
3. [criterion]

**Stage 2: [Name]**
Goal: [goal]
Requirements: [REQ-IDs]
Success criteria:
1. [criterion]
2. [criterion]

[... continue for all stages ...]

---
```

**CRITICAL: Ask for approval before committing:**

Use AskUserQuestion:
- header: "Track"
- question: "Does this track structure work for you?"
- options:
  - "Approve" — Commit and continue
  - "Adjust stages" — Tell me what to change
  - "Review full file" — Show raw track.md

**If "Approve":** Continue to commit.

**If "Adjust stages":**
- Get user's adjustment notes
- Re-spawn navigator with revision context:
  ```
  Task(prompt="
  <revision>
  User feedback on track:
  [user's notes]

  Current track.md: @.ace/track.md

  Update the track based on feedback. Edit files in place.
  Return TRACK REVISED with changes made.
  </revision>
  ", subagent_type="ace-navigator", model="{navigator_model}", description="Revise track")
  ```
- Present revised track
- Loop until user approves

**If "Review full file":** Display raw `cat .ace/track.md`, then re-ask.

**Commit track (after approval):**

```bash
git add .ace/track.md .ace/pulse.md .ace/specs.md
git commit -m "$(cat <<'EOF'
docs: create track ([N] stages)

Stages:
1. [stage-name]: [requirements covered]
2. [stage-name]: [requirements covered]
...

All v1 requirements mapped to stages.
EOF
)"
```
</step>

<step name="done">
Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► PROJECT INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**[Project Name]**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | `.ace/brief.md`             |
| Config         | `.ace/config.json`          |
| Research          | `.ace/research/`               |
| Requirements   | `.ace/specs.md`             |
| Track          | `.ace/track.md`             |

**[N] stages** | **[X] requirements** | Ready to build ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

{IF track.md contains any [UI] stages:}

**Design System** — create your project's visual identity before planning stages

/ace.design-system

<sub>/clear first → fresh context window</sub>

---

**Also available:**
- /ace.discuss-stage 1 — gather context (non-design discussion)
- /ace.plan-stage 1 — skip design and discussion

{ELSE (no [UI] stages):}

**Stage 1: [Stage Name]** — [Goal from track.md]

/ace.discuss-stage 1 — gather context and clarify approach

<sub>/clear first → fresh context window</sub>

---

**Also available:**
- /ace.plan-stage 1 — skip discussion, plan directly

{END IF}

───────────────────────────────────────────────────────────────
```
</step>

</process>
