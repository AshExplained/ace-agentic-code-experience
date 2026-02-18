---
name: ace.help
description: Show available ACE commands and usage guide
allowed-tools:
  - Read
---

<objective>
Display the complete ACE command reference.

Output ONLY the reference content below. Do NOT add:

- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
  </objective>

<reference>
# ACE Command Reference

**ACE** (Agentic Code Engine) creates hierarchical project plans optimized for solo agentic development with Claude Code.

## Quick Start

1. `/ace.start` - Initialize project (includes research, requirements, track)
2. `/ace.plan-stage 1` - Create detailed run for first stage
2b. `/ace.design-system` - Create design system for UI stages (if applicable)
2c. `/ace.design-screens 1` - Create screen prototypes (if applicable)
3. `/ace.run-stage 1` - Execute the stage

## Core Workflow

```
/ace.start → /ace.design-system (UI) → /ace.design-screens (UI) → /ace.plan-stage → /ace.run-stage → repeat
```

### Project Initialization

**`/ace.start`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel scout agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Track creation with stage breakdown and success criteria

Creates all `.ace/` artifacts:
- `brief.md` — vision and requirements
- `config.json` — workflow style (guided/turbo)
- `research/` — domain research (if selected)
- `specs.md` — scoped requirements with REQ-IDs
- `track.md` — stages mapped to requirements
- `pulse.md` — project memory

Usage: `/ace.start`

**`/ace.map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.ace/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/ace.start` on existing codebases

Usage: `/ace.map-codebase`

### Stage Planning

**`/ace.discuss-stage <number>`**
Help articulate your vision for a stage before planning.

- Captures how you imagine this stage working
- Creates intel.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel

Usage: `/ace.discuss-stage 2`

**`/ace.research-stage <number>`**
Comprehensive ecosystem research for niche/complex domains.

- Discovers standard stack, architecture patterns, pitfalls
- Creates research.md with "how experts build this" knowledge
- Use for 3D, games, audio, shaders, ML, and other specialized domains
- Goes beyond "which library" to ecosystem knowledge

Usage: `/ace.research-stage 3`

**`/ace.list-stage-assumptions <number>`**
See what Claude is planning to do before it starts.

- Shows Claude's intended approach for a stage
- Lets you course-correct if Claude misunderstood your vision
- No files created - conversational output only

Usage: `/ace.list-stage-assumptions 3`

**`/ace.plan-stage <number>`**
Create detailed execution run for a specific stage.

- Generates `.ace/stages/XX-stage-name/XX-YY-run.md`
- Breaks stage into concrete, actionable tasks
- Includes verification criteria and success measures
- Multiple runs per stage supported (XX-01, XX-02, etc.)

Usage: `/ace.plan-stage 1`
Result: Creates `.ace/stages/01-foundation/01-01-run.md`

### Design

**`/ace.design-system [--skip-ux-interview]`**
Create the project-wide design system (stylekit + components) for all UI stages.

- Runs Phase 1 of the design pipeline: UX interview, design interview, stylekit creation
- Produces `.ace/design/stylekit.yaml`, `stylekit.css`, `stylekit-preview.html`, and `components/`
- Stops after Phase 1 approval -- does NOT create screen prototypes
- Use before `/ace.design-screens` for UI stages

Usage: `/ace.design-system`

**`/ace.design-screens <stage>`**
Create screen prototypes using the existing design system.

- Runs Phase 2 of the design pipeline: screen creation, reviewer, approval gate
- Requires `.ace/design/stylekit.yaml` from a prior `/ace.design-system` run
- Generates implementation guide and commits it after screen approval
- Produces `.ace/design/screens/` specs and prototypes
- Use after `/ace.design-system` and before `/ace.plan-stage`

Usage: `/ace.design-screens 3`

**`/ace.restyle <stage>`**
Redesign a stage's visuals without re-planning.

- Requires existing design artifacts from a prior `/ace.design-system` run
- Keeps existing stylekit, creates new screen prototypes
- Preserves architecture plans (run.md files) -- only design changes

