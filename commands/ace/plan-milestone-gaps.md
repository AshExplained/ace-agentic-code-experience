---
name: ace.plan-milestone-gaps
description: Create stages to close all gaps identified by milestone audit
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Create all stages necessary to close gaps identified by `/ace.audit-milestone`.

Reads MILESTONE-AUDIT.md, groups gaps into logical stages, creates stage entries in TRACK.md, and offers to plan each stage.

One command creates all fix stages — no manual `/ace.add-stage` per gap.
</objective>

<execution_context>
<!-- Spawns ace-architect agent which has all planning expertise baked in -->
</execution_context>

<context>
**Audit results:**
Glob: .ace/v*-MILESTONE-AUDIT.md (use most recent)

**Original intent (for prioritization):**
@.ace/BRIEF.md
@.ace/SPECS.md

**Current state:**
@.ace/TRACK.md
@.ace/PULSE.md
</context>

<process>

## 1. Load Audit Results

```bash
# Find the most recent audit file
ls -t .ace/v*-MILESTONE-AUDIT.md 2>/dev/null | head -1
```

Parse YAML frontmatter to extract structured gaps:
- `gaps.requirements` — unsatisfied requirements
- `gaps.integration` — missing cross-stage connections
- `gaps.flows` — broken E2E flows

If no audit file exists or has no gaps, error:
```
No audit gaps found. Run `/ace.audit-milestone` first.
```

## 2. Prioritize Gaps

Group gaps by priority from SPECS.md:

| Priority | Action |
|----------|--------|
| `must` | Create stage, blocks milestone |
| `should` | Create stage, recommended |
| `nice` | Ask user: include or defer? |

For integration/flow gaps, infer priority from affected requirements.

## 3. Group Gaps into Stages

Cluster related gaps into logical stages:

**Grouping rules:**
- Same affected stage → combine into one fix stage
- Same subsystem (auth, API, UI) → combine
- Dependency order (fix stubs before wiring)
- Keep stages focused: 2-4 tasks each

**Example grouping:**
```
Gap: DASH-01 unsatisfied (Dashboard doesn't fetch)
Gap: Integration Stage 1→3 (Auth not passed to API calls)
Gap: Flow "View dashboard" broken at data fetch

→ Stage 6: "Wire Dashboard to API"
  - Add fetch to Dashboard.tsx
  - Include auth header in fetch
  - Handle response, update state
  - Render user data
```

## 4. Determine Stage Numbers

Find highest existing stage:
```bash
ls -d .ace/stages/*/ | sort -V | tail -1
```

New stages continue from there:
- If Stage 5 is highest, gaps become Stage 6, 7, 8...

## 5. Present Gap Closure Plan

```markdown
## Gap Closure Plan

**Milestone:** {version}
**Gaps to close:** {N} requirements, {M} integration, {K} flows

### Proposed Stages

**Stage {N}: {Name}**
Closes:
- {REQ-ID}: {description}
- Integration: {from} → {to}
Tasks: {count}

**Stage {N+1}: {Name}**
Closes:
- {REQ-ID}: {description}
- Flow: {flow name}
Tasks: {count}

{If nice-to-have gaps exist:}

### Deferred (nice-to-have)

These gaps are optional. Include them?
- {gap description}
- {gap description}

---

Create these {X} stages? (yes / adjust / defer all optional)
```

Wait for user confirmation.

## 6. Update TRACK.md

Add new stages to current milestone:

```markdown
### Stage {N}: {Name}
**Goal:** {derived from gaps being closed}
**Requirements:** {REQ-IDs being satisfied}
**Gap Closure:** Closes gaps from audit

### Stage {N+1}: {Name}
...
```

## 7. Create Stage Directories

```bash
mkdir -p ".ace/stages/{NN}-{name}"
```

## 8. Commit Track Update

**Check config:**

```bash
COMMIT_PLANNING_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .ace 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

**If `COMMIT_PLANNING_DOCS=false`:** Skip git operations

**If `COMMIT_PLANNING_DOCS=true` (default):**

```bash
git add .ace/TRACK.md
git commit -m "docs(track): add gap closure stages {N}-{M}"
```

## 9. Offer Next Steps

```markdown
## STAGE COMPLETE ✓ Gap Closure Stages Created

**Stages added:** {N} - {M}
**Gaps addressed:** {count} requirements, {count} integration, {count} flows

───────────────────────────────────────────────────────────────

## Next Up

**Plan first gap closure stage**

/ace.plan-stage {N}

<sub>/clear first — fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- /ace.run-stage {N} — if runs already exist
- cat .ace/TRACK.md — see updated track

───────────────────────────────────────────────────────────────

**After all gap stages complete:**

/ace.audit-milestone — re-audit to verify gaps closed
/ace.complete-milestone {version} — archive when audit passes
```

</process>

<gap_to_stage_mapping>

## How Gaps Become Tasks

**Requirement gap → Tasks:**
```yaml
gap:
  id: DASH-01
  description: "User sees their data"
  reason: "Dashboard exists but doesn't fetch from API"
  missing:
    - "useEffect with fetch to /api/user/data"
    - "State for user data"
    - "Render user data in JSX"

becomes:

stage: "Wire Dashboard Data"
tasks:
  - name: "Add data fetching"
    files: [src/components/Dashboard.tsx]
    action: "Add useEffect that fetches /api/user/data on mount"

  - name: "Add state management"
    files: [src/components/Dashboard.tsx]
    action: "Add useState for userData, loading, error states"

  - name: "Render user data"
    files: [src/components/Dashboard.tsx]
    action: "Replace placeholder with userData.map rendering"
```

**Integration gap → Tasks:**
```yaml
gap:
  from_stage: 1
  to_stage: 3
  connection: "Auth token → API calls"
  reason: "Dashboard API calls don't include auth header"
  missing:
    - "Auth header in fetch calls"
    - "Token refresh on 401"

becomes:

stage: "Add Auth to Dashboard API Calls"
tasks:
  - name: "Add auth header to fetches"
    files: [src/components/Dashboard.tsx, src/lib/api.ts]
    action: "Include Authorization header with token in all API calls"

  - name: "Handle 401 responses"
    files: [src/lib/api.ts]
    action: "Add interceptor to refresh token or redirect to login on 401"
```

**Flow gap → Tasks:**
```yaml
gap:
  name: "User views dashboard after login"
  broken_at: "Dashboard data load"
  reason: "No fetch call"
  missing:
    - "Fetch user data on mount"
    - "Display loading state"
    - "Render user data"

becomes:

# Usually same stage as requirement/integration gap
# Flow gaps often overlap with other gap types
```

</gap_to_stage_mapping>

<success_criteria>
- [ ] MILESTONE-AUDIT.md loaded and gaps parsed
- [ ] Gaps prioritized (must/should/nice)
- [ ] Gaps grouped into logical stages
- [ ] User confirmed stage plan
- [ ] TRACK.md updated with new stages
- [ ] Stage directories created
- [ ] Changes committed
- [ ] User knows to run `/ace.plan-stage` next
</success_criteria>
