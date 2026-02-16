<purpose>
Start a new milestone through unified flow: questioning → research (optional) → requirements → track.

Use this workflow for brownfield milestone initialization. The project exists, brief.md has history. Gathers "what's next", updates brief.md, then continues through the full requirements → track cycle with milestone-aware context.
</purpose>

<core_principle>
Subsequent milestones build on validated work. Research focuses on NEW features only. Stage numbering continues from previous milestone. Existing decisions and architecture carry forward.
</core_principle>

<process>

<step name="load_context" priority="first">
- Read brief.md (existing project, Validated requirements, decisions)
- Read milestones.md (completed milestones, shipping history)
- Read pulse.md (pending todos, blockers)
</step>

<step name="gather_milestone_goals">
- Present what shipped in last milestone
- Ask: "What do you want to build next?"
- Use AskUserQuestion to explore features
- Probe for priorities, constraints, scope
</step>

<step name="determine_milestone_version">
- Parse last version from milestones.md
- Suggest next version (v1.0 → v1.1, or v2.0 for major)
- Confirm with user
</step>

<step name="update_brief">
Add/update these sections:

```markdown
## Current Milestone: v[X.Y] [Name]

**Goal:** [One sentence describing milestone focus]

**Target features:**
- [Feature 1]
- [Feature 2]
- [Feature 3]
```

Update Active requirements section with new goals.

Update "Last updated" footer.
</step>

<step name="update_pulse">
```markdown
## Current Position

Stage: Not started (defining requirements)
Run: —
Status: Defining requirements
Last activity: [today] — Milestone v[X.Y] started
```

Keep Accumulated Context section (decisions, blockers) from previous milestone.
</step>

<step name="cleanup_and_commit">
Check ace config:
```bash
COMMIT_PLANNING_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .ace 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

If `COMMIT_PLANNING_DOCS=false`: Skip git operations

If `COMMIT_PLANNING_DOCS=true` (default):
```bash
git add .ace/brief.md .ace/pulse.md
git commit -m "docs: start milestone v[X.Y] [Name]"
```
</step>

<step name="resolve_horsepower">
Read horsepower profile for agent spawning:

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
- question: "Research the domain ecosystem for new features before defining requirements?"
- options:
  - "Research first (Recommended)" — Discover patterns, expected features, architecture for NEW capabilities
  - "Skip research" — I know what I need, go straight to requirements

**If "Research first":**

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► RESEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Researching [new features] ecosystem...
```

Create research directory:
```bash
mkdir -p .ace/research
```

Display spawning indicator:
```
◆ Spawning 5 scouts in parallel...
  → Stack research (for new features)
  → Features research
  → Architecture research (integration)
  → Pitfalls research
  → UX/DX research
```

Spawn 5 parallel ace-project-scout agents with milestone-aware context:

