<purpose>
Validate built features through conversational testing with persistent state. Creates UAT.md that tracks test progress, survives /clear, and feeds gaps into /ace.plan-stage --gaps.

User tests, Claude records. One test at a time. Plain text responses.
</purpose>

<philosophy>
**Show expected, ask if reality matches.**

Claude presents what SHOULD happen. User confirms or describes what's different.
- "yes" / "y" / "next" / empty -> pass
- Anything else -> logged as issue, severity inferred

No Pass/Fail buttons. No severity questions. Just: "Here's what should happen. Does it?"
</philosophy>

<template>
@~/.claude/ace/templates/UAT.md
</template>

<process>

<step name="resolve_horsepower" priority="first">
Read horsepower profile for agent spawning:

```bash
HORSEPOWER=$(cat .ace/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | max | balanced | eco |
|-------|-----|----------|-----|
| ace-architect | opus | opus | sonnet |
| ace-plan-reviewer | sonnet | sonnet | haiku |

Store resolved models for use in Task calls below.
</step>

<step name="check_active_session">
**First: Check for active UAT sessions**

```bash
find .ace/stages -name "*-UAT.md" -type f 2>/dev/null | head -5
```

**If active sessions exist AND no $ARGUMENTS provided:**

Read each file's frontmatter (status, stage) and Current Test section.

Display inline:

```
## Active UAT Sessions

| # | Stage | Status | Current Test | Progress |
|---|-------|--------|--------------|----------|
| 1 | 04-comments | testing | 3. Reply to Comment | 2/6 |
| 2 | 05-auth | testing | 1. Login Form | 0/4 |

Reply with a number to resume, or provide a stage number to start new.
```

Wait for user response.

- If user replies with number (1, 2) -> Load that file, go to `resume_from_file`
- If user replies with stage number -> Treat as new session, go to `create_uat_file`

**If active sessions exist AND $ARGUMENTS provided:**

Check if session exists for that stage. If yes, offer to resume or restart.
If no, continue to `create_uat_file`.

**If no active sessions AND no $ARGUMENTS:**

```
No active UAT sessions.

Provide a stage number to start testing (e.g., /ace.audit 4)
```

**If no active sessions AND $ARGUMENTS provided:**

Continue to `create_uat_file`.
</step>

<step name="find_recaps">
**Find what to test:**

Parse $ARGUMENTS as stage number (e.g., "4") or run number (e.g., "04-02").

```bash
# Find stage directory (match both zero-padded and unpadded)
PADDED_STAGE=$(printf "%02d" ${STAGE_ARG} 2>/dev/null || echo "${STAGE_ARG}")
STAGE_DIR=$(ls -d .ace/stages/${PADDED_STAGE}-* .ace/stages/${STAGE_ARG}-* 2>/dev/null | head -1)

