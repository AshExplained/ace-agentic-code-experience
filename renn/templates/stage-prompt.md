# Stage Prompt Template

> **Note:** Planning methodology is in `agents/renn-architect.md`.
> This template defines the run.md output format that the agent produces.

Template for `.renn/stages/XX-name/{stage}-{run}-run.md` - executable stage runs optimized for parallel execution.

**Naming:** Use `{stage}-{run}-run.md` format (e.g., `01-02-run.md` for Stage 1, Run 2)

---

## File Template

```markdown
---
stage: XX-name
run: NN
type: execute
batch: N                     # Execution batch (1, 2, 3...). Pre-computed at plan time.
depends_on: []              # Run IDs this run requires (e.g., ["01-01"]).
files_modified: []          # Files this run modifies.
autonomous: true            # false if run has gates requiring user interaction
user_setup: []              # Human-required setup Claude cannot automate (see below)

# Goal-backward verification (derived during planning, verified after execution)
must_haves:
  truths: []                # Observable behaviors that must be true for goal achievement
  artifacts: []             # Files that must exist with real implementation
  key_links: []             # Critical connections between artifacts
---

<objective>
[What this run accomplishes]

Purpose: [Why this matters for the project]
Output: [What artifacts will be created]
</objective>

<execution_context>
@~/.claude/renn/workflows/run-plan.md
@~/.claude/renn/templates/recap.md
[If run contains gate tasks (type="checkpoint:*"), add:]
@~/.claude/renn/references/gates.md
</execution_context>

<context>
@.renn/brief.md
@.renn/track.md
@.renn/pulse.md

# Only reference prior run RECAPs if genuinely needed:
# - This run uses types/exports from prior run
# - Prior run made decision that affects this run
# Do NOT reflexively chain: Run 02 refs 01, Run 03 refs 02...

[Relevant source files:]
@src/path/to/relevant.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: [Action-oriented name]</name>
  <files>path/to/file.ext, another/file.ext</files>
  <action>[Specific implementation - what to do, how to do it, what to avoid and WHY]</action>
  <verify>[Command or check to prove it worked]</verify>
  <done>[Measurable acceptance criteria]</done>
</task>

<task type="auto">
  <name>Task 2: [Action-oriented name]</name>
  <files>path/to/file.ext</files>
  <action>[Specific implementation]</action>
  <verify>[Command or check]</verify>
  <done>[Acceptance criteria]</done>
</task>

<!-- For gate task examples and patterns, see @~/.claude/renn/references/gates.md -->
<!-- Key rule: Claude starts dev server BEFORE human-verify gates. User only visits URLs. -->

<task type="checkpoint:decision" gate="blocking">
  <decision>[What needs deciding]</decision>
  <context>[Why this decision matters]</context>
  <options>
    <option id="option-a"><name>[Name]</name><pros>[Benefits]</pros><cons>[Tradeoffs]</cons></option>
    <option id="option-b"><name>[Name]</name><pros>[Benefits]</pros><cons>[Tradeoffs]</cons></option>
  </options>
  <resume-signal>Select: option-a or option-b</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>[What Claude built] - server running at [URL]</what-built>
  <how-to-verify>Visit [URL] and verify: [visual checks only, NO CLI commands]</how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
Before declaring run complete:
- [ ] [Specific test command]
- [ ] [Build/type check passes]
- [ ] [Behavior verification]
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- No errors or warnings introduced
- [Run-specific criteria]
  </success_criteria>

<output>
After completion, create `.renn/stages/XX-name/{stage}-{run}-recap.md`
</output>
```

---

## Frontmatter Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `stage` | Yes | Stage identifier (e.g., `01-foundation`) |
| `run` | Yes | Run number within stage (e.g., `01`, `02`) |
| `type` | Yes | Always `execute` for standard runs, `tdd` for TDD runs |
| `batch` | Yes | Execution batch number (1, 2, 3...). Pre-computed at plan time. |
| `depends_on` | Yes | Array of run IDs this run requires. |
| `files_modified` | Yes | Files this run touches. |
| `autonomous` | Yes | `true` if no gates, `false` if has gates |
| `user_setup` | No | Array of human-required setup items (external services) |
| `must_haves` | Yes | Goal-backward verification criteria (see below) |

