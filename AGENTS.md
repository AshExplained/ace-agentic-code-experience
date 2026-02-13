# ACE Contributor Patterns

Reference for creating commands, agents, workflows, templates, and references that match existing ACE conventions.

---

## Quick Reference

| Type | Location | Naming | Has Frontmatter |
|------|----------|--------|-----------------|
| Command | `commands/ace.*.md` | `ace.kebab-case.md` | Yes (YAML) |
| Agent | `agents/*.md` | `ace-*.md` | Yes (YAML) |
| Workflow | `ace/workflows/*.md` | `kebab-case.md` | No |
| Template | `ace/templates/*.md` | `kebab-case.md` | No |
| Reference | `ace/references/*.md` | `kebab-case.md` | No |

---

## 1. Command Structure

```yaml
---
name: ace.command-name
description: One-line action description
argument-hint: "<required> [optional]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---
```

**Section order (strict):**

```markdown
<objective>
What this does, why it matters, context budget (~15% orchestrator).
</objective>

<execution_context>
@~/.claude/ace/workflows/relevant-workflow.md
@~/.claude/ace/references/relevant-reference.md
</execution_context>

<context>
$ARGUMENTS

@.ace/pulse.md
@.ace/track.md
</context>

<process>
1. **Step name** — What to do
2. **Next step** — Continue
</process>

<success_criteria>
- [ ] Measurable outcome 1
- [ ] Measurable outcome 2
</success_criteria>
```

**Key principle:** Commands are thin wrappers. Delegate heavy logic to workflows.

---

## 2. Agent Structure

```yaml
---
name: ace-agent-name
description: What this agent does when spawned
tools: Read, Write, Bash, Grep, Glob, Edit, Task
color: yellow
---
```

**Required sections:**

```markdown
<role>
You are a [role]. You [primary responsibility].

You are spawned by [command/workflow].

Your job: [success definition].
</role>

<execution_flow>

<step name="load_project_state" priority="first">
Before any operation, read project state:

```bash
cat .ace/pulse.md 2>/dev/null
```

Parse: current position, decisions, blockers.
</step>

<step name="main_work">
Do the actual work here.
</step>

<step name="create_output">
Create recap.md or return structured result.
</step>

</execution_flow>

<success_criteria>
- [ ] All tasks executed
- [ ] Output created
- [ ] State updated
</success_criteria>
```

**Agent return formats:**
Agents signal completion with a role-appropriate `## HEADING` marker. Common markers:
- `## RUN COMPLETE` — Runner finished executing a stage run
- `## GATE REACHED` — Any agent pausing for user input
- `## CULPRIT FOUND` — Detective located the root cause
- `## INVESTIGATION INCONCLUSIVE` — Detective blocked
- `## {ROLE} COMPLETE` — Role-specific success (e.g., `## AUDIT COMPLETE`, `## REVIEW COMPLETE`)

---

## 3. Workflow Structure

No YAML frontmatter. Pure markdown with semantic XML.

```markdown
<purpose>
What this workflow accomplishes and when to use it.
</purpose>

<core_principle>
The key insight that makes this approach work.
</core_principle>

<process>

<step name="step_one" priority="first">
Detailed instructions for this step.

```bash
# Commands to run
```

**If condition:** Do X
**Otherwise:** Do Y
</step>

<step name="step_two">
Continue with next step.
</step>

</process>
```

**Workflows answer "HOW". Commands answer "WHEN".**

---

## 4. Template Structure

```markdown
# Template Name

Template for `.ace/path/filename.md` — purpose.

---

## File Template

```markdown
# [Title]

## Section One

[Content with placeholders]

## Section Two

[More content]
```

<purpose>
What this template captures and why it matters.
</purpose>

<lifecycle>
- **Created:** When and by whom
- **Updated:** Trigger conditions
- **Read by:** Downstream consumers
</lifecycle>

<size_constraint>
Keep under N lines. It's a digest, not an archive.
</size_constraint>
```

---

## 5. Reference Structure

