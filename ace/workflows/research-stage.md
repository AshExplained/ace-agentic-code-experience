<purpose>
Execute research at the appropriate depth level.
Produces research.md (for Level 2-3) that informs run.md creation.

Called from plan-stage.md's mandatory_research step with a depth parameter.

NOTE: For comprehensive ecosystem research ("how do experts build this"), use /ace.research-stage instead, which produces RESEARCH.md.
</purpose>

<depth_levels>
**This workflow supports three depth levels:**

| Level | Name         | Time      | Output                                       | When                                      |
| ----- | ------------ | --------- | -------------------------------------------- | ----------------------------------------- |
| 1     | Quick Verify | 2-5 min   | No file, proceed with verified knowledge     | Single library, confirming current syntax |
| 2     | Standard     | 15-30 min | research.md                                     | Choosing between options, new integration |
| 3     | Deep Dive    | 1+ hour   | Detailed research.md with validation gates      | Architectural decisions, novel problems   |

**Depth is determined by plan-stage.md before routing here.**
</depth_levels>

<source_hierarchy>
**MANDATORY: Context7 BEFORE WebSearch**

Claude's training data is 6-18 months stale. Always verify.

1. **Context7 MCP FIRST** - Current docs, no hallucination
2. **Official docs** - When Context7 lacks coverage
3. **WebSearch LAST** - For comparisons and trends only

See ~/.claude/ace/templates/research.md `<research_protocol>` for full protocol.
</source_hierarchy>

<process>

<step name="determine_depth">
Check the depth parameter passed from plan-stage.md:
- `depth=verify` → Level 1 (Quick Verification)
- `depth=standard` → Level 2 (Standard Research)
- `depth=deep` → Level 3 (Deep Dive)

Route to appropriate level workflow below.
</step>

<step name="level_1_quick_verify">
**Level 1: Quick Verification (2-5 minutes)**

For: Single known library, confirming syntax/version still correct.

**Process:**

1. Resolve library in Context7:

   ```
   mcp__context7__resolve-library-id with libraryName: "[library]"
   ```

2. Fetch relevant docs:

   ```
   mcp__context7__get-library-docs with:
   - context7CompatibleLibraryID: [from step 1]
   - topic: [specific concern]
   ```

3. Verify:

   - Current version matches expectations
   - API syntax unchanged
   - No breaking changes in recent versions

4. **If verified:** Return to plan-stage.md with confirmation. No research.md needed.

5. **If concerns found:** Escalate to Level 2.

**Output:** Verbal confirmation to proceed, or escalation to Level 2.
</step>

<step name="level_2_standard">
**Level 2: Standard Research (15-30 minutes)**

For: Choosing between options, new external integration.

**Process:**

1. **Identify what to discover:**

   - What options exist?
   - What are the key comparison criteria?
   - What's our specific use case?

2. **Context7 for each option:**

   ```
   For each library/framework:
   - mcp__context7__resolve-library-id
   - mcp__context7__get-library-docs (mode: "code" for API, "info" for concepts)
   ```

3. **Official docs** for anything Context7 lacks.

4. **WebSearch** for comparisons:

   - "[option A] vs [option B] {current_year}"
   - "[option] known issues"
   - "[option] with [our stack]"

5. **Cross-verify:** Any WebSearch finding → confirm with Context7/official docs.

6. **Create research.md** using ~/.claude/ace/templates/research.md structure:

   - Summary with recommendation
   - Key findings per option
   - Code examples from Context7
   - Confidence level (should be MEDIUM-HIGH for Level 2)

7. Return to plan-stage.md.

**Output:** `.ace/stages/XX-name/research.md`
</step>

<step name="level_3_deep_dive">
**Level 3: Deep Dive (1+ hour)**

For: Architectural decisions, novel problems, high-risk choices.

**Process:**

1. **Scope the research** using ~/.claude/ace/templates/research.md:

   - Define clear scope
   - Define include/exclude boundaries
   - List specific questions to answer

