---
name: ace.map-codebase
description: Analyze codebase with parallel mapper agents to produce .ace/codebase/ documents
argument-hint: "[optional: specific area to map, e.g., 'api' or 'auth']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
---

<objective>
Analyze existing codebase using parallel ace-codebase-mapper agents to produce structured codebase documents.

Each mapper agent explores a focus area and **writes documents directly** to `.ace/codebase/`. The orchestrator only receives confirmations, keeping context usage minimal.

Output: .ace/codebase/ folder with 7-8 structured documents about the codebase state.
</objective>

<execution_context>
@~/.claude/ace/workflows/map-codebase.md
</execution_context>

<context>
Focus area: $ARGUMENTS (optional - if provided, tells agents to focus on specific subsystem)

**Load project state if exists:**
Check for .ace/pulse.md - loads context if project already initialized

**This command can run:**
- Before ace.start (brownfield codebases) - creates codebase map first
- After ace.start (greenfield codebases) - updates codebase map as code evolves
- Anytime to refresh codebase understanding
</context>

<when_to_use>
**Use map-codebase for:**
- Brownfield projects before initialization (understand existing code first)
- Refreshing codebase map after significant changes
- Onboarding to an unfamiliar codebase
- Before major refactoring (understand current state)
- When pulse.md references outdated codebase info

**Skip map-codebase for:**
- Greenfield projects with no code yet (nothing to map)
- Trivial codebases (<5 files)
</when_to_use>

<process>
1. Check if .ace/codebase/ already exists (offer to refresh or skip)
2. Create .ace/codebase/ directory structure
3. Spawn 4-5 parallel ace-codebase-mapper agents (5th conditional on UI detection):
   - Agent 1: tech focus → writes STACK.md, INTEGRATIONS.md
   - Agent 2: arch focus → writes ARCHITECTURE.md, STRUCTURE.md
   - Agent 3: quality focus → writes CONVENTIONS.md, TESTING.md
   - Agent 4: concerns focus → writes CONCERNS.md
   - Agent 5: design focus (conditional) → writes DESIGN.md (only for UI codebases)
4. Wait for agents to complete, collect confirmations (NOT document contents)
5. Verify all expected documents exist with line counts (7 or 8)
6. Commit codebase map
7. Offer next steps (typically: ace.start or ace.plan-stage)
</process>

<success_criteria>
- [ ] .ace/codebase/ directory created
- [ ] All expected codebase documents (7 or 8) written by mapper agents
- [ ] Documents follow template structure
- [ ] Parallel agents completed without errors
- [ ] User knows next steps
</success_criteria>
