---
name: renn.research-stage
description: Research how to implement a stage (standalone - usually use /renn.plan-stage instead)
argument-hint: "[stage]"
allowed-tools:
  - Read
  - Bash
  - Task
---

<objective>
Research how to implement a stage. Spawns renn-stage-scout agent with stage context.

**Note:** This is a standalone research command. For most workflows, use `/renn.plan-stage` which integrates research automatically.

**Use this command when:**
- You want to research without architecting yet
- You want to re-research after architecting is complete
- You need to investigate before deciding if a stage is feasible

**Orchestrator role:** Parse stage, validate against track, check existing research, gather context, spawn scout agent, present results.

**Why subagent:** Research burns context fast (WebSearch, Context7 queries, source verification). Fresh 200k context for investigation. Main context stays lean for user interaction.
</objective>

<context>
Stage number: $ARGUMENTS (required)

Normalize stage input in step 1 before any directory lookups.
</context>

<process>

## 0. Resolve Horsepower Profile

Read horsepower profile for agent spawning:

```bash
HORSEPOWER=$(cat .renn/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | max | balanced | eco |
|-------|---------|----------|--------|
| renn-stage-scout | opus | sonnet | haiku |

Store resolved model for use in Task calls below.

## 1. Normalize and Validate Stage

```bash
# Normalize stage number (8 → 08, but preserve decimals like 2.1 → 02.1)
if [[ "$ARGUMENTS" =~ ^[0-9]+$ ]]; then
  STAGE=$(printf "%02d" "$ARGUMENTS")
elif [[ "$ARGUMENTS" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
  STAGE=$(printf "%02d.%s" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}")
else
  STAGE="$ARGUMENTS"
fi

grep -A5 "Stage ${STAGE}:" .renn/track.md 2>/dev/null
```

**If not found:** Error and exit. **If found:** Extract stage number, name, description.

## 2. Check Existing Research

```bash
ls .renn/stages/${STAGE}-*/research.md 2>/dev/null
```

**If exists:** Offer: 1) Update research, 2) View existing, 3) Skip. Wait for response.

**If doesn't exist:** Continue.

## 3. Gather Stage Context

```bash
grep -A20 "Stage ${STAGE}:" .renn/track.md
cat .renn/specs.md 2>/dev/null
cat .renn/stages/${STAGE}-*/*-intel.md 2>/dev/null
grep -A30 "### Decisions Made" .renn/pulse.md 2>/dev/null
```

Present summary with stage description, requirements, prior decisions.

## 4. Spawn renn-stage-scout Agent

Research modes: ecosystem (default), feasibility, implementation, comparison.

```markdown
<research_type>
Stage Research — investigating HOW to implement a specific stage well.
</research_type>

<key_insight>
The question is NOT "which library should I use?"

The question is: "What do I not know that I don't know?"

For this stage, discover:
- What's the established architecture pattern?
- What libraries form the standard stack?
- What problems do people commonly hit?
- What's SOTA vs what Claude's training thinks is SOTA?
- What should NOT be hand-rolled?
</key_insight>

<objective>
Research implementation approach for Stage {stage_number}: {stage_name}
Mode: ecosystem
</objective>

<context>
**Stage description:** {stage_description}
**Requirements:** {requirements_list}
**Prior decisions:** {decisions_if_any}
**Stage context:** {intel_md_content}
</context>

<downstream_consumer>
Your research.md will be loaded by `/renn.plan-stage` which uses specific sections:
- `## Standard Stack` → Runs use these libraries
- `## Architecture Patterns` → Task structure follows these
- `## Don't Hand-Roll` → Tasks NEVER build custom solutions for listed problems
- `## Common Pitfalls` → Verification steps check for these
- `## Code Examples` → Task actions reference these patterns

Be prescriptive, not exploratory. "Use X" not "Consider X or Y."
</downstream_consumer>

<quality_gate>
Before declaring complete, verify:
- [ ] All domains investigated (not just some)
- [ ] Negative claims verified with official docs
- [ ] Multiple sources for critical claims
- [ ] Confidence levels assigned honestly
- [ ] Section names match what plan-stage expects
</quality_gate>

<output>
Write to: .renn/stages/${STAGE}-{slug}/${STAGE}-research.md
</output>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="renn-stage-scout",
  model="{scout_model}",
  description="Research Stage {stage}"
)
```

## 5. Handle Agent Return

**`## RESEARCH COMPLETE`:** Display summary, offer: Architect stage, Dig deeper, Review full, Done.

**`## GATE REACHED ⏸`:** Present to user, get response, spawn continuation.

**`## RESEARCH INCONCLUSIVE`:** Show what was attempted, offer: Add context, Try different mode, Manual.

## 6. Spawn Continuation Agent

```markdown
<objective>
Continue research for Stage {stage_number}: {stage_name}
</objective>

<prior_state>
Research file: @.renn/stages/${STAGE}-{slug}/${STAGE}-research.md
</prior_state>

<checkpoint_response>
**Type:** {checkpoint_type}
**Response:** {user_response}
</checkpoint_response>
```

```
Task(
  prompt=continuation_prompt,
  subagent_type="renn-stage-scout",
  model="{scout_model}",
  description="Continue research Stage {stage}"
)
```

</process>

<success_criteria>
- [ ] Stage validated against track
- [ ] Existing research checked
- [ ] renn-stage-scout spawned with context
- [ ] Gates handled correctly
- [ ] User knows next steps
</success_criteria>