# Find RECAP files
ls "$STAGE_DIR"/*-RECAP.md 2>/dev/null
```

Read each RECAP.md to extract testable deliverables.
</step>

<step name="extract_tests">
**Extract testable deliverables from RECAP.md:**

Parse for:
1. **Accomplishments** - Features/functionality added
2. **User-facing changes** - UI, workflows, interactions

Focus on USER-OBSERVABLE outcomes, not implementation details.

For each deliverable, create a test:
- name: Brief test name
- expected: What the user should see/experience (specific, observable)

Examples:
- Accomplishment: "Added comment threading with infinite nesting"
  -> Test: "Reply to a Comment"
  -> Expected: "Clicking Reply opens inline composer below comment. Submitting shows reply nested under parent with visual indentation."

Skip internal/non-observable items (refactors, type changes, etc.).
</step>

<step name="create_uat_file">
**Create UAT file with all tests:**

```bash
mkdir -p "$STAGE_DIR"
```

Build test list from extracted deliverables.

Create file:

```markdown
---
status: testing
stage: XX-name
source: [list of RECAP.md files]
started: [ISO timestamp]
updated: [ISO timestamp]
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: [first test name]
expected: |
  [what user should observe]
awaiting: user response

## Tests

### 1. [Test Name]
expected: [observable behavior]
result: [pending]

### 2. [Test Name]
expected: [observable behavior]
result: [pending]

...

## Summary

total: [N]
passed: 0
issues: 0
pending: [N]
skipped: 0

## Gaps

[none yet]
```

Write to `.ace/stages/XX-name/{stage}-UAT.md`

Proceed to `present_test`.
</step>

<step name="present_test">
**Present current test to user:**

Read Current Test section from UAT file.

Display using gate box format:

```
+==============================================================+
|  GATE: Verification Required                                 |
+==============================================================+

**Test {number}: {name}**

{expected}

--------------------------------------------------------------
-> Type "pass" or describe what's wrong
--------------------------------------------------------------
```

Wait for user response (plain text, no AskUserQuestion).
</step>

<step name="process_response">
**Process user response and update file:**

**If response indicates pass:**
- Empty response, "yes", "y", "ok", "pass", "next", "approved"

Update Tests section:
```
### {N}. {name}
expected: {expected}
result: pass
```

**If response indicates skip:**
- "skip", "can't test", "n/a"

Update Tests section:
```
### {N}. {name}
expected: {expected}
result: skipped
reason: [user's reason if provided]
```

**If response is anything else:**
- Treat as issue description

Infer severity from description:
- Contains: crash, error, exception, fails, broken, unusable -> blocker
- Contains: doesn't work, wrong, missing, can't -> major
- Contains: slow, weird, off, minor, small -> minor
- Contains: color, font, spacing, alignment, visual -> cosmetic
- Default if unclear: major

Update Tests section:
```
### {N}. {name}
expected: {expected}
result: issue
reported: "{verbatim user response}"
severity: {inferred}
```

Append to Gaps section (structured YAML for plan-stage --gaps):
```yaml
- truth: "{expected behavior from test}"
  status: failed
  reason: "User reported: {verbatim user response}"
  severity: {inferred}
  test: {N}
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis
```

**After any response:**

Update Summary counts.
Update frontmatter.updated timestamp.

If more tests remain -> Update Current Test, go to `present_test`
If no more tests -> Go to `complete_session`
</step>

<step name="resume_from_file">
**Resume testing from UAT file:**

Read the full UAT file.

Find first test with `result: [pending]`.

Announce:
```
Resuming: Stage {stage} UAT
Progress: {passed + issues + skipped}/{total}
Issues found so far: {issues count}

Continuing from Test {N}...
```

Update Current Test section with the pending test.
Proceed to `present_test`.
</step>

<step name="complete_session">
**Complete testing and commit:**

Update frontmatter:
- status: complete
- updated: [now]

Clear Current Test section:
```
## Current Test

[testing complete]
```

**Check config:**

```bash
COMMIT_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .ace 2>/dev/null && COMMIT_DOCS=false
```

**If `COMMIT_DOCS=false`:** Skip git operations

**If `COMMIT_DOCS=true` (default):**

Commit the UAT file:
```bash
git add ".ace/stages/XX-name/{stage}-UAT.md"
git commit -m "test({stage}): complete UAT - {passed} passed, {issues} issues"
```

Present summary:
```
## UAT Complete: Stage {stage}

| Result | Count |
|--------|-------|
| Passed | {N}   |
| Issues | {N}   |
| Skipped| {N}   |

[If issues > 0:]
### Issues Found

[List from Issues section]
```

**If issues > 0:** Proceed to `diagnose_issues`

**If issues == 0:**
```
All tests passed. Ready to continue.

- `/ace.plan-stage {next}` — Plan next stage
- `/ace.run-stage {next}` — Execute next stage
```
</step>

<step name="diagnose_issues">
**Diagnose root causes before planning fixes:**

```
---

{N} issues found. Diagnosing root causes...

Spawning parallel debug agents to investigate each issue.
```

- Load diagnose-issues workflow
- Follow @~/.claude/ace/workflows/diagnose-issues.md
- Spawn parallel debug agents for each issue
- Collect root causes
- Update UAT.md with root causes
- Proceed to `plan_gap_closure`

Diagnosis runs automatically - no user prompt. Parallel agents investigate simultaneously, so overhead is minimal and fixes are more accurate.
</step>

<step name="plan_gap_closure">
**Auto-plan fixes from diagnosed gaps:**

Display:
```
=====================================================
 ACE > PLANNING FIXES
=====================================================

* Spawning architect for gap closure...
```

Spawn ace-architect in --gaps mode:

```
Task(
  prompt="""
<planning_context>

**Stage:** {stage_number}
**Mode:** gap_closure

**UAT with diagnoses:**
@.ace/stages/{stage_dir}/{stage}-UAT.md

**Project State:**
@.ace/PULSE.md

**Roadmap:**
@.ace/TRACK.md

</planning_context>

<downstream_consumer>
Output consumed by /ace.run-stage
Runs must be executable prompts.
</downstream_consumer>
""",
  subagent_type="ace-architect",
  model="{architect_model}",
  description="Plan gap fixes for Stage {stage}"
)
```

On return:
- **PLANNING COMPLETE:** Proceed to `verify_gap_runs`
- **PLANNING INCONCLUSIVE:** Report and offer manual intervention
</step>

<step name="verify_gap_runs">
**Verify fix runs with reviewer:**

Display:
```
=====================================================
 ACE > VERIFYING FIX RUNS
=====================================================

* Spawning plan reviewer...
```

Initialize: `iteration_count = 1`

Spawn ace-plan-reviewer:

```
Task(
  prompt="""
<verification_context>

**Stage:** {stage_number}
**Stage Goal:** Close diagnosed gaps from UAT

**Runs to verify:**
@.ace/stages/{stage_dir}/*-RUN.md

</verification_context>

<expected_output>
Return one of:
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>
""",
  subagent_type="ace-plan-reviewer",
  model="{reviewer_model}",
  description="Verify Stage {stage} fix runs"
)
```

On return:
- **VERIFICATION PASSED:** Proceed to `present_ready`
- **ISSUES FOUND:** Proceed to `revision_loop`
</step>

<step name="revision_loop">
**Iterate architect <-> reviewer until runs pass (max 3):**

**If iteration_count < 3:**

Display: `Sending back to architect for revision... (iteration {N}/3)`

Spawn ace-architect with revision context:

```
Task(
  prompt="""
<revision_context>

**Stage:** {stage_number}
**Mode:** revision

**Existing runs:**
@.ace/stages/{stage_dir}/*-RUN.md

**Reviewer issues:**
{structured_issues_from_reviewer}

</revision_context>

<instructions>
Read existing RUN.md files. Make targeted updates to address reviewer issues.
Do NOT replan from scratch unless issues are fundamental.
</instructions>
""",
  subagent_type="ace-architect",
  model="{architect_model}",
  description="Revise Stage {stage} runs"
)
```

After architect returns -> spawn reviewer again (verify_gap_runs logic)
Increment iteration_count

**If iteration_count >= 3:**

Display: `Max iterations reached. {N} issues remain.`

Offer options:
1. Force proceed (execute despite issues)
2. Provide guidance (user gives direction, retry)
3. Abandon (exit, user runs /ace.plan-stage manually)

Wait for user response.
</step>

<step name="present_ready">
**Present completion and next steps:**

```
=====================================================
 ACE > FIXES READY
=====================================================

**Stage {X}: {Name}** — {N} gap(s) diagnosed, {M} fix run(s) created

| Gap | Root Cause | Fix Run |
|-----|------------|---------|
| {truth 1} | {root_cause} | {stage}-04 |
| {truth 2} | {root_cause} | {stage}-04 |

Runs verified and ready for execution.

---------------------------------------------------------------

## > Next Up

**Execute fixes** — run fix runs

`/clear` then `/ace.run-stage {stage} --gaps-only`

---------------------------------------------------------------
```
</step>

</process>

<update_rules>
**Batched writes for efficiency:**

Keep results in memory. Write to file only when:
1. **Issue found** — Preserve the problem immediately
2. **Session complete** — Final write before commit
3. **Gate** — Every 5 passed tests (safety net)

| Section | Rule | When Written |
|---------|------|--------------|
| Frontmatter.status | OVERWRITE | Start, complete |
| Frontmatter.updated | OVERWRITE | On any file write |
| Current Test | OVERWRITE | On any file write |
| Tests.{N}.result | OVERWRITE | On any file write |
| Summary | OVERWRITE | On any file write |
| Gaps | APPEND | When issue found |

On context reset: File shows last gate. Resume from there.
</update_rules>

<severity_inference>
**Infer severity from user's natural language:**

| User says | Infer |
|-----------|-------|
| "crashes", "error", "exception", "fails completely" | blocker |
| "doesn't work", "nothing happens", "wrong behavior" | major |
| "works but...", "slow", "weird", "minor issue" | minor |
| "color", "spacing", "alignment", "looks off" | cosmetic |

Default to **major** if unclear. User can correct if needed.

**Never ask "how severe is this?"** - just infer and move on.
</severity_inference>

<success_criteria>
- [ ] UAT file created with all tests from RECAP.md
- [ ] Tests presented one at a time with expected behavior
- [ ] User responses processed as pass/issue/skip
- [ ] Severity inferred from description (never asked)
- [ ] Batched writes: on issue, every 5 passes, or completion
- [ ] Committed on completion
- [ ] If issues: parallel debug agents diagnose root causes
- [ ] If issues: ace-architect creates fix runs (gap_closure mode)
- [ ] If issues: ace-plan-reviewer verifies fix runs
- [ ] If issues: revision loop until runs pass (max 3 iterations)
- [ ] Ready for `/ace.run-stage --gaps-only` when complete
</success_criteria>
