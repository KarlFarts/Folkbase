# Warm Window Palette Design

**Date:** 2026-02-16
**Status:** Approved
**Designer:** User + Claude

## Overview

Complete redesign of the window/modal color palette from the current cold navy theme to a warm, friendly, light aesthetic. The new palette uses medium-warm tones (beiges, taupes, soft browns) with earthy green accents, creating an approachable and natural feel.

## Design Decisions

### Aesthetic Direction
- **Warmth level:** Medium warmth with noticeable warm tones (beiges, taupes, soft browns)
- **Brightness:** Light mode - bright, airy windows with light beige/cream backgrounds
- **Text contrast:** Medium contrast - warm gray/medium brown text for comfortable reading
- **Accent colors:** Earthy greens (sage, olive, forest green)
- **Border strategy:** Mixed approach - shadows for cards, subtle lines for header/footer separation
- **Overlay:** Subtle warm scrim that barely dims the background

## Color Palette

### Background Colors

```css
/* Window backgrounds */
--color-bg-secondary: #f5f1eb;      /* Main window canvas - warm cream */
--color-bg-elevated: #faf8f5;       /* Cards/raised elements - lighter cream */
--color-bg-tertiary: #ebe6dd;       /* Subtle backgrounds - slightly darker beige */
--color-bg-primary: #e8e3da;        /* Page background behind windows - warm light taupe */
```

### Text Colors

```css
/* Text hierarchy */
--color-text-primary: #4a4238;      /* Main text - warm dark brown */
--color-text-secondary: #75695c;    /* Labels - medium warm brown */
--color-text-muted: #9c8f7f;        /* Placeholders/hints - light warm brown */
--color-text-inverse: #faf8f5;      /* Text on dark/accent backgrounds */
```

### Accent Colors (Earthy Greens)

```css
/* Primary accents */
--color-accent-primary: #6b8e6f;    /* Sage green - primary buttons/links */
--color-accent-secondary: #86a08e;  /* Lighter sage - secondary accents */
--color-accent-hover: #5a7a5e;      /* Deeper sage - hover state */
--color-accent-active: #4a6650;     /* Even deeper - active state */
```

### Semantic Colors (Warm Variants)

```css
/* Success */
--color-success: #7ca982;           /* Sage green */
--color-success-bg: rgba(124, 169, 130, 0.1);
--color-success-border: rgba(124, 169, 130, 0.2);

/* Warning */
--color-warning: #d4a574;           /* Warm amber */
--color-warning-bg: rgba(212, 165, 116, 0.1);
--color-warning-border: rgba(212, 165, 116, 0.2);

/* Danger */
--color-danger: #c67b6b;            /* Warm terracotta */
--color-danger-bg: rgba(198, 123, 107, 0.1);
--color-danger-border: rgba(198, 123, 107, 0.2);

/* Info */
--color-info: #86a08e;              /* Neutral green-gray */
--color-info-bg: rgba(134, 160, 142, 0.1);
--color-info-border: rgba(134, 160, 142, 0.2);
```

### Border Colors

```css
/* Borders and dividers */
--border-color-default: #d9d0c3;    /* Warm light tan - default borders */
--border-color-hover: #6b8e6f;      /* Sage green - hover state */
--border-color-focus: #5a7a5e;      /* Deeper sage - focus state */
--border-color-error: #c67b6b;      /* Terracotta - error state */

/* Window-specific dividers */
--window-border-color: #e0d7ca;     /* Even lighter tan for header/footer */
```

### Overlay

```css
/* Modal backdrop */
--color-bg-overlay: rgba(139, 125, 107, 0.15);  /* Subtle warm brown tint */
```

## Shadows

### Shadow Tokens

```css
/* Soft warm shadows (using warm brown base color) */
--shadow-sm: 0 1px 3px rgba(74, 66, 56, 0.06);
--shadow-md: 0 2px 8px rgba(74, 66, 56, 0.08);
--shadow-lg: 0 4px 12px rgba(74, 66, 56, 0.1);
--shadow-xl: 0 8px 24px rgba(74, 66, 56, 0.12);
--shadow-2xl: 0 12px 32px rgba(74, 66, 56, 0.15);

/* Focus rings (sage green glow) */
--shadow-focus: 0 0 0 3px rgba(107, 142, 111, 0.25);
--shadow-focus-error: 0 0 0 3px rgba(198, 123, 107, 0.25);
--shadow-focus-success: 0 0 0 3px rgba(124, 169, 130, 0.25);

/* Window-specific */
--window-shadow: var(--shadow-xl);
```

### Application Strategy

