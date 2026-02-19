<purpose>
Ship the project to a deployment target in 3 phases:

1. **ASK** -- Present project summary, detect stack, suggest platforms, user declares target (this phase)
2. **RESEARCH & PLAN** -- Investigate target requirements, generate deployment checklist (Stage 39)
3. **WALK CHECKLIST** -- Execute auto items, gate on human items, track progress (Stage 40)

All three phases are fully implemented.
</purpose>

<core_principle>
Smart defaults, user decides. Detect the stack automatically, suggest the best-fit platforms, but the user always declares the final target. Persist the declaration so future phases can act on it without re-asking.
</core_principle>

<process>

<step name="detect_existing_ship" priority="first">

Check for existing ship artifacts from a previous run:

```bash
[ -f .ace/ship-plan.md ] && echo "EXISTING_PLAN" || echo "NO_PLAN"
[ -f .ace/ship-target.md ] && echo "EXISTING_TARGET" || echo "NO_TARGET"
```

**Case 1: `.ace/ship-plan.md` exists (plan already generated)**

Read the file to extract the previous target and status:

```bash
head -20 .ace/ship-plan.md
cat .ace/ship-target.md 2>/dev/null
STATUS=$(grep -m1 '^\*\*Status:\*\*' .ace/ship-target.md 2>/dev/null | sed 's/\*\*Status:\*\* //')
```

Present options using AskUserQuestion:
- header: "Existing Ship Plan"
- question: "Found an existing ship plan for [previous target]. What would you like to do?"
- options:
  - "Resume" (description: "Continue where you left off")
  - "Restart" (description: "Start fresh for the same target")
  - "Different target" (description: "Ship somewhere else")

**If "Resume":** Skip to `phase_3_walk_checklist`. The plan already exists, so Phase 1 and Phase 2 are complete. Phase 3 walks the checklist.

**If "Restart":** Delete both files and continue to phase_1_ask:

```bash
rm -f .ace/ship-plan.md .ace/ship-target.md .ace/ship-research.md
```

**If "Different target":** Delete both files and continue to phase_1_ask:

```bash
rm -f .ace/ship-plan.md .ace/ship-target.md .ace/ship-research.md
```

**Case 2: `.ace/ship-target.md` exists but `.ace/ship-plan.md` does NOT (Phase 1 done, Phase 2 pending)**

```bash
# Target declared but plan not yet generated
if [ ! -f .ace/ship-plan.md ] && [ -f .ace/ship-target.md ]; then
  echo "TARGET_ONLY"
fi
```

If TARGET_ONLY: Display "Found existing target declaration. Continuing to research and plan generation..." and skip directly to `phase_2_research_plan`.

**Case 3: Neither file exists**

Continue to `phase_1_ask`.

</step>

<step name="phase_1_ask">

Phase 1 has 6 sub-steps: extract project summary, detect stack, map stack to platforms, present summary and suggestions, persist target, display completion message.

---

**Sub-step 2a: Extract project summary from brief.md**

Read `.ace/brief.md` and extract:

```bash
# Project name from first heading
PROJECT_NAME=$(head -1 .ace/brief.md 2>/dev/null | sed 's/^# //')

# Platform from Context section
PLATFORM=$(grep -m1 '^\*\*Platform:\*\*' .ace/brief.md 2>/dev/null | sed 's/\*\*Platform:\*\* //')
```

Also extract from brief.md by reading these sections:
- `## What This Is` -- 2-3 sentence project description
- `## Core Value` -- one-liner priority statement
- `## Requirements > ### Active` -- what is currently being built

If brief.md does not exist, inform the user and stop:

```
No .ace/brief.md found. Run /ace.init first to set up your project.
```

---

**Sub-step 2b: Stack detection (5 layers)**

Detect the project's technology stack using 5 layers in priority order:

**Layer 1: brief.md Platform field**

Already extracted above as `$PLATFORM`. Values like: web, mobile-ios, cli, api, desktop, etc.

