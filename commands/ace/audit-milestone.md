---
name: ace.audit-milestone
description: Audit milestone completion against original intent before archiving
argument-hint: "[version]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
  - Write
---

<objective>
Verify milestone achieved its definition of done. Check requirements coverage, cross-stage integration, and end-to-end flows.

**This command IS the orchestrator.** Reads existing PROOF.md files (stages already verified during run-stage), aggregates tech debt and deferred gaps, then spawns integration checker for cross-stage wiring.
</objective>

<execution_context>
<!-- Spawns ace-integration-checker agent which has all audit expertise baked in -->
</execution_context>

<context>
Version: $ARGUMENTS (optional — defaults to current milestone)

**Original Intent:**
@.ace/BRIEF.md
@.ace/SPECS.md

**Planned Work:**
@.ace/TRACK.md
@.ace/config.json (if exists)

**Completed Work:**
Glob: .ace/stages/*/*-RECAP.md
Glob: .ace/stages/*/*-PROOF.md
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
|-------|-----|----------|-----|
| ace-integration-checker | sonnet | sonnet | haiku |

Store resolved model for use in Task call below.

## 1. Determine Milestone Scope

```bash
# Get stages in milestone
ls -d .ace/stages/*/ | sort -V
```

- Parse version from arguments or detect current from TRACK.md
- Identify all stage directories in scope
- Extract milestone definition of done from TRACK.md
- Extract requirements mapped to this milestone from SPECS.md

## 2. Read All Stage Verifications

For each stage directory, read the PROOF.md:

```bash
cat .ace/stages/01-*/*-PROOF.md
cat .ace/stages/02-*/*-PROOF.md
# etc.
```

From each PROOF.md, extract:
- **Status:** passed | gaps_found
- **Critical gaps:** (if any — these are blockers)
- **Non-critical gaps:** tech debt, deferred items, warnings
- **Anti-patterns found:** TODOs, stubs, placeholders
- **Requirements coverage:** which requirements satisfied/blocked

If a stage is missing PROOF.md, flag it as "unverified stage" — this is a blocker.

## 3. Spawn Integration Checker

With stage context collected:

```
Task(
  prompt="Check cross-stage integration and E2E flows.

Stages: {stage_dirs}
Stage exports: {from RECAPs}
API routes: {routes created}

Verify cross-stage wiring and E2E user flows.",
  subagent_type="ace-integration-checker",
  model="{integration_checker_model}"
)
```

## 4. Collect Results

Combine:
- Stage-level gaps and tech debt (from step 2)
- Integration checker's report (wiring gaps, broken flows)

## 5. Check Requirements Coverage

For each requirement in SPECS.md mapped to this milestone:
- Find owning stage
- Check stage verification status
- Determine: satisfied | partial | unsatisfied

## 6. Aggregate into v{version}-MILESTONE-AUDIT.md

Create `.ace/v{version}-MILESTONE-AUDIT.md` with:

```yaml
---
milestone: {version}
audited: {timestamp}
status: passed | gaps_found | tech_debt
scores:
  requirements: N/M
  stages: N/M
  integration: N/M
  flows: N/M
gaps:  # Critical blockers
  requirements: [...]
  integration: [...]
  flows: [...]
tech_debt:  # Non-critical, deferred
  - stage: 01-auth
    items:
      - "TODO: add rate limiting"
      - "Warning: no password strength validation"
  - stage: 03-dashboard
    items:
      - "Deferred: mobile responsive layout"
---
```

Plus full markdown report with tables for requirements, stages, integration, tech debt.

**Status values:**
- `passed` — all requirements met, no critical gaps, minimal tech debt
- `gaps_found` — critical blockers exist
- `tech_debt` — no blockers but accumulated deferred items need review

## 7. Present Results

Route by status (see `<offer_next>`).

</process>

<offer_next>
Output this markdown directly (not as a code block). Route based on status:

---

**If passed:**

## STAGE COMPLETE ✓ Milestone {version} — Audit Passed

**Score:** {N}/{M} requirements satisfied
**Report:** .ace/v{version}-MILESTONE-AUDIT.md

All requirements covered. Cross-stage integration verified. E2E flows complete.

───────────────────────────────────────────────────────────────

## Next Up

**Complete milestone** — archive and tag

/ace.complete-milestone {version}

<sub>/clear first — fresh context window</sub>

───────────────────────────────────────────────────────────────

---

**If gaps_found:**

## GATE REACHED ⏸ Milestone {version} — Gaps Found

**Score:** {N}/{M} requirements satisfied
**Report:** .ace/v{version}-MILESTONE-AUDIT.md

### Unsatisfied Requirements

{For each unsatisfied requirement:}
- **{REQ-ID}: {description}** (Stage {X})
  - {reason}

### Cross-Stage Issues

{For each integration gap:}
- **{from} → {to}:** {issue}

### Broken Flows

{For each flow gap:}
- **{flow name}:** breaks at {step}

───────────────────────────────────────────────────────────────

## Next Up

**Plan gap closure** — create stages to complete milestone

/ace.plan-milestone-gaps

<sub>/clear first — fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .ace/v{version}-MILESTONE-AUDIT.md — see full report
- /ace.complete-milestone {version} — proceed anyway (accept tech debt)

───────────────────────────────────────────────────────────────

---

**If tech_debt (no blockers but accumulated debt):**

## GATE REACHED ⏸ Milestone {version} — Tech Debt Review

**Score:** {N}/{M} requirements satisfied
**Report:** .ace/v{version}-MILESTONE-AUDIT.md

All requirements met. No critical blockers. Accumulated tech debt needs review.

### Tech Debt by Stage

{For each stage with debt:}
**Stage {X}: {name}**
- {item 1}
- {item 2}

### Total: {N} items across {M} stages

───────────────────────────────────────────────────────────────

## Options

**A. Complete milestone** — accept debt, track in backlog

/ace.complete-milestone {version}

**B. Plan cleanup stage** — address debt before completing

/ace.plan-milestone-gaps

<sub>/clear first — fresh context window</sub>

───────────────────────────────────────────────────────────────
</offer_next>

<success_criteria>
- [ ] Milestone scope identified
- [ ] All stage PROOF.md files read
- [ ] Tech debt and deferred gaps aggregated
- [ ] Integration checker spawned for cross-stage wiring
- [ ] v{version}-MILESTONE-AUDIT.md created
- [ ] Results presented with actionable next steps
</success_criteria>