**Batch is pre-computed:** Batch numbers are assigned during `/renn.plan-stage`. Run-stage reads `batch` directly from frontmatter and groups runs by batch number. No runtime dependency analysis needed.

**Must-haves enable verification:** The `must_haves` field carries goal-backward requirements from planning to execution. After all runs complete, run-stage spawns a verification subagent that checks these criteria against the actual codebase.

---

## Parallel vs Sequential

<parallel_examples>

**Batch 1 candidates (parallel):**

```yaml
# Run 01 - User feature
batch: 1
depends_on: []
files_modified: [src/models/user.ts, src/api/users.ts]
autonomous: true

# Run 02 - Product feature (no overlap with Run 01)
batch: 1
depends_on: []
files_modified: [src/models/product.ts, src/api/products.ts]
autonomous: true

# Run 03 - Order feature (no overlap)
batch: 1
depends_on: []
files_modified: [src/models/order.ts, src/api/orders.ts]
autonomous: true
```

All three run in parallel (Batch 1) - no dependencies, no file conflicts.

**Sequential (genuine dependency):**

```yaml
# Run 01 - Auth foundation
batch: 1
depends_on: []
files_modified: [src/lib/auth.ts, src/middleware/auth.ts]
autonomous: true

# Run 02 - Protected features (needs auth)
batch: 2
depends_on: ["01"]
files_modified: [src/features/dashboard.ts]
autonomous: true
```

Run 02 in Batch 2 waits for Run 01 in Batch 1 - genuine dependency on auth types/middleware.

**Gate run:**

```yaml
# Run 03 - UI with verification
batch: 3
depends_on: ["01", "02"]
files_modified: [src/components/Dashboard.tsx]
autonomous: false  # Has checkpoint:human-verify
```

Batch 3 runs after Batches 1 and 2. Pauses at gate, orchestrator presents to user, resumes on approval.

</parallel_examples>

---

## Context Section

**Parallel-aware context:**

```markdown
<context>
@.renn/brief.md
@.renn/track.md
@.renn/pulse.md

# Only include RECAP refs if genuinely needed:
# - This run imports types from prior run
# - Prior run made decision affecting this run
# - Prior run's output is input to this run
#
# Independent runs need NO prior RECAP references.
# Do NOT reflexively chain: 02 refs 01, 03 refs 02...

@src/relevant/source.ts
</context>
```

**Bad pattern (creates false dependencies):**
```markdown
<context>
@.renn/stages/03-features/03-01-recap.md  # Just because it's earlier
@.renn/stages/03-features/03-02-recap.md  # Reflexive chaining
</context>
```

---

## Scope Guidance

**Run sizing:**

- 2-3 tasks per run
- ~50% context usage maximum
- Complex stages: Multiple focused runs, not one large run

**When to split:**

- Different subsystems (auth vs API vs UI)
- >3 tasks
- Risk of context overflow
- TDD candidates - separate runs

**Vertical slices preferred:**

```
PREFER: Run 01 = User (model + API + UI)
        Run 02 = Product (model + API + UI)

AVOID:  Run 01 = All models
        Run 02 = All APIs
        Run 03 = All UIs
```

---

## TDD Runs

TDD features get dedicated runs with `type: tdd`.

**Heuristic:** Can you write `expect(fn(input)).toBe(output)` before writing `fn`?
→ Yes: Create a TDD run
→ No: Standard task in standard run

See `~/.claude/renn/references/tdd.md` for TDD run structure.

---

## Task Types

| Type | Use For | Autonomy |
|------|---------|----------|
| `auto` | Everything Claude can do independently | Fully autonomous |
| `checkpoint:human-verify` | Visual/functional verification | Pauses, returns to orchestrator |
| `checkpoint:decision` | Implementation choices | Pauses, returns to orchestrator |
| `checkpoint:human-action` | Truly unavoidable manual steps (rare) | Pauses, returns to orchestrator |

