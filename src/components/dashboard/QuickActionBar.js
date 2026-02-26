import { useState, useEffect, useRef } from 'react';
import ToDoWidget from './ToDoWidget';
import UpcomingEventsWidget from './UpcomingEventsWidget';
import SettingsWidget from './SettingsWidget';
import CustomActionsWidget from './CustomActionsWidget';
import { log } from '../../utils/logger';

const STORAGE_KEY = 'dashboard-last-selected-section';
const DEFAULT_SECTION = 'todos';

function QuickActionBar({
  todoItems,
  upcomingEvents,
  setupIssues,
  quickActions,
  onNavigate,
  contacts,
  expandedSection,
  onToggleSection,
}) {
  const [hasInitialized, setHasInitialized] = useState(false);
  const initializingRef = useRef(false);

  const sections = [
    {
      id: 'todos',
      label: 'To-Dos',
      icon: '',
      content: (
        <ToDoWidget
          items={todoItems || []}
          onNavigate={onNavigate}
          onViewAll={() => onNavigate('contacts')}
        />
      ),
    },
    {
      id: 'followups',
      label: 'Follow-Ups',
      icon: '',
      content: (
        <ToDoWidget
          items={todoItems || []}
          onNavigate={onNavigate}
          onViewAll={() => onNavigate('contacts')}
        />
      ),
    },
    {
      id: 'eventprep',
      label: 'Event Prep',
      icon: '',
      content: (
        <UpcomingEventsWidget
          events={upcomingEvents || []}
          contacts={contacts || []}
          onNavigate={onNavigate}
          isSidebar={false}
        />
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '',
      content: <SettingsWidget issues={setupIssues || []} onNavigate={onNavigate} />,
    },
    {
      id: 'custom',
      label: 'Custom Actions',
      icon: '',
      content: <CustomActionsWidget actions={quickActions || []} />,
    },
    {
      id: 'sync',
      label: 'Upload Contacts',
      icon: '',
      content: (
        <div className="qab-sync-content">
          <p className="qab-sync-text">
            Import contacts from your phone or other sources
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('quick-sync')}>
            Upload Contacts
          </button>
        </div>
      ),
    },
  ];

  // Auto-select default section on mount only
  useEffect(() => {
    if (!hasInitialized && !initializingRef.current) {
      initializingRef.current = true;

      // Try to load last selected section from localStorage
      const lastSelected = localStorage.getItem(STORAGE_KEY);
      log('[QuickActionBar] Loading from localStorage:', lastSelected);

      // Get valid section IDs
      const validIds = ['todos', 'followups', 'eventprep', 'settings', 'custom', 'sync'];

      // Only toggle if current section doesn't match what we want to restore
      let targetSection = DEFAULT_SECTION;
      if (lastSelected && validIds.includes(lastSelected)) {
        log('[QuickActionBar] Restoring section:', lastSelected);
        targetSection = lastSelected;
      } else {
        log('[QuickActionBar] Using default section:', DEFAULT_SECTION);
      }

      // Only call onToggleSection if we need to change the section
      if (expandedSection !== targetSection) {
        onToggleSection(targetSection);
      }

      setHasInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, expandedSection]);

  // Save to localStorage whenever the expanded section changes (after initialization)
  useEffect(() => {
    if (hasInitialized) {
      if (expandedSection) {
        log('[QuickActionBar] Saving to localStorage:', expandedSection);
        localStorage.setItem(STORAGE_KEY, expandedSection);
      } else {
        log('[QuickActionBar] Section collapsed, not clearing localStorage');
      }
      // Note: We keep the value even if expandedSection becomes null
      // so that on next visit we can restore it
    }
  }, [expandedSection, hasInitialized]);

  return (
    <div className="dashboard-quick-action-container">
      <div className="dashboard-quick-action-frame">
        <div className="dashboard-quick-action-workspace-label">Personal</div>
        <div className="dashboard-quick-action-buttons">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`dashboard-quick-action-btn ${expandedSection === section.id ? 'expanded' : ''}`}
              onClick={() => onToggleSection(section.id)}
            >
              <span className="dashboard-quick-action-icon">{section.icon}</span>
              <span className="dashboard-quick-action-label">{section.label}</span>
            </button>
          ))}
        </div>
        {expandedSection && (
          <div className="dashboard-quick-action-expanded">
            {sections.find((s) => s.id === expandedSection)?.content}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickActionBar;
