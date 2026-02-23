import React from 'react';
import CollapsibleWidget from './CollapsibleWidget';

function ToDoWidget({ items, onNavigate, onViewAll }) {
  if (!items || items.length === 0) return null;

  const formatDueDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDueDateClass = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date < today) return 'overdue';
    if (date.getTime() === today.getTime()) return 'due-today';
    return '';
  };

  const displayItems = items.slice(0, 5);

  return (
    <CollapsibleWidget title="TO DO" label="Follow ups" count={items.length} onViewAll={onViewAll}>
      <div className="todo-widget-table">
        <div className="todo-widget-header-row">
          <div className="todo-col-avatar"></div>
          <div className="todo-col-name">Name</div>
          <div className="todo-col-task">Task</div>
          <div className="todo-col-relation">Relation</div>
          <div className="todo-col-due">Due Date</div>
          <div className="todo-col-priority">Priority</div>
        </div>
        {displayItems.map((item, index) => {
          const contact = item.contact;
          const dueDate = contact['Follow-up Date'] || item.lastTouchpoint?.['Follow-up Date'];
          const priority = contact['Priority'] || 'Medium';
          const relation = contact['Relationship Type'] || '-';
          const task = item.urgentDetail || 'Follow up';

          return (
            <div
              key={contact['Contact ID'] || index}
              className="todo-widget-row"
              onClick={() => onNavigate('contact-profile', contact['Contact ID'])}
            >
              <div className="todo-col-avatar">
                <div className="avatar-sm">{contact['Name']?.charAt(0) || '?'}</div>
              </div>
              <div className="todo-col-name">
                <span className="contact-name-text">{contact['Name']}</span>
                {contact['Organization'] && (
                  <span className="contact-org-text">{contact['Organization']}</span>
                )}
              </div>
              <div className="todo-col-task">{task}</div>
              <div className="todo-col-relation">{relation}</div>
              <div className={`todo-col-due ${getDueDateClass(dueDate)}`}>
                {formatDueDate(dueDate)}
              </div>
              <div className="todo-col-priority">
                <span className={`priority-badge priority-${priority.toLowerCase()}`}>{priority}</span>
              </div>
            </div>
          );
        })}
      </div>
      {items.length > 5 && <div className="todo-widget-more">+{items.length - 5} more</div>}
    </CollapsibleWidget>
  );
}

export default ToDoWidget;
