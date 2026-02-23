# Component Patterns

Reusable component composition patterns.

## Card Components

All cards use the base `.card` class with consistent structure.

### Basic Card

```jsx
<div className="card">
  <div className="card-header">
    <h3>Title</h3>
    <button className="btn btn-primary btn-sm">Action</button>
  </div>
  <div className="card-body">
    {/* Content */}
  </div>
</div>
```

### Card Header Pattern

Headers have title on left, optional action on right:

```jsx
<div className="card-header">
  <h3>Section Title</h3>
  <span className="badge">{count}</span>  {/* or button */}
</div>
```

## Identity Header Pattern

Avatar + info on left, quick actions on right.

### Structure

```
┌────────────────────────────────────────────────────────┐
│  ┌──────┐                              ┌────────────┐  │
│  │ Initials │  Name                    │ Phone: xxx │  │
│  │  Avatar  │  Organization · Role     │ [Call][Text]│ │
│  └──────┘  [Badge] [Badge]             │ Email: xxx │  │
│                                        │ [Email][Copy]│ │
│                                        └────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Avatar Style

```css
.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xl);
  font-weight: 600;
  flex-shrink: 0;
}
```

### Quick Actions Section

Separated by left border, contains actionable items:

```css
.quick-actions {
  border-left: 1px solid var(--color-bg-tertiary);
  padding-left: var(--spacing-lg);
  min-width: 200px;
}
```

## Scrollable List Pattern

For history/timeline sections with fixed height.

```jsx
<div className="card">
  <div className="card-header">
    <h3>History</h3>
    <span className="badge">{items.length}</span>
  </div>
  <div
    className="card-body"
    style={{
      overflowY: 'auto',
      maxHeight: '400px'
    }}
  >
    {items.map(item => <ListItem key={item.id} {...item} />)}
  </div>
</div>
```

### List Item Pattern

Compact, hoverable items:

```css
.list-item {
  padding: var(--spacing-sm);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s ease;
}

.list-item:hover {
  background: var(--color-bg-elevated);
}
```

## Metadata Display Pattern

Two-column grid for label/value pairs:

```jsx
<div className="metadata-grid">
  <span className="text-muted">Label</span>
  <span>Value</span>

  <span className="text-muted">Another Label</span>
  <span>Another Value</span>
</div>
```

## Tag Display Pattern

For comma-separated values displayed as chips:

```jsx
<div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
  {tags.map(tag => (
    <span key={tag} className="tag">{tag}</span>
  ))}
</div>
```

## Empty State Pattern

When a section has no data:

```jsx
<div className="empty-state" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
  <p className="text-muted">No items yet</p>
  <button className="btn btn-primary btn-sm mt-md">
    Add First Item
  </button>
</div>
```

## Badge Patterns

### Priority Badges

```jsx
<span className={`badge badge-priority-${priority.toLowerCase()}`}>
  {priority}
</span>
```

### Status Badges

```jsx
<span className={`badge badge-status-${status.toLowerCase()}`}>
  {status}
</span>
```
