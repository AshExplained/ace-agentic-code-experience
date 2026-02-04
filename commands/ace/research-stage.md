---
name: ace.research-stage
description: Research how to implement a stage (standalone - usually use /ace.plan-stage instead)
argument-hint: "[stage]"
allowed-tools:
  - Read
  - Bash
  - Task
---

<objective>
Research how to implement a stage. Spawns ace-stage-scout agent with stage context.

**Note:** This is a standalone recon command. For most workflows, use `/ace.plan-stage` which integrates recon automatically.

**Use this command when:**
- You want to recon without architecting yet
- You want to re-recon after architecting is complete
- You need to investigate before deciding if a stage is feasible

**Orchestrator role:** Parse stage, validate against track, check existing recon, gather context, spawn scout agent, present results.

**Why subagent:** Recon burns context fast (WebSearch, Context7 queries, source verification). Fresh 200k context for investigation. Main context stays lean for user interaction.
</objective>

<context>
Stage number: $ARGUMENTS (required)

Normalize stage input in step 1 before any directory lookups.
</context>

<process>

## 0. Resolve Horsepower Profile

Read horsepower profile for agent spawning:

```bash
HORSEPOWER=$(cat .ace/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | max | balanced | eco |
|-------|---------|----------|--------|
| ace-stage-scout | opus | sonnet | haiku |

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

grep -A5 "Stage ${STAGE}:" .ace/TRACK.md 2>/dev/null
```

**If not found:** Error and exit. **If found:** Extract stage number, name, description.

## 2. Check Existing Recon

```bash
ls .ace/stages/${STAGE}-*/RECON.md 2>/dev/null
```

**If exists:** Offer: 1) Update recon, 2) View existing, 3) Skip. Wait for response.

**If doesn't exist:** Continue.

## 3. Gather Stage Context

```bash
grep -A20 "Stage ${STAGE}:" .ace/TRACK.md
cat .ace/SPECS.md 2>/dev/null
cat .ace/stages/${STAGE}-*/*-INTEL.md 2>/dev/null
grep -A30 "### Decisions Made" .ace/PULSE.md 2>/dev/null
```

Present summary with stage description, requirements, prior decisions.

## 4. Spawn ace-stage-scout Agent

Recon modes: ecosystem (default), feasibility, implementation, comparison.

```markdown
<recon_type>
Stage Recon — investigating HOW to implement a specific stage well.
</recon_type>

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
Recon implementation approach for Stage {stage_number}: {stage_name}
Mode: ecosystem
</objective>

<context>
**Stage description:** {stage_description}
**Requirements:** {requirements_list}
**Prior decisions:** {decisions_if_any}
**Stage context:** {intel_md_content}
</context>

<downstream_consumer>
Your RECON.md will be loaded by `/ace.plan-stage` which uses specific sections:
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
Write to: .ace/stages/${STAGE}-{slug}/${STAGE}-RECON.md
</output>
```

```
Task(
  prompt="First, read ~/.claude/agents/ace-stage-scout.md for your role and instructions.\n\n" + filled_prompt,
  subagent_type="general-purpose",
  model="{scout_model}",
  description="Recon Stage {stage}"
)
```

## 5. Handle Agent Return

**`## RECON COMPLETE`:** Display summary, offer: Architect stage, Dig deeper, Review full, Done.

**`## GATE REACHED ⏸`:** Present to user, get response, spawn continuation.

**`## RECON INCONCLUSIVE`:** Show what was attempted, offer: Add context, Try different mode, Manual.

## 6. Spawn Continuation Agent

```markdown
<objective>
Continue recon for Stage {stage_number}: {stage_name}
</objective>

<prior_state>
Recon file: @.ace/stages/${STAGE}-{slug}/${STAGE}-RECON.md
</prior_state>

<gate_response>
**Type:** {gate_type}
**Response:** {user_response}
</gate_response>
```

```
Task(
  prompt="First, read ~/.claude/agents/ace-stage-scout.md for your role and instructions.\n\n" + continuation_prompt,
  subagent_type="general-purpose",
  model="{scout_model}",
  description="Continue recon Stage {stage}"
)
```

</process>

<success_criteria>
- [ ] Stage validated against track
- [ ] Existing recon checked
- [ ] ace-stage-scout spawned with context
- [ ] Gates handled correctly
- [ ] User knows next steps
</success_criteria>
