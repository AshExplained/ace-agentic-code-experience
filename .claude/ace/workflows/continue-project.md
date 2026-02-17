<trigger>
Use this workflow when:
- Starting a new session on an existing project
- User says "continue", "what's next", "where were we", "resume"
- Any operation when .ace/ already exists
- User returns after time away from project
</trigger>

<purpose>
Instantly restore full project context so "Where were we?" has an immediate, complete answer.
</purpose>

<required_reading>
@.claude/ace/references/continuation-format.md
</required_reading>

<process>

<step name="detect_existing_project">
Check if this is an existing project:

```bash
ls .ace/pulse.md 2>/dev/null && echo "Project exists"
ls .ace/track.md 2>/dev/null && echo "Track exists"
ls .ace/brief.md 2>/dev/null && echo "Brief exists"
```

**If pulse.md exists:** Proceed to load_state
**If only track.md/brief.md exist:** Offer to reconstruct pulse.md
**If .ace/ doesn't exist:** This is a new project - route to /ace.start
</step>

<step name="load_state">

Read and parse pulse.md, then brief.md:

```bash
cat .ace/pulse.md
cat .ace/brief.md
```

**From pulse.md extract:**

- **Project Reference**: Core value and current focus
- **Current Position**: Stage X of Y, Run A of B, Status
- **Progress**: Visual progress bar
- **Recent Decisions**: Key decisions affecting current work
- **Pending Todos**: Ideas captured during sessions
- **Blockers/Concerns**: Issues carried forward
- **Session Continuity**: Where we left off, any resume files

**From brief.md extract:**

- **What This Is**: Current accurate description
- **Requirements**: Validated, Active, Out of Scope
- **Key Decisions**: Full decision log with outcomes
- **Constraints**: Hard limits on implementation

</step>

<step name="check_incomplete_work">
Look for incomplete work that needs attention:

```bash
# Check for continue-here files (mid-run resumption)
ls .ace/stages/*/.continue-here*.md 2>/dev/null

# Check for runs without recaps (incomplete execution)
for run in .ace/stages/*/*-run.md; do
  recap="${run/RUN/RECAP}"
  [ ! -f "$recap" ] && echo "Incomplete: $run"
done 2>/dev/null

# Check for interrupted agents
if [ -f .ace/current-agent-id.txt ] && [ -s .ace/current-agent-id.txt ]; then
  AGENT_ID=$(cat .ace/current-agent-id.txt | tr -d '\n')
  echo "Interrupted agent: $AGENT_ID"
fi
```

**If .continue-here file exists:**

- This is a mid-run resumption point
- Read the file for specific resumption context
- Flag: "Found mid-run gate"

**If RUN without RECAP exists:**

- Execution was started but not completed
- Flag: "Found incomplete run execution"

**If interrupted agent found:**

- Subagent was spawned but session ended before completion
- Read agent-history.json for task details
- Flag: "Found interrupted agent"
</step>

<step name="present_status">
Present complete project status to user:

```
PROJECT STATUS

Building: [one-liner from brief.md "What This Is"]

Stage: [X] of [Y] - [Stage name]
Run:   [A] of [B] - [Status]
Progress: [██████░░░░] XX%

Last activity: [date] - [what happened]

[If incomplete work found:]
Incomplete work detected:
  - [.continue-here file or incomplete run]

[If interrupted agent found:]
Interrupted agent detected:
  Agent ID: [id]
  Task: [task description from agent-history.json]
  Interrupted: [timestamp]

  Resume with: Task tool (resume parameter with agent ID)

[If pending todos exist:]
[N] pending todos — /ace.check-todos to review

[If blockers exist:]
Carried concerns:
  - [blocker 1]
  - [blocker 2]

[If alignment is not OK:]
Brief alignment: [status] - [assessment]
```

</step>

<step name="determine_next_action">
Based on project state, determine the most logical next action:

**If interrupted agent exists:**
→ Primary: Resume interrupted agent (Task tool with resume parameter)
→ Option: Start fresh (abandon agent work)

