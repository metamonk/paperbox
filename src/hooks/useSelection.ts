/**
 * Multi-select hook for canvas objects
 * Handles selection state and operations
 */

import { useState, useCallback } from 'react';
import type { CanvasObject } from '../types/canvas';

export interface UseSelectionResult {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  
  // Selection operations
  selectOne: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  
  // Advanced selection
  selectByType: (type: string) => void;
  selectInBounds: (bounds: { x: number; y: number; width: number; height: number }) => void;
  selectByFilter: (filter: (obj: CanvasObject) => boolean) => void;
  
  // Queries
  isSelected: (id: string) => boolean;
  getSelectedObjects: () => CanvasObject[];
  hasSelection: boolean;
  selectionCount: number;
}

/**
 * Hook for managing multi-select state
 */
export function useSelection(objects: CanvasObject[]): UseSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  /**
   * Select a single object (clear all others)
   */
  const selectOne = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
    setLastSelectedId(id);
  }, []);

  /**
   * Select multiple objects (clear all others)
   */
  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setLastSelectedId(ids[ids.length - 1] || null);
  }, []);

  /**
   * Toggle selection of an object (for Cmd/Ctrl + click)
   */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // If we're deselecting the last selected, clear it
        if (id === lastSelectedId) {
          setLastSelectedId(Array.from(next)[next.size - 1] || null);
        }
      } else {
        next.add(id);
        setLastSelectedId(id);
      }
      return next;
    });
  }, [lastSelectedId]);

  /**
   * Select all objects
   */
  const selectAll = useCallback(() => {
    const allIds = objects.map(o => o.id);
    setSelectedIds(new Set(allIds));
    setLastSelectedId(allIds[allIds.length - 1] || null);
  }, [objects]);

  /**
   * Deselect all objects
   */
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  /**
   * Select all objects of a specific type
   * Example: selectByType('rectangle') selects all rectangles
   */
  const selectByType = useCallback((type: string) => {
    const matching = objects
      .filter(o => o.type === type)
      .map(o => o.id);
    setSelectedIds(new Set(matching));
    setLastSelectedId(matching[matching.length - 1] || null);
  }, [objects]);

  /**
   * Select all objects within bounding box
   * Example: selectInBounds({ x: 0, y: 0, width: 1000, height: 1000 })
   */
  const selectInBounds = useCallback((bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    const matching = objects
      .filter(o =>
        o.x >= bounds.x &&
        o.x <= bounds.x + bounds.width &&
        o.y >= bounds.y &&
        o.y <= bounds.y + bounds.height
      )
      .map(o => o.id);
    setSelectedIds(new Set(matching));
    setLastSelectedId(matching[matching.length - 1] || null);
  }, [objects]);

  /**
   * Select objects matching a custom filter function
   * Example: selectByFilter(obj => obj.fill === '#FF0000') selects all red objects
   */
  const selectByFilter = useCallback((filter: (obj: CanvasObject) => boolean) => {
    const matching = objects
      .filter(filter)
      .map(o => o.id);
    setSelectedIds(new Set(matching));
    setLastSelectedId(matching[matching.length - 1] || null);
  }, [objects]);

  /**
   * Check if an object is selected
   */
  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  /**
   * Get all currently selected objects
   */
  const getSelectedObjects = useCallback(() => {
    return objects.filter(o => selectedIds.has(o.id));
  }, [objects, selectedIds]);

  return {
    selectedIds,
    lastSelectedId,
    selectOne,
    selectMultiple,
    toggleSelect,
    selectAll,
    deselectAll,
    selectByType,
    selectInBounds,
    selectByFilter,
    isSelected,
    getSelectedObjects,
    hasSelection: selectedIds.size > 0,
    selectionCount: selectedIds.size,
  };
}

