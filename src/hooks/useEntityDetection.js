import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { detectEntities } from '../services/entityDetector';

/**
 * Entity Detection Hook
 * Manages entity detection state with debouncing
 *
 * @param {string} text - Text to analyze
 * @param {Object} context - Context objects (contacts, events)
 * @param {number} debounceDelay - Debounce delay in ms (default: 300)
 * @returns {Object} Detection state and results
 */
export function useEntityDetection(text, context, debounceDelay = 300) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedEntities, setDetectedEntities] = useState(null);
  const [error, setError] = useState(null);

  // Debounce text input
  const debouncedText = useDebounce(text, debounceDelay);

  // Cache key for memoization
  const cacheKey = useMemo(() => {
    return `${debouncedText}_${context?.contacts?.length || 0}_${context?.events?.length || 0}`;
  }, [debouncedText, context]);

  useEffect(() => {
    // Skip if no text
    if (!debouncedText || debouncedText.trim().length === 0) {
      setDetectedEntities(null);
      setIsDetecting(false);
      return;
    }

    // Start detection
    setIsDetecting(true);
    setError(null);

    try {
      // Run detection (synchronous for now, but structured for async if needed)
      const results = detectEntities(debouncedText, context);
      setDetectedEntities(results);
    } catch (err) {
      setError(err.message);
      setDetectedEntities(null);
    } finally {
      setIsDetecting(false);
    }
  }, [cacheKey, debouncedText, context?.contacts?.length, context?.events?.length]);

  return {
    isDetecting,
    detectedEntities,
    error,
    hasEntities: detectedEntities && detectedEntities.summary.total > 0,
  };
}
