<purpose>
Set up monitoring for a deployed project in 3 phases:

1. **ASK** -- Present project context, detect stack/platform, user selects monitoring scope
2. **RESEARCH & PLAN** -- Investigate monitoring tools, generate setup checklist
3. **WALK CHECKLIST** -- Execute auto items, gate on human items, track progress

All three phases are fully implemented.
</purpose>

<core_principle>
Context-aware recommendations, user decides scope. Detect the project stack and deployment platform automatically, but the user always declares what kind of monitoring they want. Persist the declaration so Phase 2 can research without re-asking.
</core_principle>

<process>

<step name="detect_existing_watch" priority="first">

Check for existing watch artifacts:

```bash
[ -f .ace/watch-plan.md ] && echo "EXISTING_PLAN" || echo "NO_PLAN"
[ -f .ace/watch-scope.md ] && echo "EXISTING_SCOPE" || echo "NO_SCOPE"
```

**Case 1: `.ace/watch-plan.md` exists (plan already generated)**

Read the file to extract the previous scope and status:
```bash
head -20 .ace/watch-plan.md
cat .ace/watch-scope.md 2>/dev/null
```

Present options via AskUserQuestion:
- header: "Existing Watch Plan"
- question: "Found an existing monitoring plan. What would you like to do?"
- options:
  - "Resume" (description: "Continue where you left off")
  - "Start fresh" (description: "Delete existing plan and start over")
  - "Add more tools" (description: "Keep existing monitoring, add new tools")

**If "Resume":** Skip to `phase_3_walk_checklist`. Plan exists, Phases 1-2 are done.

**If "Start fresh":** Delete all watch artifacts and continue to phase_1_ask:
```bash
rm -f .ace/watch-plan.md .ace/watch-scope.md .ace/watch-research.md
```

**If "Add more tools":** Before deleting, capture existing monitoring tools from the plan so Phase 2 can exclude them from new research:

```bash
# Extract tool names from checklist item descriptions
EXISTING_TOOLS=$(grep -E '^\- \[.\] [0-9]+\.' .ace/watch-plan.md | sed 's/.*\] [0-9]*\. \[\(auto\|gate\)\] //' | head -15)
```

Append existing tools to watch-scope.md and set Mode:

```bash
echo "" >> .ace/watch-scope.md
echo "**Existing tools:**" >> .ace/watch-scope.md
echo "$EXISTING_TOOLS" >> .ace/watch-scope.md
```

Update watch-scope.md to set `**Mode:** add-more` (replacing any existing Mode line, or appending if none).

Then delete the old plan and research files (PRESERVE watch-scope.md):

```bash
rm -f .ace/watch-plan.md .ace/watch-research.md
```

Continue to `phase_2_research_plan` (Phase 2 reads the Mode flag and Existing tools field for additive research).

**Case 2: `.ace/watch-scope.md` exists but `.ace/watch-plan.md` does NOT**

Scope declared but plan not yet generated. Display: "Found existing scope declaration. Continuing to research and plan generation..." and skip to `phase_2_research_plan`.

**Case 3: Neither file exists** -- Continue to `phase_1_ask`.

</step>

<step name="phase_1_ask">

Phase 1 has 4 sub-steps: detect project context, present summary, select monitoring scope, persist scope.

**Sub-step 1a: Detect project context (WATCH-01, WATCH-02)**

Attempt to read project context from ACE state files:
```bash
PROJECT_NAME=$(head -1 .ace/brief.md 2>/dev/null | sed 's/^# //')
PLATFORM=$(grep -m1 '^\*\*Platform:\*\*' .ace/brief.md 2>/dev/null | sed 's/\*\*Platform:\*\* //')
SHIP_TARGET=$(grep -m1 '^\*\*Target:\*\*' .ace/ship-target.md 2>/dev/null | sed 's/\*\*Target:\*\* //')
STACK=$(grep -m1 '^\*\*Stack detected:\*\*' .ace/ship-target.md 2>/dev/null | sed 's/\*\*Stack detected:\*\* //')
WHAT_THIS_IS=$(sed -n '/## What This Is/,/^##/p' .ace/brief.md 2>/dev/null | head -5 | tail -4)
```

