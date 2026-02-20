<purpose>
Orchestrate parallel codebase mapper agents to analyze codebase and produce structured documents in .renn/codebase/

Each agent has fresh context, explores a specific focus area, and **writes documents directly**. The orchestrator only receives confirmation + line counts, then writes a summary.

Output: .renn/codebase/ folder with 7-8 structured documents (8th conditional on UI detection).
</purpose>

<philosophy>
**Why dedicated mapper agents:**
- Fresh context per domain (no token contamination)
- Agents write documents directly (no context transfer back to orchestrator)
- Orchestrator only summarizes what was created (minimal context usage)
- Faster execution (agents run simultaneously)

**Document quality over length:**
Include enough detail to be useful as reference. Prioritize practical examples (especially code patterns) over arbitrary brevity.

**Always include file paths:**
Documents are reference material for Claude when planning/executing. Always include actual file paths formatted with backticks: `src/services/user.ts`.
</philosophy>

<process>

<step name="resolve_horsepower" priority="first">
Read horsepower profile for agent spawning:

```bash
HORSEPOWER=$(cat .renn/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | max | balanced | eco |
|-------|-----|----------|-----|
| renn-codebase-mapper | sonnet | haiku | haiku |

Store resolved model for use in Task calls below.
</step>

<step name="check_existing">
Check if .renn/codebase/ already exists:

```bash
ls -la .renn/codebase/ 2>/dev/null
```

**If exists:**

```
.renn/codebase/ already exists with these documents:
[List files found]

What's next?
1. Refresh - Delete existing and remap codebase
2. Update - Keep existing, only update specific documents
3. Skip - Use existing codebase map as-is
```

Wait for user response.

If "Refresh": Delete .renn/codebase/, continue to create_structure
If "Update": Ask which documents to update, continue to spawn_agents (filtered)
If "Skip": Exit workflow

**If doesn't exist:**
Continue to create_structure.
</step>

<step name="create_structure">
Create .renn/codebase/ directory:

```bash
mkdir -p .renn/codebase
```

**Expected output files:**
- STACK.md (from tech mapper)
- INTEGRATIONS.md (from tech mapper)
- ARCHITECTURE.md (from arch mapper)
- STRUCTURE.md (from arch mapper)
- CONVENTIONS.md (from quality mapper)
- TESTING.md (from quality mapper)
- CONCERNS.md (from concerns mapper)
- DESIGN.md (from design mapper, conditional -- only for UI codebases)

Continue to spawn_agents.
</step>

<step name="spawn_agents">
Spawn 4 parallel renn-codebase-mapper agents (plus conditional 5th for UI codebases).

Use Task tool with `subagent_type="renn-codebase-mapper"`, `model="{mapper_model}"`, and `run_in_background=true` for parallel execution.

**CRITICAL:** Use the dedicated `renn-codebase-mapper` agent, NOT `Explore`. The mapper agent writes documents directly.

### UI Indicator Detection

Before spawning agents, check if the codebase has UI patterns:

```bash
UI_INDICATORS=0
# Style configuration files
ls tailwind.config.* postcss.config.* .stylelintrc* 2>/dev/null && ((UI_INDICATORS++))
# Component directories
ls src/components/ components/ src/ui/ app/components/ 2>/dev/null && ((UI_INDICATORS++))
# CSS/SCSS/LESS files (excluding node_modules)
find . -maxdepth 3 \( -name "*.css" -o -name "*.scss" -o -name "*.less" \) -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null | head -1 | grep -q . && ((UI_INDICATORS++))
# Android resources
find . -name "styles.xml" -path "*/res/*" 2>/dev/null | head -1 | grep -q . && ((UI_INDICATORS++))
# iOS asset catalogs
find . -name "*.xcassets" 2>/dev/null | head -1 | grep -q . && ((UI_INDICATORS++))
```

Store `UI_INDICATORS` count for conditional 5th agent spawn.

**Agent 1: Tech Focus**

Task tool parameters:
```
subagent_type: "renn-codebase-mapper"
model: "{mapper_model}"
run_in_background: true
description: "Map codebase tech stack"
```

Prompt:
```
Focus: tech

Analyze this codebase for technology stack and external integrations.

Write these documents to .renn/codebase/:
- STACK.md - Languages, runtime, frameworks, dependencies, configuration
- INTEGRATIONS.md - External APIs, databases, auth providers, webhooks

Explore thoroughly. Write documents directly using templates. Return confirmation only.
```

**Agent 2: Architecture Focus**

Task tool parameters:
```
subagent_type: "renn-codebase-mapper"
model: "{mapper_model}"
run_in_background: true
description: "Map codebase architecture"
```

Prompt:
```
Focus: arch

Analyze this codebase architecture and directory structure.

Write these documents to .renn/codebase/:
- ARCHITECTURE.md - Pattern, layers, data flow, abstractions, entry points
- STRUCTURE.md - Directory layout, key locations, naming conventions

Explore thoroughly. Write documents directly using templates. Return confirmation only.
```

**Agent 3: Quality Focus**

Task tool parameters:
```
subagent_type: "renn-codebase-mapper"
model: "{mapper_model}"
run_in_background: true
description: "Map codebase conventions"
```

Prompt:
```
Focus: quality

