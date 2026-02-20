---
name: ace.audit
description: Validate built features through conversational UAT
argument-hint: "[stage number, e.g., '4']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Edit
  - Write
  - Task
---

<objective>
Validate built features through conversational testing with persistent state.

Purpose: Confirm what Claude built actually works from user's perspective. One test at a time, plain text responses, no interrogation. When issues are found, automatically diagnose, plan fixes, and prepare for execution.

Output: {stage}-uat.md tracking all test results. If issues found: diagnosed gaps, verified fix runs ready for /ace.run-stage
</objective>

<execution_context>
@~/.claude/ace/workflows/audit-work.md
@~/.claude/ace/templates/uat.md
</execution_context>

<context>
Stage: $ARGUMENTS (optional)
- If provided: Test specific stage (e.g., "4")
- If not provided: Check for active sessions or prompt for stage

@.ace/pulse.md
@.ace/track.md
</context>

<process>
1. Check for active UAT sessions (resume or start new)
2. Find recap.md files for the stage
3. Extract testable deliverables (user-observable outcomes)
4. Create {stage}-uat.md with test list
5. Present tests one at a time:
   - Show expected behavior
   - Wait for plain text response
   - "yes/y/next" = pass, anything else = issue (severity inferred)
6. Update uat.md after each response
7. On completion: commit, present summary
8. If issues found:
   - Spawn parallel debug agents to diagnose root causes
   - Spawn ace-architect in --gaps mode to create fix runs
   - Spawn ace-plan-reviewer to verify fix runs
   - Iterate architect <-> reviewer until runs pass (max 3)
   - Present ready status with `/clear` then `/ace.run-stage`
</process>

<anti_patterns>
- Don't use AskUserQuestion for test responses — plain text conversation
- Don't ask severity — infer from description
- Don't present full checklist upfront — one test at a time
- Don't run automated tests — this is manual user validation
- Don't fix issues during testing — log as gaps, diagnose after all tests complete
</anti_patterns>

<offer_next>
Output this markdown directly (not as a code block). Route based on UAT results:

| Status | Route |
|--------|-------|
| All tests pass + more stages | Route A (next stage) |
| All tests pass + last stage | Route B (milestone complete) |
| Issues found + fix runs ready | Route C (execute fixes) |
| Issues found + planning blocked | Route D (manual intervention) |

---

**Route A: All tests pass, more stages remain**

=====================================================
 ACE > STAGE {Z} VERIFIED
=====================================================

**Stage {Z}: {Name}**

{N}/{N} tests passed
UAT complete

---------------------------------------------------------------

## > Next Up

**Stage {Z+1}: {Name}** — {Goal from track.md}

/ace.discuss-stage {Z+1} — gather context and clarify approach

<sub>/clear first -> fresh context window</sub>

---------------------------------------------------------------

**Also available:**
- /ace.plan-stage {Z+1} — skip discussion, plan directly
- /ace.run-stage {Z+1} — skip to execution (if already planned)

---------------------------------------------------------------

---

**Route B: All tests pass, milestone complete**

=====================================================
 ACE > STAGE {Z} VERIFIED
=====================================================

**Stage {Z}: {Name}**

{N}/{N} tests passed
Final stage verified

---------------------------------------------------------------

## > Next Up

**Audit milestone** — verify requirements, cross-stage integration, E2E flows

/ace.audit-milestone

<sub>/clear first -> fresh context window</sub>

---------------------------------------------------------------

**Also available:**
- /ace.complete-milestone — skip audit, archive directly

---------------------------------------------------------------

---

**Route C: Issues found, fix runs ready**

=====================================================
 ACE > STAGE {Z} ISSUES FOUND
=====================================================

**Stage {Z}: {Name}**

{N}/{M} tests passed
{X} issues diagnosed
Fix runs verified

### Issues Found

{List issues with severity from uat.md}

---------------------------------------------------------------

## > Next Up

**Execute fix runs** — run diagnosed fixes

/ace.run-stage {Z} --gaps-only

<sub>/clear first -> fresh context window</sub>

---------------------------------------------------------------

**Also available:**
- cat .ace/stages/{stage_dir}/*-run.md — review fix runs
- /ace.plan-stage {Z} --gaps — regenerate fix runs

---------------------------------------------------------------

---

**Route D: Issues found, planning blocked**

=====================================================
 ACE > STAGE {Z} BLOCKED
=====================================================

**Stage {Z}: {Name}**

{N}/{M} tests passed
Fix planning blocked after {X} iterations

### Unresolved Issues

{List blocking issues from architect/reviewer output}

---------------------------------------------------------------

## > Next Up

**Manual intervention required**

Review the issues above and either:
1. Provide guidance for fix planning
2. Manually address blockers
3. Accept current state and continue

---------------------------------------------------------------

**Options:**
- /ace.plan-stage {Z} --gaps — retry fix planning with guidance
- /ace.discuss-stage {Z} — gather more context before replanning

---------------------------------------------------------------
</offer_next>

<success_criteria>
- [ ] uat.md created with tests from recap.md
- [ ] Tests presented one at a time with expected behavior
- [ ] Plain text responses (no structured forms)
- [ ] Severity inferred, never asked
- [ ] Batched writes: on issue, every 5 passes, or completion
- [ ] Committed on completion
- [ ] If issues: parallel debug agents diagnose root causes
- [ ] If issues: ace-architect creates fix runs from diagnosed gaps
- [ ] If issues: ace-plan-reviewer verifies fix runs (max 3 iterations)
- [ ] Ready for `/ace.run-stage` when complete
</success_criteria>
