# Track Template

Template for `.ace/track.md`.

## File Template

### Initial Track (v1.0 Greenfield)

```markdown
# Track: [Project Name]

## Overview

[One paragraph describing the journey from start to finish]

## Stages

**Stage Numbering:**
- Integer stages (1, 2, 3): Planned milestone work
- Decimal stages (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal stages appear between their surrounding integers in numeric order.

- [ ] **Stage 1: [Name]** - [One-line description]
- [ ] **Stage 2: [Name]** - [One-line description]
- [ ] **Stage 3: [Name]** - [One-line description]
- [ ] **Stage 4: [Name]** - [One-line description]

## Stage Details

### Stage 1: [Name]
**Goal**: [What this stage delivers]
**Depends on**: Nothing (first stage)
**Requirements**: [REQ-01, REQ-02, REQ-03]
**Success Criteria** (what must be TRUE):
  1. [Observable behavior from user perspective]
  2. [Observable behavior from user perspective]
  3. [Observable behavior from user perspective]
**Runs**: [Number of runs, e.g., "3 runs" or "TBD"]

Runs:
- [ ] 01-01: [Brief description of first run]
- [ ] 01-02: [Brief description of second run]
- [ ] 01-03: [Brief description of third run]

### Stage 2: [Name]
**Goal**: [What this stage delivers]
**Depends on**: Stage 1
**Requirements**: [REQ-04, REQ-05]
**Success Criteria** (what must be TRUE):
  1. [Observable behavior from user perspective]
  2. [Observable behavior from user perspective]
**Runs**: [Number of runs]

Runs:
- [ ] 02-01: [Brief description]
- [ ] 02-02: [Brief description]

### Stage 2.1: Critical Fix (INSERTED)
**Goal**: [Urgent work inserted between stages]
**Depends on**: Stage 2
**Success Criteria** (what must be TRUE):
  1. [What the fix achieves]
**Runs**: 1 run

Runs:
- [ ] 02.1-01: [Description]

### Stage 3: [Name]
**Goal**: [What this stage delivers]
**Depends on**: Stage 2
**Requirements**: [REQ-06, REQ-07, REQ-08]
**Success Criteria** (what must be TRUE):
  1. [Observable behavior from user perspective]
  2. [Observable behavior from user perspective]
  3. [Observable behavior from user perspective]
**Runs**: [Number of runs]

Runs:
- [ ] 03-01: [Brief description]
- [ ] 03-02: [Brief description]

### Stage 4: [Name]
**Goal**: [What this stage delivers]
**Depends on**: Stage 3
**Requirements**: [REQ-09, REQ-10]
**Success Criteria** (what must be TRUE):
  1. [Observable behavior from user perspective]
  2. [Observable behavior from user perspective]
**Runs**: [Number of runs]

Runs:
- [ ] 04-01: [Brief description]

## Progress

**Execution Order:**
Stages execute in numeric order: 2 → 2.1 → 2.2 → 3 → 3.1 → 4

| Stage | Runs Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. [Name] | 0/3 | Not started | - |
| 2. [Name] | 0/2 | Not started | - |
| 3. [Name] | 0/2 | Not started | - |
| 4. [Name] | 0/1 | Not started | - |
```

<guidelines>
**Initial planning (v1.0):**
- Stage count depends on depth setting (quick: 3-5, standard: 5-8, comprehensive: 8-12)
- Each stage delivers something coherent
- Stages can have 1+ runs (split if >3 tasks or multiple subsystems)
- Runs use naming: {stage}-{run}-run.md (e.g., 01-02-run.md)
- No time estimates (this isn't enterprise PM)
- Progress table updated by run workflow
- Run count can be "TBD" initially, refined during planning

**Success criteria:**
- 2-5 observable behaviors per stage (from user's perspective)
- Cross-checked against requirements during track creation
- Flow downstream to `must_haves` in ace.plan
- Verified by audit-stage after execution
- Format: "User can [action]" or "[Thing] works/exists"

**After milestones ship:**
- Collapse completed milestones in `<details>` tags
- Add new milestone sections for upcoming work
- Keep continuous stage numbering (never restart at 01)
</guidelines>

<status_values>
- `Not started` - Haven't begun
- `In progress` - Currently working
- `Complete` - Done (add completion date)
- `Deferred` - Pushed to later (with reason)
</status_values>

### Milestone-Grouped Track (After v1.0 Ships)

After completing first milestone, reorganize with milestone groupings:

```markdown
# Track: [Project Name]

## Milestones

- ✅ **v1.0 MVP** - Stages 1-4 (shipped YYYY-MM-DD)
- 🚧 **v1.1 [Name]** - Stages 5-6 (in progress)
- 📋 **v2.0 [Name]** - Stages 7-10 (planned)

## Stages

<details>
<summary>✅ v1.0 MVP (Stages 1-4) - COMPLETED YYYY-MM-DD</summary>

### Stage 1: [Name]
**Goal**: [What this stage delivers]
**Runs**: 3 runs

Runs:
- [x] 01-01: [Brief description]
- [x] 01-02: [Brief description]
- [x] 01-03: [Brief description]

[... remaining v1.0 stages ...]

</details>

### 🚧 v1.1 [Name] (In Progress)

**Milestone Goal:** [What v1.1 delivers]

#### Stage 5: [Name]
**Goal**: [What this stage delivers]
**Depends on**: Stage 4
**Runs**: 2 runs

Runs:
- [ ] 05-01: [Brief description]
- [ ] 05-02: [Brief description]

[... remaining v1.1 stages ...]

### 📋 v2.0 [Name] (Planned)

**Milestone Goal:** [What v2.0 delivers]

[... v2.0 stages ...]

## Progress

| Stage | Milestone | Runs Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | YYYY-MM-DD |
| 2. Features | v1.0 | 2/2 | Complete | YYYY-MM-DD |
| 5. Security | v1.1 | 0/2 | Not started | - |
```

**Notes:**
- Milestone emoji: ✅ shipped, 🚧 in progress, 📋 planned
- Completed milestones collapsed in `<details>` for readability
- Current/future milestones expanded
- Continuous stage numbering (01-99)
- Progress table includes milestone column