2. **Exhaustive Context7 research:**

   - All relevant libraries
   - Related patterns and concepts
   - Multiple topics per library if needed

3. **Official documentation deep read:**

   - Architecture guides
   - Best practices sections
   - Migration/upgrade guides
   - Known limitations

4. **WebSearch for ecosystem context:**

   - How others solved similar problems
   - Production experiences
   - Gotchas and anti-patterns
   - Recent changes/announcements

5. **Cross-verify ALL findings:**

   - Every WebSearch claim → verify with authoritative source
   - Mark what's verified vs assumed
   - Flag contradictions

6. **Create comprehensive research.md:**

   - Full structure from ~/.claude/ace/templates/research.md
   - Quality report with source attribution
   - Confidence by finding
   - If LOW confidence on any critical finding → add validation checkpoints

7. **Confidence gate:** If overall confidence is LOW, present options before proceeding.

8. Return to plan-stage.md.

**Output:** `.ace/stages/XX-name/research.md` (comprehensive)
</step>

<step name="identify_unknowns">
**For Level 2-3:** Define what we need to learn.

Ask: What do we need to learn before we can plan this stage?

- Technology choices?
- Best practices?
- API patterns?
- Architecture approach?
  </step>

<step name="create_research_scope">
Use ~/.claude/ace/templates/research.md.

Include:

- Clear research objective
- Scoped include/exclude lists
- Source preferences (official docs, Context7, current year)
- Output structure for research.md
  </step>

<step name="execute_research">
Run the research:
- Use web search for current info
- Use Context7 MCP for library docs
- Prefer current year sources
- Structure findings per template
</step>

<step name="create_research_output">
Write `.ace/stages/XX-name/research.md`:
- Summary with recommendation
- Key findings with sources
- Code examples if applicable
- Metadata (confidence, dependencies, open questions, assumptions)
</step>

<step name="confidence_gate">
After creating research.md, check confidence level.

If confidence is LOW:
Use AskUserQuestion:

- header: "Low Confidence"
- question: "Research confidence is LOW: [reason]. How would you like to proceed?"
- options:
  - "Dig deeper" - Do more research before planning
  - "Proceed anyway" - Accept uncertainty, plan with caveats
  - "Pause" - I need to think about this

If confidence is MEDIUM:
Inline: "Research complete (medium confidence). [brief reason]. Proceed to planning?"

If confidence is HIGH:
Proceed directly, just note: "Research complete (high confidence)."
</step>

<step name="open_questions_gate">
If research.md has open_questions:

Present them inline:
"Open questions from research:

- [Question 1]
- [Question 2]

These may affect implementation. Acknowledge and proceed? (yes / address first)"

If "address first": Gather user input on questions, update research.
</step>

<step name="offer_next">
```
Research complete: .ace/stages/XX-name/research.md
Recommendation: [one-liner]
Confidence: [level]

What's next?

1. Discuss stage context (/ace.discuss-stage [current-stage])
2. Create stage plan (/ace.plan-stage [current-stage])
3. Refine research (dig deeper)
4. Review research

```

NOTE: research.md is NOT committed separately. It will be committed with stage completion.
</step>

</process>

<success_criteria>
**Level 1 (Quick Verify):**
- Context7 consulted for library/topic
- Current state verified or concerns escalated
- Verbal confirmation to proceed (no files)

**Level 2 (Standard):**
- Context7 consulted for all options
- WebSearch findings cross-verified
- research.md created with recommendation
- Confidence level MEDIUM or higher
- Ready to inform run.md creation

**Level 3 (Deep Dive):**
- Research scope defined
- Context7 exhaustively consulted
- All WebSearch findings verified against authoritative sources
- research.md created with comprehensive analysis
- Quality report with source attribution
- If LOW confidence findings → validation checkpoints defined
- Confidence gate passed
- Ready to inform run.md creation
</success_criteria>
