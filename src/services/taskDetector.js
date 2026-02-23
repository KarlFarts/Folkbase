/**
 * Task Detector Service
 * Detects tasks and action items in text
 */

import {
  extractTaskMarkers,
  extractImperativeVerbs,
  extractDeadlines,
} from '../utils/textAnalyzer';
import { isIgnored } from './braindumpPreferences';

/**
 * Detect tasks in text
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, confidence: number, position: number, taskType: string, deadline: string|null}>}
 */
export function detectTasks(text) {
  if (!text) return [];

  const detectedTasks = [];
  const seenTasks = new Set();

  // 1. Extract explicit task markers (TODO, checkboxes, etc.)
  const taskMarkers = extractTaskMarkers(text);
  taskMarkers.forEach(task => {
    const normalized = task.text.toLowerCase().trim();

    if (!seenTasks.has(normalized) && !isIgnored(task.text, 'task')) {
      seenTasks.add(normalized);

      // Find associated deadline
      const deadline = findDeadlineNearby(text, task.position);

      detectedTasks.push({
        text: task.text,
        confidence: 90, // High confidence for explicit markers
        position: task.position,
        taskType: task.marker,
        deadline: deadline ? deadline.deadline : null,
        fullText: task.fullText,
      });
    }
  });

  // 2. Extract imperative verbs
  const imperativeVerbs = extractImperativeVerbs(text);
  imperativeVerbs.forEach(action => {
    const normalized = action.text.toLowerCase().trim();

    if (!seenTasks.has(normalized) && !isIgnored(action.text, 'task')) {
      seenTasks.add(normalized);

      // Find associated deadline
      const deadline = findDeadlineNearby(text, action.position);

      detectedTasks.push({
        text: action.text,
        confidence: 70, // Medium confidence for imperative verbs
        position: action.position,
        taskType: 'imperative-verb',
        verb: action.verb,
        deadline: deadline ? deadline.deadline : null,
      });
    }
  });

  // Sort by confidence (highest first)
  detectedTasks.sort((a, b) => b.confidence - a.confidence);

  return detectedTasks;
}

/**
 * Find deadline mention near a position in text
 * @param {string} text - The full text
 * @param {number} position - Position to search around
 * @returns {Object|null} Deadline object or null
 */
function findDeadlineNearby(text, position) {
  const deadlines = extractDeadlines(text);

  // Find deadline within 50 characters after the position
  for (const deadline of deadlines) {
    const distance = deadline.position - position;

    if (distance >= 0 && distance <= 50) {
      return deadline;
    }
  }

  return null;
}