**If .continue-here file exists:**
→ Primary: Resume from gate
→ Option: Start fresh on current run

**If incomplete run (RUN without RECAP):**
→ Primary: Complete the incomplete run
→ Option: Abandon and move on

**If stage in progress, all runs complete:**
→ Primary: Transition to next stage
→ Option: Review completed work

**If stage ready to plan:**
→ Check if intel.md exists for this stage:

- If intel.md missing:
  → Primary: Discuss stage vision (how user imagines it working)
  → Secondary: Plan directly (skip context gathering)
- If intel.md exists:
  → Primary: Plan the stage
  → Option: Review track

**If stage ready to execute:**
→ Primary: Execute next run
→ Option: Review the run first
</step>

<step name="offer_options">
Present contextual options based on project state:

```
What would you like to do?

[Primary action based on state - e.g.:]
1. Resume interrupted agent [if interrupted agent found]
   OR
1. Run stage (/ace.run-stage {stage})
   OR
1. Discuss Stage 3 context (/ace.discuss-stage 3) [if intel.md missing]
   OR
1. Plan Stage 3 (/ace.plan-stage 3) [if intel.md exists or discuss option declined]

[Secondary options:]
2. Review current stage status
3. Check pending todos ([N] pending)
4. Review brief alignment
5. Something else
```

**Note:** When offering stage planning, check for intel.md existence first:

```bash
ls .ace/stages/XX-name/*-intel.md 2>/dev/null
```

If missing, suggest discuss-stage before plan. If exists, offer plan directly.

Wait for user selection.
</step>

<step name="route_to_workflow">
Based on user selection, route to appropriate workflow:

- **Execute run** → Show command for user to run after clearing:
  ```
  ---

  ## Next Up

  **{stage}.{run}: [Run Name]** — [objective from run.md]

  /ace.run-stage {stage}

  <sub>/clear first — fresh context window</sub>

  ---
  ```
- **Plan stage** → Show command for user to run after clearing:
  ```
  ---

  ## Next Up

  **Stage [N]: [Name]** — [Goal from track.md]

  /ace.plan-stage [stage-number]

  <sub>/clear first — fresh context window</sub>

  ---

  **Also available:**
  - /ace.design-system [N] — create design system (if UI stage)
  - /ace.discuss-stage [N] — gather context first
  - /ace.research-stage [N] — investigate unknowns

  ---
  ```
- **Transition** → ./transition.md
- **Check todos** → Read .ace/todos/pending/, present summary
- **Review alignment** → Read brief.md, compare to current state
- **Something else** → Ask what they need
</step>

<step name="update_session">
Before proceeding to routed workflow, update session continuity:

Update pulse.md:

```markdown
## Session Continuity

Last session: [now]
Stopped at: Session resumed, proceeding to [action]
Resume file: [updated if applicable]
```

This ensures if session ends unexpectedly, next resume knows the state.
</step>

</process>

<reconstruction>
If pulse.md is missing but other artifacts exist:

"pulse.md missing. Reconstructing from artifacts..."

1. Read brief.md → Extract "What This Is" and Core Value
2. Read track.md → Determine stages, find current position
3. Scan \*-recap.md files → Extract decisions, concerns
4. Count pending todos in .ace/todos/pending/
5. Check for .continue-here files → Session continuity

Reconstruct and write pulse.md, then proceed normally.

This handles cases where:

- Project predates pulse.md introduction
- File was accidentally deleted
- Cloning repo without full .ace/ state
</reconstruction>

<quick_resume>
If user says "continue" or "go":
- Load state silently
- Determine primary action
- Execute immediately without presenting options

"Continuing from [state]... [action]"
</quick_resume>

<success_criteria>
Resume is complete when:

- [ ] pulse.md loaded (or reconstructed)
- [ ] Incomplete work detected and flagged
- [ ] Clear status presented to user
- [ ] Contextual next actions offered
- [ ] User knows exactly where project stands
- [ ] Session continuity updated
</success_criteria>
