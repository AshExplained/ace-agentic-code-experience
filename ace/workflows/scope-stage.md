<purpose>
Extract implementation decisions that downstream agents need. Analyze the stage to identify gray areas, let the user choose what to discuss, then deep-dive each selected area until satisfied.

You are a thinking partner, not an interviewer. The user is the visionary — you are the builder. Your job is to capture decisions that will guide research and planning, not to figure out implementation yourself.
</purpose>

<downstream_awareness>
**INTEL.md feeds into:**

1. **ace-stage-scout** — Reads INTEL.md to know WHAT to research
   - "User wants card-based layout" → researcher investigates card component patterns
   - "Infinite scroll decided" → researcher looks into virtualization libraries

2. **ace-architect** — Reads INTEL.md to know WHAT decisions are locked
   - "Pull-to-refresh on mobile" → architect includes that in task specs
   - "Claude's Discretion: loading skeleton" → architect can decide approach

**Your job:** Capture decisions clearly enough that downstream agents can act on them without asking the user again.

**Not your job:** Figure out HOW to implement. That's what research and planning do with the decisions you capture.
</downstream_awareness>

<philosophy>
**User = founder/visionary. Claude = builder.**

The user knows:
- How they imagine it working
- What it should look/feel like
- What's essential vs nice-to-have
- Specific behaviors or references they have in mind

The user doesn't know (and shouldn't be asked):
- Codebase patterns (researcher reads the code)
- Technical risks (researcher identifies these)
- Implementation approach (architect figures this out)
- Success metrics (inferred from the work)

Ask about vision and implementation choices. Capture decisions for downstream agents.
</philosophy>

<scope_guardrail>
**CRITICAL: No scope creep.**

The stage boundary comes from TRACK.md and is FIXED. Discussion clarifies HOW to implement what's scoped, never WHETHER to add new capabilities.

**Allowed (clarifying ambiguity):**
- "How should posts be displayed?" (layout, density, info shown)
- "What happens on empty state?" (within the feature)
- "Pull to refresh or manual?" (behavior choice)

**Not allowed (scope creep):**
- "Should we also add comments?" (new capability)
- "What about search/filtering?" (new capability)
- "Maybe include bookmarking?" (new capability)

**The heuristic:** Does this clarify how we implement what's already in the stage, or does it add a new capability that could be its own stage?

**When user suggests scope creep:**
```
"[Feature X] would be a new capability — that's its own stage.
Want me to note it for the roadmap backlog?

For now, let's focus on [stage domain]."
```

Capture the idea in a "Deferred Ideas" section. Don't lose it, don't act on it.
</scope_guardrail>

<gray_area_identification>
Gray areas are **implementation decisions the user cares about** — things that could go multiple ways and would change the result.

**How to identify gray areas:**

1. **Read the stage goal** from TRACK.md
2. **Understand the domain** — What kind of thing is being built?
   - Something users SEE → visual presentation, interactions, states matter
   - Something users CALL → interface contracts, responses, errors matter
   - Something users RUN → invocation, output, behavior modes matter
   - Something users READ → structure, tone, depth, flow matter
   - Something being ORGANIZED → criteria, grouping, handling exceptions matter
3. **Generate stage-specific gray areas** — Not generic categories, but concrete decisions for THIS stage

**Don't use generic category labels** (UI, UX, Behavior). Generate specific gray areas:

```
Stage: "User authentication"
→ Session handling, Error responses, Multi-device policy, Recovery flow

Stage: "Organize photo library"
→ Grouping criteria, Duplicate handling, Naming convention, Folder structure

Stage: "CLI for database backups"
→ Output format, Flag design, Progress reporting, Error recovery

Stage: "API documentation"
→ Structure/navigation, Code examples depth, Versioning approach, Interactive elements
```

**The key question:** What decisions would change the outcome that the user should weigh in on?