**Layer 2: `.ace/codebase/STACK.md` (if exists)**

```bash
cat .ace/codebase/STACK.md 2>/dev/null | head -50
```

If present, this contains a full stack analysis from the codebase mapper. Extract framework names, language, and runtime information.

**Layer 3: `.ace/research/stack.md` (if exists)**

```bash
cat .ace/research/stack.md 2>/dev/null | head -50
```

If present, this contains stack recommendations from project research.

**Layer 4: Manifest file detection**

Check for language-specific manifest files:

```bash
[ -f package.json ] && echo "node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "python"
[ -f Cargo.toml ] && echo "rust"
[ -f go.mod ] && echo "go"
[ -f Package.swift ] && echo "swift"
[ -f Gemfile ] && echo "ruby"
```

**Layer 5: Framework-specific detection and existing platform config**

Detect frameworks from manifest contents:

```bash
# Node.js frameworks (from package.json dependencies)
grep -q '"next"' package.json 2>/dev/null && echo "nextjs"
grep -q '"react"' package.json 2>/dev/null && echo "react"
grep -q '"vue"' package.json 2>/dev/null && echo "vue"
grep -q '"nuxt"' package.json 2>/dev/null && echo "nuxt"
grep -q '"svelte"' package.json 2>/dev/null && echo "svelte"
grep -q '"express"' package.json 2>/dev/null && echo "express"
grep -q '"fastify"' package.json 2>/dev/null && echo "fastify"
grep -q '"hono"' package.json 2>/dev/null && echo "hono"

# Python frameworks (from requirements.txt or pyproject.toml)
grep -qi 'django' requirements.txt 2>/dev/null && echo "django"
grep -qi 'flask' requirements.txt 2>/dev/null && echo "flask"
grep -qi 'fastapi' requirements.txt 2>/dev/null && echo "fastapi"
```

Detect existing platform configuration:

```bash
[ -f vercel.json ] && echo "vercel-configured"
[ -f netlify.toml ] && echo "netlify-configured"
[ -f fly.toml ] && echo "fly-configured"
[ -f render.yaml ] && echo "render-configured"
[ -f railway.json ] && echo "railway-configured"
[ -f Dockerfile ] && echo "docker"
[ -f docker-compose.yml ] || [ -f docker-compose.yaml ] && echo "docker-compose"
```

Check if npm-publishable:

```bash
# npm-publishable if package.json exists AND "private": true is NOT present
if [ -f package.json ]; then
  grep -q '"private": true' package.json || echo "npm-publishable"
fi
```

Combine all layers into a comma-separated detected stack string for display and mapping.

---

**Sub-step 2c: Map detected stack to suggested platforms**

Use the detected stack to determine platform suggestions. If an existing platform config was detected (vercel.json, netlify.toml, etc.), that platform becomes the primary suggestion.

Otherwise, use this mapping table:

| Detected Stack | Primary | Secondary | Tertiary |
|----------------|---------|-----------|----------|
| Next.js | Vercel | Netlify | AWS Amplify |
| React (CRA/Vite) | Vercel | Netlify | Cloudflare Pages |
| Vue/Nuxt | Vercel | Netlify | Cloudflare Pages |
| Svelte/SvelteKit | Vercel | Netlify | Cloudflare Pages |
| Express/Fastify/Node API | Railway | Render | Fly.io |
| Python (Django/Flask/FastAPI) | Railway | Render | Fly.io |
| Rust (Actix/Axum) | Fly.io | Docker | AWS |
| Go (net/http/Gin/Echo) | Fly.io | Docker | Railway |
| npm package/library | npm registry | GitHub Packages | -- |
| CLI tool (Node) | npm registry | Homebrew | -- |
| CLI tool (Rust) | crates.io | Homebrew | GitHub Releases |
| CLI tool (Go) | GitHub Releases | Homebrew | -- |
| Static site | GitHub Pages | Netlify | Cloudflare Pages |
| Mobile (iOS) | TestFlight | App Store | -- |
| Mobile (Android) | Google Play | Firebase App Distribution | -- |
| Docker-configured | Fly.io | Railway | AWS ECS |

