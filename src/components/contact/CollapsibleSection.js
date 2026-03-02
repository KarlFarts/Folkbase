import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * CollapsibleSection - Reusable expand/collapse section for the contact profile.
 *
 * Props:
 *   title       {string}   - Section heading text
 *   defaultOpen {boolean}  - Whether section starts expanded (default false)
 *   children    {node}     - Section body content
 *   isEmpty     {boolean}  - Hint that the section has no data (dims the header)
 */
function CollapsibleSection({ title, defaultOpen = false, children, isEmpty = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`cs-section${isEmpty ? ' cs-section--empty' : ''}`}>
      <button
        type="button"
        className="cs-header"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="cs-title">{title}</span>
        <span className="cs-chevron">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {isOpen && <div className="cs-body">{children}</div>}
    </div>
  );
}

export default CollapsibleSection;
