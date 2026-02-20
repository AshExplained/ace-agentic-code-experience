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

## Common Components

Seven common components. Only create components the stage screens will actually use. Projects may add custom components using the same schema.

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
| `viewport` | map | Optional viewport override for this screen. Same schema as stylekit viewport section. Absent = inherit from stylekit. Present = override completely (not merged). | No |

**Section children vs single component:** A section uses either a `children` array (multiple components) or a single `component` reference with optional `variant` and `props`.

## Stylekit Viewport Schema

The optional `viewport` section in stylekit.yaml defines the target canvas for non-desktop projects. When absent, all viewport-dependent behavior is skipped -- the designer, reviewer, and implementation guide treat the absence of this section as `type: desktop` with full-width responsive behavior (the current default).

```yaml
viewport:
  type: mobile          # mobile | desktop | tablet | fixed | wearable | tv | print
  width: 390
  height: 844
  frame: iphone-15      # triggers device chrome wrapper in prototypes
  orientation: portrait  # portrait | landscape
  shape: rectangular     # rectangular | circular (wearables)
  direction: ltr         # ltr | rtl
```

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `type` | enum | `desktop`, `mobile`, `tablet`, `fixed`, `wearable`, `tv`, `print` | Yes |
| `width` | number | Canvas width in pixels (irrelevant for desktop) | No (desktop skips) |
| `height` | number | Canvas height in pixels (irrelevant for desktop) | No (desktop skips) |
| `frame` | string | Device frame identifier (e.g., `iphone-15`, `pixel-8`). Triggers device chrome wrapper. `none` for no frame. | No |
| `orientation` | enum | `portrait` or `landscape` | No (defaults to `portrait`) |
| `shape` | enum | `rectangular` or `circular` (wearables) | No (defaults to `rectangular`) |
| `direction` | enum | `ltr` or `rtl` | No (defaults to `ltr`) |

## Viewport Type Behavior

Each viewport type maps to specific canvas behavior in screen prototypes:

| Type | Canvas Behavior | Frame Available | Common Dimensions |
|------|----------------|-----------------|-------------------|
| `desktop` | Full-width responsive (current behavior) | No | N/A |
| `mobile` | Fixed-width centered div | Yes (device chrome) | 375-430px width |
| `tablet` | Fixed-width centered div | Yes (device chrome) | 768-1024px width |
| `fixed` | Exact dimensions, no scaling | Optional border | Any WxH |
| `wearable` | Small constrained canvas | Optional circular clip | 170-267px |
| `tv` | Large canvas, oversized targets | No | 1920x1080 |
| `print` | Fixed A4/Letter ratio | Page break markers | 210x297mm (A4) |

## Device Viewport Reference Table

Common device dimensions for the designer to reference. The `ID` column value is used in the `frame` field of the viewport schema. Dimensions are CSS pixels, not physical pixels.

| ID | Device | Width | Height | Frame |
|----|--------|-------|--------|-------|
| `iphone-se` | iPhone SE | 375 | 667 | `iphone-se` |
| `iphone-14` | iPhone 14 | 390 | 844 | `iphone-14` |
| `iphone-15-pro` | iPhone 15 Pro | 393 | 852 | `iphone-15-pro` |
| `iphone-15-pro-max` | iPhone 15 Pro Max | 430 | 932 | `iphone-15-pro-max` |
| `pixel-8` | Google Pixel 8 | 412 | 892 | `pixel-8` |
| `galaxy-s24` | Samsung Galaxy S24 | 360 | 780 | `galaxy-s24` |
| `ipad-mini` | iPad mini | 768 | 1024 | `ipad-mini` |
| `ipad-pro-11` | iPad Pro 11" | 834 | 1194 | `ipad-pro-11` |
| `ipad-pro-13` | iPad Pro 13" | 1024 | 1366 | `ipad-pro-13` |
| `watch-41mm` | Apple Watch 41mm | 176 | 215 | `watch-41mm` |
| `watch-ultra` | Apple Watch Ultra | 205 | 251 | `watch-ultra` |
| `galaxy-watch` | Samsung Galaxy Watch | 170 | 170 | `galaxy-watch` |
| `tv-1080p` | TV 1080p | 1920 | 1080 | none |
| `letter-page` | US Letter | 816 | 1056 | none |

## Viewport Wrapper Pattern

Screen prototypes constrain their content when a non-desktop viewport exists. The stylekit preview (`stylekit-preview.html`) is ALWAYS full-width regardless of viewport settings. The preview is a documentation artifact, not a screen prototype. Only screen prototypes at `.ace/design/screens/` use viewport wrapping.

**Viewport cascade:** Screen prototypes inherit viewport from `stylekit.yaml`. If a screen spec YAML has its own `viewport` field, the screen spec viewport overrides the stylekit viewport for that screen only. Absent viewport in screen spec = inherit from stylekit. Present viewport = complete override (not merge).

