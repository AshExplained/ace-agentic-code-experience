# Architecture Template

Template for `.ace/codebase/ARCHITECTURE.md` - captures conceptual code organization.

**Purpose:** Document how the code is organized at a conceptual level. Complements STRUCTURE.md (which shows physical file locations).

---

## File Template

```markdown
# Architecture

**Analysis Date:** [YYYY-MM-DD]

## Pattern Overview

**Overall:** [Pattern name: e.g., "Monolithic CLI", "Serverless API", "Full-stack MVC"]

**Key Characteristics:**
- [Characteristic 1: e.g., "Single executable"]
- [Characteristic 2: e.g., "Stateless request handling"]
- [Characteristic 3: e.g., "Event-driven"]

## Layers

[Describe the conceptual layers and their responsibilities]

**[Layer Name]:**
- Purpose: [What this layer does]
- Contains: [Types of code: e.g., "route handlers", "business logic"]
- Depends on: [What it uses: e.g., "data layer only"]
- Used by: [What uses it: e.g., "API routes"]

**[Layer Name]:**
- Purpose: [What this layer does]
- Contains: [Types of code]
- Depends on: [What it uses]
- Used by: [What uses it]

## Data Flow

[Describe the typical request/execution lifecycle]

**[Flow Name] (e.g., "HTTP Request", "CLI Command", "Event Processing"):**

1. [Entry point: e.g., "User runs command"]
2. [Processing step: e.g., "Router matches path"]
3. [Processing step: e.g., "Controller validates input"]
4. [Processing step: e.g., "Service executes logic"]
5. [Output: e.g., "Response returned"]

**State Management:**
- [How state is handled: e.g., "Stateless - no persistent state", "Database per request", "In-memory cache"]

## Key Abstractions

[Core concepts/patterns used throughout the codebase]

**[Abstraction Name]:**
- Purpose: [What it represents]
- Examples: [e.g., "UserService, ProjectService"]
- Pattern: [e.g., "Singleton", "Factory", "Repository"]

**[Abstraction Name]:**
- Purpose: [What it represents]
- Examples: [Concrete examples]
- Pattern: [Pattern used]

## Entry Points

[Where execution begins]

**[Entry Point]:**
- Location: [Brief: e.g., "src/index.ts", "API Gateway triggers"]
- Triggers: [What invokes it: e.g., "CLI invocation", "HTTP request"]
- Responsibilities: [What it does: e.g., "Parse args, route to command"]

## Error Handling

**Strategy:** [How errors are handled: e.g., "Exception bubbling to top-level handler", "Per-route error middleware"]

**Patterns:**
- [Pattern: e.g., "try/catch at controller level"]
- [Pattern: e.g., "Error codes returned to user"]

## Cross-Cutting Concerns

[Aspects that affect multiple layers]

**Logging:**
- [Approach: e.g., "Winston logger, injected per-request"]

**Validation:**
- [Approach: e.g., "Zod schemas at API boundary"]

**Authentication:**
- [Approach: e.g., "JWT middleware on protected routes"]

---

*Architecture analysis: [date]*
*Update when major patterns change*
```

