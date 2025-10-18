/**
 * Tools Slice Tests
 *
 * Tests for tool selection and settings management
 * Covers active tool state, tool settings, snap settings, and utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePaperboxStore } from '../index';
import { DEFAULT_TOOL_SETTINGS, type ToolType } from '../slices/toolsSlice';

describe('toolsSlice - Tool Selection and Settings Management', () => {
  beforeEach(() => {
    // Reset to default state before each test
    const store = usePaperboxStore.getState();
    store.resetToSelectTool();
    store.resetToolSettings();
  });

  describe('Initial State', () => {
    it('should initialize with select tool active', () => {
      const { activeTool, isDrawing } = usePaperboxStore.getState();

      expect(activeTool).toBe('select');
      expect(isDrawing).toBe(false);
    });

    it('should initialize with default tool settings', () => {
      const { toolSettings } = usePaperboxStore.getState();

      expect(toolSettings).toEqual(DEFAULT_TOOL_SETTINGS);
      expect(toolSettings.strokeWidth).toBe(2);
      expect(toolSettings.strokeColor).toBe('#000000');
      expect(toolSettings.fillColor).toBe('#ffffff');
      expect(toolSettings.opacity).toBe(1);
      expect(toolSettings.fontSize).toBe(16);
      expect(toolSettings.fontFamily).toBe('Arial');
      expect(toolSettings.fontWeight).toBe('normal');
      expect(toolSettings.textAlign).toBe('left');
    });

    it('should initialize with snap settings disabled', () => {
      const { toolSettings } = usePaperboxStore.getState();

      expect(toolSettings.snapToGrid).toBe(false);
      expect(toolSettings.snapToObjects).toBe(true);
      expect(toolSettings.gridSize).toBe(20);
      expect(toolSettings.snapTolerance).toBe(10);
    });
  });

  describe('setActiveTool()', () => {
    it('should change active tool', () => {
      const store = usePaperboxStore.getState();

      store.setActiveTool('rectangle');
      expect(usePaperboxStore.getState().activeTool).toBe('rectangle');

      store.setActiveTool('circle');
      expect(usePaperboxStore.getState().activeTool).toBe('circle');

      store.setActiveTool('text');
      expect(usePaperboxStore.getState().activeTool).toBe('text');
    });

    it('should reset isDrawing when switching tools', () => {
      const store = usePaperboxStore.getState();

      // Start drawing with rectangle
      store.setActiveTool('rectangle');
      store.setIsDrawing(true);
      expect(usePaperboxStore.getState().isDrawing).toBe(true);

      // Switch to circle
      store.setActiveTool('circle');
      expect(usePaperboxStore.getState().isDrawing).toBe(false);
    });

    it('should accept all valid tool types', () => {
      const store = usePaperboxStore.getState();
      const tools: ToolType[] = ['select', 'rectangle', 'circle', 'text', 'pan', 'zoom'];

      tools.forEach((tool) => {
        store.setActiveTool(tool);
        expect(usePaperboxStore.getState().activeTool).toBe(tool);
      });
    });
  });

  describe('resetToSelectTool()', () => {
    it('should reset to select tool', () => {
      const store = usePaperboxStore.getState();

      store.setActiveTool('rectangle');
      store.resetToSelectTool();

      expect(usePaperboxStore.getState().activeTool).toBe('select');
    });

    it('should reset isDrawing state', () => {
      const store = usePaperboxStore.getState();

      store.setActiveTool('circle');
      store.setIsDrawing(true);
      store.resetToSelectTool();

      expect(usePaperboxStore.getState().isDrawing).toBe(false);
    });
  });

  describe('Drawing Settings', () => {
    it('setStrokeWidth should update stroke width', () => {
      const store = usePaperboxStore.getState();

      store.setStrokeWidth(5);
      expect(usePaperboxStore.getState().toolSettings.strokeWidth).toBe(5);

      store.setStrokeWidth(10);
      expect(usePaperboxStore.getState().toolSettings.strokeWidth).toBe(10);
    });

    it('setStrokeWidth should enforce minimum of 0', () => {
      const store = usePaperboxStore.getState();

      store.setStrokeWidth(-5);
      expect(usePaperboxStore.getState().toolSettings.strokeWidth).toBe(0);
    });

    it('setStrokeColor should update stroke color', () => {
      const store = usePaperboxStore.getState();

      store.setStrokeColor('#ff0000');
      expect(usePaperboxStore.getState().toolSettings.strokeColor).toBe('#ff0000');

      store.setStrokeColor('#00ff00');
      expect(usePaperboxStore.getState().toolSettings.strokeColor).toBe('#00ff00');
    });

    it('setFillColor should update fill color', () => {
      const store = usePaperboxStore.getState();

      store.setFillColor('#0000ff');
      expect(usePaperboxStore.getState().toolSettings.fillColor).toBe('#0000ff');
    });

    it('setOpacity should update opacity', () => {
      const store = usePaperboxStore.getState();

      store.setOpacity(0.5);
      expect(usePaperboxStore.getState().toolSettings.opacity).toBe(0.5);

      store.setOpacity(0.8);
      expect(usePaperboxStore.getState().toolSettings.opacity).toBe(0.8);
    });

    it('setOpacity should clamp to 0-1 range', () => {
      const store = usePaperboxStore.getState();

      store.setOpacity(1.5);
      expect(usePaperboxStore.getState().toolSettings.opacity).toBe(1);

      store.setOpacity(-0.2);
      expect(usePaperboxStore.getState().toolSettings.opacity).toBe(0);
    });
  });

  describe('Text Settings', () => {
    it('setFontSize should update font size', () => {
      const store = usePaperboxStore.getState();

      store.setFontSize(24);
      expect(usePaperboxStore.getState().toolSettings.fontSize).toBe(24);

      store.setFontSize(32);
      expect(usePaperboxStore.getState().toolSettings.fontSize).toBe(32);
    });

    it('setFontSize should enforce minimum of 1', () => {
      const store = usePaperboxStore.getState();

      store.setFontSize(0);
      expect(usePaperboxStore.getState().toolSettings.fontSize).toBe(1);

      store.setFontSize(-10);
      expect(usePaperboxStore.getState().toolSettings.fontSize).toBe(1);
    });

    it('setFontFamily should update font family', () => {
      const store = usePaperboxStore.getState();

      store.setFontFamily('Helvetica');
      expect(usePaperboxStore.getState().toolSettings.fontFamily).toBe('Helvetica');

      store.setFontFamily('Times New Roman');
      expect(usePaperboxStore.getState().toolSettings.fontFamily).toBe('Times New Roman');
    });

    it('setFontWeight should update font weight', () => {
      const store = usePaperboxStore.getState();

      store.setFontWeight('bold');
      expect(usePaperboxStore.getState().toolSettings.fontWeight).toBe('bold');

      store.setFontWeight('normal');
      expect(usePaperboxStore.getState().toolSettings.fontWeight).toBe('normal');
    });

    it('setTextAlign should update text alignment', () => {
      const store = usePaperboxStore.getState();

      store.setTextAlign('center');
      expect(usePaperboxStore.getState().toolSettings.textAlign).toBe('center');

      store.setTextAlign('right');
      expect(usePaperboxStore.getState().toolSettings.textAlign).toBe('right');

      store.setTextAlign('left');
      expect(usePaperboxStore.getState().toolSettings.textAlign).toBe('left');
    });
  });

  describe('updateToolSettings()', () => {
    it('should update multiple settings at once', () => {
      const store = usePaperboxStore.getState();

      store.updateToolSettings({
        strokeWidth: 3,
        fillColor: '#ff0000',
        fontSize: 20,
      });

      const { toolSettings } = usePaperboxStore.getState();
      expect(toolSettings.strokeWidth).toBe(3);
      expect(toolSettings.fillColor).toBe('#ff0000');
      expect(toolSettings.fontSize).toBe(20);
    });

    it('should preserve unmodified settings', () => {
      const store = usePaperboxStore.getState();

      store.updateToolSettings({
        strokeWidth: 5,
      });

      const { toolSettings } = usePaperboxStore.getState();
      expect(toolSettings.strokeWidth).toBe(5);
      expect(toolSettings.strokeColor).toBe('#000000'); // Unchanged
      expect(toolSettings.fillColor).toBe('#ffffff'); // Unchanged
    });

    it('should handle empty updates gracefully', () => {
      const store = usePaperboxStore.getState();
      const before = usePaperboxStore.getState().toolSettings;

      store.updateToolSettings({});

      const after = usePaperboxStore.getState().toolSettings;
      expect(after).toEqual(before);
    });
  });

  describe('resetToolSettings()', () => {
    it('should reset all settings to defaults', () => {
      const store = usePaperboxStore.getState();

      // Change multiple settings
      store.updateToolSettings({
        strokeWidth: 10,
        fillColor: '#ff0000',
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
      });

      // Reset
      store.resetToolSettings();

      const { toolSettings } = usePaperboxStore.getState();
      expect(toolSettings).toEqual(DEFAULT_TOOL_SETTINGS);
    });
  });

  describe('Snap Settings', () => {
    it('toggleSnapToGrid should toggle snap to grid', () => {
      const store = usePaperboxStore.getState();

      // Initially false
      expect(usePaperboxStore.getState().toolSettings.snapToGrid).toBe(false);

      store.toggleSnapToGrid();
      expect(usePaperboxStore.getState().toolSettings.snapToGrid).toBe(true);

      store.toggleSnapToGrid();
      expect(usePaperboxStore.getState().toolSettings.snapToGrid).toBe(false);
    });

    it('toggleSnapToObjects should toggle snap to objects', () => {
      const store = usePaperboxStore.getState();

      // Initially true
      expect(usePaperboxStore.getState().toolSettings.snapToObjects).toBe(true);

      store.toggleSnapToObjects();
      expect(usePaperboxStore.getState().toolSettings.snapToObjects).toBe(false);

      store.toggleSnapToObjects();
      expect(usePaperboxStore.getState().toolSettings.snapToObjects).toBe(true);
    });

    it('setGridSize should update grid size', () => {
      const store = usePaperboxStore.getState();

      store.setGridSize(10);
      expect(usePaperboxStore.getState().toolSettings.gridSize).toBe(10);

      store.setGridSize(50);
      expect(usePaperboxStore.getState().toolSettings.gridSize).toBe(50);
    });

    it('setGridSize should enforce minimum of 1', () => {
      const store = usePaperboxStore.getState();

      store.setGridSize(0);
      expect(usePaperboxStore.getState().toolSettings.gridSize).toBe(1);

      store.setGridSize(-10);
      expect(usePaperboxStore.getState().toolSettings.gridSize).toBe(1);
    });

    it('setSnapTolerance should update snap tolerance', () => {
      const store = usePaperboxStore.getState();

      store.setSnapTolerance(5);
      expect(usePaperboxStore.getState().toolSettings.snapTolerance).toBe(5);

      store.setSnapTolerance(15);
      expect(usePaperboxStore.getState().toolSettings.snapTolerance).toBe(15);
    });

    it('setSnapTolerance should enforce minimum of 0', () => {
      const store = usePaperboxStore.getState();

      store.setSnapTolerance(-5);
      expect(usePaperboxStore.getState().toolSettings.snapTolerance).toBe(0);
    });
  });

  describe('Drawing State', () => {
    it('setIsDrawing should update drawing state', () => {
      const store = usePaperboxStore.getState();

      expect(usePaperboxStore.getState().isDrawing).toBe(false);

      store.setIsDrawing(true);
      expect(usePaperboxStore.getState().isDrawing).toBe(true);

      store.setIsDrawing(false);
      expect(usePaperboxStore.getState().isDrawing).toBe(false);
    });

    it('should allow setting isDrawing independently of tool changes', () => {
      const store = usePaperboxStore.getState();

      store.setActiveTool('rectangle');
      store.setIsDrawing(true);
      expect(usePaperboxStore.getState().isDrawing).toBe(true);

      // Manually set to false without changing tool
      store.setIsDrawing(false);
      expect(usePaperboxStore.getState().isDrawing).toBe(false);
      expect(usePaperboxStore.getState().activeTool).toBe('rectangle');
    });
  });

  describe('Utility Functions', () => {
    it('getActiveTool should return current active tool', () => {
      const store = usePaperboxStore.getState();

      expect(store.getActiveTool()).toBe('select');

      store.setActiveTool('circle');
      expect(store.getActiveTool()).toBe('circle');
    });

    it('getToolSettings should return current tool settings', () => {
      const store = usePaperboxStore.getState();

      const settings = store.getToolSettings();
      expect(settings).toEqual(DEFAULT_TOOL_SETTINGS);

      store.setStrokeWidth(5);
      const updatedSettings = store.getToolSettings();
      expect(updatedSettings.strokeWidth).toBe(5);
    });

    it('isSelectTool should return true only when select tool is active', () => {
      const store = usePaperboxStore.getState();

      expect(store.isSelectTool()).toBe(true);

      store.setActiveTool('rectangle');
      expect(store.isSelectTool()).toBe(false);

      store.setActiveTool('pan');
      expect(store.isSelectTool()).toBe(false);

      store.setActiveTool('select');
      expect(store.isSelectTool()).toBe(true);
    });

    it('isDrawingTool should return true for drawing tools', () => {
      const store = usePaperboxStore.getState();

      // Not a drawing tool
      expect(store.isDrawingTool()).toBe(false);

      // Drawing tools
      store.setActiveTool('rectangle');
      expect(store.isDrawingTool()).toBe(true);

      store.setActiveTool('circle');
      expect(store.isDrawingTool()).toBe(true);

      store.setActiveTool('text');
      expect(store.isDrawingTool()).toBe(true);

      // Not drawing tools
      store.setActiveTool('pan');
      expect(store.isDrawingTool()).toBe(false);

      store.setActiveTool('zoom');
      expect(store.isDrawingTool()).toBe(false);

      store.setActiveTool('select');
      expect(store.isDrawingTool()).toBe(false);
    });
  });

  describe('Tool Workflow Integration', () => {
    it('should handle complete tool usage flow', () => {
      const store = usePaperboxStore.getState();

      // 1. Select rectangle tool
      store.setActiveTool('rectangle');
      expect(store.getActiveTool()).toBe('rectangle');
      expect(store.isDrawingTool()).toBe(true);

      // 2. Configure settings
      store.setStrokeWidth(3);
      store.setFillColor('#ff0000');

      const settings = store.getToolSettings();
      expect(settings.strokeWidth).toBe(3);
      expect(settings.fillColor).toBe('#ff0000');

      // 3. Start drawing
      store.setIsDrawing(true);
      expect(usePaperboxStore.getState().isDrawing).toBe(true);

      // 4. Finish drawing
      store.setIsDrawing(false);
      expect(usePaperboxStore.getState().isDrawing).toBe(false);

      // 5. Switch back to select
      store.resetToSelectTool();
      expect(store.getActiveTool()).toBe('select');
      expect(store.isSelectTool()).toBe(true);
    });

    it('should maintain settings across tool switches', () => {
      const store = usePaperboxStore.getState();

      // Configure settings
      store.setStrokeWidth(5);
      store.setFillColor('#0000ff');
      store.setFontSize(24);

      // Switch tools multiple times
      store.setActiveTool('rectangle');
      store.setActiveTool('circle');
      store.setActiveTool('text');

      // Settings should be preserved
      const { toolSettings } = usePaperboxStore.getState();
      expect(toolSettings.strokeWidth).toBe(5);
      expect(toolSettings.fillColor).toBe('#0000ff');
      expect(toolSettings.fontSize).toBe(24);
    });
  });
});