Analyze this codebase for coding conventions and testing patterns.

Write these documents to .renn/codebase/:
- CONVENTIONS.md - Code style, naming, patterns, error handling
- TESTING.md - Framework, structure, mocking, coverage

Explore thoroughly. Write documents directly using templates. Return confirmation only.
```

**Agent 4: Concerns Focus**

Task tool parameters:
```
subagent_type: "renn-codebase-mapper"
model: "{mapper_model}"
run_in_background: true
description: "Map codebase concerns"
```

Prompt:
```
Focus: concerns

Analyze this codebase for technical debt, known issues, and areas of concern.

Write this document to .renn/codebase/:
- CONCERNS.md - Tech debt, bugs, security, performance, fragile areas

Explore thoroughly. Write document directly using template. Return confirmation only.
```

**Agent 5: Design Focus (conditional -- UI codebases only)**

**Only spawn if UI_INDICATORS >= 2.**

If UI_INDICATORS < 2: Log "No UI patterns detected (indicators: {UI_INDICATORS}), skipping design analysis." and skip this agent.

If UI_INDICATORS >= 2:

Task tool parameters:
```
subagent_type: "renn-codebase-mapper"
model: "{mapper_model}"
run_in_background: true
description: "Map codebase design patterns"
```

Prompt:
```
Focus: design

Analyze this codebase for visual design patterns, component inventory, and styling approach.

Write this document to .renn/codebase/:
- DESIGN.md - Color system, typography, spacing, shadows, component inventory, visual patterns, dark mode, styling technology

Explore thoroughly. Write document directly using template. Return confirmation only.
```

Continue to collect_confirmations.
</step>

<step name="collect_confirmations">
Wait for all agents to complete (4 or 5 depending on UI detection).

Read each agent's output file to collect confirmations.

**Expected confirmation format from each agent:**
```
## Mapping Complete

**Focus:** {focus}
**Documents written:**
- `.renn/codebase/{DOC1}.md` ({N} lines)
- `.renn/codebase/{DOC2}.md` ({N} lines)

Ready for orchestrator summary.
```

**What you receive:** Just file paths and line counts. NOT document contents.

If any agent failed, note the failure and continue with successful documents.

Continue to verify_output.
</step>

<step name="verify_output">
Verify all documents created successfully:

```bash
ls -la .renn/codebase/
wc -l .renn/codebase/*.md
```

**Verification checklist:**
- All expected documents exist (7 for non-UI codebases, 8 for UI codebases)
- No empty documents (each should have >20 lines)
- If 5th agent was spawned, verify DESIGN.md exists and has >20 lines

If any documents missing or empty, note which agents may have failed.

Continue to commit_codebase_map.
</step>

<step name="commit_codebase_map">
Commit the codebase map:

**Check planning config:**

```bash
COMMIT_PLANNING_DOCS=$(cat .renn/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .ace 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

**If `COMMIT_PLANNING_DOCS=false`:** Skip git operations

**If `COMMIT_PLANNING_DOCS=true` (default):**

```bash
git add .renn/codebase/*.md
git commit -m "$(cat <<'EOF'
docs: map existing codebase

- STACK.md - Technologies and dependencies
- ARCHITECTURE.md - System design and patterns
- STRUCTURE.md - Directory layout
- CONVENTIONS.md - Code style and patterns
- TESTING.md - Test structure
- INTEGRATIONS.md - External services
- CONCERNS.md - Technical debt and issues
- DESIGN.md - Visual design patterns (if UI codebase)
EOF
)"
```

Continue to offer_next.
</step>

<step name="offer_next">
Present completion summary and next steps.

**Get line counts:**
```bash
wc -l .renn/codebase/*.md
```

**Output format:**

```
Codebase mapping complete.

Created .renn/codebase/:
- STACK.md ([N] lines) - Technologies and dependencies
- ARCHITECTURE.md ([N] lines) - System design and patterns
- STRUCTURE.md ([N] lines) - Directory layout and organization
- CONVENTIONS.md ([N] lines) - Code style and patterns
- TESTING.md ([N] lines) - Test structure and practices
- INTEGRATIONS.md ([N] lines) - External services and APIs
- CONCERNS.md ([N] lines) - Technical debt and issues
- DESIGN.md ([N] lines) - Visual design patterns (UI codebases only)


---

## ▶ Next Up

**Initialize project** — use codebase context for planning

`ace.start`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- Re-run mapping: `ace.map-codebase`
- Review specific file: `cat .renn/codebase/STACK.md`
- Edit any document before proceeding

---
```

End workflow.
</step>

</process>

<success_criteria>
- .renn/codebase/ directory created
- 4-5 parallel renn-codebase-mapper agents spawned with run_in_background=true (5th conditional on UI detection)
- Agents write documents directly (orchestrator doesn't receive document contents)
- Read agent output files to collect confirmations
- All expected codebase documents exist (7 or 8 depending on UI detection)
- Clear completion summary with line counts
- User offered clear next steps in RENN style
</success_criteria>
