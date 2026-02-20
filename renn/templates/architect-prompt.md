# Architect Subagent Prompt Template

<purpose>
Template for spawning renn-architect agent. The agent contains all planning expertise — this template provides planning context only.
</purpose>

---

## File Template

```markdown
<planning_context>

**Stage:** {stage_number}
**Mode:** {standard | gap_closure}

**Project State:**
@.renn/pulse.md

**Track:**
@.renn/track.md

**Specs (if exists):**
@.renn/specs.md

**Stage Context (if exists):**
@.renn/stages/{stage_dir}/{stage}-intel.md

**Research (if exists):**
@.renn/stages/{stage_dir}/{stage}-research.md

**Gap Closure (if --gaps mode):**
@.renn/stages/{stage_dir}/{stage}-proof.md
@.renn/stages/{stage_dir}/{stage}-uat.md

</planning_context>

<downstream_consumer>
Output consumed by /renn.run-stage
Runs must be executable prompts with:
- Frontmatter (batch, depends_on, files_modified, autonomous)
- Tasks in XML format
- Verification criteria
- must_haves for goal-backward verification
</downstream_consumer>

<quality_gate>
Before returning PLANNING COMPLETE:
- [ ] run.md files created in stage directory
- [ ] Each run has valid frontmatter
- [ ] Tasks are specific and actionable
- [ ] Dependencies correctly identified
- [ ] Batches assigned for parallel execution
- [ ] must_haves derived from stage goal
</quality_gate>
```

---

## Placeholders

| Placeholder | Source | Example |
|-------------|--------|---------|
| `{stage_number}` | From track/arguments | `5` or `2.1` |
| `{stage_dir}` | Stage directory name | `05-user-profiles` |
| `{stage}` | Stage prefix | `05` |
| `{standard \| gap_closure}` | Mode flag | `standard` |

---

## Usage

**From /renn.plan-stage (standard mode):**
```python
Task(
  prompt=filled_template,
  subagent_type="renn-architect",
  description="Plan Stage {stage}"
)
```

**From /renn.plan-stage --gaps (gap closure mode):**
```python
Task(
  prompt=filled_template,  # with mode: gap_closure
  subagent_type="renn-architect",
  description="Plan gaps for Stage {stage}"
)
```

---

## Continuation

For gates, spawn fresh agent with:

```markdown
<objective>
Continue planning for Stage {stage_number}: {stage_name}
</objective>

<prior_state>
Stage directory: @.renn/stages/{stage_dir}/
Existing runs: @.renn/stages/{stage_dir}/*-run.md
</prior_state>

<checkpoint_response>
**Type:** {checkpoint_type}
**Response:** {user_response}
</checkpoint_response>

<mode>
Continue: {standard | gap_closure}
</mode>
```

---

**Note:** Planning methodology, task breakdown, dependency analysis, batch assignment, TDD detection, and goal-backward derivation are baked into the renn-architect agent. This template only passes context.
