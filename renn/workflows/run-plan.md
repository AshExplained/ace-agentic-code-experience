<purpose>
Execute a stage prompt (run.md) and create the outcome summary (recap.md).
</purpose>

<required_reading>
Read pulse.md before any operation to load project context.
Read config.json for planning behavior settings.

@~/.claude/ace/references/git-integration.md
</required_reading>

<process>

<step name="resolve_horsepower" priority="first">
Read horsepower profile for agent spawning:

```bash
HORSEPOWER=$(cat .ace/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | max | balanced | eco |
|-------|---------|----------|--------|
| ace-runner | opus | sonnet | sonnet |

Store resolved model for use in Task calls below.
</step>

<step name="load_project_state">
Before any operation, read project state:

```bash
cat .ace/pulse.md 2>/dev/null
```

**If file exists:** Parse and internalize:

- Current position (stage, run, status)
- Accumulated decisions (constraints on this execution)
- Blockers/concerns (things to watch for)
- Brief alignment status

**If file missing but .ace/ exists:**

```
pulse.md missing but planning artifacts exist.
Options:
1. Reconstruct from existing artifacts
2. Continue without project state (may lose accumulated context)
```

**If .ace/ doesn't exist:** Error - project not initialized.

This ensures every execution has full project context.

**Load planning config:**

```bash
# Check if planning docs should be committed (default: true)
COMMIT_PLANNING_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
# Auto-detect gitignored (overrides config)
git check-ignore -q .ace 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

Store `COMMIT_PLANNING_DOCS` for use in git operations.
</step>

<step name="identify_run">
Find the next run to execute:
- Check track for "In progress" stage
- Find runs in that stage directory
- Identify first run without corresponding RECAP

```bash
cat .ace/track.md
# Look for stage with "In progress" status
# Then find runs in that stage
ls .ace/stages/XX-name/*-run.md 2>/dev/null | sort
ls .ace/stages/XX-name/*-recap.md 2>/dev/null | sort
```

**Logic:**

- If `01.01-run.md` exists but `01.01-recap.md` doesn't → execute 01.01
- If `01.01-recap.md` exists but `01.02-recap.md` doesn't → execute 01.02
- Pattern: Find first RUN file without matching RECAP file

**Decimal stage handling:**

Stage directories can be integer or decimal format:

- Integer: `.ace/stages/01-foundation/01.01-run.md`
- Decimal: `.ace/stages/01.1-hotfix/01.1.01-run.md`

Parse stage number from path (handles both formats):

```bash
# Extract stage number (handles XX or XX.Y format)
STAGE=$(echo "$RUN_PATH" | grep -oE '[0-9]+(\.[0-9]+)?-[0-9]+')
```

RECAP naming follows same pattern:

- Integer: `01.01-recap.md`
- Decimal: `01.1.01-recap.md`

Confirm with user if ambiguous.

<config-check>
```bash
cat .ace/config.json 2>/dev/null
```
</config-check>

<if style="turbo">
```
⚡ Auto-approved: Execute {stage}.{run}-run.md
[Run X of Y for Stage Z]

Starting execution...
```

Proceed directly to parse_segments step.
</if>

<if style="guided" OR="custom with gates.execute_next_run true">
Present:

```
Found run to execute: {stage}.{run}-run.md
[Run X of Y for Stage Z]

Proceed with execution?
```

Wait for confirmation before proceeding.
</if>
</step>

<step name="record_start_time">
Record execution start time for performance tracking:

```bash
RUN_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RUN_START_EPOCH=$(date +%s)
```

Store in shell variables for duration calculation at completion.
</step>

<step name="parse_segments">
**Intelligent segmentation: Parse run into execution segments.**

Runs are divided into segments by gates. Each segment is routed to optimal execution context (subagent or main).

**1. Check for gates:**

```bash
# Find all gates and their types
grep -n "type=\"checkpoint" .ace/stages/XX-name/{stage}.{run}-run.md
```

**2. Analyze execution strategy:**

**If NO gates found:**

- **Fully autonomous run** - spawn single subagent for entire run
- Subagent gets fresh 200k context, executes all tasks, creates RECAP, commits
- Main context: Just orchestration (~5% usage)

**If gates found, parse into segments:**

Segment = tasks between gates (or start→first gate, or last gate→end)

**For each segment, determine routing:**

```
Segment routing rules:

IF segment has no prior gate:
  → SUBAGENT (first segment, nothing to depend on)

IF segment follows checkpoint:human-verify:
  → SUBAGENT (verification is just confirmation, doesn't affect next work)

IF segment follows checkpoint:decision OR checkpoint:human-action:
  → MAIN CONTEXT (next tasks need the decision/result)
```

**3. Execution pattern:**

**Pattern A: Fully autonomous (no gates)**

```
Spawn subagent → execute all tasks → RECAP → commit → report back
```

**Pattern B: Segmented with verify-only gates**

```
Segment 1 (tasks 1-3): Spawn subagent → execute → report back
Gate 4 (human-verify): Main context → you verify → continue
Segment 2 (tasks 5-6): Spawn NEW subagent → execute → report back
Gate 7 (human-verify): Main context → you verify → continue
Aggregate results → RECAP → commit
```

**Pattern C: Decision-dependent (must stay in main)**

```
Gate 1 (decision): Main context → you decide → continue in main
Tasks 2-5: Main context (need decision from gate 1)
No segmentation benefit - execute entirely in main
```

**4. Why segment:** Fresh context per subagent preserves peak quality. Main context stays lean (~15% usage).

**5. Implementation:**

**For fully autonomous runs:**

```
1. Run init_agent_tracking step first (see step below)

2. Use Task tool with subagent_type="ace-runner" and model="{runner_model}":

   Prompt: "Execute run at .ace/stages/{stage}.{run}-run.md

   This is an autonomous run (no gates). Execute all tasks, create recap.md in stage directory, commit with message following run's commit guidance.

   Follow all drift rules and authentication gate protocols from the run.

   When complete, report: run name, tasks completed, RECAP path, commit hash."

3. After Task tool returns with agent_id:

   a. Write agent_id to current-agent-id.txt:
      echo "[agent_id]" > .ace/current-agent-id.txt

   b. Append spawn entry to agent-history.json:
      {
        "agent_id": "[agent_id from Task response]",
        "task_description": "Execute full run {stage}.{run} (autonomous)",
        "stage": "{stage}",
        "run": "{run}",
        "segment": null,
        "timestamp": "[ISO timestamp]",
        "status": "spawned",
        "completion_timestamp": null
      }

4. Wait for subagent to complete

5. After subagent completes successfully:

   a. Update agent-history.json entry:
      - Find entry with matching agent_id
      - Set status: "completed"
      - Set completion_timestamp: "[ISO timestamp]"

   b. Clear current-agent-id.txt:
      rm .ace/current-agent-id.txt

6. Report completion to user
```

