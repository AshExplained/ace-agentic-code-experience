# Design Artifacts

<overview>
Design artifacts are the structured files that define a project's visual system: the component inventory (reusable UI elements) and screen specs (full-page layouts composing those components). This reference is consulted during design agent creation and review. It defines the YAML schemas, state vocabulary, content zone conventions, preview rules, and HTML boilerplate that the ace-designer and ace-design-reviewer agents follow.
</overview>

## Component YAML Schema

Each component entry is a YAML file with these fields:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `name` | string | Kebab-case identifier (e.g., `button`, `card`) | Yes |
| `description` | string | One-line description of what this component is | Yes |
| `category` | enum | One of: `interactive`, `display`, `layout`, `feedback` | Yes |
| `properties` | map | Configurable props. Each has `type` (enum/string/boolean/number), `values` (for enum), `default`, optional `description` and `optional` flag | Yes |
| `tokens` | map | Maps visual properties to design token paths using `{layer.category.path}` alias syntax. Keys describe what the token controls (e.g., `background`, `text-color`). Values reference valid tokens in stylekit.yaml with layer prefixes: `{primitive.*}`, `{semantic.*}`, `{component.*}` | Yes |
| `states` | map | Relevant states from the fixed vocabulary (see State Vocabulary below). Each state has `description` (required) and `changes` (required for non-default states) | Yes |
| `responsive` | map | `base` (required): base Tailwind utility classes. Optional: `sm`, `md`, `lg` for breakpoint-specific additions. Optional `notes` for behavior explanation | Yes |
| `accessibility` | map | `role` (ARIA role), `keyboard` (keyboard interaction), `aria` (key ARIA attributes) -- all required. Optional: `focus-visible` (focus ring styling) | Yes |
| `preview` | string (multiline) | Self-contained HTML snippet showing all variants and relevant states. Source of truth for rendering. Must use token-derived Tailwind utility classes | Yes |

## State Vocabulary

Eight fixed states. Components document only the states that apply to them.

| State | Description | interactive | display | layout | feedback |
|-------|-------------|:-----------:|:-------:|:------:|:--------:|
| `default` | Normal resting state | Always | Always | Always | Always |
| `hover` | Mouse cursor over element | Common | Cards only | Rare | Rare |
| `active` | Element being pressed | Common | Rare | Links only | Rare |
| `focus` | Keyboard focus ring | Always | If clickable | Links | Rare |
| `disabled` | Cannot interact | Common | Rare | Rare | Never |
| `loading` | Async operation pending | Sometimes | Rare | Rare | Sometimes |
| `error` | Validation/operation failure | Form fields | Never | Never | Sometimes |
| `empty` | No content/data | Never | Sometimes | Sometimes | Sometimes |

**Legend:** Always = document this state. Common = document if applicable. Sometimes = document only if the component has this behavior. Rare = unusual, only if specifically needed. Never = do not document.

**Selection guidance:**

- **Interactive components** (button, input): default, hover, active, focus, disabled; may need loading, error
- **Display components** (card, heading, badge, avatar): default; may need hover for clickable cards
- **Layout components** (navigation): default; may need active for current page indication
- **Feedback components** (toast, alert): default; may need loading, error, empty

## Base Component Set

Seven base components. Projects may add custom components using the same schema.

| Component | Category | Key States | Purpose |
|-----------|----------|------------|---------|
| button | interactive | default, hover, active, focus, disabled, loading | Primary action trigger |
| card | display | default, hover | Content container with optional click |
| input | interactive | default, focus, error, disabled | Text data entry |
| navigation | layout | default, active | Page/section navigation |
| heading | display | default | Section/page titles (h1-h6) |
| badge | display | default | Status indicators and labels |
| avatar | display | default | User/entity identification |

## Screen Spec YAML Schema

Each screen spec is a YAML file defining one full page:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `screen` | string | Kebab-case identifier (e.g., `dashboard`, `login`) | Yes |
| `title` | string | Display name for the screen | Yes |
| `description` | string | Purpose and context of this screen | Yes |
| `layout` | map | `type` (required): `single-column`, `sidebar-content`, or `split-screen`. Optional: `max-width`, `sidebar-width`. Required: `background` (token reference) | Yes |
| `sections` | array | Ordered array of page sections. Each section has `id` (required), optional `layout` (stack/flex-row/flex-row-between/grid), optional `columns`/`columns-md`/`columns-sm`, optional `padding`/`gap`/`sticky`. Contains either `children` array or single `component` reference | Yes |
| `states` | map | `default` (required): normal loaded state description. Optional: `loading` (with `affected-sections`), `empty` (with `affected-sections`, `message`), `error` (with `show-toast`, `retry`) | Yes |
| `images` | array | Image specs with `location`, `query` (Pexels search), `orientation` (landscape/portrait/square), `size` (WxH), `fallback` (placeholder text) | No |
| `responsive` | map | Desktop-first. `mobile` section describes mobile differences: layout type changes, per-section column/layout overrides, `hidden` flag | No |
| `interactions` | array | Trigger/action pairs describing user interactions | No |
| `developer-notes` | array | Implementation hints as string array | No |

