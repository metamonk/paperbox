/**
 * usePropertyInput - Hook for controlled inputs with debounced persistence
 * 
 * Solves the "glitchy input" problem by:
 * 1. Maintaining local state while user is typing
 * 2. Debouncing database writes (default 500ms after last keystroke)
 * 3. Immediate persistence on blur (ensures changes aren't lost)
 * 4. Syncing with external updates when not editing
 * 
 * Usage:
 * ```typescript
 * const xInput = usePropertyInput(
 *   object.x,
 *   (value) => updateObject(object.id, { x: value })
 * );
 * 
 * <Input
 *   value={xInput.value}
 *   onChange={(e) => xInput.onChange(Number(e.target.value))}
 *   onBlur={xInput.onBlur}
 * />
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePropertyInputOptions {
  debounceMs?: number;
}

export function usePropertyInput<T>(
  externalValue: T,
  onPersist: (value: T) => void,
  options: UsePropertyInputOptions = {}
) {
  const { debounceMs = 500 } = options;
  
  // Local state for the input value
  const [value, setValue] = useState<T>(externalValue);
  
  // Track if user is actively editing
  const isEditingRef = useRef(false);
  
  // Debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if there are pending changes to persist
  const hasPendingChangesRef = useRef(false);

  // Sync external value to local state when not editing
  useEffect(() => {
    if (!isEditingRef.current) {
      setValue(externalValue);
    }
  }, [externalValue]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Persist value to external store
  const persist = useCallback((valueToSave: T) => {
    onPersist(valueToSave);
    hasPendingChangesRef.current = false;
  }, [onPersist]);

  // Handle value change (called on every keystroke)
  const onChange = useCallback((newValue: T) => {
    setValue(newValue);
    isEditingRef.current = true;
    hasPendingChangesRef.current = true;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      persist(newValue);
      isEditingRef.current = false;
    }, debounceMs);
  }, [debounceMs, persist]);

  // Handle blur (save immediately)
  const onBlur = useCallback(() => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Save immediately if there are pending changes
    if (hasPendingChangesRef.current) {
      persist(value);
    }
    
    isEditingRef.current = false;
  }, [value, persist]);

  return {
    value,
    onChange,
    onBlur,
  };
}