<good_examples>
```markdown
# Architecture

**Analysis Date:** 2025-01-20

## Pattern Overview

**Overall:** CLI Application with Plugin System

**Key Characteristics:**
- Single executable with subcommands
- Plugin-based extensibility
- File-based state (no database)
- Synchronous execution model

## Layers

**Command Layer:**
- Purpose: Parse user input and route to appropriate handler
- Contains: Command definitions, argument parsing, help text
- Location: `commands/ace.*.md`
- Depends on: Workflow layer for execution logic
- Used by: CLI entry point

**Workflow Layer:**
- Purpose: Multi-step execution procedures
- Contains: Workflow definitions called by commands
- Location: `ace/workflows/*.md`
- Depends on: Agent layer, template layer
- Used by: Command handlers

**Agent Layer:**
- Purpose: Specialized task executors
- Contains: Agent definitions with roles and tools
- Location: `agents/*.md`
- Depends on: Template layer, reference layer
- Used by: Workflows via Task tool

**Template Layer:**
- Purpose: Document structure definitions
- Contains: File templates for .ace/ state files
- Location: `ace/templates/*.md`
- Depends on: Nothing (leaf layer)
- Used by: Commands, agents

**Reference Layer:**
- Purpose: Core philosophy and guidance documents
- Contains: Pattern documentation, verification rules
- Location: `ace/references/*.md`
- Depends on: Nothing (leaf layer)
- Used by: Commands, workflows, agents

## Data Flow

**Stage Execution:**

1. User runs: `ace.run-stage`
2. Command loads pulse.md and track.md for context
3. Command delegates to run-stage workflow
4. Workflow spawns ace-runner agent via Task tool
5. Agent executes tasks, updates state files
6. Agent produces recap.md on completion
7. pulse.md updated with results

**State Management:**
- File-based: All state lives in `.ace/` directory
- No persistent in-memory state
- Each command execution is independent

## Key Abstractions

**Command:**
- Purpose: CLI slash command definition
- Examples: `commands/ace.run-stage.md`, `commands/ace.plan-stage.md`
- Pattern: Thin wrapper delegating to workflows

**Workflow:**
- Purpose: Reusable multi-step procedure
- Examples: `ace/workflows/run-stage.md`, `ace/workflows/audit-work.md`
- Pattern: Step-by-step execution with gates

**Agent:**
- Purpose: Specialized subagent with fresh context
- Examples: `agents/ace-runner.md`, `agents/ace-architect.md`
- Pattern: Spawned via Task tool with full 200k context

**Template:**
- Purpose: Reusable document structures
- Examples: brief.md, pulse.md, track.md templates
- Pattern: Markdown files with placeholder sections

## Entry Points

**Commands:**
- Location: `commands/ace.*.md`
- Triggers: User invokes slash command
- Responsibilities: Load context, delegate to workflow, report results

## Error Handling

**Strategy:** Gate-based checkpoints for user intervention

**Patterns:**
- Drift rules 1-3: Auto-fix, document
- Drift rule 4: Stop, ask user
- Gate reached: Pause for human verification

## Cross-Cutting Concerns

**State Management:**
- pulse.md is the living memory across sessions
- track.md tracks stage structure
- Both read by all commands and agents

**Context Engineering:**
- 15% context budget for orchestrator
- 100% fresh context per spawned agent
- 2-3 tasks max per run to avoid degradation

---

*Architecture analysis: 2025-01-20*
*Update when major patterns change*
```
</good_examples>

<guidelines>
**What belongs in ARCHITECTURE.md:**
- Overall architectural pattern (monolith, microservices, layered, etc.)
- Conceptual layers and their relationships
- Data flow / request lifecycle
- Key abstractions and patterns
- Entry points
- Error handling strategy
- Cross-cutting concerns (logging, auth, validation)

**What does NOT belong here:**
- Exhaustive file listings (that's STRUCTURE.md)
- Technology choices (that's STACK.md)
- Line-by-line code walkthrough (defer to code reading)
- Implementation details of specific features

**File paths ARE welcome:**
Include file paths as concrete examples of abstractions. Use backtick formatting: `src/services/user.ts`. This makes the architecture document actionable for Claude when planning.

**When filling this template:**
- Read main entry points (index, server, main)
- Identify layers by reading imports/dependencies
- Trace a typical request/command execution
- Note recurring patterns (services, controllers, repositories)
- Keep descriptions conceptual, not mechanical

**Useful for stage planning when:**
- Adding new features (where does it fit in the layers?)
- Refactoring (understanding current patterns)
- Identifying where to add code (which layer handles X?)
- Understanding dependencies between components
</guidelines>