```
Task(prompt="
<research_type>
Project Research — Stack dimension for [new features].
</research_type>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.

Existing validated capabilities (DO NOT re-research):
[List from brief.md Validated requirements]

Focus ONLY on what's needed for the NEW features.
</milestone_context>

<question>
What stack additions/changes are needed for [new features]?
</question>

<project_context>
[brief.md summary - current state, new milestone goals]
</project_context>

<downstream_consumer>
Your STACK.md feeds into track creation. Be prescriptive:
- Specific libraries with versions for NEW capabilities
- Integration points with existing stack
- What NOT to add and why
</downstream_consumer>

<quality_gate>
- [ ] Versions are current (verify with Context7/official docs, not training data)
- [ ] Rationale explains WHY, not just WHAT
- [ ] Integration with existing stack considered
</quality_gate>

<output>
Write to: .ace/research/stack.md
Use template: ~/.claude/ace/templates/research/stack.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Stack research")

Task(prompt="
<research_type>
Project Research — Features dimension for [new features].
</research_type>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.

Existing features (already built):
[List from brief.md Validated requirements]

Focus on how [new features] typically work, expected behavior.
</milestone_context>

<question>
How do [target features] typically work? What's expected behavior?
</question>

<project_context>
[brief.md summary - new milestone goals]
</project_context>

<downstream_consumer>
Your FEATURES.md feeds into requirements definition. Categorize clearly:
- Table stakes (must have for these features)
- Differentiators (competitive advantage)
- Anti-features (things to deliberately NOT build)
</downstream_consumer>

<quality_gate>
- [ ] Categories are clear (table stakes vs differentiators vs anti-features)
- [ ] Complexity noted for each feature
- [ ] Dependencies on existing features identified
</quality_gate>

<output>
Write to: .ace/research/features.md
Use template: ~/.claude/ace/templates/research/features.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Features research")

Task(prompt="
<research_type>
Project Research — Architecture dimension for [new features].
</research_type>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.

Existing architecture:
[Summary from brief.md or codebase map]

Focus on how [new features] integrate with existing architecture.
</milestone_context>

<question>
How do [target features] integrate with existing [domain] architecture?
</question>

<project_context>
[brief.md summary - current architecture, new features]
</project_context>

<downstream_consumer>
Your ARCHITECTURE.md informs stage structure in track. Include:
- Integration points with existing components
- New components needed
- Data flow changes
- Suggested build order
</downstream_consumer>

<quality_gate>
- [ ] Integration points clearly identified
- [ ] New vs modified components explicit
- [ ] Build order considers existing dependencies
</quality_gate>

<output>
Write to: .ace/research/architecture.md
Use template: ~/.claude/ace/templates/research/architecture.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Architecture research")

Task(prompt="
<research_type>
Project Research — Pitfalls dimension for [new features].
</research_type>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.

Focus on common mistakes when ADDING these features to an existing system.
</milestone_context>

<question>
What are common mistakes when adding [target features] to [domain]?
</question>

<project_context>
[brief.md summary - current state, new features]
</project_context>

<downstream_consumer>
Your PITFALLS.md prevents mistakes in track/planning. For each pitfall:
- Warning signs (how to detect early)
- Prevention strategy (how to avoid)
- Which stage should address it
</downstream_consumer>

<quality_gate>
- [ ] Pitfalls are specific to adding these features (not generic)
- [ ] Integration pitfalls with existing system covered
- [ ] Prevention strategies are actionable
</quality_gate>

<output>
Write to: .ace/research/pitfalls.md
Use template: ~/.claude/ace/templates/research/pitfalls.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Pitfalls research")

Task(prompt="
<research_type>
Project Research — UX/DX dimension for [new features].

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
SUBSEQUENT MILESTONE — Adding [target features] to existing app.

Existing validated capabilities (DO NOT re-research):
[List from brief.md Validated requirements]

Focus ONLY on UX/DX patterns for the NEW features.
</milestone_context>

<question>
What UX/DX patterns should [new features] follow? Identify competitor approaches, proven patterns, anti-patterns, emotional design goals, and critical flows with friction tolerance.
</question>

<project_context>
[brief.md summary - current state, new milestone goals]
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
- [ ] Focus is on NEW features, not re-researching existing ones
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

**Stack additions:** [from recap.md]
**New feature table stakes:** [from recap.md]
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
- Current milestone goals
- Validated requirements (what already exists)

**If research exists:** Read research/features.md and extract feature categories.

**Present features by category:**

```
Here are the features for [new capabilities]:

## [Category 1]
**Table stakes:**
- Feature A
- Feature B

**Differentiators:**
- Feature C
- Feature D

**Research notes:** [any relevant notes]

---