**Section children vs single component:** A section uses either a `children` array (multiple components) or a single `component` reference with optional `variant` and `props`.

## Content Zone Hints

The `props` field in component references uses two value types:

**Literal values** configure the component directly:
```yaml
props:
  variant: primary
  level: h1
  active: true
```

**Content-zone hints** are descriptive strings guiding content generation:
```yaml
props:
  content: "Welcome headline emphasizing speed and reliability"
  content-zone: "2-3 sentence product description with call to action"
  content-zone: "Metric value with label and trend indicator (e.g., +12.5%)"
```

Content-zone hints tell the designer agent what content to generate (type and structure), how much content (quantity guidance), and what tone (if relevant to sizing/layout decisions).

## Token-Driven Preview Rules

Component preview HTML must use Tailwind utility classes that resolve through the token system. The YAML `tokens` field and the `preview` HTML must be consistent.

**Allowed in preview HTML:**

- Tailwind utility classes mapping to token-defined CSS custom properties: `bg-primary`, `text-text-primary`, `rounded-lg`, `shadow-md`, `font-display`, `text-xl`
- Structural utilities (not token-dependent): `flex`, `grid`, `items-center`, `justify-between`, `inline-flex`, `relative`, `absolute`
- Responsive prefixes: `md:text-xl`, `lg:grid-cols-3`
- State prefixes: `hover:bg-primary-hover`, `focus:ring-2`, `disabled:opacity-50`

**Forbidden in preview HTML:**

- Hardcoded hex colors: `bg-[#3b82f6]`, `text-[#111827]`, `style="color: #333"`
- Hardcoded pixel/rem arbitrary values: `p-[17px]`, `rounded-[0.5rem]`
- Hardcoded font names: `style="font-family: Inter"`
- Tailwind default colors bypassing token system: `bg-blue-500` (only valid if `--color-blue-500` is defined in tokens)

**Exception for component tokens:** Component-scoped tokens (e.g., `--button-primary-bg`) are not in Tailwind's auto-generated namespace. These may be applied using `bg-[var(--button-primary-bg)]` syntax. Prefer semantic equivalents (`bg-primary`) when the semantic token resolves to the same value.

## HTML Boilerplate Template

All prototype files (component previews and screen prototypes) use this template:

```html
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Page Title} -- {Project Name} Design</title>

  <!-- Tailwind CSS v3 ONLY (NOT v4) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            // Map from stylekit.yaml token values
            primary: { DEFAULT: '{value}', hover: '{value}' },
            secondary: { DEFAULT: '{value}' },
            neutral: { 50: '{value}', 100: '{value}', /* ... */ },
          },
          fontFamily: {
            display: ['{Display Font}', 'sans-serif'],
            body: ['{Body Font}', 'sans-serif'],
          },
          borderRadius: {
            // Map from stylekit.yaml primitive.border.radius tokens
          },
          boxShadow: {
            // Map from stylekit.yaml primitive.shadow tokens
          },
        }
      }
    }
  </script>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family={Display+Font}:wght@400;500;600;700&family={Body+Font}:wght@400;500;600&display=swap" rel="stylesheet">

  <!-- Material Symbols -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

  <!-- Project stylekit (custom properties for dark mode + values not in tailwind.config) -->
  <link rel="stylesheet" href="{relative path to stylekit.css}">

  <style>
    .material-symbols-rounded {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    /* CSS keyframe animations from stylekit */
  </style>
</head>
<body class="font-body bg-neutral-50 text-neutral-900 antialiased">

  {Page Content}

</body>
</html>
```

**Notes:** The inline `tailwind.config` maps stylekit.yaml token values to Tailwind theme extensions, enabling standard utility classes (bg-primary, text-neutral-900, font-display). The `stylekit.css` link provides CSS custom properties for dark mode overrides and any values not covered by the inline config. Font families in the Google Fonts link match `primitive.typography.family` tokens. No build system -- files open directly in any browser. MUST use Tailwind v3 CDN (`cdn.tailwindcss.com` without version suffix), NOT v4.

## Stylekit Preview (Composed Design System View)

The stylekit preview is a single HTML page at `.ace/design/stylekit-preview.html` that presents the entire design system on one page. It is the primary artifact users review during the design approval gate.

**Generated:** Full mode only (first UI stage). Not generated in screens-only mode.
**Regenerated:** During revisions in full mode (always reflects current token/component state).
**Purpose:** Replace the need to open 7+ individual component HTML files. User reviews one composed page instead.

### Page Structure

The preview has 5 mandatory sections, 2 conditional sections, and optional project-specific additions:

**Navigation:** Sticky top bar with page title, jump links to each section, and a theme toggle button (conditional on `themes.dark` existing in stylekit.yaml).

