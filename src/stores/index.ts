/**
 * Main Zustand Store
 *
 * 6-Slice Architecture for Paperbox Phase II
 * Combines all store slices with Immer middleware for immutable updates
 *
 * Architecture:
 * - canvasStore: Canvas objects, Fabric.js integration
 * - selectionStore: Selection state, multi-select, active objects
 * - historyStore: Undo/redo operations, command history
 * - layersStore: Z-index management, layer visibility
 * - toolsStore: Active tool, tool settings
 * - collaborationStore: Real-time presence, cursors, locks
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import { createCanvasSlice, type CanvasSlice } from './slices/canvasSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/selectionSlice';
import { createHistorySlice, type HistorySlice } from './slices/historySlice';
import { createLayersSlice, type LayersSlice } from './slices/layersSlice';
import { createToolsSlice, type ToolsSlice } from './slices/toolsSlice';
import { createCollaborationSlice, type CollaborationSlice } from './slices/collaborationSlice';

/**
 * Combined store type with all slices
 */
export type PaperboxStore = CanvasSlice &
  SelectionSlice &
  HistorySlice &
  LayersSlice &
  ToolsSlice &
  CollaborationSlice;

/**
 * Main Paperbox store with all slices
 *
 * Features:
 * - subscribeWithSelector middleware for selective subscriptions (required by CanvasSyncManager)
 * - Immer middleware for mutable-style updates
 * - DevTools integration for debugging
 * - Modular slice pattern for maintainability
 */
export const usePaperboxStore = create<PaperboxStore>()(
  subscribeWithSelector(
    devtools(
      immer((...args) => ({
        ...createCanvasSlice(...args),
        ...createSelectionSlice(...args),
        ...createHistorySlice(...args),
        ...createLayersSlice(...args),
        ...createToolsSlice(...args),
        ...createCollaborationSlice(...args),
      })),
      { name: 'paperbox-store' },
    ),
  ),
);

/**
 * Selector hooks for optimized component re-renders
 */

// Canvas selectors
export const useCanvasObjects = () =>
  usePaperboxStore((state) => state.objects);

export const useCanvasObjectById = (id: string) =>
  usePaperboxStore((state) => state.objects[id]);

// Selection selectors
export const useSelectedIds = () =>
  usePaperboxStore((state) => state.selectedIds);

export const useActiveObjectId = () =>
  usePaperboxStore((state) => state.activeObjectId);

// Tools selectors
export const useActiveTool = () =>
  usePaperboxStore((state) => state.activeTool);

// History selectors
export const useCanUndo = () =>
  usePaperboxStore((state) => state.canUndo);

export const useCanRedo = () =>
  usePaperboxStore((state) => state.canRedo);
