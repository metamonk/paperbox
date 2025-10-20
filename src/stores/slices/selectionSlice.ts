/**
 * Selection Slice - Zustand Store
 *
 * Manages selection state for canvas objects
 * Part of 6-slice architecture for Phase II
 *
 * Responsibilities:
 * - Selected object IDs
 * - Active object (single selection)
 * - Multi-select operations
 * - Selection utilities
 */

import type { StateCreator } from 'zustand';
import type { PaperboxStore } from '../index';

/**
 * Selection mode types
 */
export type SelectionMode = 'single' | 'multi' | 'lasso' | 'drag';

/**
 * Selection slice state interface
 */
/**
 * Result of lock-coordinated selection operations
 */
export interface SelectionWithLocksResult {
  success: string[]; // IDs successfully locked and selected
  failed: Array<{
    id: string;
    reason: string;
    lockedBy?: string;
  }>;
}

export interface SelectionSlice {
  // State
  selectedIds: string[];
  activeObjectId: string | null;
  selectionMode: SelectionMode;

  // Actions
  selectObject: (id: string) => void;
  selectObjects: (ids: string[]) => void;
  selectObjectsWithLocks: (ids: string[]) => Promise<SelectionWithLocksResult>; // W5.D5++ Enhanced Path B
  selectAll: () => void;
  deselectAll: () => void;
  deselectObject: (id: string) => void;
  toggleSelection: (id: string) => void;
  setActiveObject: (id: string | null) => void;
  setSelectionMode: (mode: SelectionMode) => void;

  // Utilities
  isSelected: (id: string) => boolean;
  hasSelection: () => boolean;
  getSelectedCount: () => number;
}

/**
 * Create selection slice
 */
export const createSelectionSlice: StateCreator<
  PaperboxStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  SelectionSlice
> = (set, get) => ({
  // Initial state
  selectedIds: [],
  activeObjectId: null,
  selectionMode: 'single',

  // Actions

  /**
   * Select single object (replaces current selection)
   */
  selectObject: (id: string) =>
    set(
      (state) => {
        state.selectedIds = [id];
        state.activeObjectId = id;
      },
      undefined,
      'selection/selectObject',
    ),

  /**
   * Select multiple objects (replaces current selection)
   */
  selectObjects: (ids: string[]) =>
    set(
      (state) => {
        state.selectedIds = ids;
        state.activeObjectId = ids[0] || null;
      },
      undefined,
      'selection/selectObjects',
    ),

  /**
   * W5.D5++ Enhanced Path B: Select objects with lock coordination
   * 
   * Implements state-driven coordination where selection workflow:
   * 1. Acquires database locks atomically
   * 2. Updates selection state (only for successfully locked objects)
   * 3. Broadcasts selection to other users via Presence
   * 4. Returns result for UI feedback
   * 
   * This prevents conflicts by ensuring only one user can edit an object at a time.
   * Fulfills FOUNDATION.md requirement: "Documented strategy (last-write-wins, CRDT, OT, etc.)"
   * Our strategy: Optimistic Locking (database-level atomic constraints)
   */
  selectObjectsWithLocks: async (ids: string[]) => {
    const store = get();

    // 1. Acquire database locks for each object atomically
    const lockResults = await Promise.all(
      ids.map(async (id) => {
        const locked = await store.requestLock(id);
        return { id, locked };
      })
    );

    // 2. Separate successful and failed locks
    const successfulIds = lockResults.filter(r => r.locked).map(r => r.id);
    const failedLocks = lockResults.filter(r => !r.locked);

    // 3. Update selection state (only for successfully locked objects)
    if (successfulIds.length > 0) {
      set(
        (state) => {
          state.selectedIds = successfulIds;
          state.activeObjectId = successfulIds[0] || null;
        },
        undefined,
        'selection/selectObjectsWithLocks'
      );

      // 4. Broadcast selection to other users (Supabase Presence)
      // DISABLED: Collaborative features temporarily disabled
      // store.broadcastSelection(successfulIds);
    } else {
      // All locks failed - clear selection
      set(
        (state) => {
          state.selectedIds = [];
          state.activeObjectId = null;
        },
        undefined,
        'selection/selectObjectsWithLocks/allFailed'
      );

      // DISABLED: Collaborative features temporarily disabled
      // store.broadcastSelection([]);
    }

    // 5. Build result with failed lock details for UI feedback
    const failed = failedLocks.map(({ id }) => {
      const lock = store.locks[id];
      return {
        id,
        reason: 'Object locked by another user',
        lockedBy: lock?.userName,
      };
    });

    // 6. Return result for caller (e.g., CanvasSyncManager can show toast)
    return { success: successfulIds, failed };
  },

  /**
   * W4.D4: Select all objects on canvas (Cmd/Ctrl+A)
   */
  selectAll: () =>
    set(
      (state) => {
        // Use state.objects, not get().objects to avoid stale state
        const allObjectIds = Object.keys(state.objects);
        state.selectedIds = allObjectIds;
        state.activeObjectId = allObjectIds[0] || null;
      },
      undefined,
      'selection/selectAll',
    ),

  /**
   * Deselect single object (keep other selections)
   */
  deselectObject: (id: string) =>
    set(
      (state) => {
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        if (state.activeObjectId === id) {
          state.activeObjectId = state.selectedIds[0] || null;
        }
      },
      undefined,
      'selection/deselectObject',
    ),

  /**
   * Clear all selections
   */
  deselectAll: () =>
    set(
      (state) => {
        state.selectedIds = [];
        state.activeObjectId = null;
      },
      undefined,
      'selection/deselectAll',
    ),

  /**
   * Toggle selection for object
   */
  toggleSelection: (id: string) =>
    set(
      (state) => {
        const isSelected = state.selectedIds.includes(id);
        if (isSelected) {
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
          if (state.activeObjectId === id) {
            state.activeObjectId = state.selectedIds[0] || null;
          }
        } else {
          state.selectedIds.push(id);
          state.activeObjectId = id;
        }
      },
      undefined,
      'selection/toggleSelection',
    ),

  /**
   * Set active object (focus for keyboard operations)
   */
  setActiveObject: (id: string | null) =>
    set(
      (state) => {
        state.activeObjectId = id;
      },
      undefined,
      'selection/setActiveObject',
    ),

  /**
   * Set selection mode
   * - Switching FROM 'multi' TO 'single' → clears selection
   * - Switching FROM 'single' TO 'multi' → preserves selection
   * - Switching TO 'lasso' or 'drag' → clears selection
   */
  setSelectionMode: (mode: SelectionMode) =>
    set(
      (state) => {
        const previousMode = state.selectionMode;
        state.selectionMode = mode;

        // Clear selection when switching from multi to single
        if (previousMode === 'multi' && mode === 'single') {
          state.selectedIds = [];
          state.activeObjectId = null;
        }

        // Clear selection when switching to lasso or drag mode
        if (mode === 'lasso' || mode === 'drag') {
          state.selectedIds = [];
          state.activeObjectId = null;
        }

        // Preserve selection when switching from single to multi
        // (no action needed, just keep existing selection)
      },
      undefined,
      'selection/setSelectionMode',
    ),

  /**
   * Check if object is selected
   */
  isSelected: (id: string) => {
    return get().selectedIds.includes(id);
  },

  /**
   * Check if any objects are selected
   */
  hasSelection: () => {
    return get().selectedIds.length > 0;
  },

  /**
   * Get count of selected objects
   */
  getSelectedCount: () => {
    return get().selectedIds.length;
  },
});
