<purpose>
Set up monitoring for a deployed project in 3 phases:

1. **ASK** -- Present project context, detect stack/platform, user selects monitoring scope
2. **RESEARCH & PLAN** -- Investigate monitoring tools, generate setup checklist
3. **WALK CHECKLIST** -- Execute auto items, gate on human items, track progress

Phase 1 is fully implemented. Phases 2 and 3 are expansion points for Stage 43.
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

**If "Add more tools":** Delete watch-plan.md and watch-research.md but PRESERVE watch-scope.md. Update watch-scope.md to set `**Mode:** add-more` (replacing any existing Mode line, or appending if none). Continue to `phase_2_research_plan` (Phase 2 reads the mode flag and does additive research).

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

Do NOT create `.ace/watch-plan.md` -- that is Phase 2's responsibility (Stage 43).

Display Phase 1 completion:
```
Monitoring scope declared: {MONITORING_SCOPE}

Phase 2 (Research & Plan) will be available after Stage 43. Scope saved to .ace/watch-scope.md.
```

</step>

<step name="phase_2_research_plan">

**Phase 2: Research & Plan** (implemented in Stage 43)

This phase will:
1. Read watch-scope.md for monitoring scope and project context
2. Spawn ace-stage-scout with monitoring-specific research prompt (free-tier-first, CLI-automatable)
3. Convert research to numbered checklist with auto/gate classification
4. Write .ace/watch-plan.md with project metadata and checklist

Display: "Phase 2 (Research & Plan) will be available after Stage 43. Scope saved to .ace/watch-scope.md."

</step>

<step name="phase_3_walk_checklist">

**Phase 3: Walk Checklist** (implemented in Stage 43)

This phase will:
1. Read .ace/watch-plan.md
2. Walk checklist items: auto-execute or present gates
3. Track progress with checkboxes and timestamps
4. Handle error recovery (retry/skip/abort)
5. Update pulse.md with monitoring progress

Display: "Phase 3 (Walk Checklist) will be available after Stage 43."

</step>

</process>

<success_criteria>
- [ ] Re-watch detection works when .ace/watch-plan.md exists (resume/start-fresh/add-more)
- [ ] Re-watch detection handles scope-only state (Phase 1 done, Phase 2 pending)
- [ ] Project context extracted from brief.md and ship-target.md when available
- [ ] No-context fallback asks user directly for stack and platform (WATCH-02)
- [ ] Monitoring scope selected via AskUserQuestion with 4 options (WATCH-03)
- [ ] Scope persisted to .ace/watch-scope.md with project metadata
- [ ] .ace/watch-plan.md is NOT created by Phase 1
- [ ] No monitoring tool names appear in Phase 1
- [ ] Phase 2 stub clearly describes Stage 43 expansion scope
- [ ] Phase 3 stub clearly describes Stage 43 expansion scope
</success_criteria>
