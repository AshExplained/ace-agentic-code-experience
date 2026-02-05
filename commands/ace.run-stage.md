---
name: ace.run-stage
description: Execute all runs in a stage with batch-based parallelization
argument-hint: "<stage-number> [--gaps-only]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---

<objective>
Execute all runs in a stage using batch-based parallel execution.

Orchestrator stays lean: discover runs, analyze dependencies, group into batches, spawn subagents, collect results. Each subagent loads the full run-plan context and handles its own run.

Context budget: ~15% orchestrator, 100% fresh per subagent.
</objective>

<execution_context>
@~/.claude/ace/references/ui-brand.md
@~/.claude/ace/workflows/run-stage.md
</execution_context>

<context>
Stage: $ARGUMENTS

**Flags:**
- `--gaps-only` — Execute only gap closure runs (runs with `gap_closure: true` in frontmatter). Use after audit creates fix runs.

@.ace/track.md
@.ace/pulse.md
</context>

<process>
0. **Resolve Horsepower Profile**

   Read horsepower profile for agent spawning:
   ```bash
   HORSEPOWER=$(cat .ace/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
   ```

   Default to "balanced" if not set.

   **Model lookup table:**

   | Agent | max | balanced | eco |
   |-------|-----|----------|-----|
   | ace-runner | opus | sonnet | sonnet |
   | ace-auditor | sonnet | sonnet | haiku |

   Store resolved models for use in Task calls below.

1. **Validate stage exists**
   - Find stage directory matching argument
   - Count run.md files
   - Error if no runs found

2. **Discover runs**
   - List all *-run.md files in stage directory
   - Check which have *-recap.md (already complete)
   - If `--gaps-only`: filter to only runs with `gap_closure: true`
   - Build list of incomplete runs

3. **Group by batch**
   - Read `batch` from each run's frontmatter
   - Group runs by batch number
   - Report batch structure to user

4. **Execute batches**
   For each batch in order:
   - Spawn `ace-runner` for each run in batch (parallel Task calls)
   - Wait for completion (Task blocks)
   - Verify RECAPs created
   - Proceed to next batch

5. **Aggregate results**
   - Collect recaps from all runs
   - Report stage completion status

6. **Commit any orchestrator corrections**
   Check for uncommitted changes before verification:
   ```bash
   git status --porcelain
   ```

   **If changes exist:** Orchestrator made corrections between runner completions. Stage and commit them individually:
   ```bash
   # Stage each modified file individually (never use git add -u, git add ., or git add -A)
   git status --porcelain | grep '^ M' | cut -c4- | while read file; do
     git add "$file"
   done
   git commit -m "fix({stage}): orchestrator corrections"
   ```

   **If clean:** Continue to verification.

7. **Verify stage goal**
   Check config: `CHECKS_AUDITOR=$(cat .ace/config.json 2>/dev/null | grep -o '"auditor"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")`

   **If `checks.auditor` is `false`:** Skip to step 8 (treat as passed).

   **Otherwise:**
   - Spawn `ace-auditor` subagent with stage directory and goal
   - Auditor checks must_haves against actual codebase (not RECAP claims)
   - Creates proof.md with detailed report
   - Route by status:
     - `passed` → continue to step 8
     - `human_needed` → present items, get approval or feedback
     - `gaps_found` → present gaps, offer `/ace.plan-stage {X} --gaps`

8. **Update track and pulse**
   - Update track.md, pulse.md

9. **Update specs**
   Mark stage requirements as Complete:
   - Read track.md, find this stage's `Requirements:` line (e.g., "AUTH-01, AUTH-02")
   - Read specs.md traceability table
   - For each REQ-ID in this stage: change Status from "Pending" to "Complete"
   - Write updated specs.md
   - Skip if: specs.md doesn't exist, or stage has no Requirements line

10. **Commit stage completion**
    Check `COMMIT_PLANNING_DOCS` from config.json (default: true).
    If false: Skip git operations for .ace/ files.
    If true: Bundle all stage metadata updates in one commit:
    - Stage: `git add .ace/track.md .ace/pulse.md`
    - Stage specs.md if updated: `git add .ace/specs.md`
    - Commit: `docs({stage}): complete {stage-name} stage`

11. **Offer next steps**
    - Route to next action (see `<offer_next>`)
</process>

<offer_next>
Output this markdown directly (not as a code block). Route based on status:

| Status | Route |
|--------|-------|
| `gaps_found` | Route C (gap closure) |
| `human_needed` | Present checklist, then re-route based on approval |
| `passed` + more stages | Route A (next stage) |
| `passed` + last stage | Route B (milestone complete) |

---

**Route A: Stage verified, more stages remain**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► STAGE {Z} COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Stage {Z}: {Name}**

{Y} runs executed
Goal verified ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Stage {Z+1}: {Name}** — {Goal from track.md}