**Gate behavior in parallel execution:**
- Run runs until gate
- Agent returns with gate details + agent_id
- Orchestrator presents to user
- User responds
- Orchestrator resumes agent with `resume: agent_id`

---

## Examples

**Autonomous parallel run:**

```markdown
---
stage: 03-features
run: 01
type: execute
batch: 1
depends_on: []
files_modified: [src/features/user/model.ts, src/features/user/api.ts, src/features/user/UserList.tsx]
autonomous: true
---

<objective>
Implement complete User feature as vertical slice.

Purpose: Self-contained user management that can run parallel to other features.
Output: User model, API endpoints, and UI components.
</objective>

<context>
@.renn/brief.md
@.renn/track.md
@.renn/pulse.md
</context>

<tasks>
<task type="auto">
  <name>Task 1: Create User model</name>
  <files>src/features/user/model.ts</files>
  <action>Define User type with id, email, name, createdAt. Export TypeScript interface.</action>
  <verify>tsc --noEmit passes</verify>
  <done>User type exported and usable</done>
</task>

<task type="auto">
  <name>Task 2: Create User API endpoints</name>
  <files>src/features/user/api.ts</files>
  <action>GET /users (list), GET /users/:id (single), POST /users (create). Use User type from model.</action>
  <verify>curl tests pass for all endpoints</verify>
  <done>All CRUD operations work</done>
</task>
</tasks>

<verification>
- [ ] npm run build succeeds
- [ ] API endpoints respond correctly
</verification>

<success_criteria>
- All tasks completed
- User feature works end-to-end
</success_criteria>

<output>
After completion, create `.renn/stages/03-features/03-01-recap.md`
</output>
```

**Run with gate (non-autonomous):**

```markdown
---
stage: 03-features
run: 03
type: execute
batch: 2
depends_on: ["03-01", "03-02"]
files_modified: [src/components/Dashboard.tsx]
autonomous: false
---

<objective>
Build dashboard with visual verification.

Purpose: Integrate user and product features into unified view.
Output: Working dashboard component.
</objective>

<execution_context>
@~/.claude/renn/workflows/run-plan.md
@~/.claude/renn/templates/recap.md
@~/.claude/renn/references/gates.md
</execution_context>

<context>
@.renn/brief.md
@.renn/track.md
@.renn/stages/03-features/03-01-recap.md
@.renn/stages/03-features/03-02-recap.md
</context>

<tasks>
<task type="auto">
  <name>Task 1: Build Dashboard layout</name>
  <files>src/components/Dashboard.tsx</files>
  <action>Create responsive grid with UserList and ProductList components. Use Tailwind for styling.</action>
  <verify>npm run build succeeds</verify>
  <done>Dashboard renders without errors</done>
</task>

<!-- Gate pattern: Claude starts server, user visits URL. See gates.md for full patterns. -->
<task type="auto">
  <name>Start dev server</name>
  <action>Run `npm run dev` in background, wait for ready</action>
  <verify>curl localhost:3000 returns 200</verify>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Dashboard - server at http://localhost:3000</what-built>
  <how-to-verify>Visit localhost:3000/dashboard. Check: desktop grid, mobile stack, no scroll issues.</how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>
</tasks>

<verification>
- [ ] npm run build succeeds
- [ ] Visual verification passed
</verification>

<success_criteria>
- All tasks completed
- User approved visual layout
</success_criteria>

<output>
After completion, create `.renn/stages/03-features/03-03-recap.md`
</output>
```

---

## Anti-Patterns

**Bad: Reflexive dependency chaining**
```yaml
depends_on: ["03-01"]  # Just because 01 comes before 02
```

**Bad: Horizontal layer grouping**
```
Run 01: All models
Run 02: All APIs (depends on 01)
Run 03: All UIs (depends on 02)
```

**Bad: Missing autonomy flag**
```yaml
# Has gate but no autonomous: false
depends_on: []
files_modified: [...]
# autonomous: ???  <- Missing!
```