**Claude handles these (don't ask):**
- Technical implementation details
- Architecture patterns
- Performance optimization
- Scope (roadmap defines this)
</gray_area_identification>

<process>

<step name="validate_stage" priority="first">
Stage number from argument (required).

Load and validate:
- Read `.ace/TRACK.md`
- Find stage entry
- Extract: number, name, description, status

**If stage not found:**
```
Stage [X] not found in roadmap.

Use /ace.status to see available stages.
```
Exit workflow.

**If stage found:** Continue to analyze_stage.
</step>

<step name="check_existing">
Check if INTEL.md already exists:

```bash
# Match both zero-padded (05-*) and unpadded (5-*) folders
PADDED_STAGE=$(printf "%02d" ${STAGE})
ls .ace/stages/${PADDED_STAGE}-*/*-INTEL.md .ace/stages/${STAGE}-*/*-INTEL.md 2>/dev/null
```

**If exists:**
Use AskUserQuestion:
- header: "Existing context"
- question: "Stage [X] already has context. What do you want to do?"
- options:
  - "Update it" — Review and revise existing context
  - "View it" — Show me what's there
  - "Skip" — Use existing context as-is

If "Update": Load existing, continue to analyze_stage
If "View": Display INTEL.md, then offer update/skip
If "Skip": Exit workflow

**If doesn't exist:** Continue to analyze_stage.
</step>

<step name="analyze_stage">
Analyze the stage to identify gray areas worth discussing.

**Read the stage description from TRACK.md and determine:**

1. **Domain boundary** — What capability is this stage delivering? State it clearly.

2. **Gray areas by category** — For each relevant category (UI, UX, Behavior, Empty States, Content), identify 1-2 specific ambiguities that would change implementation.

3. **Skip assessment** — If no meaningful gray areas exist (pure infrastructure, clear-cut implementation), the stage may not need discussion.

**Output your analysis internally, then present to user.**

Example analysis for "Post Feed" stage:
```
Domain: Displaying posts from followed users
Gray areas:
- UI: Layout style (cards vs timeline vs grid)
- UI: Information density (full posts vs previews)
- Behavior: Loading pattern (infinite scroll vs pagination)
- Empty State: What shows when no posts exist
- Content: What metadata displays (time, author, reactions count)
```
</step>

<step name="present_gray_areas">
Present the domain boundary and gray areas to user.

**First, state the boundary:**
```
Stage [X]: [Name]
Domain: [What this stage delivers — from your analysis]

We'll clarify HOW to implement this.
(New capabilities belong in other stages.)
```

**Then use AskUserQuestion (multiSelect: true):**
- header: "Discuss"
- question: "Which areas do you want to discuss for [stage name]?"
- options: Generate 3-4 stage-specific gray areas, each formatted as:
  - "[Specific area]" (label) — concrete, not generic
  - [1-2 questions this covers] (description)

**Do NOT include a "skip" or "you decide" option.** User ran this command to discuss — give them real choices.

**Examples by domain:**

For "Post Feed" (visual feature):
```
☐ Layout style — Cards vs list vs timeline? Information density?
☐ Loading behavior — Infinite scroll or pagination? Pull to refresh?
☐ Content ordering — Chronological, algorithmic, or user choice?
☐ Post metadata — What info per post? Timestamps, reactions, author?
```

For "Database backup CLI" (command-line tool):
```
☐ Output format — JSON, table, or plain text? Verbosity levels?
☐ Flag design — Short flags, long flags, or both? Required vs optional?
☐ Progress reporting — Silent, progress bar, or verbose logging?
☐ Error recovery — Fail fast, retry, or prompt for action?
```

For "Organize photo library" (organization task):
```
☐ Grouping criteria — By date, location, faces, or events?
☐ Duplicate handling — Keep best, keep all, or prompt each time?
☐ Naming convention — Original names, dates, or descriptive?
☐ Folder structure — Flat, nested by year, or by category?
```

Continue to discuss_areas with selected areas.
</step>

<step name="discuss_areas">
For each selected area, conduct a focused discussion loop.

**Philosophy: 4 questions, then check.**

Ask 4 questions per area before offering to continue or move on. Each answer often reveals the next question.

**For each area:**

1. **Announce the area:**
   ```
   Let's talk about [Area].
   ```

2. **Ask 4 questions using AskUserQuestion:**
   - header: "[Area]"
   - question: Specific decision for this area
   - options: 2-3 concrete choices (AskUserQuestion adds "Other" automatically)
   - Include "You decide" as an option when reasonable — captures Claude discretion

3. **After 4 questions, check:**
   - header: "[Area]"
   - question: "More questions about [area], or move to next?"
   - options: "More questions" / "Next area"

   If "More questions" → ask 4 more, then check again
   If "Next area" → proceed to next selected area

4. **After all areas complete:**
   - header: "Done"
   - question: "That covers [list areas]. Ready to create context?"
   - options: "Create context" / "Revisit an area"

**Question design:**
- Options should be concrete, not abstract ("Cards" not "Option A")
- Each answer should inform the next question
- If user picks "Other", receive their input, reflect it back, confirm

**Scope creep handling:**
If user mentions something outside the stage domain:
```
"[Feature] sounds like a new capability — that belongs in its own stage.
I'll note it as a deferred idea.

Back to [current area]: [return to current question]"
```

Track deferred ideas internally.
</step>

<step name="write_context">
Create INTEL.md capturing decisions made.

**Find or create stage directory:**

```bash
# Match existing directory (padded or unpadded)
PADDED_STAGE=$(printf "%02d" ${STAGE})
STAGE_DIR=$(ls -d .ace/stages/${PADDED_STAGE}-* .ace/stages/${STAGE}-* 2>/dev/null | head -1)
if [ -z "$STAGE_DIR" ]; then
  # Create from roadmap name (lowercase, hyphens)
  STAGE_NAME=$(grep "Stage ${STAGE}:" .ace/TRACK.md | sed 's/.*Stage [0-9]*: //' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  mkdir -p ".ace/stages/${PADDED_STAGE}-${STAGE_NAME}"
  STAGE_DIR=".ace/stages/${PADDED_STAGE}-${STAGE_NAME}"
fi
```

**File location:** `${STAGE_DIR}/${PADDED_STAGE}-INTEL.md`

**Structure the content by what was discussed:**

```markdown
# Stage [X]: [Name] - Context

**Gathered:** [date]
**Status:** Ready for planning

<domain>
## Stage Boundary

[Clear statement of what this stage delivers — the scope anchor]

</domain>

<decisions>
## Implementation Decisions

### [Category 1 that was discussed]
- [Decision or preference captured]
- [Another decision if applicable]

### [Category 2 that was discussed]
- [Decision or preference captured]

### Claude's Discretion
[Areas where user said "you decide" — note that Claude has flexibility here]

</decisions>

<specifics>
## Specific Ideas

[Any particular references, examples, or "I want it like X" moments from discussion]

[If none: "No specific requirements — open to standard approaches"]

</specifics>

<deferred>
## Deferred Ideas

[Ideas that came up but belong in other stages. Don't lose them.]

[If none: "None — discussion stayed within stage scope"]

</deferred>

---

*Stage: XX-name*
*Context gathered: [date]*
```

Write file.
</step>

<step name="confirm_creation">
Present summary and next steps:

```
Created: .ace/stages/${PADDED_STAGE}-${SLUG}/${PADDED_STAGE}-INTEL.md

## Decisions Captured

### [Category]
- [Key decision]

### [Category]
- [Key decision]

[If deferred ideas exist:]
## Noted for Later
- [Deferred idea] — future stage

---

## ▶ Next Up

**Stage ${STAGE}: [Name]** — [Goal from TRACK.md]

`/ace.plan-stage ${STAGE}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.plan-stage ${STAGE} --skip-research` — plan without research
- Review/edit INTEL.md before continuing

---
```
</step>

<step name="git_commit">
Commit stage context:

**Check planning config:**

```bash
COMMIT_PLANNING_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .ace 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

**If `COMMIT_PLANNING_DOCS=false`:** Skip git operations

**If `COMMIT_PLANNING_DOCS=true` (default):**

```bash
git add "${STAGE_DIR}/${PADDED_STAGE}-INTEL.md"
git commit -m "$(cat <<'EOF'
docs(${PADDED_STAGE}): capture stage context

Stage ${PADDED_STAGE}: ${STAGE_NAME}
- Implementation decisions documented
- Stage boundary established
EOF
)"
```

Confirm: "Committed: docs(${PADDED_STAGE}): capture stage context"
</step>

</process>

<success_criteria>
- Stage validated against roadmap
- Gray areas identified through intelligent analysis (not generic questions)
- User selected which areas to discuss
- Each selected area explored until user satisfied
- Scope creep redirected to deferred ideas
- INTEL.md captures actual decisions, not vague vision
- Deferred ideas preserved for future stages
- User knows next steps
</success_criteria>
