---
name: renn.settings
description: Configure RENN workflow toggles and horsepower profile
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
---

<objective>
Allow users to toggle workflow agents on/off and select horsepower profile via interactive settings.

Updates `.renn/config.json` with workflow preferences and horsepower profile selection.
</objective>

<process>

## 1. Validate Environment

```bash
ls .renn/config.json 2>/dev/null
```

**If not found:** Error - run `/renn.start` first.

## 2. Read Current Config

```bash
cat .renn/config.json
```

Parse current values (default to `true` if not present):
- `checks.research` — spawn scout during plan-stage
- `checks.review` — spawn plan reviewer during plan-stage
- `checks.auditor` — spawn auditor during run-stage
- `horsepower` — which model each agent uses (default: `balanced`)
- `git.branching_strategy` — branching approach (default: `"none"`)

## 3. Present Settings

Use AskUserQuestion with current values shown:

```
AskUserQuestion([
  {
    question: "Which horsepower profile for agents?",
    header: "Horsepower",
    multiSelect: false,
    options: [
      { label: "Max", description: "Opus everywhere except auditing (highest cost)" },
      { label: "Balanced (Recommended)", description: "Opus for planning, Sonnet for execution/auditing" },
      { label: "Eco", description: "Sonnet for writing, Haiku for research/auditing (lowest cost)" }
    ]
  },
  {
    question: "Spawn Stage Scout? (researches domain before planning)",
    header: "Research",
    multiSelect: false,
    options: [
      { label: "Yes", description: "Research stage goals before planning" },
      { label: "No", description: "Skip research, plan directly" }
    ]
  },
  {
    question: "Spawn Plan Reviewer? (verifies runs before execution)",
    header: "Review",
    multiSelect: false,
    options: [
      { label: "Yes", description: "Verify runs meet stage goals" },
      { label: "No", description: "Skip run verification" }
    ]
  },
  {
    question: "Spawn Auditor? (verifies stage completion)",
    header: "Auditor",
    multiSelect: false,
    options: [
      { label: "Yes", description: "Verify must-haves after execution" },
      { label: "No", description: "Skip post-execution auditing" }
    ]
  },
  {
    question: "Git branching strategy?",
    header: "Branching",
    multiSelect: false,
    options: [
      { label: "None (Recommended)", description: "Commit directly to current branch" },
      { label: "Per Stage", description: "Create branch for each stage (ace/stage-{N}-{name})" },
      { label: "Per Milestone", description: "Create branch for entire milestone (ace/{version}-{name})" }
    ]
  }
])
```

**Pre-select based on current config values.**

## 4. Update Config

Merge new settings into existing config.json:

```json
{
  ...existing_config,
  "horsepower": "max" | "balanced" | "eco",
  "checks": {
    "research": true/false,
    "review": true/false,
    "auditor": true/false
  },
  "git": {
    "branching_strategy": "none" | "stage" | "milestone"
  }
}
```

Write updated config to `.renn/config.json`.

## 5. Confirm Changes

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RENN ► SETTINGS UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Setting              | Value |
|----------------------|-------|
| Horsepower Profile   | {max/balanced/eco} |
| Stage Scout          | {On/Off} |
| Plan Reviewer        | {On/Off} |
| Auditor              | {On/Off} |
| Git Branching        | {None/Per Stage/Per Milestone} |

These settings apply to future /renn.plan-stage and /renn.run-stage runs.

Quick commands:
- /renn.set-profile <profile> — switch horsepower profile
- /renn.plan-stage --research — force research
- /renn.plan-stage --skip-research — skip research
- /renn.plan-stage --skip-verify — skip plan review
```

</process>

<success_criteria>
- [ ] Current config read
- [ ] User presented with 5 settings (horsepower + 3 workflow toggles + git branching)
- [ ] Config updated with horsepower, checks, and git sections
- [ ] Changes confirmed to user
</success_criteria>
