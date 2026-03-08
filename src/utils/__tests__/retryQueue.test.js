import { describe, it, expect, beforeEach } from 'vitest';
import {
  queueFailedWrite,
  getRetryQueue,
  getFailedItems,
  removeFromQueue,
  incrementAttempt,
  clearRetryQueue,
  MAX_ATTEMPTS,
} from '../retryQueue';

describe('retryQueue', () => {
  beforeEach(() => {
    clearRetryQueue();
  });

  describe('queueFailedWrite', () => {
    it('adds an operation to the queue', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
        payload: { sheetName: 'Contact Notes' },
      });

      const queue = getRetryQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('link-note-contact');
      expect(queue[0].attempts).toBe(0);
      expect(queue[0].sourceId).toBe('NOTE-aaa');
    });
  });

  describe('incrementAttempt', () => {
    it('increments the attempt count', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
      });

      const queue = getRetryQueue();
      incrementAttempt(queue[0].id);

      const updated = getRetryQueue();
      expect(updated[0].attempts).toBe(1);
    });
  });

  describe('getFailedItems', () => {
    it('returns items with attempts >= MAX_ATTEMPTS', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
      });

      const queue = getRetryQueue();
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        incrementAttempt(queue[0].id);
      }

      const failed = getFailedItems();
      expect(failed.length).toBe(1);
    });

    it('returns empty if no items have exceeded max attempts', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
      });

      const failed = getFailedItems();
      expect(failed.length).toBe(0);
    });
  });

  describe('removeFromQueue', () => {
    it('removes an item by id', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
      });

      const queue = getRetryQueue();
      removeFromQueue(queue[0].id);

      expect(getRetryQueue().length).toBe(0);
    });
  });
});
