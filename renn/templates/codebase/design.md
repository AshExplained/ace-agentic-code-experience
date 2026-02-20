# Design Patterns Template

Template for `.ace/codebase/DESIGN.md` - captures existing visual design patterns and component inventory.

**Purpose:** Surface the existing visual design system so brownfield projects can translate their patterns into ACE's design workflow rather than starting from scratch.

---

## File Template

```markdown
# Design Patterns

**Analysis Date:** [YYYY-MM-DD]

**Design Maturity:** [token-based | utility-first | ad-hoc | minimal]

## Styling Technology

**Framework:**
- [e.g., "Tailwind CSS 3.x", "CSS Modules", "Styled Components", "Android XML", "SwiftUI"]
- Config: `[config file path]`

**Approach:**
- [e.g., "utility-first", "component-scoped", "theme-based", "XML resources"]

## Color System

**Primary Palette:**
- Primary: [hex/value] - [usage: e.g., "CTA buttons, links, active states"]
- Secondary: [hex/value] - [usage]
- Accent: [hex/value] - [usage]

**Neutrals:**
- [Scale from lightest to darkest with hex values and usage]

**Feedback Colors:**
- Success: [hex/value] - [usage context]
- Warning: [hex/value] - [usage context]
- Error: [hex/value] - [usage context]
- Info: [hex/value] - [usage context]

**Source:** `[file path where colors are defined]`

## Typography

**Font Families:**
- Display/Heading: [font name] - [source: e.g., "Google Fonts", "system font", "bundled"]
- Body: [font name] - [source]
- Mono/Code: [font name] - [source]

**Type Scale:**
- [Size name]: [value] - [usage]

**Source:** `[file path where typography is defined]`

## Spacing

**Scale:**
- [Token/name]: [value] - [usage]

**Base Unit:** [e.g., "4px", "0.25rem"]

**Source:** `[file path where spacing is defined]`

## Shadows

**Elevation Scale:**
- [Name]: [value] - [usage: e.g., "cards", "modals", "dropdowns"]

**Source:** `[file path where shadows are defined]`

## Component Inventory

**[Component Name]:**
- Purpose: [what it does]
- Variants: [e.g., "primary, secondary, ghost"]
- Location: `[file path]`

## Visual Patterns

**[Pattern Name]:**
- Description: [what it looks like and when it appears]
- Components Used: [which components compose this pattern]
- Example: `[file path where this pattern appears]`

## Dark Mode

**Strategy:** [CSS class toggle | media query | system preference | not implemented]
**Implementation:** `[file path]`
**Token Overrides:** [which values change in dark mode]

## Border Radius

**Scale:**
- [Name]: [value] - [usage]

---

*Design analysis: [date]*
*Update when visual system changes*
```