**If PROJECT_NAME is non-empty (ACE context exists):**
- Use extracted values for project summary
- If SHIP_TARGET is non-empty: use it as the deployment platform
- If SHIP_TARGET is empty but PLATFORM is non-empty: use PLATFORM
- If neither: ask user where the project is deployed (single AskUserQuestion)

**If PROJECT_NAME is empty (no ACE context -- WATCH-02 fallback):**

Ask the user directly via AskUserQuestion (maximum 2 questions):

1. header: "Project Info" / question: "No ACE project context found. What's your project's tech stack? (e.g., Next.js with Supabase, Django with PostgreSQL, Express with MongoDB)"
   Use the response as STACK. Set PROJECT_NAME to "Your project".

2. header: "Deployment Platform" / question: "Where is your project deployed?"
   options: "Vercel" (Static sites, Next.js, serverless) | "Railway" (Full-stack apps, databases) | "Fly.io" (Docker containers, global edge) | "AWS" (EC2, ECS, Lambda, etc.) | "Other" (Tell me where it's deployed)
   If "Other": ask follow-up for the platform name. Use the response as SHIP_TARGET.

---

**Sub-step 1b: Present project summary**

Display the detected or user-provided context:
```
## Your Project

**{PROJECT_NAME}**
{WHAT_THIS_IS or ""}

**Stack:** {STACK or PLATFORM}
**Deployed to:** {SHIP_TARGET or "unknown"}
```
If no description is available (no brief.md), omit the description line.

---

**Sub-step 1c: Select monitoring scope (WATCH-03)**

Present monitoring scope options via AskUserQuestion:
- header: "Monitoring Scope"
- question: "What monitoring do you want to set up for {PROJECT_NAME}?"
- options:
  - "Errors + Uptime" (description: "Recommended -- error tracking and health checks cover 80% of issues")
  - "Full observability" (description: "Errors, uptime, analytics, and performance monitoring")
  - "Just error tracking" (description: "Catch and alert on runtime errors only")
  - "Other" (description: "Tell me what you want to monitor")

If "Other": ask follow-up with header "Custom Monitoring" / question "What do you want to monitor? (e.g., database performance, API latency, user analytics)"

Use the response as MONITORING_SCOPE. No monitoring tool names in Phase 1 -- the scope question asks WHAT to monitor, not WHICH tools to use. Phase 2 (scout research) determines specific tools.

---

**Sub-step 1d: Persist scope to watch-scope.md**

Write `.ace/watch-scope.md`:
```markdown
# Watch Scope

**Project:** {PROJECT_NAME}
**Platform:** {SHIP_TARGET}
**Stack:** {STACK}
**Monitoring scope:** {MONITORING_SCOPE}
**Declared:** {YYYY-MM-DD}
**Status:** awaiting-plan
```

Do NOT create `.ace/watch-plan.md` -- that is Phase 2's responsibility.

Display Phase 1 completion:
```
Monitoring scope declared: {MONITORING_SCOPE}

Continuing to Phase 2 (Research & Plan)...
```

</step>

<step name="phase_2_research_plan">

Phase 2 reads the declared monitoring scope, researches tools via ace-stage-scout, and generates a monitoring checklist.

---

**Sub-step 2a: Read scope and validate**

Read `.ace/watch-scope.md` to extract monitoring scope and project context:

```bash
PROJECT=$(grep -m1 '^\*\*Project:\*\*' .ace/watch-scope.md | sed 's/\*\*Project:\*\* //')
PLATFORM=$(grep -m1 '^\*\*Platform:\*\*' .ace/watch-scope.md | sed 's/\*\*Platform:\*\* //')
STACK=$(grep -m1 '^\*\*Stack:\*\*' .ace/watch-scope.md | sed 's/\*\*Stack:\*\* //')
SCOPE=$(grep -m1 '^\*\*Monitoring scope:\*\*' .ace/watch-scope.md | sed 's/\*\*Monitoring scope:\*\* //')
STATUS=$(grep -m1 '^\*\*Status:\*\*' .ace/watch-scope.md | sed 's/\*\*Status:\*\* //')
MODE=$(grep -m1 '^\*\*Mode:\*\*' .ace/watch-scope.md 2>/dev/null | sed 's/\*\*Mode:\*\* //')
```

**Status routing:**

- **If STATUS is `plan-ready`:** `.ace/watch-plan.md` already exists. Skip Phase 2 entirely and continue to Phase 3.
- **If STATUS is not `awaiting-plan` and not `plan-ready`:** Warn "Unexpected status '{STATUS}' in watch-scope.md, continuing anyway." and proceed.
- **If SCOPE is empty:** Error "No monitoring scope found in watch-scope.md. Run /ace.watch again to declare a scope." and stop execution.

---

**Sub-step 2b: Gather context for research prompt**

```bash
PROJECT_NAME=$(head -1 .ace/brief.md 2>/dev/null | sed 's/^# //')
WHAT_THIS_IS=$(sed -n '/## What This Is/,/^##/p' .ace/brief.md 2>/dev/null | head -5 | tail -4)
MODEL_PROFILE=$(cat .ace/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Resolve scout model from horsepower profile:

| horsepower | scout model |
|------------|-------------|
| max | opus |
| balanced | sonnet |
| eco | haiku |

---

**Sub-step 2c: Construct and spawn scout**

Construct a monitoring-specific research prompt with XML sections:

```markdown
<objective>
Research monitoring tools and setup steps for a {stack} project deployed on {platform}.

Answer: "What are the exact steps to set up {monitoring_scope} monitoring for this project?"
</objective>

<project_context>
**Project:** {project_name}
**Description:** {what_this_is}
**Stack:** {stack}
**Platform:** {platform}
**Monitoring scope:** {monitoring_scope}
</project_context>

<research_focus>
Research monitoring tools and setup for this specific stack and platform:

1. **Error tracking** -- SDK integration, source maps, alert configuration
2. **Uptime monitoring** -- Health check endpoints, ping services, status pages
3. **Analytics** (if scope includes) -- Page views, events, privacy-friendly options
4. **Performance monitoring** (if scope includes) -- Core Web Vitals, API latency, slow queries

For each tool:
- **Free tier limits** (mandatory) -- what is included free
- **Setup steps** -- exact CLI commands, SDK installation, config file changes
- **Automation potential** -- can this be fully set up via CLI/API, or does it require browser signup?

**CRITICAL CONSTRAINTS:**
- Recommend FREE TIER tools only. Solo dev, not enterprise.
- Prefer tools with CLI/API setup over dashboard-only tools.
- Prefer tools that are widely adopted and well-documented.
- For every step, note whether it can be done via CLI/API (automatable by Claude) or requires human action (browser signup, credential retrieval, etc.).

{add_more_context}
</research_focus>

<output>
Write findings to: .ace/watch-research.md

Structure as numbered monitoring setup steps with:
- Tool name and free tier details
- Setup steps (CLI commands or human instructions)
- Whether each step is automatable via CLI/API or requires human action
- Verification method (how to confirm the tool is working)
- Common failure modes
</output>
```

**If MODE is "add-more":** Replace `{add_more_context}` with the following section:

```markdown
**EXISTING MONITORING (do not duplicate):**
The project already has monitoring set up. The user wants to ADD MORE tools.
Do NOT recommend tools that are already configured. Focus on gaps and complementary tools.

Already configured:
{existing_tools from watch-scope.md "Existing tools:" field}
```

Read the `**Existing tools:**` field from watch-scope.md:

```bash
EXISTING_TOOLS=$(sed -n '/^\*\*Existing tools:\*\*/,/^\*\*/p' .ace/watch-scope.md | head -20)
```

**If MODE is not "add-more" (or absent):** Replace `{add_more_context}` with an empty string.

Spawn the scout:

```
Task(
  prompt=research_prompt,
  subagent_type="ace-stage-scout",
  model="{scout_model}",
  description="Research monitoring tools for {stack} on {platform}"
)
```

---

**Sub-step 2d: Handle scout return**

**If scout returns `## RESEARCH COMPLETE`:**

Display: "Research complete. Converting to monitoring checklist..."

Continue to checklist conversion below.

**If scout returns `## RESEARCH BLOCKED`:**

Display the blocker message from the scout's return. Then offer recovery options using AskUserQuestion:

- header: "Research Blocked"
- question: "The scout could not complete research for monitoring on {platform}. How would you like to proceed?"
- options:
  - "Retry research" (description: "Spawn the scout again with the same prompt")
  - "Enter plan manually" (description: "Create .ace/watch-plan.md yourself and resume")
  - "Abort" (description: "Stop the watch workflow")

**If "Retry research":** Return to sub-step 2c and spawn the scout again.

**If "Enter plan manually":** Display instructions for the expected watch-plan.md format, then stop. User creates the file and runs /ace.watch again (detect_existing_watch will find it).

**If "Abort":** Stop the workflow with message "Watch workflow aborted. Run /ace.watch to start again."

---

**Sub-step 2e: Convert research to checklist**

Read `.ace/watch-research.md` and convert the scout's monitoring research into a numbered, classified checklist. This is deterministic workflow logic performed by the orchestrator (Claude running the workflow), not another agent spawn.

**Auto/gate classification table:**

| Step Type | Tag | Rationale |
|-----------|-----|-----------|
| npm/pip/gem package install | `[auto]` | Claude runs package managers |
| SDK initialization code (write config file) | `[auto]` | Claude has Write tool |
| Create health check endpoint | `[auto]` | Claude writes code |
| Install CLI tool (e.g., `npm i -g @sentry/wizard`) | `[auto]` | Claude runs CLI |
| Configure source maps upload in build | `[auto]` | Claude modifies build config |
| Create .env entries for tool keys | `[auto]` | Claude uses Write tool |
| Set environment variables on platform via CLI | `[auto]` | Claude runs `vercel env add`, `railway variables set`, etc. |
| Git commit monitoring config | `[auto]` | Claude runs git commands |
| Account signup (Sentry, UptimeRobot, etc.) | `[gate]` | Requires browser, human identity |
| Retrieve API key/DSN from dashboard | `[gate]` | User must copy from dashboard |
| Connect external integrations (Slack, PagerDuty) | `[gate]` | OAuth flow, browser required |
| Configure alerting thresholds in dashboard | `[gate]` | Dashboard-only for most tools |
| DNS record for status page subdomain | `[gate]` | Domain registrar, propagation |
| Verify alerts are received (trigger test alert) | `[gate]` | Human confirms notification arrived |
| Visual check of monitoring dashboard | `[gate]` | Human judges if data flows correctly |

**Key rule:** When a step can be done EITHER via dashboard OR via CLI, classify as `[auto]` and use the CLI approach. Only classify as `[gate]` when NO CLI/API alternative exists.

**Conversion process:**

1. Read `.ace/watch-research.md`
2. Parse monitoring setup steps from the research
3. Classify each step as `[auto]` or `[gate]` using the table above
4. Number sequentially across all sections
5. Group into logical sections: Prerequisites, SDK Integration, Platform Configuration, Verification
6. For gate items, add an `Instructions:` sub-bullet with human-facing text explaining what the user must do
7. Target 8-15 total checklist items. Group related micro-steps into single items. Each item should be one logical action.

Write `.ace/watch-plan.md` with this format:

```markdown
# Watch Plan

**Project:** {PROJECT_NAME}
**Platform:** {PLATFORM}
**Stack:** {STACK}
**Monitoring scope:** {MONITORING_SCOPE}
**Created:** {YYYY-MM-DD}
**Status:** ready

## Prerequisites

- [ ] 1. [auto/gate] {step description}

## SDK Integration

- [ ] N. [auto/gate] {step description}

## Platform Configuration

- [ ] N. [auto/gate] {step description}

## Verification

- [ ] N. [gate/auto] {step description}
  - Instructions: {what the user needs to verify}

---
*Generated by /ace.watch Phase 2*
*Research source: ace-stage-scout*
```

Gate items always include the `Instructions:` sub-bullet. Auto items do not need it (Claude will execute them directly).

---

**Sub-step 2f: Update status and display**

Update watch-scope.md status:

```bash
sed -i 's/^\*\*Status:\*\* awaiting-plan/\*\*Status:\*\* plan-ready/' .ace/watch-scope.md
```

Count auto and gate items:

```bash
AUTO_COUNT=$(grep -c '\[auto\]' .ace/watch-plan.md)
GATE_COUNT=$(grep -c '\[gate\]' .ace/watch-plan.md)
TOTAL=$((AUTO_COUNT + GATE_COUNT))
```

Display completion message:

```
Plan generated: .ace/watch-plan.md
{TOTAL} total steps ({AUTO_COUNT} auto, {GATE_COUNT} gate)
```

Display: "Continuing to Phase 3..."

Then proceed to `phase_3_walk_checklist`.

</step>

<step name="phase_3_walk_checklist">

Phase 3 walks the monitoring checklist item by item -- executing auto items, presenting gate items for user action, and tracking progress with checkboxes and timestamps.

This phase MUST execute in the main context (NOT a Task() subagent) because it uses AskUserQuestion for gate presentation.

---

**Sub-step 3a: Initialize execution**

Read watch-plan.md and prepare for execution:

```bash
# Verify plan exists and read metadata
SCOPE=$(grep -m1 '^\*\*Monitoring scope:\*\*' .ace/watch-plan.md | sed 's/\*\*Monitoring scope:\*\* //')
STATUS=$(grep -m1 '^\*\*Status:\*\*' .ace/watch-plan.md | sed 's/\*\*Status:\*\* //')

# Read project name for display
PROJECT_NAME=$(head -1 .ace/brief.md 2>/dev/null | sed 's/^# //')

# Count items
TOTAL=$(grep -c '^\- \[.\] [0-9]' .ace/watch-plan.md)
COMPLETED=$(grep -c '^\- \[x\] [0-9]' .ace/watch-plan.md)
REMAINING=$((TOTAL - COMPLETED))
```

**If STATUS contains `paused-at`:**
Display: "Resuming from where you left off ({COMPLETED}/{TOTAL} complete)..."

**If REMAINING is 0:**
Display: "All items already complete!" and skip to sub-step 3g (completion summary).

Update status to in-progress:

```bash
sed -i 's/^\*\*Status:\*\* .*/\*\*Status:\*\* in-progress/' .ace/watch-plan.md
```

Display execution header:

```
## Setting up monitoring

{COMPLETED}/{TOTAL} steps complete, {REMAINING} remaining.
Starting execution...
```

---

**Sub-step 3b: Walk checklist items**

For each unchecked item in watch-plan.md (in order):

```bash
# Extract unchecked items from watch-plan.md
grep -n '^\- \[ \] [0-9]' .ace/watch-plan.md
```

Read each item line to extract:
- Item number (N)
- Type tag (`[auto]` or `[gate]`)
- Description (text after the tag)
- For gate items: Instructions sub-bullet (next line starting with `  - Instructions:`)

**If `[auto]`:**

1. Display: "Step {N}: {description}"
2. Interpret the description and execute the appropriate CLI commands or file operations
   - Do NOT hardcode tool-specific execution logic -- Claude interprets auto item descriptions at runtime
   - Show concise output for successful execution
3. If execution succeeds:
   - Display: "Step {N} complete"
   - Update checkbox and timestamp in watch-plan.md using sed:
     ```bash
     TIMESTAMP=$(date +%H:%M)
     sed -i "s/^- \[ \] ${ITEM_NUM}\./- [x] ${ITEM_NUM}./" .ace/watch-plan.md
     sed -i "/^\- \[x\] ${ITEM_NUM}\./s/$/ (completed ${TIMESTAMP})/" .ace/watch-plan.md
     ```
   - If the auto item modified project files (SDK install, config file creation, code changes), stage and commit with a descriptive message:
     ```bash
     git add {modified files}
     git commit -m "feat: {description of monitoring change}"
     ```
4. If execution fails:
   - Check if the error is an authentication error -> go to sub-step 3c (dynamic auth gate)
   - Otherwise -> go to sub-step 3d (error recovery)

**If `[gate]`:**

Present to user via AskUserQuestion:

- header: "Step {N}: {description}"
- question: "{Instructions text}\n\nComplete this step and confirm."
- options:
  - "Done" (description: "I've completed this step")
  - "Skip" (description: "Skip this step and continue")
  - "Come back later" (description: "Save progress and exit -- for long waits like account verification")
  - "Abort" (description: "Stop the monitoring setup entirely")

Route based on response:

- **"Done":** Update checkbox and timestamp in watch-plan.md, continue to next item:
  ```bash
  TIMESTAMP=$(date +%H:%M)
  sed -i "s/^- \[ \] ${ITEM_NUM}\./- [x] ${ITEM_NUM}./" .ace/watch-plan.md
  sed -i "/^\- \[x\] ${ITEM_NUM}\./s/$/ (completed ${TIMESTAMP})/" .ace/watch-plan.md
  ```

- **"Skip":** Mark as checked with "(skipped)" annotation, continue to next item:
  ```bash
  sed -i "s/^- \[ \] ${ITEM_NUM}\./- [x] ${ITEM_NUM}./" .ace/watch-plan.md
  sed -i "/^\- \[x\] ${ITEM_NUM}\./s/$/ (skipped)/" .ace/watch-plan.md
  ```

- **"Come back later":** Go to sub-step 3e (pause and save position)

- **"Abort":** Go to sub-step 3f (abort handling)

**After processing each item:** Update pulse.md at section boundaries (when crossing from Prerequisites to SDK Integration, to Platform Configuration, to Verification) with:
```
Status: Setting up monitoring ({completed}/{total} steps)
Last activity: {date} -- Completed monitoring step {N}: {description}
```

---

**Sub-step 3c: Dynamic authentication gate**

When an auto item fails, check the command output for authentication error patterns BEFORE falling through to generic error recovery. Auth errors are checked first because they have a specific recovery path (authenticate then retry).

Detect auth error patterns in command output or error messages:
- "Not authenticated", "Not logged in"
- "Unauthorized", "401", "403"
- "Please run {tool} login", "Please login"
- "Missing API key", "Invalid API key", "Invalid credentials"
- "Authentication required", "EAUTHUNKNOWN"

**If auth error detected:**

Present auth gate via AskUserQuestion:

- header: "Authentication Required"
- question: "{tool} requires authentication.\n\n{auth instructions based on error message -- e.g., 'Run `vercel login` in your terminal and complete browser authentication'}\n\nAuthenticate and confirm when done."
- options:
  - "Done" (description: "I've authenticated")
  - "Abort" (description: "Stop monitoring setup")

Route based on response:

- **"Done":** Verify authentication if possible (e.g., `vercel whoami`, `npm whoami`, `gh auth status`). Then retry the original auto item from the beginning of its execution logic. If retry succeeds, mark the item complete with checkbox and timestamp. If retry fails with a DIFFERENT error (not auth), fall through to sub-step 3d (error recovery).

- **"Abort":** Go to sub-step 3f (abort handling)

**Secrets safety:**
- Credentials are ALWAYS handled via gates, NEVER auto-executed
- NEVER retry with cached credentials
- NEVER auto-handle secrets or API keys
- If an auto item's error suggests providing an API key inline, create a gate instead of trying to auto-provide it

---

**Sub-step 3d: Error recovery**

When an auto item fails with a non-authentication error (sub-step 3c did not match):

Present the failure via AskUserQuestion with full error details:

- header: "Step {N} Failed"
- question: "{description} failed.\n\nCommand: {what was attempted}\nError: {full error output}\n\nHow would you like to proceed?"
- options:
  - "Retry" (description: "Try this step again")
  - "Skip" (description: "Mark as skipped and continue")
  - "Abort" (description: "Stop the monitoring setup")

Route based on response:

- **"Retry":** Re-execute the same auto item from the beginning of its execution logic (sub-step 3b auto path). The retry loop has no limit -- the user decides when to stop via Skip or Abort.

- **"Skip":** Mark the item as checked with "(skipped)" annotation, continue to next item:
  ```bash
  sed -i "s/^- \[ \] ${ITEM_NUM}\./- [x] ${ITEM_NUM}./" .ace/watch-plan.md
  sed -i "/^\- \[x\] ${ITEM_NUM}\./s/$/ (skipped)/" .ace/watch-plan.md
  ```

- **"Abort":** Go to sub-step 3f (abort handling)

**Error output:** Show verbose error output on failure (unlike success which shows concise output). The user needs full context to decide between retry, skip, and abort.

---

**Sub-step 3e: Come back later (async gate)**

When user selects "Come back later" on a gate item (for long-running operations like account verification, DNS propagation, external integration setup):

1. Update watch-plan.md Status from `in-progress` to `paused-at-{N}` where N is the current item number:
   ```bash
   sed -i "s/^\*\*Status:\*\* in-progress/\*\*Status:\*\* paused-at-${ITEM_NUM}/" .ace/watch-plan.md
   ```

2. Update pulse.md Session Continuity:
   ```
   Last activity: {date} -- Monitoring setup paused at step {N} of {TOTAL}
   Resume file: .ace/watch-plan.md
   Next action: Run /ace.watch to resume monitoring setup
   ```

3. Display exit message:
   ```
   Progress saved at step {N} of {TOTAL}.
   {COMPLETED} steps complete, {REMAINING} remaining.

   Run /ace.watch to resume from step {N}.
   ```

4. Stop execution (return from the workflow -- do NOT continue to the next item)

**Resume mechanism:** No new code needed. The existing `detect_existing_watch` step already handles resume: watch-plan.md exists -> user picks "Resume" -> Phase 3 starts -> sub-step 3a reads watch-plan.md -> finds first unchecked item -> continues from there.

---

**Sub-step 3f: Abort**

When user selects "Abort" from a gate item or error recovery:

1. Update watch-plan.md Status to `aborted`:
   ```bash
   sed -i 's/^\*\*Status:\*\* in-progress/\*\*Status:\*\* aborted/' .ace/watch-plan.md
   ```

2. Update pulse.md with abort status:
   ```
   Last activity: {date} -- Monitoring setup aborted at step {N}
   ```

3. Display abort message:
   ```
   Monitoring setup aborted at step {N}.
   {COMPLETED}/{TOTAL} steps were completed.

   Run /ace.watch to resume or restart.
   ```

4. Stop execution

---

**Sub-step 3g: Completion summary**

After all items in watch-plan.md are processed (no unchecked items remain):

1. Count results:
   ```bash
   COMPLETED=$(grep -c '^\- \[x\] [0-9]' .ace/watch-plan.md)
   SKIPPED=$(grep -c '(skipped)' .ace/watch-plan.md)
   TOTAL=$(grep -c '^\- \[.\] [0-9]' .ace/watch-plan.md)
   ```

2. Verify no unchecked items remain before declaring complete:
   ```bash
   UNCHECKED=$(grep -c '^\- \[ \] [0-9]' .ace/watch-plan.md)
   if [ "$UNCHECKED" -gt 0 ]; then
     echo "ERROR: ${UNCHECKED} unchecked items remain -- do not declare complete"
     # Return to sub-step 3b to continue processing
   fi
   ```

3. Update watch-plan.md Status to `complete`:
   ```bash
   sed -i 's/^\*\*Status:\*\* in-progress/\*\*Status:\*\* complete/' .ace/watch-plan.md
   ```

4. Update watch-scope.md Status to `monitored`:
   ```bash
   sed -i 's/^\*\*Status:\*\* plan-ready/\*\*Status:\*\* monitored/' .ace/watch-scope.md
   ```

5. Update pulse.md to reflect monitoring completion -- revert to standard format and note monitoring set up:
   ```
   Last activity: {date} -- Set up monitoring for {project_name} ({monitoring_scope})
   ```

6. Display completion summary:
   ```
   ## Monitoring Setup Complete!

   **Project:** {project_name}
   **Platform:** {platform}
   **Monitoring scope:** {monitoring_scope}
   **Steps:** {COMPLETED} completed, {SKIPPED} skipped

   ### What's Monitoring

   {List key tools set up, extracted from completed checklist items}
   ```

   If skipped items exist, list them:
   ```
   ### Skipped Steps

   {For each item with "(skipped)" annotation, list the item number and description}

   These steps were skipped and may need manual attention.
   ```

   Display next action:
   ```
   ---

   ## What's Next

   Ready to plan the next iteration? Start a new milestone:

   `/ace.new-milestone` -- define what to build next, research, plan, and create a new track

   <sub>`/clear` first -- fresh context window</sub>
   ```

**Critical details:**
- Status field transitions: `ready` -> `in-progress` -> `paused-at-N` / `complete` / `aborted`
- "Come back later" and "Abort" both STOP execution -- they do not continue the loop
- The completion summary ONLY runs when no unchecked items remain (verified with grep before declaring complete)
- watch-scope.md Status update to `monitored` only happens on completion, not on pause or abort
- pulse.md format during monitoring: `Status: Setting up monitoring ({N}/{total} steps)`, reverted on completion/abort
- Auto items that modify project files are committed individually with descriptive messages

</step>

</process>

<success_criteria>
Phase 1 (Ask):
- [ ] Re-watch detection works when .ace/watch-plan.md exists (resume/start-fresh/add-more)
- [ ] Re-watch detection handles scope-only state (Phase 1 done, Phase 2 pending)
- [ ] Project context extracted from brief.md and ship-target.md when available
- [ ] No-context fallback asks user directly for stack and platform (WATCH-02)
- [ ] Monitoring scope selected via AskUserQuestion with 4 options (WATCH-03)
- [ ] Scope persisted to .ace/watch-scope.md with project metadata
- [ ] .ace/watch-plan.md is NOT created by Phase 1
- [ ] No monitoring tool names appear in Phase 1

Phase 2 (Research & Plan):
- [ ] ace-stage-scout spawned with monitoring-specific research prompt
- [ ] Scout research converted to numbered checklist with auto/gate classification
- [ ] .ace/watch-plan.md created with project metadata, scope, and checklist items
- [ ] watch-scope.md status updated from awaiting-plan to plan-ready
- [ ] Auto items prefer CLI commands over dashboard instructions
- [ ] Add-more mode excludes existing tools from research

Phase 3 (Walk Checklist):
- [ ] Phase 3 walks checklist items with auto-execution and gate presentation
- [ ] Auto items interpreted and executed by Claude at runtime
- [ ] Auto items that modify project files are committed individually
- [ ] Gate items presented via AskUserQuestion with Done/Skip/Come back later/Abort
- [ ] Auth errors in auto items create dynamic authentication gates before retry
- [ ] Failed auto items offer retry/skip/abort recovery
- [ ] Checkbox updates use sed with HH:MM timestamps
- [ ] Skipped items use `- [x]` with "(skipped)" annotation
- [ ] Async gates save position for resume via "Come back later"
- [ ] Completion summary with monitoring-specific details (tools, scope, platform)
- [ ] watch-plan.md Status transitions: ready -> in-progress -> complete/paused/aborted
- [ ] watch-scope.md updated to monitored on completion
- [ ] pulse.md reflects monitoring progress at section boundaries
- [ ] Completion summary suggests /ace.new-milestone as the next action (WATCH-12)
</success_criteria>