**Bad: Vague tasks**
```xml
<task type="auto">
  <name>Set up authentication</name>
  <action>Add auth to the app</action>
</task>
```

---

<guidelines>

## Guidelines

- Always use XML structure for Claude parsing
- Include `batch`, `depends_on`, `files_modified`, `autonomous` in every run
- Prefer vertical slices over horizontal layers
- Only reference prior RECAPs when genuinely needed
- Group gates with related auto tasks in same run
- 2-3 tasks per run, ~50% context max

</guidelines>

---

## User Setup (External Services)

When a run introduces external services requiring human configuration, declare in frontmatter:

```yaml
user_setup:
  - service: stripe
    why: "Payment processing requires API keys"
    env_vars:
      - name: STRIPE_SECRET_KEY
        source: "Stripe Dashboard → Developers → API keys → Secret key"
      - name: STRIPE_WEBHOOK_SECRET
        source: "Stripe Dashboard → Developers → Webhooks → Signing secret"
    dashboard_config:
      - task: "Create webhook endpoint"
        location: "Stripe Dashboard → Developers → Webhooks → Add endpoint"
        details: "URL: https://[your-domain]/api/webhooks/stripe"
    local_dev:
      - "stripe listen --forward-to localhost:3000/api/webhooks/stripe"
```

**The automation-first rule:** `user_setup` contains ONLY what Claude literally cannot do:
- Account creation (requires human signup)
- Secret retrieval (requires dashboard access)
- Dashboard configuration (requires human in browser)

**NOT included:** Package installs, code changes, file creation, CLI commands Claude can run.

**Result:** Run-stage generates `{stage}-USER-SETUP.md` with checklist for the user.

See `~/.claude/renn/templates/user-setup.md` for full schema and examples

---

## Must-Haves (Goal-Backward Verification)

The `must_haves` field defines what must be TRUE for the stage goal to be achieved. Derived during planning, verified after execution.

**Structure:**

```yaml
must_haves:
  truths:
    - "User can see existing messages"
    - "User can send a message"
    - "Messages persist across refresh"
  artifacts:
    - path: "src/components/Chat.tsx"
      provides: "Message list rendering"
      min_lines: 30
    - path: "src/app/api/chat/route.ts"
      provides: "Message CRUD operations"
      exports: ["GET", "POST"]
    - path: "prisma/schema.prisma"
      provides: "Message model"
      contains: "model Message"
  key_links:
    - from: "src/components/Chat.tsx"
      to: "/api/chat"
      via: "fetch in useEffect"
      pattern: "fetch.*api/chat"
    - from: "src/app/api/chat/route.ts"
      to: "prisma.message"
      via: "database query"
      pattern: "prisma\\.message\\.(find|create)"
```

**Field descriptions:**

| Field | Purpose |
|-------|---------|
| `truths` | Observable behaviors from user perspective. Each must be testable. |
| `artifacts` | Files that must exist with real implementation. |
| `artifacts[].path` | File path relative to project root. |
| `artifacts[].provides` | What this artifact delivers. |
| `artifacts[].min_lines` | Optional. Minimum lines to be considered substantive. |
| `artifacts[].exports` | Optional. Expected exports to verify. |
| `artifacts[].contains` | Optional. Pattern that must exist in file. |
| `key_links` | Critical connections between artifacts. |
| `key_links[].from` | Source artifact. |
| `key_links[].to` | Target artifact or endpoint. |
| `key_links[].via` | How they connect (description). |
| `key_links[].pattern` | Optional. Regex to verify connection exists. |

**Why this matters:**

Task completion ≠ Goal achievement. A task "create chat component" can complete by creating a placeholder. The `must_haves` field captures what must actually work, enabling verification to catch gaps before they compound.

**Verification flow:**

1. Plan-stage derives must_haves from stage goal (goal-backward)
2. Must_haves written to run.md frontmatter
3. Run-stage runs all runs
4. Verification subagent checks must_haves against codebase
5. Gaps found → fix runs created → execute → re-verify
6. All must_haves pass → stage complete

See `~/.claude/renn/workflows/audit-stage.md` for verification logic.
