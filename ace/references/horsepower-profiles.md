# Horsepower Profiles

Horsepower profiles control which Claude model each ACE agent uses. This allows balancing quality vs token spend.

## Profile Definitions

| Agent | `max` | `balanced` | `eco` |
|-------|-------|------------|-------|
| ace-architect | opus | opus | sonnet |
| ace-navigator | opus | sonnet | sonnet |
| ace-runner | opus | sonnet | sonnet |
| ace-stage-scout | opus | sonnet | haiku |
| ace-project-scout | opus | sonnet | haiku |
| ace-synthesizer | sonnet | sonnet | haiku |
| ace-detective | opus | sonnet | sonnet |
| ace-codebase-mapper | sonnet | haiku | haiku |
| ace-auditor | sonnet | sonnet | haiku |
| ace-plan-reviewer | sonnet | sonnet | haiku |
| ace-designer | opus | sonnet | sonnet |
| ace-design-reviewer | sonnet | sonnet | haiku |
| ace-integration-checker | sonnet | sonnet | haiku |

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
1. Read .ace/config.json
2. Get horsepower (default: "balanced")
3. Look up agent in table above
4. Pass model parameter to Task call
```

## Switching Profiles

Runtime: `/ace.set-profile <profile>`

Per-project default: Set in `.ace/config.json`:
```json
{
  "horsepower": "balanced"
}
```

## Design Rationale

**Why Opus for ace-architect?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why Sonnet for ace-runner?**
Runners follow explicit run.md instructions. The run already contains the reasoning; execution is implementation.

**Why Sonnet (not Haiku) for auditors in balanced?**
Verification requires goal-backward reasoning - checking if code *delivers* what the stage promised, not just pattern matching. Sonnet handles this well; Haiku may miss subtle gaps.

**Why Haiku for ace-codebase-mapper?**
Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.

**Why Opus for ace-designer?**
Design requires aesthetic judgment, visual reasoning, and creative problem-solving. Model quality has the highest impact on creative output distinctiveness. In balanced/eco modes, sonnet follows the structured spec and produces compliant output, though with less creative flair.

**Why Sonnet for ace-design-reviewer?**
Reviewer checks structured criteria (schema compliance, token references, checklist items), not subjective aesthetics. Sonnet handles systematic verification well. In eco mode, haiku handles the formulaic checks (field presence, value comparison) adequately.

**Why no profile change for the security step?**
Step 7.6 (Security Conformance) is part of the ace-auditor agent, which already uses Sonnet in balanced mode. Security review requires the same reasoning capability as goal-backward verification -- analyzing code for vulnerabilities, not just pattern matching. Sonnet handles this well; no profile adjustment needed.