- **Window header/footer dividers:** Use subtle border lines with `--window-border-color` (#e0d7ca)
- **Cards and elevated elements:** Use `--shadow-md` for gentle floating effect
- **Window containers:** Use `--shadow-xl` for prominent depth
- **Form inputs:** Light borders that change to sage green on focus
- **Section dividers:** Minimal lines with `--border-color-default`

## Component Styling

### Buttons

#### Primary Button
```css
--btn-primary-bg: #6b8e6f;          /* Sage green */
--btn-primary-text: #ffffff;        /* White */
--btn-primary-hover: #5a7a5e;       /* Deeper sage */
--btn-primary-active: #4a6650;      /* Even deeper sage */
```

#### Secondary Button
```css
--btn-secondary-bg: #ebe6dd;        /* Warm beige */
--btn-secondary-text: #4a4238;      /* Dark brown */
--btn-secondary-border: 1px solid #d9d0c3;
--btn-secondary-hover: #e0d7ca;     /* Lighter beige */
```

#### Ghost Button
```css
--btn-ghost-bg: transparent;
--btn-ghost-text: #75695c;          /* Medium brown */
--btn-ghost-hover: #faf8f5;         /* Very light cream */
```

### Form Elements

```css
/* Form inputs */
--form-input-bg: #faf8f5;           /* Light cream background */
--form-input-border: 1px solid #d9d0c3;
--form-input-text: #4a4238;
--form-input-placeholder: #9c8f7f;

/* Focus states */
--form-focus-border: #5a7a5e;       /* Sage green */
--form-focus-shadow: 0 0 0 3px rgba(107, 142, 111, 0.2);

/* Error states */
--form-error-border: #c67b6b;       /* Terracotta */
--form-error-shadow: 0 0 0 3px rgba(198, 123, 107, 0.2);
```

### Window-Specific Classes

#### `.window-overlay`
- Background: `rgba(139, 125, 107, 0.15)` - subtle warm scrim

#### `.window-content`
- Background: `#f5f1eb` (warm cream)
- Border: `1px solid #e0d7ca` (light tan)
- Shadow: `var(--shadow-xl)`
- Border radius: `var(--radius-xl)` (12px)

#### `.window-header` / `.window-footer`
- Border color: `#e0d7ca` (very light tan divider line)

#### `.window-item`
- Background: `#faf8f5` (light cream - elevated)
- Shadow: `var(--shadow-sm)` instead of border
- Border radius: `var(--radius-md)` (8px)

#### `.window-action-card`
- Default background: `#faf8f5`
- Shadow: `var(--shadow-md)`
- Border: None (shadow provides depth)

#### `.window-action-card.window-warning`
- Border: `1px solid #d4a574` (warm amber)
- Background: `rgba(212, 165, 116, 0.08)`

#### `.window-action-card.window-success`
- Border: `1px solid #7ca982` (sage green)
- Background: `rgba(124, 169, 130, 0.08)`

#### `.window-action-card.window-error`
- Border: `1px solid #c67b6b` (terracotta)
- Background: `rgba(198, 123, 107, 0.08)`

## Implementation Notes

### Files to Update

1. **`src/styles/index.css`** - Update all color tokens in `:root`
   - Background colors (lines 13-17)
   - Text colors (lines 20-23)
   - Accent colors (lines 26-29)
   - Semantic colors (lines 32-46)
   - Border colors (lines 113-116)
   - Shadows (lines 128-139)
   - Button tokens (lines 201-214)
   - Form tokens (lines 178-190)
   - Window overlay (line 1608)

2. **Window component styles** (lines 1602-1850 in `src/styles/index.css`)
   - Update `.window-content` background and border
   - Update `.window-header` and `.window-footer` border colors
   - Update `.window-item` to use shadows instead of borders
   - Update `.window-action-card` variants with new semantic colors

### Migration Strategy

1. **Update design tokens first** - Change all CSS variables in `:root`
2. **Test window components** - Verify all modals look correct
3. **Check form elements** - Ensure inputs, buttons work with new palette
4. **Review semantic states** - Test success/warning/error states
5. **Accessibility check** - Verify text contrast meets WCAG AA standards (medium contrast approach should pass)

### Contrast Ratios (Estimated)

- Primary text (#4a4238) on light backgrounds: ~8:1 (AAA)
- Secondary text (#75695c) on light backgrounds: ~5:1 (AA)
- Muted text (#9c8f7f) on light backgrounds: ~3:1 (AA for large text)
- Sage buttons (#6b8e6f) with white text: ~4.5:1 (AA)

All contrast ratios should be verified with a contrast checker before deployment.

## Visual Comparison

### Before (Cold Navy)
- Background: `#1a1f2e` (dark navy)
- Text: `#f0f2f5` (light gray)
- Accent: `#3b82f6` (blue)
- Feel: Corporate, serious, cold

### After (Warm Cream)
- Background: `#f5f1eb` (warm cream)
- Text: `#4a4238` (dark brown)
- Accent: `#6b8e6f` (sage green)
- Feel: Friendly, natural, approachable

## Success Criteria

✓ Warm, approachable aesthetic
✓ Light, airy feel without being stark white
✓ Readable medium-contrast text
✓ Natural earthy green accents
✓ Soft shadows for depth without harsh borders
✓ Subtle warm overlay that doesn't dominate
✓ Maintains accessibility standards (WCAG AA minimum)

## Future Considerations

- **Dark mode variant:** Could create a warm dark mode using deep browns/charcoals if needed
- **Theme switcher:** User preference for warm light vs warm dark
- **Additional accent colors:** Could expand earthy palette (terracotta for CTAs, warm yellows for highlights)
