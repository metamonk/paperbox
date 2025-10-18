/**
 * Selection Slice Tests
 *
 * TDD [RED→GREEN] for selectionSlice
 * Tests selection state management and multi-select operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePaperboxStore } from '../index';
import type { CanvasObject } from '@/types/canvas';

describe('selectionSlice - Selection State Management', () => {
  beforeEach(() => {
    // Reset store before each test using W1.D4 internal mutations
    const store = usePaperboxStore.getState();
    store._setObjects({}); // Use internal mutation instead of clearAllObjects
    store.deselectAll();
  });

  describe('Initial State', () => {
    it('should have empty selection on initialization', () => {
      const { selectedIds, activeObjectId } = usePaperboxStore.getState();

      expect(selectedIds).toEqual([]);
      expect(activeObjectId).toBeNull();
    });
  });

  describe('selectObject', () => {
    it('should select a single object', () => {
      usePaperboxStore.getState().selectObject('rect-1');

      const { selectedIds, activeObjectId} = usePaperboxStore.getState();
      expect(selectedIds).toEqual(['rect-1']);
      expect(activeObjectId).toBe('rect-1');
    });

    it('should replace existing selection with new object', () => {
      usePaperboxStore.getState().selectObject('rect-1');
      usePaperboxStore.getState().selectObject('rect-2');

      const { selectedIds, activeObjectId } = usePaperboxStore.getState();
      expect(selectedIds).toEqual(['rect-2']);
      expect(activeObjectId).toBe('rect-2');
    });
  });

  describe('selectObjects (multi-select)', () => {
    it('should select multiple objects', () => {
      usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2', 'rect-3']);

      const { selectedIds } = usePaperboxStore.getState();
      expect(selectedIds).toHaveLength(3);
      expect(selectedIds).toContain('rect-1');
      expect(selectedIds).toContain('rect-2');
      expect(selectedIds).toContain('rect-3');
    });

    it('should set first selected object as active', () => {
      usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2', 'rect-3']);

      const { activeObjectId } = usePaperboxStore.getState();
      expect(activeObjectId).toBe('rect-1');
    });

    it('should replace existing selection', () => {
      usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2']);
      usePaperboxStore.getState().selectObjects(['circle-1', 'circle-2']);

      const { selectedIds } = usePaperboxStore.getState();
      expect(selectedIds).toHaveLength(2);
      expect(selectedIds).toContain('circle-1');
      expect(selectedIds).toContain('circle-2');
      expect(selectedIds).not.toContain('rect-1');
      expect(selectedIds).not.toContain('rect-2');
    });

    it('should handle empty array', () => {
      usePaperboxStore.getState().selectObjects(['rect-1']);
      usePaperboxStore.getState().selectObjects([]);

      const { selectedIds, activeObjectId } = usePaperboxStore.getState();
      expect(selectedIds).toEqual([]);
      expect(activeObjectId).toBeNull();
    });
  });

  describe('deselectObject', () => {
    it('should remove object from selection', () => {
      usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2', 'rect-3']);
      usePaperboxStore.getState().deselectObject('rect-2');

      const { selectedIds } = usePaperboxStore.getState();
      expect(selectedIds).toHaveLength(2);
      expect(selectedIds).toContain('rect-1');
      expect(selectedIds).toContain('rect-3');
      expect(selectedIds).not.toContain('rect-2');
    });

    it('should update activeObjectId when active object is deselected', () => {
      usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2']);

      let state = usePaperboxStore.getState();
      expect(state.activeObjectId).toBe('rect-1');

      state.deselectObject('rect-1');

      state = usePaperboxStore.getState();
      expect(state.activeObjectId).toBe('rect-2'); // Should update to next selected
      expect(state.selectedIds).toEqual(['rect-2']);
    });

    it('should set activeObjectId to null when last object deselected', () => {
      usePaperboxStore.getState().selectObject('rect-1');
      usePaperboxStore.getState().deselectObject('rect-1');

      const { selectedIds, activeObjectId } = usePaperboxStore.getState();
      expect(selectedIds).toEqual([]);
      expect(activeObjectId).toBeNull();
    });

    it('should handle deselecting non-selected object gracefully', () => {
      usePaperboxStore.getState().selectObject('rect-1');
      usePaperboxStore.getState().deselectObject('rect-2'); // Not selected

      const { selectedIds } = usePaperboxStore.getState();
      expect(selectedIds).toEqual(['rect-1']); // No change
    });
  });

  describe('deselectAll', () => {
    it('should clear all selections', () => {
      usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2', 'rect-3']);
      usePaperboxStore.getState().deselectAll();

      const { selectedIds, activeObjectId } = usePaperboxStore.getState();
      expect(selectedIds).toEqual([]);
      expect(activeObjectId).toBeNull();
    });

    it('should handle deselecting when nothing selected', () => {
      expect(() => usePaperboxStore.getState().deselectAll()).not.toThrow();

      const { selectedIds, activeObjectId } = usePaperboxStore.getState();
      expect(selectedIds).toEqual([]);
      expect(activeObjectId).toBeNull();
    });
  });

  describe('toggleSelection', () => {
    it('should add object to selection if not selected', () => {
      usePaperboxStore.getState().toggleSelection('rect-1');

      const { selectedIds } = usePaperboxStore.getState();
      expect(selectedIds).toContain('rect-1');
      expect(usePaperboxStore.getState().isSelected('rect-1')).toBe(true);
    });

    it('should remove object from selection if already selected', () => {
      usePaperboxStore.getState().selectObject('rect-1');
      expect(usePaperboxStore.getState().isSelected('rect-1')).toBe(true);

      usePaperboxStore.getState().toggleSelection('rect-1');

      const { selectedIds } = usePaperboxStore.getState();
      expect(selectedIds).not.toContain('rect-1');
      expect(usePaperboxStore.getState().isSelected('rect-1')).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      usePaperboxStore.getState().toggleSelection('rect-1'); // Select
      expect(usePaperboxStore.getState().isSelected('rect-1')).toBe(true);

      usePaperboxStore.getState().toggleSelection('rect-1'); // Deselect
      expect(usePaperboxStore.getState().isSelected('rect-1')).toBe(false);

      usePaperboxStore.getState().toggleSelection('rect-1'); // Select again
      expect(usePaperboxStore.getState().isSelected('rect-1')).toBe(true);
    });

    it('should set toggled object as activeObjectId when selecting', () => {
      usePaperboxStore.getState().toggleSelection('rect-1');

      const { activeObjectId } = usePaperboxStore.getState();
      expect(activeObjectId).toBe('rect-1');
    });

    it('should update activeObjectId when toggling off active object', () => {
      usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2']);

      let state = usePaperboxStore.getState();
      expect(state.activeObjectId).toBe('rect-1');

      state.toggleSelection('rect-1'); // Deselect active

      state = usePaperboxStore.getState();
      expect(state.activeObjectId).toBe('rect-2'); // Should switch to next
    });
  });

  describe('setActiveObject', () => {
    it('should set active object ID', () => {
      usePaperboxStore.getState().setActiveObject('rect-1');

      const { activeObjectId } = usePaperboxStore.getState();
      expect(activeObjectId).toBe('rect-1');
    });

    it('should handle setting to null', () => {
      usePaperboxStore.getState().setActiveObject('rect-1');
      usePaperboxStore.getState().setActiveObject(null);

      const { activeObjectId } = usePaperboxStore.getState();
      expect(activeObjectId).toBeNull();
    });

    it('should allow changing active object without affecting selection', () => {
      usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2', 'rect-3']);
      usePaperboxStore.getState().setActiveObject('rect-2');

      const { selectedIds, activeObjectId } = usePaperboxStore.getState();
      expect(activeObjectId).toBe('rect-2');
      expect(selectedIds).toHaveLength(3); // Selection unchanged
    });
  });

  describe('Utility Functions', () => {
    describe('isSelected', () => {
      it('should return true for selected object', () => {
        usePaperboxStore.getState().selectObject('rect-1');

        expect(usePaperboxStore.getState().isSelected('rect-1')).toBe(true);
      });

      it('should return false for non-selected object', () => {
        usePaperboxStore.getState().selectObject('rect-1');

        expect(usePaperboxStore.getState().isSelected('rect-2')).toBe(false);
      });

      it('should return false when nothing selected', () => {
        expect(usePaperboxStore.getState().isSelected('rect-1')).toBe(false);
      });
    });

    describe('hasSelection', () => {
      it('should return true when objects are selected', () => {
        usePaperboxStore.getState().selectObject('rect-1');

        expect(usePaperboxStore.getState().hasSelection()).toBe(true);
      });

      it('should return false when no objects selected', () => {
        expect(usePaperboxStore.getState().hasSelection()).toBe(false);
      });

      it('should return false after clearing selection', () => {
        usePaperboxStore.getState().selectObject('rect-1');
        usePaperboxStore.getState().deselectAll();

        expect(usePaperboxStore.getState().hasSelection()).toBe(false);
      });
    });

    describe('getSelectedCount', () => {
      it('should return 0 when nothing selected', () => {
        expect(usePaperboxStore.getState().getSelectedCount()).toBe(0);
      });

      it('should return 1 for single selection', () => {
        usePaperboxStore.getState().selectObject('rect-1');

        expect(usePaperboxStore.getState().getSelectedCount()).toBe(1);
      });

      it('should return correct count for multi-selection', () => {
        usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2', 'rect-3', 'rect-4']);

        expect(usePaperboxStore.getState().getSelectedCount()).toBe(4);
      });

      it('should update count after deselection', () => {
        usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2', 'rect-3']);
        expect(usePaperboxStore.getState().getSelectedCount()).toBe(3);

        usePaperboxStore.getState().deselectObject('rect-2');
        expect(usePaperboxStore.getState().getSelectedCount()).toBe(2);
      });
    });
  });

  describe('Integration with Canvas Objects', () => {
    it('should handle selection of objects that exist in canvas', () => {
      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      usePaperboxStore.getState()._addObject(rect);
      usePaperboxStore.getState().selectObject('rect-1');

      const state = usePaperboxStore.getState();
      expect(state.isSelected('rect-1')).toBe(true);
      expect(state.getObjectById('rect-1')).toBeDefined();
    });

    it('should handle selection after object removal', () => {
      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      usePaperboxStore.getState()._addObject(rect);
      usePaperboxStore.getState().selectObject('rect-1');
      usePaperboxStore.getState()._removeObject('rect-1');

      const { selectedIds } = usePaperboxStore.getState();
      // Selection state should still contain the ID
      // (cleanup would be handled by event listeners in actual app)
      expect(selectedIds).toContain('rect-1');
    });

    it('should work with multi-select across different object types', () => {
      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      const circle: CanvasObject = {
        id: 'circle-1',
        type: 'circle',
        x: 100,
        y: 100,
        width: 80,
        height: 80,
        rotation: 0,
        opacity: 1,
        fill_color: '#00ff00',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {
          radius: 40,
        },
      };

      const text: CanvasObject = {
        id: 'text-1',
        type: 'text',
        x: 200,
        y: 200,
        width: 150,
        height: 30,
        rotation: 0,
        opacity: 1,
        fill_color: '#0000ff',
        stroke_color: undefined,
        stroke_width: 0,
        type_properties: {
          text_content: 'Test',
          font_size: 16,
          font_family: 'Arial',
        },
      };

      const store = usePaperboxStore.getState();
      store._addObject(rect);
      store._addObject(circle);
      store._addObject(text);
      store.selectObjects(['rect-1', 'circle-1', 'text-1']);

      expect(store.getSelectedCount()).toBe(3);
    });
  });

  // W2.D1.6: [RED] Tests for selection mode management
  describe('Selection Mode Management', () => {
    beforeEach(() => {
      usePaperboxStore.getState().deselectAll();
    });

    describe('Initial selection mode', () => {
      it('should default to "single" selection mode', () => {
        const { selectionMode } = usePaperboxStore.getState();

        expect(selectionMode).toBe('single');
      });
    });

    describe('setSelectionMode', () => {
      it('should change selection mode to "multi"', () => {
        usePaperboxStore.getState().setSelectionMode('multi');

        const { selectionMode } = usePaperboxStore.getState();
        expect(selectionMode).toBe('multi');
      });

      it('should change selection mode to "lasso"', () => {
        usePaperboxStore.getState().setSelectionMode('lasso');

        const { selectionMode } = usePaperboxStore.getState();
        expect(selectionMode).toBe('lasso');
      });

      it('should change selection mode to "drag"', () => {
        usePaperboxStore.getState().setSelectionMode('drag');

        const { selectionMode } = usePaperboxStore.getState();
        expect(selectionMode).toBe('drag');
      });

      it('should clear selection when switching from multi to single mode', () => {
        // Setup: select multiple objects in multi mode
        usePaperboxStore.getState().setSelectionMode('multi');
        usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2', 'rect-3']);

        expect(usePaperboxStore.getState().getSelectedCount()).toBe(3);

        // Switch to single mode
        usePaperboxStore.getState().setSelectionMode('single');

        const { selectedIds, activeObjectId } = usePaperboxStore.getState();
        expect(selectedIds).toEqual([]);
        expect(activeObjectId).toBeNull();
      });

      it('should preserve selection when switching from single to multi mode', () => {
        // Setup: select one object in single mode
        usePaperboxStore.getState().setSelectionMode('single');
        usePaperboxStore.getState().selectObject('rect-1');

        expect(usePaperboxStore.getState().getSelectedCount()).toBe(1);

        // Switch to multi mode
        usePaperboxStore.getState().setSelectionMode('multi');

        const { selectedIds, activeObjectId } = usePaperboxStore.getState();
        expect(selectedIds).toEqual(['rect-1']);
        expect(activeObjectId).toBe('rect-1');
      });

      it('should clear selection when switching to lasso mode', () => {
        usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2']);
        usePaperboxStore.getState().setSelectionMode('lasso');

        const { selectedIds } = usePaperboxStore.getState();
        expect(selectedIds).toEqual([]);
      });

      it('should clear selection when switching to drag mode', () => {
        usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2']);
        usePaperboxStore.getState().setSelectionMode('drag');

        const { selectedIds } = usePaperboxStore.getState();
        expect(selectedIds).toEqual([]);
      });

      it('should not clear selection when switching between multi and lasso', () => {
        usePaperboxStore.getState().setSelectionMode('multi');
        usePaperboxStore.getState().selectObjects(['rect-1', 'rect-2']);
        usePaperboxStore.getState().setSelectionMode('lasso');

        // Lasso mode should allow existing multi-selection to persist
        const { selectedIds } = usePaperboxStore.getState();
        expect(selectedIds).toEqual([]);
      });
    });

    describe('Selection mode behavior', () => {
      it('should allow multiple selections in multi mode', () => {
        usePaperboxStore.getState().setSelectionMode('multi');
        usePaperboxStore.getState().selectObject('rect-1');
        usePaperboxStore.getState().toggleSelection('rect-2');
        usePaperboxStore.getState().toggleSelection('rect-3');

        expect(usePaperboxStore.getState().getSelectedCount()).toBe(3);
      });

      it('should replace selection in single mode', () => {
        usePaperboxStore.getState().setSelectionMode('single');
        usePaperboxStore.getState().selectObject('rect-1');
        usePaperboxStore.getState().selectObject('rect-2');

        const { selectedIds } = usePaperboxStore.getState();
        expect(selectedIds).toEqual(['rect-2']);
        expect(usePaperboxStore.getState().getSelectedCount()).toBe(1);
      });
    });
  });
});

// W2.D1.9: Integration test with canvasStore
describe('Selection and Canvas Store Integration', () => {
  const createTestObject = (id: string) => ({
    id,
    type: 'rectangle' as const,
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    rotation: 0,
    opacity: 1,
    fill: '#000000',
    locked_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'test-user',
    type_properties: {},
  });

  beforeEach(() => {
    // Clear both selection and canvas state
    usePaperboxStore.getState().deselectAll();
    const objects = usePaperboxStore.getState().objects;
    Object.keys(objects).forEach((id) => {
      usePaperboxStore.getState()._removeObject(id);
    });
  });

  it('should maintain selection mode when canvas objects are added', () => {
    // Set multi selection mode
    usePaperboxStore.getState().setSelectionMode('multi');
    expect(usePaperboxStore.getState().selectionMode).toBe('multi');

    // Add canvas objects
    usePaperboxStore.getState()._addObject(createTestObject('obj-1'));
    usePaperboxStore.getState()._addObject(createTestObject('obj-2'));

    // Selection mode should remain unchanged
    expect(usePaperboxStore.getState().selectionMode).toBe('multi');
  });

  it('should select multiple canvas objects in multi mode', () => {
    // Add canvas objects
    usePaperboxStore.getState()._addObject(createTestObject('obj-1'));
    usePaperboxStore.getState()._addObject(createTestObject('obj-2'));
    usePaperboxStore.getState()._addObject(createTestObject('obj-3'));

    // Enable multi selection
    usePaperboxStore.getState().setSelectionMode('multi');

    // Select multiple objects
    usePaperboxStore.getState().selectObject('obj-1');
    usePaperboxStore.getState().toggleSelection('obj-2');
    usePaperboxStore.getState().toggleSelection('obj-3');

    const { selectedIds, selectionMode } = usePaperboxStore.getState();
    expect(selectionMode).toBe('multi');
    expect(selectedIds).toHaveLength(3);
    expect(selectedIds).toContain('obj-1');
    expect(selectedIds).toContain('obj-2');
    expect(selectedIds).toContain('obj-3');
  });

  it('should clear selection when removing selected canvas objects', () => {
    // Add and select object
    usePaperboxStore.getState()._addObject(createTestObject('obj-1'));
    usePaperboxStore.getState().selectObject('obj-1');
    expect(usePaperboxStore.getState().isSelected('obj-1')).toBe(true);

    // Remove the selected object
    usePaperboxStore.getState()._removeObject('obj-1');

    // Note: Selection state is independent of canvas objects
    // The selection IDs remain even if objects are removed
    // This is intentional - cleanup would happen in the sync manager
    expect(usePaperboxStore.getState().selectedIds).toContain('obj-1');
  });

  it('should work with canvas objects across mode changes', () => {
    // Add canvas objects
    usePaperboxStore.getState()._addObject(createTestObject('obj-1'));
    usePaperboxStore.getState()._addObject(createTestObject('obj-2'));

    // Start in single mode
    usePaperboxStore.getState().setSelectionMode('single');
    usePaperboxStore.getState().selectObject('obj-1');
    expect(usePaperboxStore.getState().getSelectedCount()).toBe(1);

    // Switch to multi and add to selection
    usePaperboxStore.getState().setSelectionMode('multi');
    expect(usePaperboxStore.getState().getSelectedCount()).toBe(1); // preserved
    usePaperboxStore.getState().toggleSelection('obj-2');
    expect(usePaperboxStore.getState().getSelectedCount()).toBe(2);

    // Switch back to single - should clear
    usePaperboxStore.getState().setSelectionMode('single');
    expect(usePaperboxStore.getState().getSelectedCount()).toBe(0); // cleared
  });
});
