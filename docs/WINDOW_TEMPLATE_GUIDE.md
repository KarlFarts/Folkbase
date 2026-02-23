# Window Template System Guide

## Overview

The Window Template System provides a consistent, reusable foundation for all windows, dialogs, and modals throughout the Touchpoint CRM application. It ensures visual consistency while maintaining flexibility for different use cases.

## Core Components

### WindowTemplate Component

The `WindowTemplate` component (`src/components/WindowTemplate.js`) is the primary building block for all windows.

```jsx
import WindowTemplate from '../components/WindowTemplate';

<WindowTemplate
  isOpen={isOpen}
  onClose={handleClose}
  title="Window Title"
  size="md"
  footer={<button className="btn btn-primary">Save</button>}
>
  {/* Window content */}
</WindowTemplate>
```

### Props

- `isOpen` (boolean, required): Controls window visibility
- `onClose` (function): Called when window should close
- `title` (string): Main window title
- `subtitle` (string): Optional subtitle below title
- `size` (string): Window size - 'sm', 'md', 'lg', 'xl', 'full'
- `showCloseButton` (boolean): Show/hide close button (default: true)
- `children` (node): Window content
- `footer` (node): Footer content (buttons, etc.)
- `className` (string): Additional CSS classes for window content
- `overlayClassName` (string): Additional CSS classes for overlay

## CSS Architecture

### Window Structure Classes

```css
.window-overlay    /* Full-screen backdrop */
.window-content    /* Main window container */
.window-header     /* Title and close button area */
.window-body       /* Scrollable content area */
.window-footer     /* Action buttons area */
```

### Window Sections

```css
.window-section           /* Content grouping */
.window-section-title     /* Section headings */
.window-section-content   /* Section content wrapper */
```

### Window Items

```css
.window-item        /* Individual content blocks */
.window-item-label  /* Item labels with icons */
.window-item-value  /* Item values/status */
```

### Action Cards

```css
.window-action-card     /* Prominent action items */
.window-warning        /* Warning state */
.window-success        /* Success state */
.window-error          /* Error state */
```

## Usage Patterns

### Basic Modal Dialog

```jsx
<WindowTemplate
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  title="Confirm Action"
  footer={
    <>
      <button className="btn btn-secondary" onClick={() => setShowDialog(false)}>
        Cancel
      </button>
      <button className="btn btn-primary" onClick={handleConfirm}>
        Confirm
      </button>
    </>
  }
>
  <p>Are you sure you want to perform this action?</p>
</WindowTemplate>
```

### Settings Panel

```jsx
<WindowTemplate
  isOpen={showSettings}
  onClose={() => setShowSettings(false)}
  title="Settings"
  size="lg"
>
  <div className="window-section">
    <h3 className="window-section-title">Account</h3>
    <div className="window-section-content">
      <div className="window-item">
        <div className="window-item-label">Email</div>
        <div className="window-item-value">user@example.com</div>
      </div>
    </div>
  </div>
</WindowTemplate>
```

### Form Dialog

```jsx
<WindowTemplate
  isOpen={showForm}
  onClose={() => setShowForm(false)}
  title="Add Contact"
  footer={
    <button className="btn btn-primary btn-full" onClick={handleSubmit}>
      Save Contact
    </button>
  }
>
  <div className="window-section">
    <div className="form-field">
      <label className="form-label">Name</label>
      <input className="form-input" type="text" />
    </div>
    <div className="form-field">
      <label className="form-label">Email</label>
      <input className="form-input" type="email" />
    </div>
  </div>
</WindowTemplate>
```

## Form Elements

### Buttons

```jsx
<button className="btn btn-primary">Primary Action</button>
<button className="btn btn-secondary">Secondary Action</button>
<button className="btn btn-danger">Danger Action</button>
<button className="btn btn-ghost">Ghost Action</button>

<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary btn-lg">Large</button>
<button className="btn btn-primary btn-full">Full Width</button>
```

### Form Inputs

```jsx
<div className="form-field">
  <label className="form-label">Field Label</label>
  <input className="form-input" type="text" placeholder="Placeholder" />
</div>

<select className="form-select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>

<textarea className="form-textarea" rows="4"></textarea>
```

### Validation States

```jsx
<input className="form-input form-error" type="email" />
<div className="form-error-message">Invalid email address</div>

<input className="form-input" type="text" />
<div className="form-success-message">Looks good!</div>
```

## Theming & Customization

### CSS Variables

All styling is controlled through CSS variables defined in `:root`. Key categories:

#### Colors
- `--color-bg-*`: Background colors
- `--color-text-*`: Text colors
- `--color-accent-*`: Accent colors
- `--color-success/warning/danger/info`: Semantic colors

#### Spacing
- `--spacing-xs` through `--spacing-2xl`: Consistent spacing scale

#### Typography
- `--font-size-*`: Font sizes
- `--font-weight-*`: Font weights
- `--line-height-*`: Line heights

#### Components
- `--btn-*`: Button-specific variables
- `--form-*`: Form element variables
- `--window-*`: Window-specific variables

### Customizing Windows

#### Size Variants
```jsx
<WindowTemplate size="sm">  {/* 400px max-width */} </WindowTemplate>
<WindowTemplate size="md">  {/* 600px max-width */} </WindowTemplate>
<WindowTemplate size="lg">  {/* 800px max-width */} </WindowTemplate>
<WindowTemplate size="xl">  {/* 1000px max-width */} </WindowTemplate>
<WindowTemplate size="full"> {/* 90vw max-width */} </WindowTemplate>
```

#### Custom Styling
```jsx
<WindowTemplate
  className="custom-window"
  overlayClassName="custom-overlay"
>
  {/* Content */}
</WindowTemplate>

/* In CSS */
.custom-window {
  /* Custom window styles */
}

.custom-overlay {
  /* Custom overlay styles */
}
```

## Best Practices

### Content Organization
1. Use `window-section` for logical content grouping
2. Apply `window-section-title` for section headings
3. Wrap section content in `window-section-content`

### Consistent Spacing
1. Use CSS variables for all spacing
2. Maintain consistent margins and padding
3. Follow the established spacing scale

### Accessibility
1. Always provide meaningful titles
2. Ensure keyboard navigation works
3. Use semantic HTML elements
4. Provide appropriate ARIA labels when needed

### Responsive Design
1. Windows automatically adapt to screen size
2. Content scrolls on small screens
3. Touch targets meet minimum size requirements

## Migration Guide

### From Custom Modals

Replace custom modal implementations:

```jsx
// Before
<div className="custom-modal-overlay">
  <div className="custom-modal">
    <div className="custom-header">
      <h2>Title</h2>
      <button onClick={onClose}>×</button>
    </div>
    <div className="custom-body">
      {/* content */}
    </div>
  </div>
</div>

// After
<WindowTemplate
  isOpen={isOpen}
  onClose={onClose}
  title="Title"
>
  {/* content */}
</WindowTemplate>
```

### From Inline Styles

Replace inline styles with design tokens:

```jsx
// Before
<div style={{ color: '#ef4444', marginBottom: '16px' }}>
  Error message
</div>

// After
<div className="window-action-card window-error">
  Error message
</div>
```

## Examples in Codebase

- `src/components/Settings.js`: Complex settings modal
- `src/pages/SignIn.js`: Full-page window implementation
- `src/styles/index.css`: Complete CSS variable definitions

## Future Enhancements

- Animation variants (slide, fade, scale)
- Draggable windows
- Resizable windows
- Toast notifications
- Confirmation dialogs
- Progress indicators