<good_examples>
```markdown
# Design Patterns

**Analysis Date:** 2025-03-15

**Design Maturity:** utility-first

## Styling Technology

**Framework:**
- Tailwind CSS 3.4.1
- Config: `tailwind.config.ts`
- PostCSS: `postcss.config.js`

**Approach:**
- Utility-first with custom theme extensions
- `@apply` used in `src/styles/globals.css` for base component classes
- Shadcn/UI components configured via `components.json`

## Color System

**Primary Palette:**
- Primary: hsl(221.2 83.2% 53.3%) - CTA buttons, links, active tab indicators
- Secondary: hsl(210 40% 96.1%) - Secondary buttons, subtle backgrounds
- Accent: hsl(210 40% 96.1%) - Hover states, focus rings

**Neutrals:**
- Background: hsl(0 0% 100%) - Page background
- Foreground: hsl(222.2 84% 4.9%) - Primary text
- Muted: hsl(210 40% 96.1%) - Disabled states, placeholder text
- Muted Foreground: hsl(215.4 16.3% 46.9%) - Secondary text, captions
- Border: hsl(214.3 31.8% 91.4%) - Dividers, input borders
- Card: hsl(0 0% 100%) - Card surfaces

**Feedback Colors:**
- Success: hsl(142.1 76.2% 36.3%) - Success toasts, valid input indicators
- Warning: hsl(38 92% 50%) - Warning badges, caution alerts
- Error: hsl(0 84.2% 60.2%) - Error messages, destructive button variant
- Info: hsl(221.2 83.2% 53.3%) - Info banners (shares primary hue)

**Source:** `tailwind.config.ts` (theme.extend.colors), `src/styles/globals.css` (:root CSS variables)

## Typography

**Font Families:**
- Display/Heading: Inter - Google Fonts, variable weight (400-700)
- Body: Inter - Google Fonts, variable weight (400-600)
- Mono/Code: Fira Code - Google Fonts, used in code blocks and CLI output

**Type Scale:**
- xs: 0.75rem (12px) - Labels, badges, fine print
- sm: 0.875rem (14px) - Secondary text, table cells
- base: 1rem (16px) - Body text, input values
- lg: 1.125rem (18px) - Card titles, section labels
- xl: 1.25rem (20px) - Page section headings
- 2xl: 1.5rem (24px) - Page titles
- 3xl: 1.875rem (30px) - Hero headings
- 4xl: 2.25rem (36px) - Landing page hero

**Source:** `tailwind.config.ts` (theme.extend.fontFamily), `src/app/layout.tsx` (font imports)

## Spacing

**Scale:**
- 0.5: 0.125rem (2px) - Tight inline spacing
- 1: 0.25rem (4px) - Icon-to-text gaps
- 2: 0.5rem (8px) - Compact element padding
- 3: 0.75rem (12px) - Button padding-y
- 4: 1rem (16px) - Card padding, form field gaps
- 6: 1.5rem (24px) - Section padding, card gaps
- 8: 2rem (32px) - Page section margins
- 12: 3rem (48px) - Major section breaks
- 16: 4rem (64px) - Page-level vertical rhythm

**Base Unit:** 4px (0.25rem)

**Source:** `tailwind.config.ts` (default Tailwind spacing scale, no custom overrides)

## Shadows

**Elevation Scale:**
- sm: 0 1px 2px 0 rgb(0 0 0 / 0.05) - Subtle buttons, input fields
- DEFAULT: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1) - Cards, dropdowns
- md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) - Elevated cards, popovers
- lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) - Modals, dialogs
- xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) - Floating action menus

**Source:** `tailwind.config.ts` (default Tailwind shadow scale with custom `ring` shadow added)

## Component Inventory

**Button:**
- Purpose: Primary interactive element for actions
- Variants: default, secondary, destructive, outline, ghost, link
- Location: `src/components/ui/button.tsx`

**Card:**
- Purpose: Content container with header, body, footer sections
- Variants: default, interactive (hover shadow)
- Location: `src/components/ui/card.tsx`

**Input:**
- Purpose: Text input fields for forms
- Variants: default, with-icon, with-addon
- Location: `src/components/ui/input.tsx`

**Badge:**
- Purpose: Status indicators and category labels
- Variants: default, secondary, destructive, outline
- Location: `src/components/ui/badge.tsx`

**Avatar:**
- Purpose: User profile images with fallback initials
- Variants: sm (32px), md (40px), lg (64px)
- Location: `src/components/ui/avatar.tsx`

**Modal (Dialog):**
- Purpose: Overlay dialogs for confirmations and forms
- Variants: default, alert (destructive action confirmation)
- Location: `src/components/ui/dialog.tsx`

**Table:**
- Purpose: Data display with sortable columns
- Variants: default, striped, compact
- Location: `src/components/ui/table.tsx`

**Navigation:**
- Purpose: Top navigation bar with responsive mobile menu
- Variants: default (transparent), scrolled (with shadow)
- Location: `src/components/layout/navigation.tsx`

**Sidebar:**
- Purpose: Left sidebar navigation for dashboard views
- Variants: expanded, collapsed (icon-only)
- Location: `src/components/layout/sidebar.tsx`

**Toast:**
- Purpose: Temporary notification messages
- Variants: default, success, error, warning
- Location: `src/components/ui/toast.tsx`

## Visual Patterns

**Dashboard Grid:**
- Description: 2-4 column responsive grid of stat cards above a main content area with sidebar filters
- Components Used: Card, Badge, Avatar, Sidebar
- Example: `src/app/dashboard/page.tsx`

**Settings Form:**
- Description: Vertical stack of labeled form sections with save/cancel footer actions
- Components Used: Input, Button, Card, Toast
- Example: `src/app/settings/page.tsx`

**Data Table with Actions:**
- Description: Full-width table with column sorting, row-level action dropdowns, and bulk selection
- Components Used: Table, Button (ghost), Badge, Modal
- Example: `src/app/users/page.tsx`

**Empty State:**
- Description: Centered illustration with heading, description text, and primary CTA button
- Components Used: Button
- Example: `src/components/empty-state.tsx`

## Dark Mode

**Strategy:** CSS class toggle
**Implementation:** `src/components/theme-provider.tsx` (next-themes ThemeProvider)
**Token Overrides:**
- Background: hsl(222.2 84% 4.9%) (inverted from white)
- Foreground: hsl(210 40% 98%) (inverted from near-black)
- Card: hsl(222.2 84% 4.9%) (matches dark background)
- Border: hsl(217.2 32.6% 17.5%) (darker dividers)
- Muted: hsl(217.2 32.6% 17.5%) (darker subtle surfaces)
- All feedback colors remain unchanged (sufficient contrast in both modes)
- Shadows reduced to 50% opacity in dark mode

## Border Radius

**Scale:**
- sm: 0.25rem (4px) - Badges, small chips
- DEFAULT: 0.375rem (6px) - Buttons, inputs, cards
- md: 0.5rem (8px) - Cards when used as containers
- lg: 0.75rem (12px) - Modal dialogs, large cards
- full: 9999px - Avatars, circular buttons, pills

---

*Design analysis: 2025-03-15*
*Update when visual system changes*
```
</good_examples>

