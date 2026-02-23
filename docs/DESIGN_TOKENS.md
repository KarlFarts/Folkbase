# Design Tokens

CSS custom properties defining the visual foundation of the application.

All tokens are defined in `src/styles/index.css`.

## Spacing Scale

Consistent spacing using a 4px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-xs` | 4px | Tight gaps, inline spacing |
| `--spacing-sm` | 8px | Small gaps between related items |
| `--spacing-md` | 16px | Standard spacing, form gaps |
| `--spacing-lg` | 24px | Section spacing, card padding |
| `--spacing-xl` | 32px | Large section gaps |
| `--spacing-2xl` | 48px | Page-level spacing |

### Usage Examples

```css
/* Card body padding */
padding: var(--spacing-lg);

/* Gap between stacked cards */
gap: var(--spacing-lg);

/* Small gap between badges */
gap: var(--spacing-sm);

/* Tight gap in metadata grids */
gap: var(--spacing-xs) var(--spacing-md);
```

## Color System

### Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-primary` | #0f1419 | Page background |
| `--color-bg-secondary` | #1a1f2e | Card backgrounds |
| `--color-bg-tertiary` | #242b3d | Inactive tabs, subtle backgrounds |
| `--color-bg-elevated` | #2d364a | Hover states, elevated elements |
| `--color-bg-overlay` | rgba(0,0,0,0.7) | Modal backdrops |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | #f0f2f5 | Primary text |
| `--color-text-secondary` | #9aa0a6 | Secondary text |
| `--color-text-muted` | #6b7280 | Labels, placeholders |
| `--color-text-inverse` | #0f1419 | Text on light backgrounds |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | #10b981 | Success states, active status |
| `--color-warning` | #f59e0b | Warnings, medium priority |
| `--color-danger` | #ef4444 | Errors, urgent priority |
| `--color-info` | #6366f1 | Informational |
| `--color-primary` | #3b82f6 | Primary accent, links |

Each semantic color has `-bg` and `-border` variants for subtle backgrounds.

### Priority Colors

| Token | Usage |
|-------|-------|
| `--color-priority-urgent` | Urgent priority badge |
| `--color-priority-high` | High priority badge |
| `--color-priority-medium` | Medium priority badge |
| `--color-priority-low` | Low priority badge |
| `--color-priority-none` | No priority set |

### Status Colors

| Token | Usage |
|-------|-------|
| `--color-status-active` | Active status |
| `--color-status-inactive` | Inactive status |
| `--color-status-dnc` | Do Not Contact |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small elements, tags |
| `--radius-md` | 8px | Buttons, inputs, cards |
| `--radius-lg` | 12px | Large cards, modals |
| `--radius-xl` | 16px | Hero elements |
| `--radius-full` | 9999px | Circular elements, avatars |

## Typography

### Font Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `--font-size-xs` | 0.75rem | Small labels, timestamps |
| `--font-size-sm` | 0.875rem | Secondary text, tabs |
| `--font-size-base` | 1rem | Body text |
| `--font-size-lg` | 1.125rem | Subtitles |
| `--font-size-xl` | 1.25rem | Headers, avatar initials |
| `--font-size-2xl` | 1.5rem | Page titles |
| `--font-size-3xl` | 2rem | Large titles |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-weight-normal` | 400 | Body text |
| `--font-weight-medium` | 500 | Emphasis |
| `--font-weight-semibold` | 600 | Headers, active tabs |
| `--font-weight-bold` | 700 | Strong emphasis |

## Shadows

| Token | Usage |
|-------|-------|
| `--shadow-sm` | Subtle elevation |
| `--shadow-md` | Card elevation |
| `--shadow-lg` | Dropdowns, popovers |
| `--shadow-xl` | Modals |
| `--shadow-focus` | Focus ring (accessibility) |

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | 150ms | Hover states, small interactions |
| `--transition-base` | 200ms | Standard animations |
| `--transition-slow` | 300ms | Complex animations |
| `--transition-bounce` | 400ms | Playful interactions |

### Usage

```css
button {
  transition: var(--transition-fast);
}

.modal {
  transition: var(--transition-base);
}
```