```markdown
<overview>
What this reference covers and when to consult it.
</overview>

<core_principle>
The key insight or pattern being documented.
</core_principle>

## Section Heading

Content with examples.

```bash
# Code examples inline
```

## Another Section

More detailed patterns.
```

**References are lazy-loaded via @-references.** Keep them self-contained.

---

## 6. XML Conventions

### Semantic tags only (not structural)

**DO:**
```xml
<objective>
## Primary Goal
Build authentication
</objective>
```

**DON'T:**
```xml
<section name="objective">
  <content>Build authentication</content>
</section>
```

### Step naming

```xml
<step name="load_project_state" priority="first">
```

- `name`: snake_case
- `priority`: Optional ("first", "second")

### Task XML

```xml
<task type="auto">
  <name>Task N: Action-oriented name</name>
  <files>src/path/file.ts</files>
  <action>What to do and WHY</action>
  <verify>Command to prove completion</verify>
  <done>Acceptance criteria</done>
</task>
```

**Task types:**
- `type="auto"` — Autonomous
- `type="checkpoint:human-verify"` — User verifies
- `type="checkpoint:decision"` — User chooses

---

## 7. @-Reference Patterns

### Static (always load)
```markdown
@~/.claude/ace/workflows/run-stage.md
@.ace/pulse.md
```

### Conditional (if exists)
```markdown
@.ace/research.md (if exists)
```

### Path rule
Always use `~/.claude/` in source files. Installer transforms paths during copy:
- Global install: `~/.claude/` → `~/.claude/` (or `$CLAUDE_CONFIG_DIR/.claude/`)
- Local install: `~/.claude/` → `./.claude/`

---

## 8. State Files

| File | Purpose | Updated By |
|------|---------|------------|
| `pulse.md` | Living memory across sessions | Runner, orchestrator, commands |
| `track.md` | Stage structure | Navigator, stage commands |
| `brief.md` | Project context | Init, rarely after |
| `specs.md` | Requirement traceability | Architect, auditor |
| `config.json` | Workflow preferences | Init, settings command |

### pulse.md is double-loaded intentionally

- **Orchestrator inlines:** Fallback if disk fails
- **Runner reads disk:** Gets fresh state from other writers

Multiple actors write pulse.md → readers need fresh data.

---

## 9. Commit Conventions

### Format
```
{type}({stage}.{run}): {description}
```

### Types
| Type | Use |
|------|-----|
| `feat` | New feature |
| `fix` | Bug fix |
| `test` | Tests only (TDD RED) |
| `refactor` | Code cleanup |
| `docs` | Planning/metadata |
| `chore` | Config, deps |

### Staging rules
```bash
# DO: Stage individually
git add src/auth.ts src/types.ts

# DON'T: Never use broad patterns
git add .      # FORBIDDEN
git add -A     # FORBIDDEN
git add src/   # FORBIDDEN
```

---

## 10. Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `run-stage.md` |
| Commands | `ace.kebab-case` | `ace.run-stage` |
| Agents | `ace-kebab` | `ace-runner` |
| Step names | snake_case | `name="load_state"` |
| Bash vars | CAPS_SNAKE | `STAGE_ARG` |
| State files | lowercase | `pulse.md` |
| Stage dirs | `NN-kebab` | `01-authentication` |

---

## 11. Context Engineering

### Run size constraint
- **2-3 tasks max per run**
- Split larger work into multiple runs
- This sidesteps JIT loading complexity

### Fresh context per agent
- Orchestrator: ~15% context
- Each subagent: 100% fresh 200k

### Quality curve
| Context | Quality |
|---------|---------|
| 0-30% | Peak |
| 30-50% | Good |
| 50-70% | Degrading |
| 70%+ | Stop and split |

---

## 12. Drift Rules

| Rule | Trigger | Action |
|------|---------|--------|
| 1 | Bug found | Auto-fix, document |
| 2 | Critical gap | Auto-add, document |
| 3 | Blocker | Auto-fix, document |
| 4 | Architectural change | STOP, ask user |

Rules 1-3: No permission needed
Rule 4: Always ask

---

## 13. Language Rules

### DO
- Imperative voice: "Execute tasks"
- Direct statements
- Technical precision

