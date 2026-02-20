# Horsepower Profiles

Horsepower profiles control which Claude model each RENN agent uses. This allows balancing quality vs token spend.

## Profile Definitions

| Agent | `max` | `balanced` | `eco` |
|-------|-------|------------|-------|
| renn-architect | opus | opus | sonnet |
| renn-navigator | opus | sonnet | sonnet |
| renn-runner | opus | sonnet | sonnet |
| renn-stage-scout | opus | sonnet | haiku |
| renn-project-scout | opus | sonnet | haiku |
| renn-synthesizer | sonnet | sonnet | haiku |
| renn-detective | opus | sonnet | sonnet |
| renn-codebase-mapper | sonnet | haiku | haiku |
| renn-auditor | sonnet | sonnet | haiku |
| renn-plan-reviewer | sonnet | sonnet | haiku |
| renn-designer | opus | sonnet | sonnet |
| renn-design-reviewer | sonnet | sonnet | haiku |
| renn-integration-checker | sonnet | sonnet | haiku |

## Profile Philosophy

**max** - Maximum reasoning power
- Opus for all decision-making agents
- Sonnet for read-only verification
- Use when: quota available, critical architecture work

**balanced** (default) - Smart allocation
- Opus only for planning (where architecture decisions happen)
- Sonnet for execution and research (follows explicit instructions)
- Sonnet for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**eco** - Minimal Opus usage
- Sonnet for anything that writes code
- Haiku for research and verification
- Use when: conserving quota, high-volume work, less critical stages

## Resolution Logic

Orchestrators resolve model before spawning:

```
1. Read .renn/config.json
2. Get horsepower (default: "balanced")
3. Look up agent in table above
4. Pass model parameter to Task call
```

## Switching Profiles

Runtime: `/renn.set-profile <profile>`

Per-project default: Set in `.renn/config.json`:
```json
{
  "horsepower": "balanced"
}
```

## Design Rationale

**Why Opus for renn-architect?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why Sonnet for renn-runner?**
Runners follow explicit run.md instructions. The run already contains the reasoning; execution is implementation.

**Why Sonnet (not Haiku) for auditors in balanced?**
Verification requires goal-backward reasoning - checking if code *delivers* what the stage promised, not just pattern matching. Sonnet handles this well; Haiku may miss subtle gaps.

**Why Haiku for renn-codebase-mapper?**
Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.

**Why Opus for renn-designer?**
Design requires aesthetic judgment, visual reasoning, and creative problem-solving. Model quality has the highest impact on creative output distinctiveness. In balanced/eco modes, sonnet follows the structured spec and produces compliant output, though with less creative flair.

**Why Sonnet for renn-design-reviewer?**
Reviewer checks structured criteria (schema compliance, token references, checklist items), not subjective aesthetics. Sonnet handles systematic verification well. In eco mode, haiku handles the formulaic checks (field presence, value comparison) adequately.

**Why no profile change for the security step?**
Step 7.6 (Security Conformance) is part of the renn-auditor agent, which already uses Sonnet in balanced mode. Security review requires the same reasoning capability as goal-backward verification -- analyzing code for vulnerabilities, not just pattern matching. Sonnet handles this well; no profile adjustment needed.