**For segmented runs (has verify-only gates):**

```
Execute segment-by-segment:

For each autonomous segment:
  Spawn subagent with prompt: "Execute tasks [X-Y] from run at .ace/stages/{stage}.{run}-run.md. Read the run for full context and drift rules. Do NOT create RECAP or commit - just execute these tasks and report results."

  Wait for subagent completion

For each gate:
  Execute in main context
  Wait for user interaction
  Continue to next segment

After all segments complete:
  Aggregate all results
  Create recap.md
  Commit with all changes
```

**For decision-dependent runs:**

```
Execute in main context (standard flow below)
No subagent routing
Quality maintained through small scope (2-3 tasks per run)
```

See step name="segment_execution" for detailed segment execution loop.
</step>

<step name="init_agent_tracking">
**Initialize agent tracking for subagent resume capability.**

Before spawning any subagents, set up tracking infrastructure:

**1. Create/verify tracking files:**

```bash
# Create agent history file if doesn't exist
if [ ! -f .ace/agent-history.json ]; then
  echo '{"version":"1.0","max_entries":50,"entries":[]}' > .ace/agent-history.json
fi

# Clear any stale current-agent-id (from interrupted sessions)
# Will be populated when subagent spawns
rm -f .ace/current-agent-id.txt
```

**2. Check for interrupted agents (resume detection):**

```bash
# Check if current-agent-id.txt exists from previous interrupted session
if [ -f .ace/current-agent-id.txt ]; then
  INTERRUPTED_ID=$(cat .ace/current-agent-id.txt)
  echo "Found interrupted agent: $INTERRUPTED_ID"
fi
```

**If interrupted agent found:**
- The agent ID file exists from a previous session that didn't complete
- This agent can potentially be resumed using Task tool's `resume` parameter
- Present to user: "Previous session was interrupted. Resume agent [ID] or start fresh?"
- If resume: Use Task tool with `resume` parameter set to the interrupted ID
- If fresh: Clear the file and proceed normally

**3. Prune old entries (housekeeping):**

If agent-history.json has more than `max_entries`:
- Remove oldest entries with status "completed"
- Never remove entries with status "spawned" (may need resume)
- Keep file under size limit for fast reads

**When to run this step:**
- Pattern A (fully autonomous): Before spawning the single subagent
- Pattern B (segmented): Before the segment execution loop
- Pattern C (main context): Skip - no subagents spawned
</step>

<step name="segment_execution">
**Detailed segment execution loop for segmented runs.**