**Mandatory sections:**

1. **Color Palette** -- Grid of all `primitive.color` tokens with visual swatches, token names, and hex/oklch values
2. **Typography** -- Contextual specimens using real project text (not generic placeholder), labeled with typographic role (h1, h2, body, small, mono), showing font family, size, weight, and line-height
3. **Spacing Scale** -- Visual bars with semantic names (card-padding, section-gap) alongside raw values
4. **Components Gallery** -- Each component rendered in ALL relevant states (default, hover, focus, disabled, loading), not just default
5. **Patterns / Compositions** -- 3-5 compositions of components into real UI patterns (header, modal, toast, empty state)

**Conditional sections:**

6. **Animations** -- Included when `@keyframes` are defined in `stylekit.css`. Shows each animation with label, preview element, and replay button using CSS class toggle pattern
7. **Responsive Breakpoints** -- Included when project breakpoints differ from Tailwind v3 defaults. Shows breakpoint table with values and layout notes

The 5+2 sections are the floor. The designer may add 1-2 project-specific sections (icon gallery, illustration guide, data visualization palette) based on project context.

### Key Differences from Screen Prototypes

| Aspect | Screen Prototypes | Stylekit Preview |
|--------|-------------------|------------------|
| Location | `{stage_dir}/design/{screen}.html` | `.ace/design/stylekit-preview.html` |
| CSS path | Relative multi-level (`../../../design/stylekit.css`) | Same directory (`stylekit.css`) |
| Content | Page layouts with real content | Token documentation + component gallery |
| Anti-generic checks | Yes (reviewed for design quality) | No (documentation artifact) |
| Mode | Both full and screens-only | Full mode only |
| User-facing | Yes (in approval gate) | Yes (in approval gate, full mode) |

### Preview Implementation Patterns

**Theme toggle:**
```javascript
function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const icon = document.getElementById('theme-icon');
  icon.textContent = document.documentElement.classList.contains('dark') ? 'light_mode' : 'dark_mode';
}
```
Conditional: only render the toggle button if `themes.dark` exists in `stylekit.yaml`.

**Animation replay:**
```javascript
function replay(btn, className) {
  btn.classList.remove(className);
  btn.offsetHeight; // force reflow to restart CSS animation
  btn.classList.add(className);
}
```
Each animation gets a button calling `onclick="replay(this, 'animate-{name}')"`.

**Component state rendering:**
For each component, render states side-by-side. Simulate non-interactive states with CSS classes: hover with explicit hover-state classes, focus with `ring-2 ring-primary`, disabled with `opacity-50 cursor-not-allowed`, loading with an inline spinner icon. Use the component's YAML `states` field to determine which states to render.

### File List in Approval Gate

The approval gate lists only these HTML files for user review:

**Full mode:**
- `.ace/design/stylekit-preview.html` (design system overview)
- `{stage_dir}/design/{screen-name}.html` (screen prototypes)

**Screens-only mode:**
- `{stage_dir}/design/{screen-name}.html` (screen prototypes only)

Individual component HTMLs at `.ace/design/components/{name}/{name}.html` exist on disk for agent use but are NOT listed in the approval gate.

## Format Rules

1. **Token-driven previews:** All visual values in component preview HTML trace to design tokens via Tailwind utility classes. No hardcoded hex colors, pixel sizes, or font names in preview snippets.

2. **YAML tokens field matches preview HTML:** If a component's YAML `tokens` section declares `background: "{component.button.primary.bg}"`, the preview HTML uses the corresponding Tailwind class (`bg-primary`), not a hardcoded value. The two sources must be consistent.

3. **State vocabulary is fixed at 8 states:** default, hover, active, focus, disabled, loading, error, empty. Components document only relevant states from this vocabulary -- never custom or ad-hoc state names.

4. **Section-based screen specs:** Screen layout uses hierarchical sections, each with a `layout` type and `children` array of component references. Not a flat component list.

5. **Content zones with hints:** Screen spec component props use descriptive hints for content generation (e.g., "2-3 sentence product description") -- not full representative text and not bare structural placeholders.

6. **Desktop-first responsive strategy:** Screen specs define the desktop layout as primary. Mobile differences go in the `responsive.mobile` override section.

7. **Composable, not compiled:** Page prototypes are composed by copying and adapting component HTML -- no build system, no web components, no runtime imports. All HTML files open directly in a browser.

8. **Single source of truth for rendering:** The component preview HTML file is the canonical rendering reference. Page prototypes derive from it. When a component changes, pages are re-rendered from the updated component.

9. **Descriptive placeholder fallback:** When Pexels API is unavailable, images render as styled divs with descriptive text and dimensions, using a consistent format across all prototypes.

10. **Revisions overwrite in place:** Prototype files are overwritten during revisions. Git tracks previous versions for comparison -- no `-before.html` copies are created.