## [Next Category]
...
```

**If no research:** Gather requirements through conversation instead.

Ask: "What are the main things users need to be able to do with [new features]?"

For each capability mentioned:
- Ask clarifying questions to make it specific
- Probe for related capabilities
- Group into categories

**Scope each category:**

For each category, use AskUserQuestion:

- header: "[Category name]"
- question: "Which [category] features are in this milestone?"
- multiSelect: true
- options:
  - "[Feature 1]" — [brief description]
  - "[Feature 2]" — [brief description]
  - "[Feature 3]" — [brief description]
  - "None for this milestone" — Defer entire category

Track responses:
- Selected features → this milestone's requirements
- Unselected table stakes → future milestone
- Unselected differentiators → out of scope

**Identify gaps:**

Use AskUserQuestion:
- header: "Additions"
- question: "Any requirements research missed? (Features specific to your vision)"
- options:
  - "No, research covered it" — Proceed
  - "Yes, let me add some" — Capture additions

**Generate specs.md:**

Create `.ace/specs.md` with:
- v1 Requirements for THIS milestone grouped by category (checkboxes, REQ-IDs)
- Future Requirements (deferred to later milestones)
- Out of Scope (explicit exclusions with reasoning)
- Traceability section (empty, filled by track)

**REQ-ID format:** `[CATEGORY]-[NUMBER]` (AUTH-01, NOTIF-02)

Continue numbering from existing requirements if applicable.

**Requirement quality criteria:**

Good requirements are:
- **Specific and testable:** "User can reset password via email link" (not "Handle password reset")
- **User-centric:** "User can X" (not "System does Y")
- **Atomic:** One capability per requirement (not "User can login and manage profile")
- **Independent:** Minimal dependencies on other requirements

**Present full requirements list:**

Show every requirement (not counts) for user confirmation:

```
## Milestone v[X.Y] Requirements

### [Category 1]
- [ ] **CAT1-01**: User can do X
- [ ] **CAT1-02**: User can do Y

### [Category 2]
- [ ] **CAT2-01**: User can do Z

[... full list ...]

---

Does this capture what you're building? (yes / adjust)
```

If "adjust": Return to scoping.

**Commit requirements:**

Check ace config (same pattern as cleanup_and_commit).

If committing:
```bash
git add .ace/specs.md
git commit -m "$(cat <<'EOF'
docs: define milestone v[X.Y] requirements

[X] requirements across [N] categories
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

**Determine starting stage number:**

Read milestones.md to find the last stage number from previous milestone.
New stages continue from there (e.g., if v1.0 ended at stage 5, v1.1 starts at stage 6).

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

**Previous milestone (for stage numbering):**
@.ace/milestones.md

</planning_context>

<instructions>
Create track for milestone v[X.Y]:
1. Start stage numbering from [N] (continues from previous milestone)
2. Derive stages from THIS MILESTONE's requirements (don't include validated/existing)
3. Map every requirement to exactly one stage
4. Derive 2-5 success criteria per stage (observable user behaviors)
5. Validate 100% coverage of new requirements
6. Write files immediately (track.md, pulse.md, update specs.md traceability)
7. Return TRACK CREATED with summary

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

**[N] stages** | **[X] requirements mapped** | All milestone requirements covered ✓

| # | Stage | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| [N] | [Name] | [Goal] | [REQ-IDs] | [count] |
| [N+1] | [Name] | [Goal] | [REQ-IDs] | [count] |
...

### Stage Details

**Stage [N]: [Name]**
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

Check ace config (same pattern as cleanup_and_commit).

If committing:
```bash
git add .ace/track.md .ace/pulse.md .ace/specs.md
git commit -m "$(cat <<'EOF'
docs: create milestone v[X.Y] track ([N] stages)

Stages:
[N]. [stage-name]: [requirements covered]
[N+1]. [stage-name]: [requirements covered]
...

All milestone requirements mapped to stages.
EOF
)"
```
</step>

<step name="done">
Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► MILESTONE INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Milestone v[X.Y]: [Name]**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | `.ace/brief.md`             |
| Research          | `.ace/research/`               |
| Requirements   | `.ace/specs.md`             |
| Track          | `.ace/track.md`             |

**[N] stages** | **[X] requirements** | Ready to build ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Stage [N]: [Stage Name]** — [Goal from track.md]

`/ace.discuss-stage [N]` — gather context and clarify approach

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.plan-stage [N]` — skip discussion, plan directly

───────────────────────────────────────────────────────────────
```
</step>

</process>
