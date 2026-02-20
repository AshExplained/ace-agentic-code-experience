<purpose>
Surface Claude's assumptions about a stage before planning, enabling users to correct misconceptions early.

Key difference from discuss-stage: This is ANALYSIS of what Claude thinks, not INTAKE of what user knows. No file output - purely conversational to prompt discussion.
</purpose>

<process>

<step name="validate_stage" priority="first">
Stage number: $ARGUMENTS (required)

**If argument missing:**

```
Error: Stage number required.

Usage: /ace.list-stage-assumptions [stage-number]
Example: /ace.list-stage-assumptions 3
```

Exit workflow.

**If argument provided:**
Validate stage exists in track:

```bash
cat .ace/track.md | grep -i "Stage ${STAGE}"
```

**If stage not found:**

```
Error: Stage ${STAGE} not found in track.

Available stages:
[list stages from track]
```

Exit workflow.

**If stage found:**
Parse stage details from track:

- Stage number
- Stage name
- Stage description/goal
- Any scope details mentioned

Continue to analyze_stage.
</step>

<step name="analyze_stage">
Based on track description and project context, identify assumptions across five areas:

**1. Technical Approach:**
What libraries, frameworks, patterns, or tools would Claude use?
- "I'd use X library because..."
- "I'd follow Y pattern because..."
- "I'd structure this as Z because..."

**2. Implementation Order:**
What would Claude build first, second, third?
- "I'd start with X because it's foundational"
- "Then Y because it depends on X"
- "Finally Z because..."

**3. Scope Boundaries:**
What's included vs excluded in Claude's interpretation?
- "This stage includes: A, B, C"
- "This stage does NOT include: D, E, F"
- "Boundary ambiguities: G could go either way"

**4. Risk Areas:**
Where does Claude expect complexity or challenges?
- "The tricky part is X because..."
- "Potential issues: Y, Z"
- "I'd watch out for..."

**5. Dependencies:**
What does Claude assume exists or needs to be in place?
- "This assumes X from previous stages"
- "External dependencies: Y, Z"
- "This will be consumed by..."

Be honest about uncertainty. Mark assumptions with confidence levels:
- "Fairly confident: ..." (clear from track)
- "Assuming: ..." (reasonable inference)
- "Unclear: ..." (could go multiple ways)
</step>

<step name="present_assumptions">
Present assumptions in a clear, scannable format:

```
## My Assumptions for Stage ${STAGE}: ${STAGE_NAME}

### Technical Approach
[List assumptions about how to implement]

### Implementation Order
[List assumptions about sequencing]

### Scope Boundaries
**In scope:** [what's included]
**Out of scope:** [what's excluded]
**Ambiguous:** [what could go either way]

### Risk Areas
[List anticipated challenges]

### Dependencies
**From prior stages:** [what's needed]
**External:** [third-party needs]
**Feeds into:** [what future stages need from this]

---

**What do you think?**

Are these assumptions accurate? Let me know:
- What I got right
- What I got wrong
- What I'm missing
```

Wait for user response.
</step>

<step name="gather_feedback">
**If user provides corrections:**

Acknowledge the corrections:

```
Key corrections:
- [correction 1]
- [correction 2]

This changes my understanding significantly. [Summarize new understanding]
```

**If user confirms assumptions:**

```
Assumptions validated.
```

Continue to offer_next.
</step>

<step name="offer_next">
Present next steps:

```
What's next?
1. Discuss context (/ace.discuss-stage ${STAGE}) - Let me ask you questions to build comprehensive context
2. Plan this stage (/ace.plan-stage ${STAGE}) - Create detailed execution runs
3. Re-examine assumptions - I'll analyze again with your corrections
4. Done for now
```

Wait for user selection.

If "Discuss context": Note that intel.md will incorporate any corrections discussed here
If "Plan this stage": Proceed knowing assumptions are understood
If "Re-examine": Return to analyze_stage with updated understanding
</step>

</process>

<success_criteria>
- Stage number validated against track
- Assumptions surfaced across five areas: technical approach, implementation order, scope, risks, dependencies
- Confidence levels marked where appropriate
- "What do you think?" prompt presented
- User feedback acknowledged
- Clear next steps offered
</success_criteria>