/ace.discuss-stage {Z+1} — gather context and clarify approach

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- /ace.plan-stage {Z+1} — skip discussion, plan directly
- /ace.audit {Z} — manual acceptance testing before continuing

───────────────────────────────────────────────────────────────

---

**Route B: Stage verified, milestone complete**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► MILESTONE COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**v1.0**

{N} stages completed
All stage goals verified ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Audit milestone** — verify requirements, cross-stage integration, E2E flows

/ace.audit-milestone

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- /ace.audit — manual acceptance testing
- /ace.complete-milestone — skip audit, archive directly

───────────────────────────────────────────────────────────────

---

**Route C: Gaps found — need additional planning**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACE ► STAGE {Z} GAPS FOUND ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Stage {Z}: {Name}**

Score: {N}/{M} must-haves verified
Report: .ace/stages/{stage_dir}/{stage}-proof.md

### What's Missing

{Extract gap summaries from proof.md}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Plan gap closure** — create additional runs to complete the stage

/ace.plan-stage {Z} --gaps

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .ace/stages/{stage_dir}/{stage}-proof.md — see full report
- /ace.audit {Z} — manual testing before planning

───────────────────────────────────────────────────────────────

---

After user runs /ace.plan-stage {Z} --gaps:
1. Architect reads proof.md gaps
2. Creates runs 04, 05, etc. to close gaps
3. User runs /ace.run-stage {Z} again
4. Run-stage runs incomplete runs (04, 05...)
5. Auditor runs again → loop until passed
</offer_next>

<batch_execution>
**Parallel spawning:**

Before spawning, read file contents. The `@` syntax does not work across Task() boundaries.

```bash
# Read each run and pulse.md
RUN_01_CONTENT=$(cat "{run_01_path}")
RUN_02_CONTENT=$(cat "{run_02_path}")
RUN_03_CONTENT=$(cat "{run_03_path}")
PULSE_CONTENT=$(cat .ace/pulse.md)
```

Spawn all runs in a batch with a single message containing multiple Task calls, with inlined content:

```
Task(prompt="Execute run at {run_01_path}\n\nRun:\n{run_01_content}\n\nProject pulse:\n{pulse_content}", subagent_type="ace-runner", model="{runner_model}")
Task(prompt="Execute run at {run_02_path}\n\nRun:\n{run_02_content}\n\nProject pulse:\n{pulse_content}", subagent_type="ace-runner", model="{runner_model}")
Task(prompt="Execute run at {run_03_path}\n\nRun:\n{run_03_content}\n\nProject pulse:\n{pulse_content}", subagent_type="ace-runner", model="{runner_model}")
```

All three run in parallel. Task tool blocks until all complete.

**No polling.** No background agents. No TaskOutput loops.
</batch_execution>

<gate_handling>
Runs with `autonomous: false` have gates. The run-stage.md workflow handles the full gate flow:
- Subagent pauses at gate, returns structured state
- Orchestrator presents to user, collects response
- Spawns fresh continuation agent (not resume)

See `@~/.claude/ace/workflows/run-stage.md` step `gate_handling` for complete details.
</gate_handling>

<drift_rules>
During execution, handle discoveries automatically:

1. **Auto-fix bugs** - Fix immediately, document in Recap
2. **Auto-add critical** - Security/correctness gaps, add and document
3. **Auto-fix blockers** - Can't proceed without fix, do it and document
4. **Ask about architectural** - Major structural changes, stop and ask user

Only rule 4 requires user intervention.
</drift_rules>

<commit_rules>
**Per-Task Commits:**

After each task completes:
1. Stage only files modified by that task
2. Commit with format: `{type}({stage}.{run}): {task-name}`
3. Types: feat, fix, test, refactor, perf, chore
4. Record commit hash for recap.md

**Run Metadata Commit:**

After all tasks in a run complete:
1. Stage run artifacts only: run.md, recap.md
2. Commit with format: `docs({stage}.{run}): complete [run-name] run`
3. NO code files (already committed per-task)

**Stage Completion Commit:**

After all runs in stage complete (step 7):
1. Stage: track.md, pulse.md, specs.md (if updated), proof.md
2. Commit with format: `docs({stage}): complete {stage-name} stage`
3. Bundles all stage-level state updates in one commit

**NEVER use:**
- `git add .`
- `git add -A`
- `git add src/` or any broad directory

**Always stage files individually.**
</commit_rules>

<success_criteria>
- [ ] All incomplete runs in stage executed
- [ ] Each run has recap.md
- [ ] Stage goal verified (must_haves checked against codebase)
- [ ] proof.md created in stage directory
- [ ] pulse.md reflects stage completion
- [ ] track.md updated
- [ ] specs.md updated (stage requirements marked Complete)
- [ ] User informed of next steps
</success_criteria>
