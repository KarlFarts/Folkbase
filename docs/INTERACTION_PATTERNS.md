# Interaction Patterns

UI interaction patterns for consistent behavior.

## Tab Navigation

### Bottom Tab Pattern (Rolodex Style)

Tabs at the bottom of the card, active tab appears "lifted" and connected to content.

```
┌──────────────────────────────────────┐
│                                      │
│           Tab Content                │
│                                      │
├──────┬──────┬──────┬──────┬──────────┤
│ Tab1 │ Tab2 │ Tab3 │ Tab4 │          │
└──────┴──────┴──────┴──────┴──────────┘
        ↑ Active tab (lifted, connected to content)
```

### Implementation

```jsx
<div className="card" style={{ overflow: 'visible' }}>
  {/* Content Area */}
  <div className="card-body" style={{ paddingBottom: 'var(--spacing-lg)' }}>
    {children}
  </div>

  {/* Bottom Tab Navigation */}
  <div style={{
    display: 'flex',
    gap: '2px',
    padding: '0 var(--spacing-md)',
    marginBottom: '-1px',
    overflowX: 'auto'
  }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          border: '1px solid var(--color-bg-tertiary)',
          borderBottom: isActive ? '1px solid var(--color-bg-primary)' : '1px solid var(--color-bg-tertiary)',
          borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          background: isActive ? 'var(--color-bg-primary)' : 'var(--color-bg-tertiary)',
          color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          fontWeight: isActive ? '600' : '400',
          marginTop: isActive ? '-2px' : '0',
          zIndex: isActive ? 1 : 0
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
</div>
```

### When to Use Bottom Tabs vs Top Tabs

| Bottom Tabs | Top Tabs |
|-------------|----------|
| Card-contained content | Page-level navigation |
| Detail views with sections | Main navigation |
| When content connects visually to tab | Standard form sections |

## Modal Pattern

Full-screen overlay with centered card.

### Structure

```jsx
<div
  style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 'var(--spacing-md)'
  }}
  onClick={onClose}  // Close on backdrop click
>
  <div
    className="card"
    style={{
      maxWidth: '500px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto'
    }}
    onClick={(e) => e.stopPropagation()}  // Prevent close when clicking content
  >
    <div className="card-header">
      <h3>{title}</h3>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>X</button>
    </div>
    <div className="card-body">
      {children}
    </div>
  </div>
</div>
```

## Hover States

### List Item Hover

```jsx
<div
  style={{
    background: 'var(--color-bg-tertiary)',
    cursor: 'pointer',
    transition: 'background 0.15s ease'
  }}
  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
>
  {content}
</div>
```

## Copy to Clipboard Pattern

```jsx
const [copied, setCopied] = useState(false);

const handleCopy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

return (
  <button onClick={() => handleCopy(value)}>
    {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
  </button>
);
```

## Button Patterns

### Ghost Buttons (for inline actions)

```jsx
<a href={`tel:${phone}`} className="btn btn-ghost btn-sm">
  <Phone size={14} /> Call
</a>
```

### Button with Icon

```jsx
<button className="btn btn-primary btn-sm" style={{
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-xs)'
}}>
  <Icon size={14} /> Label
</button>
```

## Transitions

Standard transition for interactive elements:

```css
transition: all 0.15s ease;
/* or use variable: */
transition: var(--transition-fast);
```
