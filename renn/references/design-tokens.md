<overview>
Token schema reference for the three-layer W3C DTCG design token system used by ace-designer and ace-design-reviewer agents. Consulted during stylekit creation (full mode), stylekit validation (reviewer), and token-to-CSS generation.
</overview>

## DTCG $type Reference Table

| Visual Category | DTCG $type | $value Format |
|-----------------|------------|---------------|
| Colors | `color` | String: hex (`"#3b82f6"`) or oklch (`"oklch(0.55 0.15 250)"`) |
| Font families | `fontFamily` | Array of strings: `["Inter", "sans-serif"]` |
| Font weights | `fontWeight` | Number: `400`, `700` |
| Font sizes | `dimension` | Object: `{ value: 1.25, unit: "rem" }` |
| Line heights | `number` | Number: `1.5` |
| Letter spacing | `dimension` | Object: `{ value: -0.025, unit: "em" }` |
| Spacing | `dimension` | Object: `{ value: 0.25, unit: "rem" }` |
| Breakpoints | `dimension` | Object: `{ value: 40, unit: "rem" }` |
| Shadows | `shadow` | Object: `{ color, offsetX, offsetY, blur, spread }` |
| Border widths | `dimension` | Object: `{ value: 1, unit: "px" }` |
| Border radius | `dimension` | Object: `{ value: 0.5, unit: "rem" }` |
| Z-index / Opacity | `number` | Number: `50` or `0.5` |
| Durations | `duration` | Object: `{ value: 300, unit: "ms" }` |
| Easing | `cubicBezier` | Array of 4 numbers: `[0, 0, 0.2, 1]` |

**Animations:** CSS `@keyframes` are defined directly in `stylekit.css` as standard CSS, not as formal DTCG tokens. The DTCG spec has no native animation type. The designer writes keyframe definitions in `stylekit.css` after the `.dark {}` block, using existing `duration` and `cubicBezier` tokens for timing values. The stylekit preview documents defined animations with interactive replay buttons.

## Three-Layer Architecture

| Layer | Purpose | Naming Pattern | Alias Rules |
|-------|---------|----------------|-------------|
| **Primitive** | Raw values (palette, scales, base units) | `primitive.{category}.{name}[.{variant}]` | Concrete values only. No aliases. |
| **Semantic** | Intent-based aliases referencing primitives | `semantic.{category}.{name}[.{variant}]` | References primitives via `{primitive.path.to.token}` |
| **Component** | Scoped to specific UI components | `component.{component-name}.{property}` | References semantic via `{semantic.path.to.token}` (or primitive when no semantic exists) |

**Alias resolution rules:**

- Primitive tokens: concrete `$value` entries only (no aliases)
- Semantic tokens: reference primitives using `{primitive.path.to.token}` alias syntax
- Component tokens: reference semantic tokens using `{semantic.path.to.token}`, or primitive tokens when no appropriate semantic token exists
- Maximum alias chain depth: **2 levels** (component -> semantic -> primitive)
- Circular aliases are forbidden
- Alias resolution order: primitives first, then semantics, then components

## Token File Sections

Five required top-level sections, in order:

1. **`metadata`** -- file metadata (project name, version, generation timestamp, format identifier)
2. **`primitive`** -- Layer 1: raw values (palette, typography scales, spacing units, shadows, borders)
3. **`semantic`** -- Layer 2: intent-based aliases referencing primitives
4. **`component`** -- Layer 3: component-scoped tokens referencing semantic or primitive tokens
5. **`themes`** -- theme overrides (only tokens that differ per theme; base tokens = light)

## Namespace Consolidation Table

Maps token category paths to CSS custom property names used in the `:root {}` block and referenced by the Tailwind v3 inline `tailwind.config`.

| Token Category Path | CSS Custom Property | Consolidation Rule |
|--------------------|-----------------------|-------------------|
| `primitive.color.*` | `--color-*` | Drop `primitive.`, flatten remaining |
| `semantic.color.*` | `--color-*` | Drop `semantic.`, flatten remaining |
| `primitive.typography.family.*` | `--font-*` | Map `typography.family.{name}` to `--font-{name}` |
| `primitive.typography.size.*` | `--text-*` | Map `typography.size.{name}` to `--text-{name}` |
| `primitive.typography.weight.*` | `--font-weight-*` | Map `typography.weight.{name}` to `--font-weight-{name}` |
| `primitive.typography.leading.*` | `--leading-*` | Map `typography.leading.{name}` to `--leading-{name}` |
| `primitive.typography.tracking.*` | `--tracking-*` | Map `typography.tracking.{name}` to `--tracking-{name}` |
| `primitive.spacing.unit` | `--spacing` | Single value; Tailwind multiplies by utility number |
| `primitive.breakpoint.*` | `--breakpoint-*` | Map `breakpoint.{name}` to `--breakpoint-{name}` |
| `primitive.border.radius.*` | `--radius-*` | Map `border.radius.{name}` to `--radius-{name}` |
| `primitive.shadow.*` | `--shadow-*` | Map `shadow.{name}` to `--shadow-{name}` |
| `primitive.transition.easing.*` | `--ease-*` | Map `transition.easing.{name}` to `--ease-{name}` |
| `primitive.transition.duration.*` | `--animate-duration-*` | Map `transition.duration.{name}` to `--animate-duration-{name}` |
| `component.*` | `--{component}.*` | Drop `component.`, flatten remaining |