When multiple stacks are detected (e.g., Next.js + npm-publishable), pick the primary platform for the dominant stack and include npm registry as an additional option.

---

**Sub-step 2d: Present project summary and platform suggestions**

Display the project summary and suggestions:

```
## Your Project

**[Project Name]**
[What This Is description from brief.md]

**Stack:** [detected frameworks/languages, comma-separated]
**Platform:** [from brief.md or detected]

---

Based on your stack, here are recommended shipping targets:
```

Then use AskUserQuestion to let the user choose:

- header: "Shipping Target"
- question: "Where do you want to ship [Project Name]?"
- options:
  - "[Primary suggestion]" (description: "Best match for your [detected stack] stack")
  - "[Secondary suggestion]" (description: "Also works well with [detected stack]")
  - "[Tertiary suggestion]" (description: "Alternative option")
  - "Other" (description: "Tell me where you want to ship")

If the user selects "Other", ask a follow-up question:

- header: "Custom Target"
- question: "What platform or service do you want to ship to?"

Use the response as the chosen target.

---

**Sub-step 2e: Persist the declared target**

Write the chosen target to `.ace/ship-target.md`:

```markdown
# Ship Target

**Target:** [chosen platform]
**Declared:** [YYYY-MM-DD]
**Stack detected:** [comma-separated detected stack]
**Status:** awaiting-plan
```

This file is small and intentional. It exists so Phase 2 (Stage 39) can read the target without re-asking the user.

Do NOT create `.ace/ship-plan.md` -- that is Phase 2's responsibility.

---

**Sub-step 2f: Display Phase 1 completion message**

```
Target declared: [chosen platform]

Phase 2 (Research & Plan) will be implemented in Stage 39.
Run /ace.ship again after Stage 39 is complete to continue.
```

</step>

<step name="phase_2_research_plan">

Phase 2 reads the declared target, researches deployment requirements via ace-stage-scout, and generates a deployment checklist.

---

**Sub-step 2a: Read target and validate**

Read `.ace/ship-target.md` to extract target, stack, and status:

```bash
TARGET=$(grep -m1 '^\*\*Target:\*\*' .ace/ship-target.md | sed 's/\*\*Target:\*\* //')
STACK=$(grep -m1 '^\*\*Stack detected:\*\*' .ace/ship-target.md | sed 's/\*\*Stack detected:\*\* //')
STATUS=$(grep -m1 '^\*\*Status:\*\*' .ace/ship-target.md | sed 's/\*\*Status:\*\* //')
```

**Status routing:**

- **If STATUS is `plan-ready`:** `.ace/ship-plan.md` already exists. Skip Phase 2 entirely and continue to Phase 3.
- **If STATUS is not `awaiting-plan` and not `plan-ready`:** Warn "Unexpected status '{STATUS}' in ship-target.md, continuing anyway." and proceed.
- **If TARGET is empty:** Error "No target found in ship-target.md. Run /ace.ship again to declare a target." and stop execution.

---

**Sub-step 2b: Gather context for research prompt**

```bash
PROJECT_NAME=$(head -1 .ace/brief.md 2>/dev/null | sed 's/^# //')
WHAT_THIS_IS=$(sed -n '/## What This Is/,/^##/p' .ace/brief.md 2>/dev/null | head -5 | tail -4)
PLATFORM_TYPE=$(grep -m1 '^\*\*Platform:\*\*' .ace/brief.md 2>/dev/null | sed 's/\*\*Platform:\*\* //')
MODEL_PROFILE=$(cat .ace/config.json 2>/dev/null | grep -o '"horsepower"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Resolve scout model from horsepower profile:

| horsepower | scout model |
|------------|-------------|
| max | opus |
| balanced | sonnet |
| eco | haiku |

---

**Sub-step 2c: Spawn ace-stage-scout**

Construct a shipping-specific research prompt with XML sections:

```markdown
<objective>
Research how to deploy a {stack} project to {target}.

