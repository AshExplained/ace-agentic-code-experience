---
name: renn.help
description: Show available RENN commands and usage guide
allowed-tools:
  - Read
---

<objective>
Display the complete RENN command reference.

Output ONLY the reference content below. Do NOT add:

- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
  </objective>

<reference>
# RENN Command Reference

**RENN** (Agentic Code Engine) creates hierarchical project plans optimized for solo agentic development with Claude Code.

## Quick Start

1. `/renn.start` - Initialize project (includes research, requirements, track)
2. `/renn.plan-stage 1` - Create detailed run for first stage
2b. `/renn.design-system` - Create design system for UI stages (if applicable)
2c. `/renn.design-screens 1` - Create screen prototypes (if applicable)
3. `/renn.run-stage 1` - Execute the stage

## Core Workflow

```
/renn.start → /renn.design-system (UI) → /renn.design-screens (UI) → /renn.plan-stage → /renn.run-stage → repeat
```

### Project Initialization

**`/renn.start`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel scout agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Track creation with stage breakdown and success criteria

Creates all `.renn/` artifacts:
- `brief.md` — vision and requirements
- `config.json` — workflow style (guided/turbo)
- `research/` — domain research (if selected)
- `specs.md` — scoped requirements with REQ-IDs
- `track.md` — stages mapped to requirements
- `pulse.md` — project memory

Usage: `/renn.start`

**`/renn.map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.renn/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/renn.start` on existing codebases

Usage: `/renn.map-codebase`

### Stage Planning

**`/renn.discuss-stage <number>`**
Help articulate your vision for a stage before planning.

- Captures how you imagine this stage working
- Creates intel.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel

Usage: `/renn.discuss-stage 2`

**`/renn.research-stage <number>`**
Comprehensive ecosystem research for niche/complex domains.

- Discovers standard stack, architecture patterns, pitfalls
- Creates research.md with "how experts build this" knowledge
- Use for 3D, games, audio, shaders, ML, and other specialized domains
- Goes beyond "which library" to ecosystem knowledge

Usage: `/renn.research-stage 3`

**`/renn.list-stage-assumptions <number>`**
See what Claude is planning to do before it starts.

- Shows Claude's intended approach for a stage
- Lets you course-correct if Claude misunderstood your vision
- No files created - conversational output only

Usage: `/renn.list-stage-assumptions 3`

**`/renn.plan-stage <number>`**
Create detailed execution run for a specific stage.

- Generates `.renn/stages/XX-stage-name/XX-YY-run.md`
- Breaks stage into concrete, actionable tasks
- Includes verification criteria and success measures
- Multiple runs per stage supported (XX-01, XX-02, etc.)

Usage: `/renn.plan-stage 1`
Result: Creates `.renn/stages/01-foundation/01-01-run.md`

### Design

**`/renn.design-system [--skip-ux-interview]`**
Create the project-wide design system (stylekit + components) for all UI stages.

- Runs Phase 1 of the design pipeline: UX interview, design interview, stylekit creation
- Produces `.renn/design/stylekit.yaml`, `stylekit.css`, `stylekit-preview.html`, and `components/`
- Stops after Phase 1 approval -- does NOT create screen prototypes
- Use before `/renn.design-screens` for UI stages

Usage: `/renn.design-system`

**`/renn.design-screens <stage>`**
Create screen prototypes using the existing design system.

- Runs Phase 2 of the design pipeline: screen creation, reviewer, approval gate
- Requires `.renn/design/stylekit.yaml` from a prior `/renn.design-system` run
- Generates implementation guide and commits it after screen approval
- Produces `.renn/design/screens/` specs and prototypes
- Use after `/renn.design-system` and before `/renn.plan-stage`

Usage: `/renn.design-screens 3`

**`/renn.restyle <stage>`**
Redesign a stage's visuals without re-planning.

- Requires existing design artifacts from a prior `/renn.design-system` run
- Keeps existing stylekit, creates new screen prototypes
- Preserves architecture plans (run.md files) -- only design changes

Usage: `/renn.restyle 3`

### Execution

**`/renn.run-stage <stage-number>`**
Execute all runs in a stage.

- Groups runs by batch (from frontmatter), executes batches sequentially
- Runs within each batch run in parallel via Task tool
- Verifies stage goal after all runs complete
- Updates specs.md, track.md, pulse.md

Usage: `/renn.run-stage 5`

### Quick Mode

**`/renn.dash`**
Execute small, ad-hoc tasks with RENN guarantees but skip optional agents.

