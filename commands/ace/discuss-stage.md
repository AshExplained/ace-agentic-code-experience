---
name: ace.discuss-stage
description: Gather stage context through adaptive questioning before architecting
argument-hint: "<stage>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Extract implementation decisions that downstream agents need — scout and architect will use INTEL.md to know what to investigate and what choices are locked.

**How it works:**
1. Analyze the stage to identify gray areas (UI, UX, behavior, etc.)
2. Present gray areas — user selects which to discuss
3. Deep-dive each selected area until satisfied
4. Create INTEL.md with decisions that guide recon and architecting

**Output:** `{stage}-INTEL.md` — decisions clear enough that downstream agents can act without asking the user again
</objective>

<execution_context>
@~/.claude/ace/workflows/scope-stage.md
@~/.claude/ace/templates/INTEL.md
</execution_context>

<context>
Stage number: $ARGUMENTS (required)

**Load project state:**
@.ace/PULSE.md

**Load track:**
@.ace/TRACK.md
</context>

<process>
1. Validate stage number (error if missing or not in track)
2. Check if INTEL.md exists (offer update/view/skip if yes)
3. **Analyze stage** — Identify domain and generate stage-specific gray areas
4. **Present gray areas** — Multi-select: which to discuss? (NO skip option)
5. **Deep-dive each area** — 4 questions per area, then offer more/next
6. **Write INTEL.md** — Sections match areas discussed
7. Offer next steps (recon or architect)

**CRITICAL: Scope guardrail**
- Stage boundary from TRACK.md is FIXED
- Discussion clarifies HOW to implement, not WHETHER to add more
- If user suggests new capabilities: "That's its own stage. I'll note it for later."
- Capture deferred ideas — don't lose them, don't act on them

**Domain-aware gray areas:**
Gray areas depend on what's being built. Analyze the stage goal:
- Something users SEE → layout, density, interactions, states
- Something users CALL → responses, errors, auth, versioning
- Something users RUN → output format, flags, modes, error handling
- Something users READ → structure, tone, depth, flow
- Something being ORGANIZED → criteria, grouping, naming, exceptions

Generate 3-4 **stage-specific** gray areas, not generic categories.

**Probing depth:**
- Ask 4 questions per area before checking
- "More questions about [area], or move to next?"
- If more → ask 4 more, check again
- After all areas → "Ready to create intel?"

**Do NOT ask about (Claude handles these):**
- Technical implementation
- Architecture choices
- Performance concerns
- Scope expansion
</process>

<success_criteria>
- Gray areas identified through intelligent analysis
- User chose which areas to discuss
- Each selected area explored until satisfied
- Scope creep redirected to deferred ideas
- INTEL.md captures decisions, not vague vision
- User knows next steps
</success_criteria>