Answer: "What are the exact steps to ship this project to {target}?"
</objective>

<project_context>
**Project:** {project_name}
**Description:** {what_this_is}
**Stack:** {stack}
**Target:** {target}
**Platform type:** {platform_type}
</project_context>

<research_focus>
Research the following for deploying to {target}:

1. **Prerequisites** -- CLI tools needed, account requirements, authentication steps
2. **Project configuration** -- Config files needed, build settings, framework-specific adapters
3. **Environment variables** -- What secrets and config values the platform requires
4. **Build and deploy** -- Exact CLI commands for build, deploy, and promote to production
5. **DNS/Domain** -- Custom domain configuration (if applicable, otherwise skip)
6. **Post-deploy verification** -- How to programmatically and visually confirm deployment succeeded
7. **Common gotchas** -- Platform-specific pitfalls for {stack} projects

For every step, note whether it can be done via CLI/API or requires human action (browser-required, credential retrieval, etc.). Prefer CLI commands over dashboard instructions.
</research_focus>

<output>
Write findings to: .ace/ship-research.md

Structure as numbered deployment steps with:
- Step name and description
- CLI command (if automatable) or human instruction (if not)
- Verification method
- Common failure modes
</output>
```

Spawn the scout:

```
Task(
  prompt=research_prompt,
  subagent_type="ace-stage-scout",
  model="{scout_model}",
  description="Research shipping to {target}"
)
```

---

**Sub-step 2d: Handle scout return**

**If scout returns `## RESEARCH COMPLETE`:**

Display: "Research complete. Converting to deployment checklist..."

Continue to checklist conversion below.

**If scout returns `## RESEARCH BLOCKED`:**

Display the blocker message from the scout's return. Then offer recovery options using AskUserQuestion:

- header: "Research Blocked"
- question: "The scout could not complete research for {target}. How would you like to proceed?"
- options:
  - "Retry research" (description: "Spawn the scout again with the same prompt")
  - "Enter plan manually" (description: "Create .ace/ship-plan.md yourself and resume")
  - "Abort" (description: "Stop the ship workflow")

**If "Retry research":** Return to sub-step 2c and spawn the scout again.

**If "Enter plan manually":** Display instructions for the expected ship-plan.md format, then stop. User creates the file and runs /ace.ship again (detect_existing_ship will find it).

**If "Abort":** Stop the workflow with message "Ship workflow aborted. Run /ace.ship to start again."

---

**Sub-step 2e: Convert research to checklist**

Read `.ace/ship-research.md` and convert the scout's deployment research into a numbered, classified checklist. This is deterministic workflow logic performed by the orchestrator (Claude running the workflow), not another agent spawn.

**Auto/gate classification table:**

| Step Type | Tag | Rationale |
|-----------|-----|-----------|
| CLI command execution | `[auto]` | Claude can run any CLI command |
| File creation/modification | `[auto]` | Claude has Write/Edit tools |
| Package installation | `[auto]` | Claude runs npm/pip/etc. |
| Build commands | `[auto]` | Claude runs build tools |
| Git operations | `[auto]` | Claude runs git commands |
| CLI tool installation | `[auto]` | Claude can install most CLIs |
| Account creation/signup | `[gate]` | Requires browser, human identity |
| Authentication/login (browser-based) | `[gate]` | Browser-based OAuth, credential entry |
| Secret/API key provisioning | `[gate]` | User must retrieve from dashboard |
| DNS configuration | `[gate]` | Domain registrar, propagation wait |
| Payment/billing setup | `[gate]` | Credit card, 3D Secure |
| Visual deployment verification | `[gate]` | Human judges if it looks right |
| App store submission | `[gate]` | Manual review process |
| Email/SMS verification | `[gate]` | Requires human to click link |

