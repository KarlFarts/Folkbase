# Layout Patterns

Reusable layout patterns for building consistent UI across the application.

## Two-Column 60/40 Layout

The primary layout for detail views. Main content on the left, context/metadata on the right.

### When to Use

- Entity detail pages (profiles, event details)
- Any view with primary content + supplementary sidebar

### Structure

```
┌────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────┐  ┌────────────────────────┐  │
│  │                          │  │                        │  │
│  │     Primary Content      │  │    Sidebar Content     │  │
│  │         (60%)            │  │        (40%)           │  │
│  │                          │  │                        │  │
│  └──────────────────────────┘  └────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Implementation

```css
.two-column-layout {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: var(--spacing-lg);
  align-items: start;
}
```

### Column Content Guidelines

**Left Column (60%)**
- Identity/header section at top
- Tabbed content or primary data below

**Right Column (40%)**
- Biography/metadata card
- History/timeline (scrollable)
- Quick actions

## Stacked Column Layout

For content within each column, use flex with consistent gaps.

```css
.column-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
```

## Grid Patterns

### Two-Column Form Grid

For label/value pairs in metadata sections:

```css
.metadata-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--spacing-xs) var(--spacing-md);
}
```

### Identity Header Grid

For header with content on left, actions on right:

```css
.identity-header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--spacing-lg);
  align-items: flex-start;
}
```

## Responsive Considerations

The 60/40 layout should stack on smaller screens:

```css
@media (max-width: 768px) {
  .two-column-layout {
    grid-template-columns: 1fr;
  }
}
```
