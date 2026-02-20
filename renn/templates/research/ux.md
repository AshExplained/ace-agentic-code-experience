# UX/DX Research Template

Template for `.renn/research/UX.md` -- UX patterns for UI projects, DX patterns for non-UI projects.

## File Template

<template>

### Variant 1: UI Projects (UX Research)

Use this variant for web apps, mobile apps, dashboards, websites.

```markdown
# UX Research

**Domain:** [domain type]
**Project Type:** UI
**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW]

## Competitor & Prior Art Analysis

| Competitor | UX Strengths | UX Weaknesses | Takeaway |
|------------|-------------|---------------|----------|
| [name] | [what they do well] | [what frustrates users] | [what to learn] |
| [name] | [what they do well] | [what frustrates users] | [what to learn] |
| [name] | [what they do well] | [what frustrates users] | [what to learn] |

### Patterns Worth Adopting

- **[Pattern]:** [evidence from competitor] -- Confidence: [HIGH/MEDIUM/LOW]
- **[Pattern]:** [evidence from competitor] -- Confidence: [HIGH/MEDIUM/LOW]

### Patterns to Avoid

- **[Anti-pattern]:** [why it fails in competitors] -- Source: [url]
- **[Anti-pattern]:** [why it fails in competitors] -- Source: [url]

## Proven UX Patterns

Established patterns for [domain] with evidence of effectiveness.

### [Pattern 1 Name]
**What:** [description]
**Evidence:** [where this pattern succeeds -- competitor, research, industry standard]
**When to use:** [conditions]
**Implementation notes:** [practical guidance]
**Confidence:** [HIGH/MEDIUM/LOW]

### [Pattern 2 Name]
**What:** [description]
**Evidence:** [where this pattern succeeds]
**When to use:** [conditions]
**Implementation notes:** [practical guidance]
**Confidence:** [HIGH/MEDIUM/LOW]

## Anti-Patterns

Common UX mistakes in [domain] with alternatives.

| Anti-Pattern | Why It's Common | Why It Fails | Better Approach |
|-------------|----------------|-------------|-----------------|
| [mistake] | [surface appeal] | [user impact] | [recommended alternative] |
| [mistake] | [surface appeal] | [user impact] | [recommended alternative] |
| [mistake] | [surface appeal] | [user impact] | [recommended alternative] |

## Emotional Design Goals

**Primary emotion:** [what the user should feel -- e.g., "confident", "playful", "empowered"]
**Anti-emotion:** [what the user must NOT feel -- e.g., "overwhelmed", "confused", "anxious"]
**Product personality:** [2-3 trait words -- e.g., "calm, precise, trustworthy"]

### How These Translate to Design

- [Emotion] -> [design implication -- e.g., "confident -> clear CTAs, progress indicators, no dead ends"]
- [Anti-emotion] -> [what to avoid -- e.g., "overwhelmed -> limit options per screen, progressive disclosure"]

## Critical Flows

Flows that make or break the user experience.

| Flow | Friction Tolerance | Why Critical | Key UX Requirements |
|------|-------------------|-------------|---------------------|
| [flow name] | LOW/MEDIUM/HIGH | [why users care] | [what must go right] |
| [flow name] | LOW/MEDIUM/HIGH | [why users care] | [what must go right] |

### [Flow 1]: [Name]
**Steps:** [numbered steps in the flow]
**Friction tolerance:** [LOW = any friction causes abandonment, HIGH = users will push through]
**Drop-off risks:** [where users commonly abandon]
**UX requirements:** [specific UX needs for this flow]

### [Flow 2]: [Name]
**Steps:** [numbered steps in the flow]
**Friction tolerance:** [level]
**Drop-off risks:** [where users commonly abandon]
**UX requirements:** [specific UX needs for this flow]

## Sources

- [URL] -- Confidence: [HIGH/MEDIUM/LOW]
- [URL] -- Confidence: [HIGH/MEDIUM/LOW]
- [URL] -- Confidence: [HIGH/MEDIUM/LOW]

---
*UX research for: [domain]*
*Researched: [date]*
```

### Variant 2: Non-UI Projects (DX Research)

Use this variant for CLI tools, APIs, and libraries.

