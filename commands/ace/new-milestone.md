---
name: ace.new-milestone
description: Start a new milestone cycle — update BRIEF.md and route to requirements
argument-hint: "[milestone name, e.g., 'v1.1 Notifications']"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---

<objective>
Start a new milestone through unified flow: questioning → recon (optional) → requirements → track.

This is the brownfield equivalent of ace.start. The project exists, BRIEF.md has history. This command gathers "what's next", updates BRIEF.md, then continues through the full requirements → track cycle.

**Creates/Updates:**
- `.ace/BRIEF.md` — updated with new milestone goals
- `.ace/recon/` — domain recon (optional, focuses on NEW features)
- `.ace/SPECS.md` — scoped requirements for this milestone
- `.ace/TRACK.md` — stage structure (continues numbering)
- `.ace/PULSE.md` — reset for new milestone

**After this command:** Run `/ace.plan-stage [N]` to start execution.
</objective>

<execution_context>
@~/.claude/ace/references/questioning.md
@~/.claude/ace/references/ui-brand.md
@~/.claude/ace/templates/BRIEF.md
@~/.claude/ace/templates/SPECS.md
</execution_context>

<context>
Milestone name: $ARGUMENTS (optional - will prompt if not provided)

**Load project context:**
@.ace/BRIEF.md
@.ace/PULSE.md
@.ace/MILESTONES.md
@.ace/config.json

**Load milestone context (if exists, from /ace.discuss-milestone):**
@.ace/MILESTONE-CONTEXT.md
</context>

<process>

## Stage 1: Load Context

- Read BRIEF.md (existing project, Validated requirements, decisions)
- Read MILESTONES.md (what shipped previously)
- Read PULSE.md (pending todos, blockers)
- Check for MILESTONE-CONTEXT.md (from /ace.discuss-milestone)

## Stage 2: Gather Milestone Goals

**If MILESTONE-CONTEXT.md exists:**
- Use features and scope from discuss-milestone
- Present summary for confirmation

**If no context file:**
- Present what shipped in last milestone
- Ask: "What do you want to build next?"
- Use AskUserQuestion to explore features
- Probe for priorities, constraints, scope

## Stage 3: Determine Milestone Version

- Parse last version from MILESTONES.md
- Suggest next version (v1.0 → v1.1, or v2.0 for major)
- Confirm with user

## Stage 4: Update BRIEF.md

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

## Stage 5: Update PULSE.md

```markdown
## Current Position

Stage: Not started (defining requirements)
Run: —
Status: Defining requirements
Last activity: [today] — Milestone v[X.Y] started
```

Keep Accumulated Context section (decisions, blockers) from previous milestone.

## Stage 6: Cleanup and Commit

Delete MILESTONE-CONTEXT.md if exists (consumed).

Check ace config:
```bash
COMMIT_PLANNING_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .ace 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

If `COMMIT_PLANNING_DOCS=false`: Skip git operations

If `COMMIT_PLANNING_DOCS=true` (default):
```bash
git add .ace/BRIEF.md .ace/PULSE.md
git commit -m "docs: start milestone v[X.Y] [Name]"
```

## Stage 6.5: Resolve Horsepower Profile

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

## Stage 7: Recon Decision

Use AskUserQuestion:
- header: "Recon"
- question: "Research the domain ecosystem for new features before defining requirements?"
- options:
  - "Recon first (Recommended)" — Discover patterns, expected features, architecture for NEW capabilities
  - "Skip recon" — I know what I need, go straight to requirements

**If "Recon first":**

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► RECON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Researching [new features] ecosystem...
```

Create recon directory:
```bash
mkdir -p .ace/recon
```

Display spawning indicator:
```
◆ Spawning 4 scouts in parallel...
  → Stack recon (for new features)
  → Features recon
  → Architecture recon (integration)
  → Pitfalls recon
```

Spawn 4 parallel ace-project-scout agents with milestone-aware context:

```
Task(prompt="
<research_type>
Project Recon — Stack dimension for [new features].
</research_type>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.

Existing validated capabilities (DO NOT re-research):
[List from BRIEF.md Validated requirements]

Focus ONLY on what's needed for the NEW features.
</milestone_context>

<question>
What stack additions/changes are needed for [new features]?
</question>

<project_context>
[BRIEF.md summary - current state, new milestone goals]
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
Write to: .ace/recon/STACK.md
Use template: ~/.claude/ace/templates/recon-project/STACK.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Stack recon")

Task(prompt="
<research_type>
Project Recon — Features dimension for [new features].
</research_type>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.

Existing features (already built):
[List from BRIEF.md Validated requirements]

Focus on how [new features] typically work, expected behavior.
</milestone_context>

<question>
How do [target features] typically work? What's expected behavior?
</question>

<project_context>
[BRIEF.md summary - new milestone goals]
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
Write to: .ace/recon/FEATURES.md
Use template: ~/.claude/ace/templates/recon-project/FEATURES.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Features recon")

Task(prompt="
<research_type>
Project Recon — Architecture dimension for [new features].
</research_type>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.

Existing architecture:
[Summary from BRIEF.md or codebase map]

Focus on how [new features] integrate with existing architecture.
</milestone_context>

<question>
How do [target features] integrate with existing [domain] architecture?
</question>

<project_context>
[BRIEF.md summary - current architecture, new features]
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
Write to: .ace/recon/ARCHITECTURE.md
Use template: ~/.claude/ace/templates/recon-project/ARCHITECTURE.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Architecture recon")

Task(prompt="
<research_type>
Project Recon — Pitfalls dimension for [new features].
</research_type>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.

Focus on common mistakes when ADDING these features to an existing system.
</milestone_context>

<question>
What are common mistakes when adding [target features] to [domain]?
</question>

<project_context>
[BRIEF.md summary - current state, new features]
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
Write to: .ace/recon/PITFALLS.md
Use template: ~/.claude/ace/templates/recon-project/PITFALLS.md
</output>
", subagent_type="ace-project-scout", model="{scout_model}", description="Pitfalls recon")
```

