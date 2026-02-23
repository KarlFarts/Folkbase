/**
 * Migration utility to fix Event and Task ID formats in localStorage
 * Run this ONCE before transitioning from dev mode to production
 *
 * Migrates:
 * - E001, E002 → EVT001, EVT002
 * - TASK001, TASK002 → TSK001, TSK002
 *
 * Also updates all relationship references in:
 * - Event Notes, Task Notes
 * - Entity relationships
 */

// Match the localStorage keys used in seedTestData.js
const STORAGE_KEY_EVENTS = 'dev_events';
const STORAGE_KEY_TASKS = 'dev_tasks';
const STORAGE_KEY_EVENT_NOTES = 'dev_event_notes';
const STORAGE_KEY_TASK_NOTES = 'dev_task_notes';
const STORAGE_KEY_RELATIONSHIPS = 'dev_relationships';

export function migrateLocalStorageIds() {
  const results = {
    eventsFixed: 0,
    tasksFixed: 0,
    eventNotesFixed: 0,
    taskNotesFixed: 0,
    warnings: [],
  };

  try {
    // 1. Migrate Events: E001 → EVT001
    const eventsStr = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (eventsStr) {
      const events = JSON.parse(eventsStr);
      const oldToNewEventIds = new Map();

      events.forEach((event) => {
        const oldId = event['Event ID'];
        if (oldId && oldId.match(/^E\d+$/)) {
          const number = oldId.substring(1);
          const newId = `EVT${number}`;
          event['Event ID'] = newId;
          oldToNewEventIds.set(oldId, newId);
          results.eventsFixed++;
        }
      });

      if (results.eventsFixed > 0) {
        localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));

        // Update Event Notes references
        const eventNotesStr = localStorage.getItem(STORAGE_KEY_EVENT_NOTES);
        if (eventNotesStr) {
          const eventNotes = JSON.parse(eventNotesStr);
          eventNotes.forEach((link) => {
            const oldEventId = link['Event ID'];
            if (oldToNewEventIds.has(oldEventId)) {
              link['Event ID'] = oldToNewEventIds.get(oldEventId);
              results.eventNotesFixed++;
            }
          });
          localStorage.setItem(STORAGE_KEY_EVENT_NOTES, JSON.stringify(eventNotes));
        }
      }
    }

    // 2. Migrate Tasks: TASK001 → TSK001
    const tasksStr = localStorage.getItem(STORAGE_KEY_TASKS);
    if (tasksStr) {
      const tasks = JSON.parse(tasksStr);
      const oldToNewTaskIds = new Map();

      tasks.forEach((task) => {
        const oldId = task['Task ID'];
        if (oldId && oldId.match(/^TASK\d+$/i)) {
          const number = oldId.replace(/^TASK/i, '');
          const newId = `TSK${number}`;
          task['Task ID'] = newId;
          oldToNewTaskIds.set(oldId, newId);
          results.tasksFixed++;
        }
      });

      if (results.tasksFixed > 0) {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));

        // Update Task Notes references
        const taskNotesStr = localStorage.getItem(STORAGE_KEY_TASK_NOTES);
        if (taskNotesStr) {
          const taskNotes = JSON.parse(taskNotesStr);
          taskNotes.forEach((link) => {
            const oldTaskId = link['Task ID'];
            if (oldToNewTaskIds.has(oldTaskId)) {
              link['Task ID'] = oldToNewTaskIds.get(oldTaskId);
              results.taskNotesFixed++;
            }
          });
          localStorage.setItem(STORAGE_KEY_TASK_NOTES, JSON.stringify(taskNotes));
        }
      }
    }

    // 3. Check for any other references in entity relationships
    const entityRelStr = localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
    if (entityRelStr) {
      const entityRel = JSON.parse(entityRelStr);
      let entityRelFixed = 0;

      entityRel.forEach((rel) => {
        if (rel['Entity 1 ID'] && rel['Entity 1 ID'].match(/^E\d+$/)) {
          const number = rel['Entity 1 ID'].substring(1);
          rel['Entity 1 ID'] = `EVT${number}`;
          entityRelFixed++;
        }
        if (rel['Entity 2 ID'] && rel['Entity 2 ID'].match(/^E\d+$/)) {
          const number = rel['Entity 2 ID'].substring(1);
          rel['Entity 2 ID'] = `EVT${number}`;
          entityRelFixed++;
        }
        if (rel['Entity 1 ID'] && rel['Entity 1 ID'].match(/^TASK\d+$/i)) {
          const number = rel['Entity 1 ID'].replace(/^TASK/i, '');
          rel['Entity 1 ID'] = `TSK${number}`;
          entityRelFixed++;
        }
        if (rel['Entity 2 ID'] && rel['Entity 2 ID'].match(/^TASK\d+$/i)) {
          const number = rel['Entity 2 ID'].replace(/^TASK/i, '');
          rel['Entity 2 ID'] = `TSK${number}`;
          entityRelFixed++;
        }
      });

      if (entityRelFixed > 0) {
        localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(entityRel));
      }
    }

    return results;
  } catch (error) {
    console.error('Migration error:', error);
    results.warnings.push(error.message);
    return results;
  }
}

/**
 * Dry run - shows what would be migrated without changing data
 */
export function previewMigration() {
  const preview = {
    eventsToMigrate: [],
    tasksToMigrate: [],
  };

  try {
    const eventsStr = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (eventsStr) {
      const events = JSON.parse(eventsStr);
      events.forEach((event) => {
        const oldId = event['Event ID'];
        if (oldId && oldId.match(/^E\d+$/)) {
          const number = oldId.substring(1);
          const newId = `EVT${number}`;
          preview.eventsToMigrate.push({ old: oldId, new: newId });
        }
      });
    }

    const tasksStr = localStorage.getItem(STORAGE_KEY_TASKS);
    if (tasksStr) {
      const tasks = JSON.parse(tasksStr);
      tasks.forEach((task) => {
        const oldId = task['Task ID'];
        if (oldId && oldId.match(/^TASK\d+$/i)) {
          const number = oldId.replace(/^TASK/i, '');
          const newId = `TSK${number}`;
          preview.tasksToMigrate.push({ old: oldId, new: newId });
        }
      });
    }

    return preview;
  } catch (error) {
    console.error('Preview error:', error);
    return preview;
  }
}