### DON'T
- Passive voice: "Tasks are executed"
- Filler: "Let me", "Just", "Simply"
- Sycophancy: "Great!", "Awesome!"

### Banned in implementation docs
- "We changed", "Previously", "No longer"
- Describe current state only

### Banned patterns
- Story points, sprint ceremonies
- Human time estimates (hours, days)
- Generic XML (`<section>`, `<item>`)

---

## 14. Anti-Patterns

### Vague tasks
```xml
<!-- BAD -->
<task type="auto">
  <name>Add authentication</name>
  <action>Implement auth</action>
</task>

<!-- GOOD -->
<task type="auto">
  <name>Create login endpoint with JWT</name>
  <files>src/app/api/auth/login/route.ts</files>
  <action>POST accepting {email, password}. Query User, compare with bcrypt. On match, create JWT with jose, set httpOnly cookie, return 200.</action>
  <verify>curl -X POST localhost:3000/api/auth/login returns 200</verify>
  <done>Valid creds → 200 + cookie. Invalid → 401.</done>
</task>
```

### Placeholder stubs (reject these)
```javascript
return <div>Component</div>   // Stub
return null                    // Stub
onClick={() => {}}             // Empty handler
```

### Commands with embedded logic
Commands should delegate to workflows, not contain 500+ lines of execution logic.

---

## 15. Prompt Security

### Review rules for prompt file changes

Any PR modifying markdown prompt files (commands, agents, workflows, templates, references) must be evaluated for:

| Threat | What to flag |
|--------|-------------|
| Hidden instructions | HTML comments (`<!-- -->`) containing directives or behavioral overrides |
| Behavioral drift | Wording changes that weaken safety boundaries, expand permissions, or alter intended behavior |
| Data exfiltration | References to external URLs, webhooks, APIs, or instructions to transmit project/user data |
| Instruction override | Phrases that attempt to override, ignore, or deprioritize existing instructions |
| Obfuscation | Base64 encoded content, zero-width Unicode characters, homoglyphs |
| Scope creep | A command/agent that does more than its name and description suggest |

### Contributor rules

- HTML comments in prompt files must contain only documentation, never instructions
- No prompt file may reference external URLs unless the feature explicitly requires it
- Every behavioral change to an existing prompt requires an explanation in the PR description

---

## 16. Checklists for New Files

### New Command
- [ ] YAML frontmatter with name, description, argument-hint, allowed-tools
- [ ] `<objective>` section
- [ ] `<execution_context>` with @-references to workflows
- [ ] `<process>` with numbered steps
- [ ] `<success_criteria>` checklist
- [ ] Delegates to workflow (not self-contained)

### New Agent
- [ ] YAML frontmatter with name, description, tools, color
- [ ] `<role>` defining identity and success
- [ ] `<execution_flow>` with `<step>` elements
- [ ] First step reads pulse.md
- [ ] Last step creates output (RECAP or structured return)
- [ ] `<success_criteria>` checklist

### New Workflow
- [ ] No YAML frontmatter
- [ ] `<purpose>` or `<overview>` explaining when to use
- [ ] `<process>` or semantic equivalent
- [ ] Steps with snake_case names
- [ ] Self-contained (can be @-referenced)

### New Template
- [ ] Title and purpose header
- [ ] Template block with placeholders
- [ ] `<purpose>` explaining what it captures
- [ ] `<lifecycle>` explaining create/update/read triggers
- [ ] Size constraint if applicable

### New Reference
- [ ] `<overview>` or `<purpose>`
- [ ] Self-contained (no external dependencies)
- [ ] Concrete examples included
- [ ] Grep-friendly patterns

---

## Meta-Principles

1. **XML for semantics, Markdown for content**
2. **Commands delegate, workflows execute**
3. **Runs are prompts, not documents**
4. **Small runs (2-3 tasks) sidestep context issues**
5. **pulse.md is the living memory**
6. **Fresh context per agent (200k each)**
7. **Atomic commits enable recovery**
8. **No enterprise patterns (solo dev + Claude)**
9. **Describe current state, not history**
10. **Drift rules 1-3 are automatic**
