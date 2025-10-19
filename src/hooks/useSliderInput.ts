/**
 * useSliderInput - Hook for slider controls with deferred persistence
 * 
 * Solves the "glitchy slider" problem by:
 * 1. Maintaining local state during drag (smooth, instant updates)
 * 2. Only persisting to database on release (via onValueCommit)
 * 3. Syncing with external updates when not actively dragging
 * 
 * Usage:
 * ```typescript
 * const rotationSlider = useSliderInput(
 *   object.rotation,
 *   (value) => updateObject(object.id, { rotation: value })
 * );
 * 
 * <Slider
 *   value={[rotationSlider.value]}
 *   onValueChange={rotationSlider.onValueChange}
 *   onValueCommit={rotationSlider.onValueCommit}
 *   min={0}
 *   max={360}
 * />
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useSliderInput<T extends number>(
  externalValue: T,
  onPersist: (value: T) => void
) {
  // Local state for the slider value
  const [value, setValue] = useState<T>(externalValue);
  
  // Track if user is actively dragging
  const isDraggingRef = useRef(false);

  // Sync external value to local state when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setValue(externalValue);
    }
  }, [externalValue]);

  // Handle value change during drag (local state only, no database write)
  const onValueChange = useCallback((values: number[]) => {
    isDraggingRef.current = true;
    setValue(values[0] as T);
  }, []);

  // Handle value commit on release (persist to database)
  const onValueCommit = useCallback((values: number[]) => {
    isDraggingRef.current = false;
    const finalValue = values[0] as T;
    setValue(finalValue);
    onPersist(finalValue);
  }, [onPersist]);

  return {
    value,
    onValueChange,
    onValueCommit,
  };
}

