---
name: renn.dash
description: Execute a quick task with RENN guarantees (atomic commits, state tracking) but skip optional agents
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
---

<objective>
Execute small, ad-hoc tasks with RENN guarantees (atomic commits, pulse.md tracking) while skipping optional agents (research, plan-reviewer, auditor).

Dash mode is the same system with a shorter path:
- Spawns renn-architect (quick mode) + renn-runner(s)
- Skips renn-stage-scout, renn-plan-reviewer, renn-auditor
- Dash tasks live in `.renn/quick/` separate from planned stages
- Updates pulse.md "Quick Tasks Completed" table (NOT track.md)

Use when: You know exactly what to do and the task is small enough to not need research or verification.
</objective>

<execution_context>
Orchestration is inline - no separate workflow file. Dash mode is deliberately simpler than full RENN.
</execution_context>

<context>
@.renn/pulse.md
</context>

<process>
**Step 0: Resolve Horsepower Profile**

Read horsepower profile for agent spawning:

```bash
HORSEPOWER=$(cat .renn/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | max | balanced | eco |
|-------|-----|----------|-----|
| renn-architect | opus | opus | sonnet |
| renn-runner | opus | sonnet | sonnet |

Store resolved models for use in Task calls below.

---

**Step 1: Pre-flight validation**

Check that an active RENN project exists:

```bash
if [ ! -f .renn/track.md ]; then
  echo "Dash mode requires an active project with track.md."
  echo "Run /renn.start first."
  exit 1
fi
```

If validation fails, stop immediately with the error message.

Dash tasks can run mid-stage - validation only checks track.md exists, not stage status.

---

**Step 2: Get task description**

Prompt user interactively for the task description:

```
AskUserQuestion(
  header: "Dash Task",
  question: "What do you want to do?",
  followUp: null
)
```

Store response as `$DESCRIPTION`.

If empty, re-prompt: "Please provide a task description."

Generate slug from description:
```bash
slug=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//' | cut -c1-40)
```

---

**Step 3: Calculate next dash task number**

Ensure `.renn/quick/` directory exists and find the next sequential number:

```bash
# Ensure .renn/quick/ exists
mkdir -p .renn/quick

# Find highest existing number and increment
last=$(ls -1d .renn/quick/[0-9][0-9][0-9]-* 2>/dev/null | sort -r | head -1 | xargs -I{} basename {} | grep -oE '^[0-9]+')

if [ -z "$last" ]; then
  next_num="001"
else
  next_num=$(printf "%03d" $((10#$last + 1)))
fi
```

---

**Step 4: Create dash task directory**

Create the directory for this dash task:

```bash
DASH_DIR=".renn/quick/${next_num}-${slug}"
mkdir -p "$DASH_DIR"
```

Report to user:
```
Creating dash task ${next_num}: ${DESCRIPTION}
Directory: ${DASH_DIR}
```

Store `$DASH_DIR` for use in orchestration.

---

**Step 5: Spawn architect (quick mode)**

Spawn renn-architect with quick mode context:

```
Task(
  prompt="
<planning_context>

**Mode:** quick
**Directory:** ${DASH_DIR}
**Description:** ${DESCRIPTION}

**Project State:**
@.renn/pulse.md

</planning_context>

<constraints>
- Create a SINGLE run with 1-3 focused tasks
- Dash tasks should be atomic and self-contained
- No research stage, no reviewer stage
- Target ~30% context usage (simple, focused)
</constraints>

<output>
Write run to: ${DASH_DIR}/${next_num}-run.md
Return: ## PLANNING COMPLETE with run path
</output>
",
  subagent_type="renn-architect",
  model="{architect_model}",
  description="Dash run: ${DESCRIPTION}"
)
```

After architect returns:
1. Verify run exists at `${DASH_DIR}/${next_num}-run.md`
2. Extract run count (typically 1 for dash tasks)
3. Report: "Run created: ${DASH_DIR}/${next_num}-run.md"

If run not found, error: "Architect failed to create ${next_num}-run.md"

---

**Step 6: Spawn runner**

Spawn renn-runner with run reference:

```
Task(
  prompt="
Execute dash task ${next_num}.

Run: @${DASH_DIR}/${next_num}-run.md
Project state: @.renn/pulse.md

<constraints>
- Execute all tasks in the run
- Commit each task atomically
- Create recap at: ${DASH_DIR}/${next_num}-recap.md
- Do NOT update track.md (dash tasks are separate from planned stages)
</constraints>
",
  subagent_type="renn-runner",
  model="{runner_model}",
  description="Execute: ${DESCRIPTION}"
)
```

After runner returns:
1. Verify recap exists at `${DASH_DIR}/${next_num}-recap.md`
2. Extract commit hash from runner output
3. Report completion status

If recap not found, error: "Runner failed to create ${next_num}-recap.md"

Note: For dash tasks producing multiple runs (rare), spawn runners in parallel batches per run-stage patterns.

---

**Step 7: Update pulse.md**

Update pulse.md with dash task completion record.

**7a. Check if "Quick Tasks Completed" section exists:**

Read pulse.md and check for `### Quick Tasks Completed` section.

**7b. If section doesn't exist, create it:**

Insert after `### Blockers/Concerns` section:

```markdown
### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
```

**7c. Append new row to table:**

```markdown
| ${next_num} | ${DESCRIPTION} | $(date +%Y-%m-%d) | ${commit_hash} | [${next_num}-${slug}](./quick/${next_num}-${slug}/) |
```

**7d. Update "Last activity" line:**

Find and update the line:
```
Last activity: $(date +%Y-%m-%d) - Completed dash task ${next_num}: ${DESCRIPTION}
```

Use Edit tool to make these changes atomically

---

**Step 8: Final commit and completion**

Stage and commit dash task artifacts:

```bash
# Stage dash task artifacts
git add ${DASH_DIR}/${next_num}-run.md
git add ${DASH_DIR}/${next_num}-recap.md
git add .renn/pulse.md

# Commit with dash task format
git commit -m "$(cat <<'EOF'
docs(dash-${next_num}): ${DESCRIPTION}

Dash task completed.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

Get final commit hash:
```bash
commit_hash=$(git rev-parse --short HEAD)
```

Display completion output:
```
---

RENN > DASH TASK COMPLETE

Dash Task ${next_num}: ${DESCRIPTION}

Recap: ${DASH_DIR}/${next_num}-recap.md
Commit: ${commit_hash}

---

Ready for next task: /renn.dash
```

</process>

<success_criteria>
- [ ] track.md validation passes
- [ ] User provides task description
- [ ] Slug generated (lowercase, hyphens, max 40 chars)
- [ ] Next number calculated (001, 002, 003...)
- [ ] Directory created at `.renn/quick/NNN-slug/`
- [ ] `${next_num}-run.md` created by architect
- [ ] `${next_num}-recap.md` created by runner
- [ ] pulse.md updated with dash task row
- [ ] Artifacts committed
</success_criteria>