**Key rule (PLN-03):** When a step can be done EITHER via dashboard OR via CLI, classify as `[auto]` and use the CLI approach. Only classify as `[gate]` when NO CLI/API alternative exists.

**Conversion process:**

1. Read `.ace/ship-research.md`
2. Parse deployment steps from the research
3. Classify each step as `[auto]` or `[gate]` using the table above
4. Number sequentially across all sections
5. Group into logical sections: Prerequisites, Configuration, Deploy, Verify
6. For gate items, add an `Instructions:` sub-bullet with human-facing text explaining what the user must do
7. Target 8-15 total checklist items. Group related micro-steps into single items. Each item should be one logical action.

Write `.ace/ship-plan.md` with this format:

```markdown
# Ship Plan

**Project:** {PROJECT_NAME}
**Target:** {TARGET}
**Stack:** {STACK}
**Created:** {YYYY-MM-DD}
**Status:** ready

## Prerequisites

- [ ] 1. [auto/gate] {step description}

## Configuration

- [ ] N. [auto/gate] {step description}

## Deploy

- [ ] N. [auto/gate] {step description}

## Verify

- [ ] N. [gate] {step description}
  - Instructions: {what the user needs to verify}

---
*Generated by /ace.ship Phase 2*
*Research source: ace-stage-scout*
```

Gate items always include the `Instructions:` sub-bullet. Auto items do not need it (Claude will execute them directly).

---

**Sub-step 2f: Update status and display completion**

Update ship-target.md status:

```bash
sed -i 's/Status: awaiting-plan/Status: plan-ready/' .ace/ship-target.md
```

Count auto and gate items:

```bash
AUTO_COUNT=$(grep -c '\[auto\]' .ace/ship-plan.md)
GATE_COUNT=$(grep -c '\[gate\]' .ace/ship-plan.md)
TOTAL=$((AUTO_COUNT + GATE_COUNT))
```

Display completion message:

```
Plan generated: .ace/ship-plan.md
{TOTAL} total steps ({AUTO_COUNT} auto, {GATE_COUNT} gate)
```

Display: "Continuing to Phase 3..."

Then proceed to `phase_3_walk_checklist`.

</step>

<step name="phase_3_walk_checklist">

Phase 3 walks the deployment checklist item by item -- executing auto items, presenting gate items for user action, and tracking progress with checkboxes and timestamps.

This phase MUST execute in the main context (NOT a Task() subagent) because it uses AskUserQuestion for gate presentation.

---

**Sub-step 3a: Initialize execution**

Read ship-plan.md and prepare for execution:

```bash
# Verify plan exists and read metadata
TARGET=$(grep -m1 '^\*\*Target:\*\*' .ace/ship-plan.md | sed 's/\*\*Target:\*\* //')
STATUS=$(grep -m1 '^\*\*Status:\*\*' .ace/ship-plan.md | sed 's/\*\*Status:\*\* //')

# Read project name for display
PROJECT_NAME=$(head -1 .ace/brief.md 2>/dev/null | sed 's/^# //')

# Count items
TOTAL=$(grep -c '^\- \[.\] [0-9]' .ace/ship-plan.md)
COMPLETED=$(grep -c '^\- \[x\] [0-9]' .ace/ship-plan.md)
REMAINING=$((TOTAL - COMPLETED))
```

**If STATUS contains `paused-at`:**
Display: "Resuming from where you left off ({COMPLETED}/{TOTAL} complete)..."

**If REMAINING is 0:**
Display: "All items already complete!" and skip to sub-step 3g (completion summary).

Update status to in-progress:

```bash
sed -i 's/^\*\*Status:\*\* .*/\*\*Status:\*\* in-progress/' .ace/ship-plan.md
```

Display execution header:

```
## Shipping to {TARGET}

{COMPLETED}/{TOTAL} steps complete, {REMAINING} remaining.
Starting execution...
```

---

**Sub-step 3b: Walk checklist items**

For each unchecked item in ship-plan.md (in order):