**Background page pattern (shared by all constrained viewports):**

```html
<body class="font-body bg-neutral-200 text-neutral-900 antialiased min-h-screen flex items-center justify-center">
  <!-- Device container centered on gray background -->
  <div class="relative" style="width: {width}px;">
    <!-- Device frame (optional) -->
    {frame_html}
    <!-- Content area -->
    <div class="bg-neutral-50 overflow-hidden" style="width: {width}px; height: {height}px; overflow-y: auto;">
      {page_content}
    </div>
  </div>
</body>
```

The body background changes from `bg-neutral-50` (the default full-width page bg) to `bg-neutral-200` (a contrasting surface) so the viewport container is visually distinct from the page. The content area uses `bg-neutral-50` to match the normal page background.

**iPhone frame pattern (mobile devices):**

```html
<div class="rounded-[2.5rem] border-[3px] border-neutral-800 shadow-xl overflow-hidden relative">
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-neutral-800 rounded-b-2xl z-10"></div>
  <div class="bg-neutral-50" style="width: {width}px; height: {height}px; overflow-y: auto; padding-top: 44px;">
    {page_content}
  </div>
</div>
```

**Circular frame pattern (wearables):**

```html
<div class="rounded-full border-[4px] border-neutral-700 shadow-xl overflow-hidden">
  <div class="bg-neutral-900" style="width: {width}px; height: {height}px; clip-path: circle(50%);">
    {page_content}
  </div>
</div>
```

**Fixed dimension pattern (no frame):**

```html
<div class="border border-neutral-300 shadow-lg overflow-hidden">
  <div class="bg-neutral-50" style="width: {width}px; height: {height}px; overflow-y: auto;">
    {page_content}
  </div>
</div>
```

**RTL support pattern:**

```html
<html lang="{language}" dir="rtl" class="scroll-smooth">
```

When `direction: rtl`, the `<html>` tag gains `dir="rtl"`. All Tailwind layout utilities auto-flip. No additional CSS changes needed.

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
  <link rel="stylesheet" href="../stylekit.css">

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

**Notes:** The inline `tailwind.config` maps stylekit.yaml token values to Tailwind theme extensions, enabling standard utility classes (bg-primary, text-neutral-900, font-display). The `stylekit.css` link provides CSS custom properties for dark mode overrides and any values not covered by the inline config. Font families in the Google Fonts link match `primitive.typography.family` tokens. No build system -- files open directly in any browser. MUST use Tailwind v3 CDN (`cdn.tailwindcss.com` without version suffix), NOT v4. For screen prototypes at `.ace/design/screens/`, the relative path is `../stylekit.css`. For the stylekit preview at `.ace/design/`, the path is `stylekit.css` (same directory).

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
| Location | `.ace/design/screens/{screen}.html` | `.ace/design/stylekit-preview.html` |
| CSS path | One level up (`../stylekit.css`) | Same directory (`stylekit.css`) |
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
- `.ace/design/screens/{screen-name}.html` (screen prototypes -- new and modified only)

**Screens-only mode:**
- `.ace/design/screens/{screen-name}.html` (screen prototypes -- new and modified only)

Individual component HTMLs at `.ace/design/components/{name}/{name}.html` exist on disk for agent use but are NOT listed in the approval gate.

## Implementation Guide Schema

The implementation guide bridges the designer's Tailwind v3 CDN prototypes to the project's actual CSS framework. It is a summary translation document (target: 100-200 lines) that maps design patterns to framework-specific equivalents. The runner consults it alongside HTML prototypes to produce framework-native code that matches the approved visual design.

**File location:** `.ace/design/implementation-guide.md`

**Generated:** After Phase 2 design approval, before architect spawn (see `generate_implementation_guide` step in plan-stage). Not generated when `HAS_DESIGN=false`.

**Regenerated:** When design artifacts change after the guide was last generated (timestamp comparison against `.ace/design/screens/*.html`, `stylekit.yaml`, `stylekit.css`).

**Consumed by:** Architect (inlined in planning_context via `IMPLEMENTATION_GUIDE` variable), runner (via `@.ace/design/implementation-guide.md` reference in task context).

### Required Sections

The implementation guide has 5 required sections:

**1. Framework Detection**

| Field | Description |
|-------|-------------|
| `CSS framework` | Detected framework name (tailwind-v3, tailwind-v4, styled-components, css-modules, vanilla-css) |
| `Version` | Framework version from package.json |
| `Configuration approach` | How the framework is configured (e.g., "Tailwind v4 CSS-first config", "CSS custom properties in :root", "styled-components ThemeProvider") |

**2. Token System Translation**