<guidelines>
**What belongs in DESIGN.md:**
- Design token values with semantic context (color names, hex values, usage descriptions)
- Typography definitions (font families, type scale, font sources)
- Spacing and sizing scales with base unit
- Shadow and elevation definitions
- Component inventory at summary level (name, purpose, variants, file path)
- Visual patterns describing how components compose into page layouts
- Dark mode strategy and token overrides
- Border radius scale
- Styling technology and approach (framework, config file paths)
- Design maturity assessment

**What does NOT belong here:**
- Component implementation code (no JSX, no template code)
- Full CSS file contents (extract values, not dump files)
- Build configuration details (webpack, Vite, PostCSS plugin lists)
- JavaScript/TypeScript application logic
- State management patterns (that belongs in ARCHITECTURE.md)
- Test files or test patterns (that belongs in TESTING.md)
- Package dependency lists (that belongs in STACK.md)

**When filling this template:**
- Always include semantic context alongside raw values ("Primary: #2563EB, used for CTA buttons" not just "#2563EB")
- Capture component variants not just names ("primary, secondary, ghost" not just "Button exists")
- Include `**Source:**` file paths for every section where values are extracted from specific files
- Use backticks for all file paths: `tailwind.config.ts`
- For projects with minimal design systems, still document what exists and set Design Maturity to "ad-hoc" or "minimal"
- Prefer actual measured values over descriptions ("0.375rem" not "small")
- Document dark mode token overrides even if only a few values change

**Useful for:**
- plan-stage translate mode detection (DESIGN.md existence triggers translate flow)
- Designer agent extraction reference (translate mode reads this to generate stylekit)
- Architect UI planning context (understands existing visual patterns before proposing changes)
- Reviewer calibration (knows what the existing design looks like for comparison)

**How this gets populated:**
Design mapper agent during `ace.map-codebase` (conditional -- only spawned when 2+ UI indicators detected). The mapper explores CSS/config files, component directories, and theme providers, then writes this document directly to `.ace/codebase/DESIGN.md`.
</guidelines>
