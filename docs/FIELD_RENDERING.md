# Field Rendering Guide

How to render different field types in both edit and display modes.

## Field Types

| Type | Description | Edit Component | Display Component |
|------|-------------|----------------|-------------------|
| `text` | Single-line text | `<input type="text">` | `<p>` |
| `multi-text` | Comma-separated values | `<input type="text">` | List with action buttons |
| `textarea` | Multi-line text | `<textarea>` | `<p style="white-space: pre-wrap">` |
| `select` | Dropdown selection | `<select>` | `<p>` or `<span className="tag">` |
| `tags` | Comma-separated tags | `<input type="text">` | Tag chips |
| `date` | Date value | `<input type="date">` | Formatted date string |
| `url` | Web link | `<input type="url">` | `<a>` link |
| `contact-lookup` | Reference to another contact | Autocomplete (future) | Name with link |

## Edit Mode Rendering

### Text Input

```jsx
<input
  type="text"
  className="form-input"
  value={value || ''}
  onChange={(e) => onChange(e.target.value)}
  placeholder={field.placeholder}
/>
```

### Textarea

```jsx
<textarea
  className="form-textarea"
  value={value || ''}
  onChange={(e) => onChange(e.target.value)}
  placeholder={field.placeholder}
  rows={3}
/>
```

### Select

```jsx
<select
  className="form-select"
  value={value || ''}
  onChange={(e) => onChange(e.target.value)}
>
  <option value="">Select...</option>
  {options.map(opt => (
    <option key={opt} value={opt}>{opt}</option>
  ))}
</select>
```

### Date

```jsx
<input
  type="date"
  className="form-input"
  value={value || ''}
  onChange={(e) => onChange(e.target.value)}
/>
```

## Display Mode Rendering

### Empty State

When no value exists:

```jsx
if (!value) {
  return <p className="text-muted">Not set</p>;
}
```

### Multi-Text with Actions

Parse comma-separated values, show action buttons:

```jsx
const items = value.split(',').map(v => v.trim()).filter(Boolean);

return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
    {items.map((item, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <span>{item}</span>
        {field.actions?.includes('call') && (
          <a href={`tel:${item}`} className="btn btn-ghost btn-sm">Call</a>
        )}
        {field.actions?.includes('email') && (
          <a href={`mailto:${item}`} className="btn btn-ghost btn-sm">Email</a>
        )}
      </div>
    ))}
  </div>
);
```

### Tags

```jsx
const tags = value.split(',').map(t => t.trim()).filter(Boolean);

return (
  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
    {tags.map((tag, i) => (
      <span key={i} className="tag">{tag}</span>
    ))}
  </div>
);
```

### URL

```jsx
<a
  href={value}
  target="_blank"
  rel="noopener noreferrer"
  style={{ color: 'var(--color-primary)' }}
>
  {value}
</a>
```

### Textarea (preserving whitespace)

```jsx
<p style={{ whiteSpace: 'pre-wrap' }}>{value}</p>
```

## Future Field Indicator

Fields pending backend implementation should have visual treatment:

```css
.future-field {
  border: 2px dashed var(--color-text-muted);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  opacity: 0.7;
  position: relative;
}

.future-field::before {
  content: 'Future field';
  position: absolute;
  top: -10px;
  right: var(--spacing-sm);
  background: var(--color-bg-secondary);
  padding: 2px var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
}
```