**This step applies ONLY to segmented runs (Pattern B: has gates, but they're verify-only).**

For Pattern A (fully autonomous) and Pattern C (decision-dependent), skip this step.

**Execution flow:**

````
1. Parse run to identify segments:
   - Read run file
   - Find gate locations: grep -n "type=\"checkpoint" run.md
   - Identify gate types: grep "type=\"checkpoint" run.md | grep -o 'gate:[^"]*'
   - Build segment map:
     * Segment 1: Start → first gate (tasks 1-X)
     * Gate 1: Type and location
     * Segment 2: After gate 1 → next gate (tasks X+1 to Y)
     * Gate 2: Type and location
     * ... continue for all segments

2. For each segment in order:

   A. Determine routing (apply rules from parse_segments):
      - No prior gate? → Subagent
      - Prior gate was human-verify? → Subagent
      - Prior gate was decision/human-action? → Main context

   B. If routing = Subagent:
      ```
      Spawn Task tool with subagent_type="ace-runner" and model="{runner_model}":

      Prompt: "Execute tasks [task numbers/names] from run at [run path].

      **Context:**
      - Read the full run for objective, context files, and drift rules
      - You are executing a SEGMENT of this run (not the full run)
      - Other segments will be executed separately

      **Your responsibilities:**
      - Execute only the tasks assigned to you
      - Follow all drift rules and authentication gate protocols
      - Track drifts for later Recap
      - DO NOT create recap.md (will be created after all segments complete)
      - DO NOT commit (will be done after all segments complete)

      **Report back:**
      - Tasks completed
      - Files created/modified
      - Drifts encountered
      - Any issues or blockers"

      **After Task tool returns with agent_id:**

      1. Write agent_id to current-agent-id.txt:
         echo "[agent_id]" > .ace/current-agent-id.txt

      2. Append spawn entry to agent-history.json:
         {
           "agent_id": "[agent_id from Task response]",
           "task_description": "Execute tasks [X-Y] from run {stage}.{run}",
           "stage": "{stage}",
           "run": "{run}",
           "segment": [segment_number],
           "timestamp": "[ISO timestamp]",
           "status": "spawned",
           "completion_timestamp": null
         }

      Wait for subagent to complete
      Capture results (files changed, drifts, etc.)

      **After subagent completes successfully:**

      1. Update agent-history.json entry:
         - Find entry with matching agent_id
         - Set status: "completed"
         - Set completion_timestamp: "[ISO timestamp]"

      2. Clear current-agent-id.txt:
         rm .ace/current-agent-id.txt

      ```

   C. If routing = Main context:
      Execute tasks in main using standard execution flow (step name="execute")
      Track results locally

   D. After segment completes (whether subagent or main):
      Continue to next gate/segment

3. After ALL segments complete:

   A. Aggregate results from all segments:
      - Collect files created/modified from all segments
      - Collect drifts from all segments
      - Collect decisions from all gates
      - Merge into complete picture

   B. Create recap.md:
      - Use aggregated results
      - Document all work from all segments
      - Include drifts from all segments
      - Note which segments were subagented

   C. Commit:
      - Stage all files from all segments
      - Stage recap.md
      - Commit with message following run guidance
      - Include note about segmented execution if relevant

   D. Report completion

**Example execution trace:**

````

Run: 01.02-run.md (8 tasks, 2 verify gates)

Parsing segments...

- Segment 1: Tasks 1-3 (autonomous)
- Gate 4: human-verify
- Segment 2: Tasks 5-6 (autonomous)
- Gate 7: human-verify
- Segment 3: Task 8 (autonomous)

Routing analysis:

- Segment 1: No prior gate → SUBAGENT ✓
- Gate 4: Verify only → MAIN (required)
- Segment 2: After verify → SUBAGENT ✓
- Gate 7: Verify only → MAIN (required)
- Segment 3: After verify → SUBAGENT ✓

Execution:
[1] Spawning subagent for tasks 1-3...
→ Subagent completes: 3 files modified, 0 drifts
[2] Executing gate 4 (human-verify)...
╔═══════════════════════════════════════════════════════╗
║  GATE: Verification Required                          ║
╚═══════════════════════════════════════════════════════╝

Progress: 3/8 tasks complete
Task: Verify database schema

Built: User and Session tables with relations

How to verify:
  1. Check src/db/schema.ts for correct types

────────────────────────────────────────────────────────
→ YOUR ACTION: Type "approved" or describe issues
────────────────────────────────────────────────────────
User: "approved"
[3] Spawning subagent for tasks 5-6...
→ Subagent completes: 2 files modified, 1 drift (added error handling)
[4] Executing gate 7 (human-verify)...
User: "approved"
[5] Spawning subagent for task 8...
→ Subagent completes: 1 file modified, 0 drifts

Aggregating results...

- Total files: 6 modified
- Total drifts: 1
- Segmented execution: 3 subagents, 2 gates

Creating recap.md...
Committing...
✓ Complete

````

**Benefit:** Each subagent starts fresh (~20-30% context), enabling larger runs without quality degradation.
</step>

<step name="load_prompt">
Read the run prompt:
```bash
cat .ace/stages/XX-name/{stage}.{run}-run.md
````

This IS the execution instructions. Follow it exactly.

**If run references intel.md:**
The intel.md file provides the user's vision for this stage — how they imagine it working, what's essential, and what's out of scope. Honor this context throughout execution.
</step>

<step name="previous_stage_check">
Before executing, check if previous stage had issues:

```bash
# Find previous stage recap
ls .ace/stages/*/recap.md 2>/dev/null | sort -r | head -2 | tail -1
```

If previous stage recap.md has "Issues Encountered" != "None" or "Next Stage Readiness" mentions blockers:

Use AskUserQuestion:

- header: "Previous Issues"
- question: "Previous stage had unresolved items: [summary]. How to proceed?"
- options:
  - "Proceed anyway" - Issues won't block this stage
  - "Address first" - Let's resolve before continuing
  - "Review previous" - Show me the full recap
    </step>

<step name="execute">
Execute each task in the prompt. **Drifts are normal** - handle them automatically using embedded rules below.

1. Read the @context files listed in the prompt

2. For each task:

   **If `type="auto"`:**

   **Before executing:** Check if task has `tdd="true"` attribute:
   - If yes: Follow TDD execution flow (see `<tdd_execution>`) - RED → GREEN → REFACTOR cycle with atomic commits per stage
   - If no: Standard implementation

   - Work toward task completion
   - **If CLI/API returns authentication error:** Handle as authentication gate (see below)
   - **When you discover additional work not in run:** Apply drift rules (see below) automatically
   - Continue implementing, applying rules as needed
   - Run the verification
   - Confirm done criteria met
   - **Commit the task** (see `<task_commit>` below)
   - Track task completion and commit hash for Recap documentation
   - Continue to next task

   **If `type="checkpoint:*"`:**

   - STOP immediately (do not continue to next task)
   - Execute gate_protocol (see below)
   - Wait for user response
   - Verify if possible (check files, env vars, etc.)
   - Only after user confirmation: continue to next task

3. Run overall verification checks from `<verification>` section
4. Confirm all success criteria from `<success_criteria>` section met
5. Document all drifts in Recap (automatic - see drift_documentation below)
   </step>

<authentication_gates>

## Handling Authentication Errors During Execution

**When you encounter authentication errors during `type="auto"` task execution:**

This is NOT a failure. Authentication gates are expected and normal. Handle them dynamically:

**Authentication error indicators:**

- CLI returns: "Error: Not authenticated", "Not logged in", "Unauthorized", "401", "403"
- API returns: "Authentication required", "Invalid API key", "Missing credentials"
- Command fails with: "Please run {tool} login" or "Set {ENV_VAR} environment variable"

**Authentication gate protocol:**

1. **Recognize it's an auth gate** - Not a bug, just needs credentials
2. **STOP current task execution** - Don't retry repeatedly
3. **Create dynamic checkpoint:human-action** - Present it to user immediately
4. **Provide exact authentication steps** - CLI commands, where to get keys
5. **Wait for user to authenticate** - Let them complete auth flow
6. **Verify authentication works** - Test that credentials are valid
7. **Retry the original task** - Resume automation where you left off
8. **Continue normally** - Don't treat this as an error in Recap

**Example: Vercel deployment hits auth error**

```
Task 3: Deploy to Vercel
Running: vercel --yes

Error: Not authenticated. Please run 'vercel login'

[Create gate dynamically]

╔═══════════════════════════════════════════════════════╗
║  GATE: Action Required                                ║
╚═══════════════════════════════════════════════════════╝

Progress: 2/8 tasks complete
Task: Authenticate Vercel CLI

Attempted: vercel --yes
Error: Not authenticated

What you need to do:
  1. Run: vercel login
  2. Complete browser authentication

I'll verify: vercel whoami returns your account

────────────────────────────────────────────────────────
→ YOUR ACTION: Type "done" when authenticated
────────────────────────────────────────────────────────

[Wait for user response]

[User types "done"]

Verifying authentication...
Running: vercel whoami
✓ Authenticated as: user@example.com

Retrying deployment...
Running: vercel --yes
✓ Deployed to: https://myapp-abc123.vercel.app

Task 3 complete. Continuing to task 4...
```

**In Recap documentation:**

Document authentication gates as normal flow, not drifts:

```markdown
## Authentication Gates

During execution, I encountered authentication requirements:

1. Task 3: Vercel CLI required authentication
   - Paused for `vercel login`
   - Resumed after authentication
   - Deployed successfully

These are normal gates, not errors.
```

**Key principles:**

- Authentication gates are NOT failures or bugs
- They're expected interaction points during first-time setup
- Handle them gracefully and continue automation after unblocked
- Don't mark tasks as "failed" or "incomplete" due to auth gates
- Document them as normal flow, separate from drifts
  </authentication_gates>

<drift_rules>

## Automatic Drift Handling

**While executing tasks, you WILL discover work not in the run.** This is normal.

Apply these rules automatically. Track all drifts for Recap documentation.

---

**RULE 1: Auto-fix bugs**

**Trigger:** Code doesn't work as intended (broken behavior, incorrect output, errors)

**Action:** Fix immediately, track for Recap

**Examples:**

- Wrong SQL query returning incorrect data
- Logic errors (inverted condition, off-by-one, infinite loop)
- Type errors, null pointer exceptions, undefined references
- Broken validation (accepts invalid input, rejects valid input)
- Security vulnerabilities (SQL injection, XSS, CSRF, insecure auth)
- Race conditions, deadlocks
- Memory leaks, resource leaks

**Process:**

1. Fix the bug inline
2. Add/update tests to prevent regression
3. Verify fix works
4. Continue task
5. Track in drifts list: `[Rule 1 - Bug] [description]`

**No user permission needed.** Bugs must be fixed for correct operation.

---

**RULE 2: Auto-add missing critical functionality**

**Trigger:** Code is missing essential features for correctness, security, or basic operation

**Action:** Add immediately, track for Recap

**Examples:**

- Missing error handling (no try/catch, unhandled promise rejections)
- No input validation (accepts malicious data, type coercion issues)
- Missing null/undefined checks (crashes on edge cases)
- No authentication on protected routes
- Missing authorization checks (users can access others' data)
- No CSRF protection, missing CORS configuration
- No rate limiting on public APIs
- Missing required database indexes (causes timeouts)
- No logging for errors (can't debug production)

**Process:**

1. Add the missing functionality inline
2. Add tests for the new functionality
3. Verify it works
4. Continue task
5. Track in drifts list: `[Rule 2 - Missing Critical] [description]`

**Critical = required for correct/secure/performant operation**
**No user permission needed.** These are not "features" - they're requirements for basic correctness.

---

**RULE 3: Auto-fix blocking issues**

**Trigger:** Something prevents you from completing current task

**Action:** Fix immediately to unblock, track for Recap

**Examples:**

- Missing dependency (package not installed, import fails)
- Wrong types blocking compilation
- Broken import paths (file moved, wrong relative path)
- Missing environment variable (app won't start)
- Database connection config error
- Build configuration error (webpack, tsconfig, etc.)
- Missing file referenced in code
- Circular dependency blocking module resolution

**Process:**

1. Fix the blocking issue
2. Verify task can now proceed
3. Continue task
4. Track in drifts list: `[Rule 3 - Blocking] [description]`

**No user permission needed.** Can't complete task without fixing blocker.

---

**RULE 4: Ask about architectural changes**

**Trigger:** Fix/addition requires significant structural modification

**Action:** STOP, present to user, wait for decision

**Examples:**

- Adding new database table (not just column)
- Major schema changes (changing primary key, splitting tables)
- Introducing new service layer or architectural pattern
- Switching libraries/frameworks (React → Vue, REST → GraphQL)
- Changing authentication approach (sessions → JWT)
- Adding new infrastructure (message queue, cache layer, CDN)
- Changing API contracts (breaking changes to endpoints)
- Adding new deployment environment

**Process:**

1. STOP current task
2. Present clearly:

```
⚠️ Architectural Decision Needed

Current task: [task name]
Discovery: [what you found that prompted this]
Proposed change: [architectural modification]
Why needed: [rationale]
Impact: [what this affects - APIs, deployment, dependencies, etc.]
Alternatives: [other approaches, or "none apparent"]

Proceed with proposed change? (yes / different approach / defer)
```

3. WAIT for user response
4. If approved: implement, track as `[Rule 4 - Architectural] [description]`
5. If different approach: discuss and implement
6. If deferred: note in Recap and continue without change

**User decision required.** These changes affect system design.

---

**RULE PRIORITY (when multiple could apply):**

1. **If Rule 4 applies** → STOP and ask (architectural decision)
2. **If Rules 1-3 apply** → Fix automatically, track for Recap
3. **If genuinely unsure which rule** → Apply Rule 4 (ask user)

**Edge case guidance:**

- "This validation is missing" → Rule 2 (critical for security)
- "This crashes on null" → Rule 1 (bug)
- "Need to add table" → Rule 4 (architectural)
- "Need to add column" → Rule 1 or 2 (depends: fixing bug or adding critical field)

**When in doubt:** Ask yourself "Does this affect correctness, security, or ability to complete task?"

- YES → Rules 1-3 (fix automatically)
- MAYBE → Rule 4 (ask user)

</drift_rules>

<drift_documentation>

## Documenting Drifts in Recap

After all tasks complete, Recap MUST include drifts section.

**If no drifts:**

```markdown
## Drifts from Run

None - run executed exactly as written.
```

**If drifts occurred:**

```markdown
## Drifts from Run

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed case-sensitive email uniqueness constraint**

- **Found during:** Task 4 (Follow/unfollow API implementation)
- **Issue:** User.email unique constraint was case-sensitive - Test@example.com and test@example.com were both allowed, causing duplicate accounts
- **Fix:** Changed to `CREATE UNIQUE INDEX users_email_unique ON users (LOWER(email))`
- **Files modified:** src/models/User.ts, migrations/003_fix_email_unique.sql
- **Verification:** Unique constraint test passes - duplicate emails properly rejected
- **Commit:** abc123f

**2. [Rule 2 - Missing Critical] Added JWT expiry validation to auth middleware**

- **Found during:** Task 3 (Protected route implementation)
- **Issue:** Auth middleware wasn't checking token expiry - expired tokens were being accepted
- **Fix:** Added exp claim validation in middleware, reject with 401 if expired
- **Files modified:** src/middleware/auth.ts, src/middleware/auth.test.ts
- **Verification:** Expired token test passes - properly rejects with 401
- **Commit:** def456g

---

**Total drifts:** 4 auto-fixed (1 bug, 1 missing critical, 1 blocking, 1 architectural with approval)
**Impact on run:** All auto-fixes necessary for correctness/security/performance. No scope creep.
```

**This provides complete transparency:**

- Every drift documented
- Why it was needed
- What rule applied
- What was done
- User can see exactly what happened beyond the run

</drift_documentation>

<tdd_run_execution>
## TDD Run Execution

When executing a run with `type: tdd` in frontmatter, follow the RED-GREEN-REFACTOR cycle for the single feature defined in the run.

**1. Check test infrastructure (if first TDD run):**
If no test framework configured:
- Detect project type from package.json/requirements.txt/etc.
- Install minimal test framework (Jest, pytest, Go testing, etc.)
- Create test config file
- Verify: run empty test suite
- This is part of the RED stage, not a separate task

**2. RED - Write failing test:**
- Read `<behavior>` element for test specification
- Create test file if doesn't exist (follow project conventions)
- Write test(s) that describe expected behavior
- Run tests - MUST fail (if passes, test is wrong or feature exists)
- Commit: `test({stage}.{run}): add failing test for [feature]`

**3. GREEN - Implement to pass:**
- Read `<implementation>` element for guidance
- Write minimal code to make test pass
- Run tests - MUST pass
- Commit: `feat({stage}.{run}): implement [feature]`

**4. REFACTOR (if needed):**
- Clean up code if obvious improvements
- Run tests - MUST still pass
- Commit only if changes made: `refactor({stage}.{run}): clean up [feature]`

**Commit pattern for TDD runs:**
Each TDD run produces 2-3 atomic commits:
1. `test({stage}.{run}): add failing test for X`
2. `feat({stage}.{run}): implement X`
3. `refactor({stage}.{run}): clean up X` (optional)

**Error handling:**
- If test doesn't fail in RED stage: Test is wrong or feature already exists. Investigate before proceeding.
- If test doesn't pass in GREEN stage: Debug implementation, keep iterating until green.
- If tests fail in REFACTOR stage: Undo refactor, commit was premature.

**Verification:**
After TDD run completion, ensure:
- All tests pass
- Test coverage for the new behavior exists
- No unrelated tests broken

**Why TDD uses dedicated runs:** TDD requires 2-3 execution cycles (RED → GREEN → REFACTOR), each with file reads, test runs, and potential debugging. This consumes 40-50% of context for a single feature. Dedicated runs ensure full quality throughout the cycle.

**Comparison:**
- Standard runs: Multiple tasks, 1 commit per task, 2-4 commits total
- TDD runs: Single feature, 2-3 commits for RED/GREEN/REFACTOR cycle

See `~/.claude/ace/references/tdd.md` for TDD run structure.
</tdd_run_execution>

<task_commit>
## Task Commit Protocol

After each task completes (verification passed, done criteria met), commit immediately:

**1. Identify modified files:**

Track files changed during this specific task (not the entire run):

```bash
git status --short
```

**2. Stage only task-related files:**

Stage each file individually (NEVER use `git add .` or `git add -A`):

```bash
# Example - adjust to actual files modified by this task
git add src/api/auth.ts
git add src/types/user.ts
```

**3. Determine commit type:**

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature, endpoint, component, functionality | feat(08.02): create user registration endpoint |
| `fix` | Bug fix, error correction | fix(08.02): correct email validation regex |
| `test` | Test-only changes (TDD RED stage) | test(08.02): add failing test for password hashing |
| `refactor` | Code cleanup, no behavior change (TDD REFACTOR stage) | refactor(08.02): extract validation to helper |
| `perf` | Performance improvement | perf(08.02): add database index for user lookups |
| `docs` | Documentation changes | docs(08.02): add API endpoint documentation |
| `style` | Formatting, linting fixes | style(08.02): format auth module |
| `chore` | Config, tooling, dependencies | chore(08.02): add bcrypt dependency |

**4. Craft commit message:**

Format: `{type}({stage}.{run}): {task-name-or-description}`

```bash
git commit -m "{type}({stage}.{run}): {concise task description}

- {key change 1}
- {key change 2}
- {key change 3}
"
```

**Examples:**

```bash
# Standard run task
git commit -m "feat(08.02): create user registration endpoint

- POST /auth/register validates email and password
- Checks for duplicate users
- Returns JWT token on success
"

# Another standard task
git commit -m "fix(08.02): correct email validation regex

- Fixed regex to accept plus-addressing
- Added tests for edge cases
"
```

**Note:** TDD runs have their own commit pattern (test/feat/refactor for RED/GREEN/REFACTOR stages). See `<tdd_run_execution>` section above.

**5. Record commit hash:**

After committing, capture hash for recap.md:

```bash
TASK_COMMIT=$(git rev-parse --short HEAD)
echo "Task ${TASK_NUM} committed: ${TASK_COMMIT}"
```

Store in array or list for RECAP generation:
```bash
TASK_COMMITS+=("Task ${TASK_NUM}: ${TASK_COMMIT}")
```

</task_commit>

<step name="gate_protocol">
When encountering `type="checkpoint:*"`:

**Critical: Claude automates everything with CLI/API before gates.** Gates are for verification and decisions, not manual work.

**Display gate clearly:**

```
╔═══════════════════════════════════════════════════════╗
║  GATE: [Type]                                         ║
╚═══════════════════════════════════════════════════════╝

Progress: {X}/{Y} tasks complete
Task: [task name]

[Display task-specific content based on type]

────────────────────────────────────────────────────────
→ YOUR ACTION: [Resume signal instruction]
────────────────────────────────────────────────────────
```

**For checkpoint:human-verify (90% of gates):**

```
Built: [what was automated - deployed, built, configured]

How to verify:
  1. [Step 1 - exact command/URL]
  2. [Step 2 - what to check]
  3. [Step 3 - expected behavior]

────────────────────────────────────────────────────────
→ YOUR ACTION: Type "approved" or describe issues
────────────────────────────────────────────────────────
```

**For checkpoint:decision (9% of gates):**

```
Decision needed: [decision]

Context: [why this matters]

Options:
1. [option-id]: [name]
   Pros: [pros]
   Cons: [cons]

2. [option-id]: [name]
   Pros: [pros]
   Cons: [cons]

[Resume signal - e.g., "Select: option-id"]
```

**For checkpoint:human-action (1% - rare, only for truly unavoidable manual steps):**

```
I automated: [what Claude already did via CLI/API]

Need your help with: [the ONE thing with no CLI/API - email link, 2FA code]

Instructions:
[Single unavoidable step]

I'll verify after: [verification]

[Resume signal - e.g., "Type 'done' when complete"]
```

**After displaying:** WAIT for user response. Do NOT hallucinate completion. Do NOT continue to next task.

**After user responds:**

- Run verification if specified (file exists, env var set, tests pass, etc.)
- If verification passes or N/A: continue to next task
- If verification fails: inform user, wait for resolution

See ~/.claude/ace/references/gates.md for complete gate guidance.
</step>

<step name="gate_return_for_orchestrator">
**When spawned by an orchestrator (run-stage or run-plan command):**

If you were spawned via Task tool and hit a gate, you cannot directly interact with the user. Instead, RETURN to the orchestrator with structured gate state so it can present to the user and spawn a fresh continuation agent.

**Return format for gates:**

**Required in your return:**

1. **Completed Tasks table** - Tasks done so far with commit hashes and files created
2. **Current Task** - Which task you're on and what's blocking it
3. **Gate Details** - User-facing content (verification steps, decision options, or action instructions)
4. **Awaiting** - What you need from the user

**Example return:**

```
## GATE REACHED ⏸

**Type:** human-action
**Run:** 01.01
**Progress:** 1/3 tasks complete

### Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Initialize Next.js 15 project | d6fe73f | package.json, tsconfig.json, app/ |

### Current Task

**Task 2:** Initialize Convex backend
**Status:** blocked
**Blocked by:** Convex CLI authentication required

### Gate Details

**Automation attempted:**
Ran `npx convex dev` to initialize Convex backend

**Error encountered:**
"Error: Not authenticated. Run `npx convex login` first."

**What you need to do:**
1. Run: `npx convex login`
2. Complete browser authentication
3. Run: `npx convex dev`
4. Create project when prompted

**I'll verify after:**
`cat .env.local | grep CONVEX` returns the Convex URL

### Awaiting

Type "done" when Convex is authenticated and project created.
```

**After you return:**

The orchestrator will:
1. Parse your structured return
2. Present gate details to the user
3. Collect user's response
4. Spawn a FRESH continuation agent with your completed tasks state

You will NOT be resumed. A new agent continues from where you stopped, using your Completed Tasks table to know what's done.

**How to know if you were spawned:**

If you're reading this workflow because an orchestrator spawned you (vs running directly), the orchestrator's prompt will include gate return instructions. Follow those instructions when you hit a gate.

**If running in main context (not spawned):**

Use the standard gate_protocol - display gate and wait for direct user response.
</step>

<step name="verification_failure_gate">
If any task verification fails:

STOP. Do not continue to next task.

Present inline:
"Verification failed for Task [X]: [task name]

Expected: [verification criteria]
Actual: [what happened]

How to proceed?

1. Retry - Try the task again
2. Skip - Mark as incomplete, continue
3. Stop - Pause execution, investigate"

Wait for user decision.

If user chose "Skip", note it in recap.md under "Issues Encountered".
</step>

<step name="record_completion_time">
Record execution end time and calculate duration:

```bash
RUN_END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RUN_END_EPOCH=$(date +%s)

DURATION_SEC=$(( RUN_END_EPOCH - RUN_START_EPOCH ))
DURATION_MIN=$(( DURATION_SEC / 60 ))

if [[ $DURATION_MIN -ge 60 ]]; then
  HRS=$(( DURATION_MIN / 60 ))
  MIN=$(( DURATION_MIN % 60 ))
  DURATION="${HRS}h ${MIN}m"
else
  DURATION="${DURATION_MIN} min"
fi
```

Pass timing data to recap.md creation.
</step>

<step name="generate_user_setup">
**Generate USER-SETUP.md if run has user_setup in frontmatter.**

Check run.md frontmatter for `user_setup` field:

```bash
grep -A 50 "^user_setup:" .ace/stages/XX-name/{stage}.{run}-run.md | head -50
```

**If user_setup exists and is not empty:**

Create `.ace/stages/XX-name/{stage}-USER-SETUP.md` using template from `~/.claude/ace/templates/user-setup.md`.

**Content generation:**

1. Parse each service in `user_setup` array
2. For each service, generate sections:
   - Environment Variables table (from `env_vars`)
   - Account Setup checklist (from `account_setup`, if present)
   - Dashboard Configuration steps (from `dashboard_config`, if present)
   - Local Development notes (from `local_dev`, if present)
3. Add verification section with commands to confirm setup works
4. Set status to "Incomplete"

**Example output:**

```markdown
# Stage 10: User Setup Required

**Generated:** 2025-01-14
**Stage:** 10-monetization
**Status:** Incomplete

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key | `.env.local` |
| [ ] | `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret | `.env.local` |

## Dashboard Configuration

- [ ] **Create webhook endpoint**
  - Location: Stripe Dashboard → Developers → Webhooks → Add endpoint
  - Details: URL: https://[your-domain]/api/webhooks/stripe, Events: checkout.session.completed

## Local Development

For local testing:
\`\`\`bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
\`\`\`

## Verification

[Verification commands based on service]

---
**Once all items complete:** Mark status as "Complete"
```

**If user_setup is empty or missing:**

Skip this step - no USER-SETUP.md needed.

**Track for offer_next:**

Set `USER_SETUP_CREATED=true` if file was generated, for use in completion messaging.
</step>

<step name="create_recap">
Create `{stage}.{run}-recap.md` as specified in the prompt's `<output>` section.
Use ~/.claude/ace/templates/recap.md for structure.

**File location:** `.ace/stages/XX-name/{stage}.{run}-recap.md`

**Frontmatter population:**

Before writing recap content, populate frontmatter fields from execution context:

1. **Basic identification:**
   - stage: From run.md frontmatter
   - run: From run.md frontmatter
   - subsystem: Categorize based on stage focus (auth, payments, ui, api, database, infra, testing, etc.)
   - tags: Extract tech keywords (libraries, frameworks, tools used)

2. **Dependency graph:**
   - requires: List prior stages this built upon (check run.md context section for referenced prior recaps)
   - provides: Extract from accomplishments - what was delivered
   - affects: Infer from stage description/goal what future stages might need this

3. **Tech tracking:**
   - tech-stack.added: New libraries from package.json changes or requirements
   - tech-stack.patterns: Architectural patterns established (from decisions/accomplishments)

4. **File tracking:**
   - key-files.created: From "Files Created/Modified" section
   - key-files.modified: From "Files Created/Modified" section

5. **Decisions:**
   - key-decisions: Extract from "Decisions Made" section

6. **Metrics:**
   - duration: From $DURATION variable
   - completed: From $RUN_END_TIME (date only, format YYYY-MM-DD)

Note: If subsystem/affects are unclear, use best judgment based on stage name and accomplishments. Can be refined later.

**Title format:** `# Stage [X] Run [Y]: [Name] Recap`

The one-liner must be SUBSTANTIVE:

- Good: "JWT auth with refresh rotation using jose library"
- Bad: "Authentication implemented"

**Include performance data:**

- Duration: `$DURATION`
- Started: `$RUN_START_TIME`
- Completed: `$RUN_END_TIME`
- Tasks completed: (count from execution)
- Files modified: (count from execution)

**Next Step section:**

- If more runs exist in this stage: "Ready for {stage}.{next-run}-run.md"
- If this is the last run: "Stage complete, ready for transition"
  </step>

<step name="update_current_position">
Update Current Position section in pulse.md to reflect run completion.

**Format:**

```markdown
Stage: [current] of [total] ([stage name])
Run: [just completed] of [total in stage]
Status: [In progress / Stage complete]
Last activity: [today] - Completed {stage}.{run}-run.md

Progress: [progress bar]
```

**Calculate progress bar:**

- Count total runs across all stages (from track.md)
- Count completed runs (count recap.md files that exist)
- Progress = (completed / total) × 100%
- Render: ░ for incomplete, █ for complete

**Example - completing 02.01-run.md (run 5 of 10 total):**

Before:

```markdown
## Current Position

Stage: 2 of 4 (Authentication)
Run: Not started
Status: Ready to execute
Last activity: 2025-01-18 - Stage 1 complete

Progress: ██████░░░░ 40%
```

After:

```markdown
## Current Position

Stage: 2 of 4 (Authentication)
Run: 1 of 2 in current stage
Status: In progress
Last activity: 2025-01-19 - Completed 02.01-run.md

Progress: ███████░░░ 50%
```

**Step complete when:**

- [ ] Stage number shows current stage (X of total)
- [ ] Run number shows runs complete in current stage (N of total-in-stage)
- [ ] Status reflects current state (In progress / Stage complete)
- [ ] Last activity shows today's date and the run just completed
- [ ] Progress bar calculated correctly from total completed runs
      </step>

<step name="extract_decisions_and_issues">
Extract decisions, issues, and concerns from recap.md into pulse.md accumulated context.

**Decisions Made:**

- Read recap.md "## Decisions Made" section
- If content exists (not "None"):
  - Add each decision to pulse.md Decisions table
  - Format: `| [stage number] | [decision summary] | [rationale] |`

**Blockers/Concerns:**

- Read recap.md "## Next Stage Readiness" section
- If contains blockers or concerns:
  - Add to pulse.md "Blockers/Concerns Carried Forward"
    </step>

<step name="update_session_continuity">
Update Session Continuity section in pulse.md to enable resumption in future sessions.

**Format:**

```markdown
Last session: [current date and time]
Stopped at: Completed {stage}.{run}-run.md
Resume file: [path to .continue-here if exists, else "None"]
```

**Size constraint note:** Keep pulse.md under 150 lines total.
</step>

<step name="issues_review_gate">
Before proceeding, check recap.md content.

If "Issues Encountered" is NOT "None":

<if style="turbo">
```
⚡ Auto-approved: Issues acknowledgment
⚠️ Note: Issues were encountered during execution:
- [Issue 1]
- [Issue 2]
(Logged - continuing in turbo mode)
```

Continue without waiting.
</if>

<if style="guided" OR="custom with gates.issues_review true">
Present issues and wait for acknowledgment before proceeding.
</if>
</step>

<step name="update_track">
Update the track file:

```bash
TRACK_FILE=".ace/track.md"
```

**If more runs remain in this stage:**

- Update run count: "2/3 runs complete"
- Keep stage status as "In progress"

**If this was the last run in the stage:**

- Mark stage complete: status → "Complete"
- Add completion date
</step>

<step name="git_commit_metadata">
Commit execution metadata (RECAP + PULSE + TRACK):

**Note:** All task code has already been committed during execution (one commit per task).
run.md was already committed during plan-stage. This final commit captures execution results only.

**Check planning config:**

If `COMMIT_PLANNING_DOCS=false` (set in load_project_state):
- Skip all git operations for .ace/ files
- Planning docs exist locally but are gitignored
- Log: "Skipping planning docs commit (commit_docs: false)"
- Proceed to next step

If `COMMIT_PLANNING_DOCS=true` (default):
- Continue with git operations below

**1. Stage execution artifacts:**

```bash
git add .ace/stages/XX-name/{stage}.{run}-recap.md
git add .ace/pulse.md
```

**2. Stage track:**

```bash
git add .ace/track.md
```

**3. Verify staging:**

```bash
git status
# Should show only execution artifacts (RECAP, PULSE, TRACK), no code files
```

**4. Commit metadata:**

```bash
git commit -m "$(cat <<'EOF'
docs({stage}.{run}): complete [run-name] run

Tasks completed: [N]/[N]
- [Task 1 name]
- [Task 2 name]
- [Task 3 name]

RECAP: .ace/stages/XX-name/{stage}.{run}-recap.md
EOF
)"
```

**Example:**

```bash
git commit -m "$(cat <<'EOF'
docs(08.02): complete user registration run

Tasks completed: 3/3
- User registration endpoint
- Password hashing with bcrypt
- Email confirmation flow

RECAP: .ace/stages/08-user-auth/08.02-registration-recap.md
EOF
)"
```

**Git log after run execution:**

```
abc123f docs(08.02): complete user registration run
def456g feat(08.02): add email confirmation flow
hij789k feat(08.02): implement password hashing with bcrypt
lmn012o feat(08.02): create user registration endpoint
```

Each task has its own commit, followed by one metadata commit documenting run completion.

See `git-integration.md` (loaded via required_reading) for commit message conventions.
</step>

<step name="update_codebase_map">
**If .ace/codebase/ exists:**

Check what changed across all task commits in this run:

```bash
# Find first task commit (right after previous run's docs commit)
FIRST_TASK=$(git log --oneline --grep="feat({stage}.{run}):" --grep="fix({stage}.{run}):" --grep="test({stage}.{run}):" --reverse | head -1 | cut -d' ' -f1)

# Get all changes from first task through now
git diff --name-only ${FIRST_TASK}^..HEAD 2>/dev/null
```

**Update only if structural changes occurred:**

| Change Detected | Update Action |
|-----------------|---------------|
| New directory in src/ | STRUCTURE.md: Add to directory layout |
| package.json deps changed | STACK.md: Add/remove from dependencies list |
| New file pattern (e.g., first .test.ts) | CONVENTIONS.md: Note new pattern |
| New external API client | INTEGRATIONS.md: Add service entry with file path |
| Config file added/changed | STACK.md: Update configuration section |
| File renamed/moved | Update paths in relevant docs |

**Skip update if only:**
- Code changes within existing files
- Bug fixes
- Content changes (no structural impact)

**Update format:**
Make single targeted edits - add a bullet point, update a path, or remove a stale entry. Don't rewrite sections.

```bash
git add .ace/codebase/*.md
git commit --amend --no-edit  # Include in metadata commit
```

**If .ace/codebase/ doesn't exist:**
Skip this step.
</step>

<step name="offer_next">
**MANDATORY: Verify remaining work before presenting next steps.**

Do NOT skip this verification. Do NOT assume stage or milestone completion without checking.

**Step 0: Check for USER-SETUP.md**

If `USER_SETUP_CREATED=true` (from generate_user_setup step), always include this warning block at the TOP of completion output:

```
⚠️ USER SETUP REQUIRED

This stage introduced external services requiring manual configuration:

📋 .ace/stages/{stage-dir}/{stage}-USER-SETUP.md

Quick view:
- [ ] {ENV_VAR_1}
- [ ] {ENV_VAR_2}
- [ ] {Dashboard config task}

Complete this setup for the integration to function.
Run `cat .ace/stages/{stage-dir}/{stage}-USER-SETUP.md` for full details.

---
```

This warning appears BEFORE "Run complete" messaging. User sees setup requirements prominently.

**Step 1: Count runs and recaps in current stage**

List files in the stage directory:

```bash
ls -1 .ace/stages/[current-stage-dir]/*-run.md 2>/dev/null | wc -l
ls -1 .ace/stages/[current-stage-dir]/*-recap.md 2>/dev/null | wc -l
```

State the counts: "This stage has [X] runs and [Y] recaps."

**Step 2: Route based on run completion**

Compare the counts from Step 1:

| Condition | Meaning | Action |
|-----------|---------|--------|
| recaps < runs | More runs remain | Go to **Route A** |
| recaps = runs | Stage complete | Go to Step 3 |

---

**Route A: More runs remain in this stage**

Identify the next unexecuted run:
- Find the first run.md file that has no matching recap.md
- Read its `<objective>` section

<if style="turbo">
```
Run {stage}.{run} complete.
Recap: .ace/stages/{stage-dir}/{stage}.{run}-recap.md

{Y} of {X} runs complete for Stage {Z}.

⚡ Auto-continuing: Execute next run ({stage}.{next-run})
```

Loop back to identify_run step automatically.
</if>

<if style="guided" OR="custom with gates.execute_next_run true">
```
Run {stage}.{run} complete.
Recap: .ace/stages/{stage-dir}/{stage}.{run}-recap.md

{Y} of {X} runs complete for Stage {Z}.

---

## ▶ Next Up

**{stage}.{next-run}: [Run Name]** — [objective from next run.md]

`/ace.run-stage {stage}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.audit {stage}.{run}` — manual acceptance testing before continuing
- Review what was built before continuing

---
```

Wait for user to clear and run next command.
</if>

**STOP here if Route A applies. Do not continue to Step 3.**

---

**Step 3: Check milestone status (only when all runs in stage are complete)**

Read track.md and extract:
1. Current stage number (from the run just completed)
2. All stage numbers listed in the current milestone section

To find stages in the current milestone, look for:
- Stage headers: lines starting with `### Stage` or `#### Stage`
- Stage list items: lines like `- [ ] **Stage X:` or `- [x] **Stage X:`

Count total stages in the current milestone and identify the highest stage number.

State: "Current stage is {X}. Milestone has {N} stages (highest: {Y})."

**Step 4: Route based on milestone status**

| Condition | Meaning | Action |
|-----------|---------|--------|
| current stage < highest stage | More stages remain | Go to **Route B** |
| current stage = highest stage | Milestone complete | Go to **Route C** |

---

**Route B: Stage complete, more stages remain in milestone**

Read track.md to get the next stage's name and goal.

```
Run {stage}.{run} complete.
Recap: .ace/stages/{stage-dir}/{stage}.{run}-recap.md

## ✓ Stage {Z}: {Stage Name} Complete

All {Y} runs finished.

---

## ▶ Next Up

**Stage {Z+1}: {Next Stage Name}** — {Goal from track.md}

`/ace.plan-stage {Z+1}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.audit {Z}` — manual acceptance testing before continuing
- `/ace.discuss-stage {Z+1}` — gather context first
- Review stage accomplishments before continuing

---
```

---

**Route C: Milestone complete (all stages done)**

```
🎉 MILESTONE COMPLETE!

Run {stage}.{run} complete.
Recap: .ace/stages/{stage-dir}/{stage}.{run}-recap.md

## ✓ Stage {Z}: {Stage Name} Complete

All {Y} runs finished.

╔═══════════════════════════════════════════════════════╗
║  All {N} stages complete! Milestone is 100% done.     ║
╚═══════════════════════════════════════════════════════╝

---

## ▶ Next Up

**Complete Milestone** — archive and prepare for next

`/ace.complete-milestone`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/ace.audit` — manual acceptance testing before completing milestone
- `/ace.add-stage <description>` — add another stage before completing
- Review accomplishments before archiving

---
```

</step>

</process>

<success_criteria>

- All tasks from run.md completed
- All verifications pass
- USER-SETUP.md generated if user_setup in frontmatter
- recap.md created with substantive content
- pulse.md updated (position, decisions, issues, session)
- track.md updated
- If codebase map exists: map updated with execution changes (or skipped if no significant changes)
- If USER-SETUP.md created: prominently surfaced in completion output
  </success_criteria>