After all 4 agents complete, spawn synthesizer to create RECAP.md:

```
Task(prompt="
<task>
Synthesize recon outputs into RECAP.md.
</task>

<recon_files>
Read these files:
- .ace/recon/STACK.md
- .ace/recon/FEATURES.md
- .ace/recon/ARCHITECTURE.md
- .ace/recon/PITFALLS.md
</recon_files>

<output>
Write to: .ace/recon/RECAP.md
Use template: ~/.claude/ace/templates/recon-project/RECAP.md
Commit after writing.
</output>
", subagent_type="ace-synthesizer", model="{synthesizer_model}", description="Synthesize recon")
```

Display recon complete banner and key findings:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► RECON COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Key Findings

**Stack additions:** [from RECAP.md]
**New feature table stakes:** [from RECAP.md]
**Watch Out For:** [from RECAP.md]

Files: `.ace/recon/`
```

**If "Skip recon":** Continue to Stage 8.

## Stage 8: Define Requirements

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► DEFINING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Load context:**

Read BRIEF.md and extract:
- Core value (the ONE thing that must work)
- Current milestone goals
- Validated requirements (what already exists)

**If recon exists:** Read recon/FEATURES.md and extract feature categories.

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

**Recon notes:** [any relevant notes]

---

## [Next Category]
...
```

**If no recon:** Gather requirements through conversation instead.

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
- question: "Any requirements recon missed? (Features specific to your vision)"
- options:
  - "No, recon covered it" — Proceed
  - "Yes, let me add some" — Capture additions

**Generate SPECS.md:**

Create `.ace/SPECS.md` with:
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

Check ace config (same pattern as Stage 6).

If committing:
```bash
git add .ace/SPECS.md
git commit -m "$(cat <<'EOF'
docs: define milestone v[X.Y] requirements

[X] requirements across [N] categories
EOF
)"
```

## Stage 9: Create Track

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► CREATING TRACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning navigator...
```

**Determine starting stage number:**

Read MILESTONES.md to find the last stage number from previous milestone.
New stages continue from there (e.g., if v1.0 ended at stage 5, v1.1 starts at stage 6).

Spawn ace-navigator agent with context:

```
Task(prompt="
<planning_context>

**Project:**
@.ace/BRIEF.md

**Requirements:**
@.ace/SPECS.md

**Recon (if exists):**
@.ace/recon/RECAP.md

**Config:**
@.ace/config.json

**Previous milestone (for stage numbering):**
@.ace/MILESTONES.md

</planning_context>

<instructions>
Create track for milestone v[X.Y]:
1. Start stage numbering from [N] (continues from previous milestone)
2. Derive stages from THIS MILESTONE's requirements (don't include validated/existing)
3. Map every requirement to exactly one stage
4. Derive 2-5 success criteria per stage (observable user behaviors)
5. Validate 100% coverage of new requirements
6. Write files immediately (TRACK.md, PULSE.md, update SPECS.md traceability)
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

Read the created TRACK.md and present it nicely inline:

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
  - "Review full file" — Show raw TRACK.md

**If "Approve":** Continue to commit.

**If "Adjust stages":**
- Get user's adjustment notes
- Re-spawn navigator with revision context:
  ```
  Task(prompt="
  <revision>
  User feedback on track:
  [user's notes]

  Current TRACK.md: @.ace/TRACK.md

  Update the track based on feedback. Edit files in place.
  Return TRACK REVISED with changes made.
  </revision>
  ", subagent_type="ace-navigator", model="{navigator_model}", description="Revise track")
  ```
- Present revised track
- Loop until user approves

**If "Review full file":** Display raw `cat .ace/TRACK.md`, then re-ask.

**Commit track (after approval):**

Check ace config (same pattern as Stage 6).

If committing:
```bash
git add .ace/TRACK.md .ace/PULSE.md .ace/SPECS.md
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

## Stage 10: Done

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► MILESTONE INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Milestone v[X.Y]: [Name]**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | `.ace/BRIEF.md`             |
| Recon          | `.ace/recon/`               |
| Requirements   | `.ace/SPECS.md`             |
| Track          | `.ace/TRACK.md`             |

**[N] stages** | **[X] requirements** | Ready to build ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Stage [N]: [Stage Name]** — [Goal from TRACK.md]

`/ace.discuss-stage [N]` — gather context and clarify approach

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.plan-stage [N]` — skip discussion, plan directly

───────────────────────────────────────────────────────────────
```

</process>

<success_criteria>
- [ ] BRIEF.md updated with Current Milestone section
- [ ] PULSE.md reset for new milestone
- [ ] MILESTONE-CONTEXT.md consumed and deleted (if existed)
- [ ] Recon completed (if selected) — 4 parallel agents spawned, milestone-aware
- [ ] Requirements gathered (from recon or conversation)
- [ ] User scoped each category
- [ ] SPECS.md created with REQ-IDs
- [ ] ace-navigator spawned with stage numbering context
- [ ] Track files written immediately (not draft)
- [ ] User feedback incorporated (if any)
- [ ] TRACK.md created with stages continuing from previous milestone
- [ ] All commits made (if planning docs committed)
- [ ] User knows next step is `/ace.discuss-stage [N]`

**Atomic commits:** Each stage commits its artifacts immediately. If context is lost, artifacts persist.
</success_criteria>