Maps stylekit.yaml tokens to the project's CSS system. Content varies by framework:

| Framework | Translation Approach |
|-----------|---------------------|
| vanilla-css | CSS custom properties in `:root {}` -- stylekit.css is directly usable |
| tailwind-v3 | `tailwind.config.js` theme extensions mapping token names to values |
| tailwind-v4 | CSS-first `@theme` declarations in the project's CSS entry point |
| css-modules | Shared CSS custom properties imported in each module via `:root {}` |
| styled-components | Theme object with token values passed through `ThemeProvider` |

Fields: token namespace mapping (stylekit names to project equivalents), exact file path for token definitions, syntax examples for each token layer (primitive, semantic, component).

**3. Icon System**

| Field | Description |
|-------|-------------|
| `Icon library` | Library used in prototypes (typically Material Symbols Rounded) |
| `npm install` | Install command for the project (e.g., `npm install @material-symbols/font-400`) |
| `Import pattern` | How to import in the project's framework (CSS link, JS import, font declaration) |
| `Usage syntax` | How to render icons (component syntax, font class, SVG import) |

**4. Animation Patterns**

| Field | Description |
|-------|-------------|
| `Animations list` | Each `@keyframes` animation found in prototypes and stylekit.css |
| `Definition location` | Where to put keyframes in the project (globals.css, tailwind config, CSS module) |
| `Reference syntax` | How to apply animations (utility class, CSS class name, `animation` property) |

**5. Component Class Mapping**

For each screen prototype, lists key visual sections with their Tailwind v3 CDN classes and the project-framework equivalent. Focuses on classes that DIFFER between v3 CDN and the project framework. Structural classes (flex, grid, items-center) that are identical across frameworks are skipped.

Example entry:
```
### dashboard.html
| Section | v3 CDN Class | Project Equivalent |
|---------|-------------|-------------------|
| Header gradient | bg-gradient-to-r from-primary to-secondary | bg-gradient-to-r from-primary to-secondary (same -- project uses Tailwind v3) |
| Card shadow | shadow-md | shadow-card (project defines semantic shadow token) |
| Icon | material-symbols-rounded font class | <Icon name="..." /> component import |
```

### Notes