Usage: `/ace.restyle 3`

### Execution

**`/ace.run-stage <stage-number>`**
Execute all runs in a stage.

- Groups runs by batch (from frontmatter), executes batches sequentially
- Runs within each batch run in parallel via Task tool
- Verifies stage goal after all runs complete
- Updates specs.md, track.md, pulse.md

Usage: `/ace.run-stage 5`

### Quick Mode

**`/ace.dash`**
Execute small, ad-hoc tasks with ACE guarantees but skip optional agents.

Quick mode uses the same system with a shorter path:
- Spawns architect + runner (skips scout, reviewer, auditor)
- Quick tasks live in `.ace/quick/` separate from planned stages
- Updates pulse.md tracking (not track.md)

Use when you know exactly what to do and the task is small enough to not need research or auditing.

Usage: `/ace.dash`
Result: Creates `.ace/quick/NNN-slug/run.md`, `.ace/quick/NNN-slug/recap.md`

### Track Management

**`/ace.add-stage <description>`**
Add new stage to end of current milestone.

- Appends to track.md
- Uses next sequential number
- Updates stage directory structure

Usage: `/ace.add-stage "Add admin dashboard"`

**`/ace.insert-stage <after> <description>`**
Insert urgent work as decimal stage between existing stages.

- Creates intermediate stage (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains stage ordering

Usage: `/ace.insert-stage 7 "Fix critical auth bug"`
Result: Creates Stage 7.1

**`/ace.remove-stage <number>`**
Remove a future stage and renumber subsequent stages.

- Deletes stage directory and all references
- Renumbers all subsequent stages to close the gap
- Only works on future (unstarted) stages
- Git commit preserves historical record

Usage: `/ace.remove-stage 17`
Result: Stage 17 deleted, stages 18-20 become 17-19

### Milestone Management

**`/ace.new-milestone <name>`**
Start a new milestone through unified flow.

- Deep questioning to understand what you're building next
- Optional domain research (spawns 4 parallel scout agents)
- Requirements definition with scoping
- Track creation with stage breakdown

Mirrors `/ace.start` flow for brownfield projects (existing brief.md).

Usage: `/ace.new-milestone "v2.0 Features"`

**`/ace.complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates milestones.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/ace.complete-milestone 1.0.0`

### Progress Tracking

**`/ace.status`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from RECAP files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next run or create it if missing
- Detects 100% milestone completion

Usage: `/ace.status`

### Session Management

**`/ace.continue`**
Resume work from previous session with full context restoration.

- Reads pulse.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/ace.continue`

**`/ace.pause`**
Create context handoff when pausing work mid-stage.

- Creates .continue-here file with current state
- Updates pulse.md session continuity section
- Captures in-progress work context

Usage: `/ace.pause`

### Debugging

**`/ace.debug [issue description]`**
Systematic debugging with persistent state across context resets.

- Gathers symptoms through adaptive questioning
- Creates `.ace/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/ace.debug` with no args to resume
- Archives resolved issues to `.ace/debug/resolved/`

Usage: `/ace.debug "login button doesn't work"`
Usage: `/ace.debug` (resume active session)

### Todo Management

**`/ace.add-todo [description]`**
Capture idea or task as todo from current conversation.

- Extracts context from conversation (or uses provided description)
- Creates structured todo file in `.ace/todos/pending/`
- Infers area from file paths for grouping
- Checks for duplicates before creating
- Updates pulse.md todo count

Usage: `/ace.add-todo` (infers from conversation)
Usage: `/ace.add-todo Add auth token refresh`

**`/ace.check-todos [area]`**
List pending todos and select one to work on.

- Lists all pending todos with title, area, age
- Optional area filter (e.g., `/ace.check-todos api`)
- Loads full context for selected todo
- Routes to appropriate action (work now, add to stage, brainstorm)
- Moves todo to done/ when work begins

Usage: `/ace.check-todos`
Usage: `/ace.check-todos api`

### User Acceptance Testing

**`/ace.audit [stage]`**
Validate built features through conversational UAT.

- Extracts testable deliverables from RECAP files
- Presents tests one at a time (yes/no responses)
- Automatically diagnoses failures and creates fix runs
- Ready for re-execution if issues found

Usage: `/ace.audit 3`

### Milestone Auditing

**`/ace.audit-milestone [version]`**
Audit milestone completion against original intent.

- Reads all stage proof.md files
- Checks requirements coverage
- Spawns integration checker for cross-stage wiring
- Creates MILESTONE-AUDIT.md with gaps and tech debt

Usage: `/ace.audit-milestone`

**`/ace.plan-milestone-gaps`**
Create stages to close gaps identified by audit.

- Reads MILESTONE-AUDIT.md and groups gaps into stages
- Prioritizes by requirement priority (must/should/nice)
- Adds gap closure stages to track.md
- Ready for `/ace.plan-stage` on new stages

Usage: `/ace.plan-milestone-gaps`

### Configuration

**`/ace.settings`**
Configure workflow toggles and horsepower profile interactively.

- Toggle scout, plan reviewer, auditor agents
- Select horsepower profile (max/balanced/eco)
- Updates `.ace/config.json`

Usage: `/ace.settings`

**`/ace.set-profile <profile>`**
Quick switch horsepower profile for ACE agents.

- `max` — Opus everywhere except auditing
- `balanced` — Opus for planning, Sonnet for execution (default)
- `eco` — Sonnet for writing, Haiku for research/auditing

Usage: `/ace.set-profile eco`

### Utility Commands

**`/ace.help`**
Show this command reference.

## Files & Structure

```
.ace/
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

Set during `/ace.start`:

**Guided Mode**

- Confirms each major decision
- Pauses at gates for approval
- More guidance throughout

**Turbo Mode**

- Auto-approves most decisions
- Executes runs without confirmation
- Only stops for critical gates

Change anytime by editing `.ace/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.ace/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.ace/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.ace/` is gitignored and you want project-wide searches to include it

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
/ace.start              # Unified flow: questioning → research → requirements → track
/clear
/ace.plan-stage 1       # Create runs for first stage
/clear
/ace.run-stage 1        # Execute all runs in stage
```

For projects with UI stages, add design commands before `/ace.plan-stage`:

```
/ace.start              # Unified flow
/clear
/ace.design-system      # Create design system for all UI stages
/clear
/ace.design-screens 1   # Create screen prototypes
/clear
/ace.plan-stage 1       # Plan implementation
/clear
/ace.run-stage 1        # Execute
```

**Designing a UI stage:**

```
/ace.design-system      # Create design system for all UI stages
/clear
/ace.design-screens 2   # Create screen prototypes
/clear
/ace.plan-stage 2       # Plan implementation using design artifacts
/clear
/ace.run-stage 2        # Execute
```

**Resuming work after a break:**

```
/ace.status  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/ace.insert-stage 5 "Critical security fix"
/ace.plan-stage 5.1
/ace.run-stage 5.1
```

**Completing a milestone:**

```
/ace.complete-milestone 1.0.0
/clear
/ace.new-milestone  # Start next milestone (questioning → research → requirements → track)
```

**Capturing ideas during work:**

```
/ace.add-todo                    # Capture from conversation context
/ace.add-todo Fix modal z-index  # Capture with explicit description
/ace.check-todos                 # Review and work on todos
/ace.check-todos api             # Filter by area
```

**Debugging an issue:**

```
/ace.debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/ace.debug                                    # Resume from where you left off
```

## Getting Help

- Read `.ace/brief.md` for project vision
- Read `.ace/pulse.md` for current context
- Check `.ace/track.md` for stage status
- Run `/ace.status` to check where you're up to
  </reference>

<process>
Output the reference content above verbatim. Do not add project-specific analysis, git status, or commentary.
</process>

<success_criteria>
- [ ] Complete command reference displayed to user
</success_criteria>
