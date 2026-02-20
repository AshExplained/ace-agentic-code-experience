---
name: ace.set-profile
description: Switch horsepower profile for ACE agents (max/balanced/eco)
allowed-tools:
  - Read
  - Write
  - Bash
arguments:
  - name: profile
    description: "Profile name: max, balanced, or eco"
    required: true
---

<objective>
Switch the horsepower profile used by ACE agents. This controls which Claude model each agent uses, balancing quality vs token spend.
</objective>

<profiles>
| Profile | Description |
|---------|-------------|
| **max** | Opus everywhere except read-only auditing |
| **balanced** | Opus for planning, Sonnet for execution/auditing (default) |
| **eco** | Sonnet for writing, Haiku for research/auditing |
</profiles>

<process>

## 1. Validate argument

```
if $ARGUMENTS.profile not in ["max", "balanced", "eco"]:
  Error: Invalid profile "$ARGUMENTS.profile"
  Valid profiles: max, balanced, eco
  STOP
```

## 2. Check for project

```bash
ls .ace/config.json 2>/dev/null
```

If no `.ace/` directory:
```
Error: No ACE project found.
Run /ace.start first to initialize a project.
```

## 3. Update config.json

Read current config:
```bash
cat .ace/config.json
```

Update `horsepower` field (or add if missing):
```json
{
  "horsepower": "$ARGUMENTS.profile"
}
```

Write updated config back to `.ace/config.json`.

## 4. Confirm

```
✓ Horsepower profile set to: $ARGUMENTS.profile

Agents will now use:
[Show table from horsepower-profiles.md for selected profile]

Next spawned agents will use the new profile.
```

</process>

<examples>

**Switch to eco mode:**
```
/ace.set-profile eco

✓ Horsepower profile set to: eco

Agents will now use:
| Agent | Model |
|-------|-------|
| ace-architect | sonnet |
| ace-runner | sonnet |
| ace-auditor | haiku |
| ... | ... |
```

**Switch to max mode:**
```
/ace.set-profile max

✓ Horsepower profile set to: max

Agents will now use:
| Agent | Model |
|-------|-------|
| ace-architect | opus |
| ace-runner | opus |
| ace-auditor | sonnet |
| ... | ... |
```

</examples>

<success_criteria>
- [ ] Profile validated as max, balanced, or eco
- [ ] config.json updated with new horsepower value
- [ ] Confirmation with model table displayed to user
</success_criteria>