## CSS Generation Rules

Key rules for `:root {}` output:

- The generated CSS file is a plain CSS custom properties file (no Tailwind directives, no `@import`, no `@theme`)
- Open a `:root {}` block containing all resolved token values as CSS custom properties
- All values inside `:root` are concrete CSS values -- no `var()` references, no aliases
- Semantic and component tokens appear with their fully-resolved concrete values alongside primitive tokens
- Layer prefix (`primitive.`, `semantic.`, `component.`) is dropped in CSS property names
- Dots become hyphens, prefixed with `--` (e.g., `primitive.color.brand.teal-500` becomes `--color-brand-teal-500`)
- Do NOT use Tailwind v4 syntax (`@import "tailwindcss"`, `@theme`, `@custom-variant`) -- the CSS file is consumed by the HTML boilerplate's inline `tailwind.config`
- Token names within a namespace must be unique (flatten step must detect duplicate paths)

## Dark Theme Override Rules

- Base tokens (primitive, semantic, component sections) represent the **light theme** (default)
- `themes.dark` contains **only tokens that differ** in dark mode
- Only semantic and component tokens are overridden -- primitives are the shared palette across all themes
- Dark overrides go in a `.dark {}` block after the `:root {}` block
- Each alias in `themes.dark` is resolved to its concrete value before CSS output
- Theme overrides must NOT introduce new token paths -- they override existing paths only
- The `.dark {}` block overrides the same CSS custom property names defined in `:root {}`

## Condensed Example

**Token YAML (3 layers):**

```yaml
primitive:
  color:
    $type: color
    brand:
      teal-500: { $value: "oklch(0.65 0.15 180)" }
  typography:
    family:
      $type: fontFamily
      body: { $value: ["Inter", "sans-serif"] }

semantic:
  color:
    primary: { $value: "{primitive.color.brand.teal-500}" }

component:
  button:
    primary-bg: { $value: "{semantic.color.primary}" }

themes:
  dark:
    semantic:
      color:
        primary: { $value: "{primitive.color.brand.teal-500}" }
```

**Generated CSS output:**

```css
:root {
  --color-brand-teal-500: oklch(0.65 0.15 180);
  --color-primary: oklch(0.65 0.15 180);
  --font-body: "Inter", sans-serif;
  --button-primary-bg: oklch(0.65 0.15 180);
}

.dark {
  --color-primary: oklch(0.65 0.15 180);
}
```

## Format Rules Summary

1. **Single YAML file**: All tokens (primitive, semantic, component, themes) reside in one `tokens.yaml` file with a metadata header.

2. **DTCG $type/$value structure**: Every token leaf uses `$type` (inherited from parent group or declared inline) and `$value` (concrete value or `{alias}` reference).

3. **Three layers only**: Primitive (concrete values), Semantic (references primitives), Component (references semantic or primitive). No fourth layer.

4. **Maximum alias depth of 2**: Component -> Semantic -> Primitive is the deepest chain. No alias may reference another alias that itself references an alias.

5. **Dot-separated YAML paths, hyphen-separated CSS properties**: YAML uses `primitive.color.brand.blue.500`; CSS output uses `--color-brand-blue-500`. Layer prefix is dropped in CSS.

6. **All :root values are concrete**: The generated `:root {}` block contains resolved values only -- no `var()` references, no aliases. Aliases are resolved during the pipeline.

7. **Color namespace**: The `:root {}` block defines all project colors as CSS custom properties. The HTML boilerplate's inline `tailwind.config` maps these to Tailwind theme extensions.

8. **Themes override semantics, not primitives**: The `themes.dark` section contains only semantic and component token overrides. Primitive tokens are the shared palette across all themes. The `.dark {}` block overrides the same CSS custom property names defined in `:root {}`.

9. **Spacing uses Tailwind multiplier pattern**: Define `--spacing: 0.25rem` (base unit). Tailwind generates `p-4` = 4 * 0.25rem = 1rem automatically.

10. **Responsive behavior in HTML, not tokens**: Breakpoint tokens define thresholds. Responsive adaptation is achieved via Tailwind utility prefixes (`md:text-xl`) in markup, not via breakpoint-conditional token values.