Quick mode uses the same system with a shorter path:
- Spawns architect + runner (skips scout, reviewer, auditor)
- Quick tasks live in `.renn/quick/` separate from planned stages
- Updates pulse.md tracking (not track.md)

Use when you know exactly what to do and the task is small enough to not need research or auditing.

Usage: `/renn.dash`
Result: Creates `.renn/quick/NNN-slug/run.md`, `.renn/quick/NNN-slug/recap.md`

### Track Management

**`/renn.add-stage <description>`**
Add new stage to end of current milestone.

- Appends to track.md
- Uses next sequential number
- Updates stage directory structure

Usage: `/renn.add-stage "Add admin dashboard"`

**`/renn.insert-stage <after> <description>`**
Insert urgent work as decimal stage between existing stages.

- Creates intermediate stage (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains stage ordering

Usage: `/renn.insert-stage 7 "Fix critical auth bug"`
Result: Creates Stage 7.1

**`/renn.remove-stage <number>`**
Remove a future stage and renumber subsequent stages.

- Deletes stage directory and all references
- Renumbers all subsequent stages to close the gap
- Only works on future (unstarted) stages
- Git commit preserves historical record

Usage: `/renn.remove-stage 17`
Result: Stage 17 deleted, stages 18-20 become 17-19

### Milestone Management

**`/renn.new-milestone <name>`**
Start a new milestone through unified flow.

- Deep questioning to understand what you're building next
- Optional domain research (spawns 4 parallel scout agents)
- Requirements definition with scoping
- Track creation with stage breakdown

Mirrors `/renn.start` flow for brownfield projects (existing brief.md).

Usage: `/renn.new-milestone "v2.0 Features"`

**`/renn.complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates milestones.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/renn.complete-milestone 1.0.0`

### Shipping

**`/renn.ship`**
Ship your project to a deployment target.

- Detects your stack and suggests relevant platforms
- Researches deployment requirements for chosen target
- Generates and walks a deployment checklist (auto + human-gated steps)

Usage: `/renn.ship`

**`/renn.watch`**
Set up monitoring for your deployed project.

- Reads project context from brief.md and ship-target.md
- If no RENN context exists, asks you directly for stack and platform info
- Researches monitoring tools (free-tier-first) and generates a setup checklist
- Walks the checklist with auto-execution and human-gated steps

Usage: `/renn.watch`

### Progress Tracking

**`/renn.status`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from RECAP files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next run or create it if missing
- Detects 100% milestone completion

Usage: `/renn.status`

### Session Management

**`/renn.continue`**
Resume work from previous session with full context restoration.

- Reads pulse.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/renn.continue`

**`/renn.pause`**
Create context handoff when pausing work mid-stage.

- Creates .continue-here file with current state
- Updates pulse.md session continuity section
- Captures in-progress work context

Usage: `/renn.pause`

### Debugging

**`/renn.debug [issue description]`**
Systematic debugging with persistent state across context resets.

- Gathers symptoms through adaptive questioning
- Creates `.renn/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/renn.debug` with no args to resume
- Archives resolved issues to `.renn/debug/resolved/`

Usage: `/renn.debug "login button doesn't work"`
Usage: `/renn.debug` (resume active session)

### Todo Management

**`/renn.add-todo [description]`**
Capture idea or task as todo from current conversation.

- Extracts context from conversation (or uses provided description)
- Creates structured todo file in `.renn/todos/pending/`
- Infers area from file paths for grouping
- Checks for duplicates before creating
- Updates pulse.md todo count

Usage: `/renn.add-todo` (infers from conversation)
Usage: `/renn.add-todo Add auth token refresh`

**`/renn.check-todos [area]`**
List pending todos and select one to work on.

- Lists all pending todos with title, area, age
- Optional area filter (e.g., `/renn.check-todos api`)
- Loads full context for selected todo
- Routes to appropriate action (work now, add to stage, brainstorm)
- Moves todo to done/ when work begins

Usage: `/renn.check-todos`
Usage: `/renn.check-todos api`

### User Acceptance Testing

**`/renn.audit [stage]`**
Validate built features through conversational UAT.

- Extracts testable deliverables from RECAP files
- Presents tests one at a time (yes/no responses)
- Automatically diagnoses failures and creates fix runs
- Ready for re-execution if issues found

Usage: `/renn.audit 3`

### Milestone Auditing

**`/renn.audit-milestone [version]`**
Audit milestone completion against original intent.

- Reads all stage proof.md files
- Checks requirements coverage
- Spawns integration checker for cross-stage wiring
- Creates MILESTONE-AUDIT.md with gaps and tech debt

Usage: `/renn.audit-milestone`

**`/renn.plan-milestone-gaps`**
Create stages to close gaps identified by audit.

- Reads MILESTONE-AUDIT.md and groups gaps into stages
- Prioritizes by requirement priority (must/should/nice)
- Adds gap closure stages to track.md
- Ready for `/renn.plan-stage` on new stages

Usage: `/renn.plan-milestone-gaps`

### Configuration

**`/renn.settings`**
Configure workflow toggles and horsepower profile interactively.

- Toggle scout, plan reviewer, auditor agents
- Select horsepower profile (max/balanced/eco)
- Updates `.renn/config.json`

Usage: `/renn.settings`

**`/renn.set-profile <profile>`**
Quick switch horsepower profile for RENN agents.

- `max` — Opus everywhere except auditing
- `balanced` — Opus for planning, Sonnet for execution (default)
- `eco` — Sonnet for writing, Haiku for research/auditing

Usage: `/renn.set-profile eco`

### Utility Commands

**`/renn.help`**
Show this command reference.

## Files & Structure

```
.renn/
├── brief.md              # Project vision
├── track.md              # Current stage breakdown
├── pulse.md              # Project memory & context
├── config.json           # Workflow style & gates
├── todos/                # Captured ideas and tasks
│   ├── pending/          # Todos waiting to be worked on
│   └── done/             # Completed todos
├── debug/                # Active debug sessions
│   └── resolved/         # Archived resolved issues
├── codebase/             # Codebase map (brownfield projects)
│   ├── STACK.md          # Languages, frameworks, dependencies
│   ├── ARCHITECTURE.md   # Patterns, layers, data flow
│   ├── STRUCTURE.md      # Directory layout, key files
│   ├── CONVENTIONS.md    # Coding standards, naming
│   ├── TESTING.md        # Test setup, patterns
│   ├── INTEGRATIONS.md   # External services, APIs
│   └── CONCERNS.md       # Tech debt, known issues
└── stages/
    ├── 01-foundation/
    │   ├── 01-01-run.md
    │   └── 01-01-recap.md
    └── 02-core-features/
        ├── 02-01-run.md
        └── 02-01-recap.md
```

## Workflow Styles

Set during `/renn.start`:

**Guided Mode**

- Confirms each major decision
- Pauses at gates for approval
- More guidance throughout

**Turbo Mode**

- Auto-approves most decisions
- Executes runs without confirmation
- Only stops for critical gates

Change anytime by editing `.renn/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.renn/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.renn/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.renn/` is gitignored and you want project-wide searches to include it

Example config:
```json
{
  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  }
}
```

## Common Workflows

**Starting a new project:**

```
/renn.start              # Unified flow: questioning → research → requirements → track
/clear
/renn.plan-stage 1       # Create runs for first stage
/clear
/renn.run-stage 1        # Execute all runs in stage
```

For projects with UI stages, add design commands before `/renn.plan-stage`:

```
/renn.start              # Unified flow
/clear
/renn.design-system      # Create design system for all UI stages
/clear
/renn.design-screens 1   # Create screen prototypes
/clear
/renn.plan-stage 1       # Plan implementation
/clear
/renn.run-stage 1        # Execute
```

**Designing a UI stage:**

```
/renn.design-system      # Create design system for all UI stages
/clear
/renn.design-screens 2   # Create screen prototypes
/clear
/renn.plan-stage 2       # Plan implementation using design artifacts
/clear
/renn.run-stage 2        # Execute
```

**Resuming work after a break:**

```
/renn.status  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/renn.insert-stage 5 "Critical security fix"
/renn.plan-stage 5.1
/renn.run-stage 5.1
```

**Completing a milestone:**

```
/renn.complete-milestone 1.0.0
/clear
/renn.ship               # Ship to production (optional)
/clear
/renn.watch              # Set up monitoring (optional)
/clear
/renn.new-milestone      # Start next milestone
```

**Capturing ideas during work:**

```
/renn.add-todo                    # Capture from conversation context
/renn.add-todo Fix modal z-index  # Capture with explicit description
/renn.check-todos                 # Review and work on todos
/renn.check-todos api             # Filter by area
```

**Debugging an issue:**

```
/renn.debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/renn.debug                                    # Resume from where you left off
```

## Getting Help

- Read `.renn/brief.md` for project vision
- Read `.renn/pulse.md` for current context
- Check `.renn/track.md` for stage status
- Run `/renn.status` to check where you're up to
  </reference>

<process>
Output the reference content above verbatim. Do not add project-specific analysis, git status, or commentary.
</process>

<success_criteria>
- [ ] Complete command reference displayed to user
</success_criteria>