```bash
# Extract unchecked items from ship-plan.md
grep -n '^\- \[ \] [0-9]' .ace/ship-plan.md
```

Read each item line to extract:
- Item number (N)
- Type tag (`[auto]` or `[gate]`)
- Description (text after the tag)
- For gate items: Instructions sub-bullet (next line starting with `  - Instructions:`)

**If `[auto]`:**

1. Display: "Step {N}: {description}"
2. Interpret the description and execute the appropriate CLI commands or file operations
   - Do NOT hardcode platform-specific execution logic -- Claude interprets auto item descriptions at runtime
   - Show concise output for successful execution
3. If execution succeeds:
   - Display: "Step {N} complete"
   - Update checkbox and timestamp in ship-plan.md using sed:
     ```bash
     TIMESTAMP=$(date +%H:%M)
     sed -i "s/^- \[ \] ${ITEM_NUM}\./- [x] ${ITEM_NUM}./" .ace/ship-plan.md
     sed -i "/^\- \[x\] ${ITEM_NUM}\./s/$/ (completed ${TIMESTAMP})/" .ace/ship-plan.md
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
  - "Come back later" (description: "Save progress and exit -- for long waits like DNS propagation")
  - "Abort" (description: "Stop the ship workflow entirely")

Route based on response:

- **"Done":** Update checkbox and timestamp in ship-plan.md, continue to next item:
  ```bash
  TIMESTAMP=$(date +%H:%M)
  sed -i "s/^- \[ \] ${ITEM_NUM}\./- [x] ${ITEM_NUM}./" .ace/ship-plan.md
  sed -i "/^\- \[x\] ${ITEM_NUM}\./s/$/ (completed ${TIMESTAMP})/" .ace/ship-plan.md
  ```

- **"Skip":** Mark as checked with "(skipped)" annotation, continue to next item:
  ```bash
  sed -i "s/^- \[ \] ${ITEM_NUM}\./- [x] ${ITEM_NUM}./" .ace/ship-plan.md
  sed -i "/^\- \[x\] ${ITEM_NUM}\./s/$/ (skipped)/" .ace/ship-plan.md
  ```

- **"Come back later":** Go to sub-step 3e (pause and save position)

- **"Abort":** Go to sub-step 3f (abort handling)

**After processing each item:** Update pulse.md at section boundaries (when crossing from Prerequisites to Configuration, to Deploy, to Verify) with:
```
Status: Shipping to {target} ({completed}/{total} steps)
```

</step>

</process>

<success_criteria>
- [ ] Re-ship detection works when .ace/ship-plan.md exists (resume/restart/different-target)
- [ ] Re-ship detection handles target-only state (Phase 1 done, Phase 2 pending)
- [ ] Project summary extracted from brief.md and displayed
- [ ] Stack detected via 5 layers (brief.md, STACK.md, research, manifests, frameworks)
- [ ] Detected stack mapped to platform suggestions
- [ ] User selected target via AskUserQuestion
- [ ] Target persisted to .ace/ship-target.md with status awaiting-plan
- [ ] .ace/ship-plan.md is NOT created by Phase 1
- [ ] ace-stage-scout spawned with shipping-specific research prompt
- [ ] Scout research converted to numbered checklist with auto/gate classification
- [ ] .ace/ship-plan.md created with project metadata, target, and checklist items
- [ ] ship-target.md status updated from awaiting-plan to plan-ready
- [ ] Auto items prefer CLI commands over dashboard instructions
- [ ] Phase 3 walks checklist items with auto-execution and gate presentation
- [ ] Auto items interpreted and executed by Claude at runtime
- [ ] Gate items presented via AskUserQuestion with Done/Skip/Come back later/Abort
- [ ] Auth errors in auto items create dynamic gates before retry
- [ ] Failed auto items offer retry/skip/abort recovery
- [ ] Checkbox updates use sed with HH:MM timestamps
- [ ] Skipped items use `- [x]` with "(skipped)" annotation
</success_criteria>