- The guide is a summary document, not a full prototype inline. Target 100-200 lines.
- For vanilla CSS projects, the guide maps to CSS custom properties in `:root {}`. The designer-generated `stylekit.css` is directly usable as the project's token source.
- For projects already using Tailwind v3, the guide may be minimal (prototypes already match the project's framework).
- The guide does NOT include full HTML prototype content. It maps patterns. The architect references paths and the runner reads prototypes directly.

## Prototype as Visual Spec

HTML prototypes are visual specifications, not code to copy. They show the approved visual design using Tailwind v3 CDN for fast, reliable static rendering. The project's actual implementation uses whatever CSS framework the project has. The implementation guide bridges this gap.

### Principle

The designer produces pixel-perfect HTML prototypes as the visual source of truth. These prototypes demonstrate exact spacing, color relationships, typography hierarchies, animation timing, icon usage, opacity effects, hover states, and responsive breakpoints. The runner reads the prototype to understand visual intent, then expresses that intent using the project's own framework and the implementation guide's translation mappings.

### What to Read from Prototypes

When a task references an HTML prototype (`@.ace/design/screens/{screen}.html`), the runner extracts:

- **Exact spacing relationships** between elements (padding, margin, gap patterns)
- **Animation and transition details** (timing, easing, what triggers them)
- **Icon usage** (which icons, where, what size, what weight)
- **Opacity and backdrop effects** (blur, overlay darkness, transparency levels)
- **Hover and focus states** (what changes on interaction, transition properties)
- **Color relationships** (which semantic tokens apply to which elements)
- **Typography hierarchy** (which font sizes, weights, line-heights for each text role)
- **Responsive breakpoint behavior** (what changes at each breakpoint)

### What NOT to Do

- **Copy v3 CDN classes directly** into a non-v3 project (e.g., pasting `bg-primary` into a styled-components project)
- **Use inline SVGs** when the implementation guide specifies an icon font or component library
- **Hardcode hex colors** instead of using the project's token system (`#3b82f6` instead of `var(--color-primary)`)
- **Skip animations and transitions** shown in the prototype (they are part of the approved design)
- **Pre-translate design into approximate CSS** in task action text (let the runner read the prototype and guide directly)
- **Ignore responsive behavior** documented in the prototype (breakpoint changes are intentional design decisions)

### Translation Flow

```
HTML Prototype          Implementation Guide        Project Code
(visual intent)    -->  (framework mapping)     -->  (framework-native)

What it looks like      How to express it            Actual implementation
- exact spacing         - token name mapping         - project CSS classes
- icon choices          - icon library import        - icon component usage
- animation timing      - animation location         - keyframe + class
- color relationships   - CSS custom property names  - theme token references
```

The prototype answers "what should it look like?" The implementation guide answers "how do I express that in this framework?" The project code is the result.

### Context Budget

HTML prototypes are typically 200-400 lines. To manage runner context:

- Limit each task to at most **1-2 HTML prototype** `@` references
- Multi-screen runs should split screen implementations across tasks
- The implementation guide (100-200 lines) is referenced once per run, not per task

## Prototype Interactivity

Screen prototypes with multiple states are interactive state machines, not static layouts. Prototypes with states beyond `default` support UI state switching via toggle controls and include working JavaScript for form interactions. Single-state screens (only `default`) have no toggle controls — they are static layouts with optional interaction JavaScript (form validation, modals, etc.).

### Demo Toggle Controls

Screen prototypes with states beyond `default` include a floating control panel for state switching. Single-state screens omit this entirely.

```html
<!-- Fixed bottom-right toggle controls -->
<div class="fixed bottom-4 right-4 z-[60] flex gap-2">
  <button onclick="toggleErrorState()" id="toggle-error-btn"
    class="bg-base-surface-raised border border-base-border-strong
           text-neutral-50 px-3 py-1.5 rounded-lg text-xs font-medium
           hover:bg-base-surface-hover transition-colors shadow-lg">
    Toggle Error State
  </button>
  <button onclick="resetForm()"
    class="bg-base-surface-raised border border-base-border-strong
           text-neutral-50 px-3 py-1.5 rounded-lg text-xs font-medium
           hover:bg-base-surface-hover transition-colors shadow-lg">
    Reset
  </button>
</div>
```

Toggle buttons map to the screen spec's `states` field. One button per non-default state. Button styling adapts to the project's token system.

### JavaScript Interaction Patterns

Prototype JavaScript is demo-quality: global variables, global functions, plain DOM manipulation. No state management, no error handling beyond form validation.

**Form validation:**
```javascript
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('email-input');
  if (!input.value.trim()) {
    input.classList.add('border-red-500', 'animate-shake');
    errorMsg.classList.remove('hidden');
    setTimeout(() => input.classList.remove('animate-shake'), 500);
    return;
  }
  // proceed with success flow
});
```

**Tag/chip input:**
```javascript
tagInput.addEventListener('keydown', (e) => {
  if (e.key === ',' || e.key === 'Enter') {
    e.preventDefault();
    addTag(tagInput.value.trim());
  }
  if (e.key === 'Backspace' && tagInput.value === '' && tags.length > 0) {
    removeTag(tags.length - 1);
  }
});
```

**Loading state transition:**
```javascript
saveBtn.innerHTML = '<span class="material-symbols-rounded text-lg animate-spin">progress_activity</span> Saving...';
saveBtn.disabled = true;
setTimeout(() => {
  saveBtn.innerHTML = '<span class="material-symbols-rounded text-lg">check</span> Saved!';
  setTimeout(() => {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }, 1200);
}, 800);
```

**Modal open/close:**
```javascript
function openModal() {
  modal.classList.remove('hidden');
  modal.querySelector('.modal-card').classList.add('animate-scale-in');
}
function closeModal() {
  modal.querySelector('.modal-card').classList.add('animate-scale-out');
  setTimeout(() => modal.classList.add('hidden'), 200);
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
```

**State toggle:**
```javascript
let errorStateActive = false;
function toggleErrorState() {
  errorStateActive = !errorStateActive;
  document.getElementById('error-section').classList.toggle('hidden');
  document.getElementById('default-section').classList.toggle('hidden');
  document.getElementById('toggle-error-btn').textContent =
    errorStateActive ? 'Show Default' : 'Toggle Error State';
}
```

### Modal Context Pattern

Modal/dialog screens render the parent screen dimmed behind the overlay:

```html
<!-- Dimmed parent background -->
<div class="min-h-screen" aria-hidden="true">
  <div class="opacity-40">
    <!-- Simplified skeleton of parent screen (header, sidebar hints, card grid with colored divs) -->
  </div>
</div>

<!-- Overlay backdrop -->
<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"></div>

<!-- Modal content -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <!-- Modal card with actual interactive content -->
</div>
```

The parent screen uses skeleton content (colored divs with rounded corners) at 40% opacity, not a full-fidelity replica. This conveys spatial context without duplicating the full parent screen.

### Script Block Convention

Each prototype's script block appears after all HTML content, just before the closing body tag. Structure:

1. State variables (`let errorStateActive = false;`)
2. Toggle functions (`function toggleErrorState() { ... }`)
3. Interaction handlers (`form.addEventListener(...)`)
4. Initialization (if needed)

Target: under 100 lines of JS per screen. If a screen needs more, the interactions are too complex for a throwaway prototype.

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