```markdown
# DX Research

**Domain:** [domain type]
**Project Type:** [CLI | API | Library]
**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW]

## Competitor & Prior Art Analysis

| Tool/Library | DX Strengths | DX Weaknesses | Takeaway |
|-------------|-------------|---------------|----------|
| [name] | [what devs love] | [what frustrates devs] | [what to learn] |
| [name] | [what devs love] | [what frustrates devs] | [what to learn] |
| [name] | [what devs love] | [what frustrates devs] | [what to learn] |

## CLI Conventions

> Include this section for CLI projects only. Source: https://clig.dev/

### Output Patterns
- Human-readable by default, `--json` for structured output
- Color: use sparingly, respect `NO_COLOR` and `TERM=dumb`
- Progress: show activity within 100ms for long operations
- Tables: align columns, use `--no-header` for scriptability

### Error Messages
- Rewrite for humans with actionable guidance
- Suggest corrections for typos (did you mean X?)
- Include debug info for unexpected errors (stack trace behind `--verbose`)
- Write errors to stderr, data to stdout

### Help Text
- Lead with examples, not reference docs
- Support `-h`, `--help`, and `help` subcommand
- Include web links to detailed docs
- Group flags by category for long help output

### Flags and Arguments
- Prefer flags over positional arguments
- Support both short (`-v`) and long (`--verbose`) forms
- Standard flags: `-h`/`--help`, `-v`/`--verbose`, `--version`, `--json`, `--dry-run`, `--no-input`, `--force`
- Never require secrets in flags (use env vars or stdin)
- Use `--` to separate flags from positional arguments

### Configuration Precedence
1. Flags (highest priority)
2. Environment variables
3. Project-level config (`.toolrc`, `tool.config.js`)
4. User-level config (`~/.config/tool/`)
5. System-wide config (lowest priority)

**Source:** https://clig.dev/

## API Design Principles

> Include this section for API projects only.

**Naming:** RESTful resource naming, consistent pluralization, clear hierarchy (`/users/{id}/orders`)
**Versioning:** URL path versioning (`/v1/`, `/v2/`) or `Accept` header-based
**Error responses:** Structured JSON with `error.code`, `error.message`, and `error.details`
**Pagination:** Cursor-based for large datasets, offset-based for small stable collections
**Rate limiting:** Return `429 Too Many Requests` with `Retry-After` header
**Documentation:** OpenAPI/Swagger spec, interactive examples, copy-paste curl commands

## Library Design Principles

> Include this section for library projects only.

**API surface:** Minimal, focused exports -- one primary function/class per concern
**Naming:** Consistent, predictable naming that matches domain language
**Error handling:** Throw typed errors (not strings), document all error types and when they occur
**Documentation:** README with quick start, API reference, migration guide between versions
**Bundling:** Support ESM and CJS, enable tree-shaking, ship source maps
**Type safety:** Ship TypeScript declarations (`.d.ts`), use generics for flexibility

## Proven DX Patterns

| Pattern | Evidence | Application |
|---------|----------|-------------|
| [pattern] | [where this works well] | [how to apply it] |
| [pattern] | [where this works well] | [how to apply it] |
| [pattern] | [where this works well] | [how to apply it] |

## Anti-Patterns

| Anti-Pattern | Why Common | User Impact | Alternative |
|-------------|-----------|-------------|-------------|
| [mistake] | [surface appeal] | [developer frustration] | [better approach] |
| [mistake] | [surface appeal] | [developer frustration] | [better approach] |
| [mistake] | [surface appeal] | [developer frustration] | [better approach] |

## Emotional Design Goals

**Primary emotion:** [what the developer should feel -- e.g., "productive", "in control", "confident"]
**Anti-emotion:** [what the developer must NOT feel -- e.g., "lost", "fighting the tool", "confused"]
**Product personality:** [e.g., "helpful, predictable, fast"]

### How These Translate to Design

- [Emotion] -> [DX implication -- e.g., "productive -> fast startup, sensible defaults, minimal config"]
- [Anti-emotion] -> [what to avoid -- e.g., "lost -> clear error messages, discoverable help, examples first"]

## Critical Flows

Flows that make or break the developer experience.

| Flow | Friction Tolerance | Why Critical | Key DX Requirements |
|------|-------------------|-------------|---------------------|
| [flow] | LOW/MEDIUM/HIGH | [why devs care] | [what must go right] |
| [flow] | LOW/MEDIUM/HIGH | [why devs care] | [what must go right] |

### [Flow 1]: [Name]
**Steps:** [numbered steps in the flow]
**Friction tolerance:** [level]
**Drop-off risks:** [where developers commonly give up]
**DX requirements:** [specific DX needs for this flow]

## Sources

- [URL] -- Confidence: [HIGH/MEDIUM/LOW]
- [URL] -- Confidence: [HIGH/MEDIUM/LOW]
- [URL] -- Confidence: [HIGH/MEDIUM/LOW]

---
*DX research for: [domain]*
*Researched: [date]*
```

</template>

<guidelines>

**Project Type Detection:**
- UI projects (web app, mobile app, dashboard, website): Use Variant 1 (UX Research)
- CLI projects: Use Variant 2 (DX Research) with the CLI Conventions section
- API projects: Use Variant 2 (DX Research) with the API Design Principles section
- Library/package projects: Use Variant 2 (DX Research) with the Library Design Principles section
- If unclear, default to DX research unless screens/pages are explicitly mentioned in the project description

**Section Selection for DX Variant:**
- Include only the relevant project-type section (CLI Conventions OR API Design Principles OR Library Design Principles)
- Do not include all three -- pick the one that matches the project type
- If a project spans multiple types (e.g., CLI + library), include the primary type's section and note the secondary in Proven DX Patterns

**Confidence Levels:**
- Every competitor finding must have supporting evidence (URL, product name, or documented pattern)
- Every proven pattern must have a confidence level (HIGH/MEDIUM/LOW)
- HIGH: verified from official docs, Context7, or multiple credible sources
- MEDIUM: verified from one credible source or multiple community sources
- LOW: single blog post, unverified community claim, or training data only

**Anti-Patterns to Avoid:**
- **Generic UX advice:** "Use clear CTAs" is useless. "E-commerce checkout should show order summary at every step because 18% of users abandon when they can't see their total" is actionable
- **Over-scoping DX:** For CLI projects, clig.dev is the primary source. Do not research generic software engineering practices
- **Mixing UX and visual design:** UX.md covers interaction patterns, flows, and emotions. Visual design (colors, typography, layout) belongs in the design interview and stylekit. No overlap
- **Fictional competitors:** Research REAL products in the domain. Never invent placeholder competitors. If competitors are hard to find, say so and assign LOW confidence

**Size Guidance:**
- Aim for 100-200 lines of filled content per variant
- Structured enough to be useful for downstream consumers (stage scout, UX interview, designer)
- Not so long it exhausts agent context when loaded as reference material

**Downstream Consumers:**
- Stage scout reads UX.md to generate stage-specific UX questions
- UX interview uses findings to generate informed questions with research-backed defaults
- UX synthesis combines interview answers with UX.md findings into a concrete ux_brief
- For DX projects, architect and runner reference DX patterns during implementation

</guidelines>
