/**
 * Tools Slice - Zustand Store
 *
 * Manages active tool selection and tool-specific settings
 * Part of 6-slice architecture for Phase II
 *
 * Responsibilities:
 * - Active tool selection (select, rectangle, circle, text, pan, zoom)
 * - Tool-specific settings (stroke width, fill color, font size, etc.)
 * - Tool mode management (create vs edit mode)
 * - Tool state persistence
 */

import type { StateCreator } from 'zustand';
import type { PaperboxStore } from '../index';

/**
 * Available tools in the canvas editor
 */
export type ToolType =
  | 'select'
  | 'rectangle'
  | 'circle'
  | 'text'
  | 'pan'
  | 'zoom';

/**
 * Tool-specific settings interface
 */
export interface ToolSettings {
  // Drawing settings
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  opacity: number;

  // Text settings
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';

  // Shape settings
  cornerRadius: number; // For rounded rectangles (future enhancement)

  // Grid and snap settings
  snapToGrid: boolean;
  gridSize: number;
  snapToObjects: boolean;
  snapTolerance: number;
}

/**
 * Default tool settings
 */
export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  strokeWidth: 2,
  strokeColor: '#000000',
  fillColor: '#ffffff',
  opacity: 1,
  fontSize: 16,
  fontFamily: 'Arial',
  fontWeight: 'normal',
  textAlign: 'left',
  cornerRadius: 0,
  snapToGrid: false,
  gridSize: 20,
  snapToObjects: true,
  snapTolerance: 10,
};

/**
 * Tools slice state interface
 */
export interface ToolsSlice {
  // State
  activeTool: ToolType;
  toolSettings: ToolSettings;
  isDrawing: boolean; // True when actively creating a shape

  // Actions - Tool selection
  setActiveTool: (tool: ToolType) => void;
  resetToSelectTool: () => void;

  // Actions - Tool settings
  updateToolSettings: (updates: Partial<ToolSettings>) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setFontWeight: (weight: 'normal' | 'bold') => void;
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  resetToolSettings: () => void;

  // Actions - Snap settings
  toggleSnapToGrid: () => void;
  toggleSnapToObjects: () => void;
  setGridSize: (size: number) => void;
  setSnapTolerance: (tolerance: number) => void;

  // Actions - Drawing state
  setIsDrawing: (isDrawing: boolean) => void;

  // Utilities
  getActiveTool: () => ToolType;
  getToolSettings: () => ToolSettings;
  isSelectTool: () => boolean;
  isDrawingTool: () => boolean;
}

/**
 * Create tools slice
 *
 * Manages active tool selection and tool-specific settings
 */
export const createToolsSlice: StateCreator<
  PaperboxStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  ToolsSlice
> = (set, get) => ({
  // Initial state
  activeTool: 'select',
  toolSettings: DEFAULT_TOOL_SETTINGS,
  isDrawing: false,

  // Tool selection actions

  /**
   * Set active tool
   */
  setActiveTool: (tool: ToolType) =>
    set(
      (state) => {
        state.activeTool = tool;

        // Reset drawing state when switching tools
        state.isDrawing = false;
      },
      undefined,
      'tools/setActiveTool',
    ),

  /**
   * Reset to select tool
   */
  resetToSelectTool: () =>
    set(
      (state) => {
        state.activeTool = 'select';
        state.isDrawing = false;
      },
      undefined,
      'tools/resetToSelectTool',
    ),

  // Tool settings actions

  /**
   * Update multiple tool settings at once
   */
  updateToolSettings: (updates: Partial<ToolSettings>) =>
    set(
      (state) => {
        state.toolSettings = { ...state.toolSettings, ...updates };
      },
      undefined,
      'tools/updateToolSettings',
    ),

  /**
   * Set stroke width
   */
  setStrokeWidth: (width: number) =>
    set(
      (state) => {
        state.toolSettings.strokeWidth = Math.max(0, width);
      },
      undefined,
      'tools/setStrokeWidth',
    ),

  /**
   * Set stroke color
   */
  setStrokeColor: (color: string) =>
    set(
      (state) => {
        state.toolSettings.strokeColor = color;
      },
      undefined,
      'tools/setStrokeColor',
    ),

  /**
   * Set fill color
   */
  setFillColor: (color: string) =>
    set(
      (state) => {
        state.toolSettings.fillColor = color;
      },
      undefined,
      'tools/setFillColor',
    ),

  /**
   * Set opacity
   */
  setOpacity: (opacity: number) =>
    set(
      (state) => {
        state.toolSettings.opacity = Math.max(0, Math.min(1, opacity));
      },
      undefined,
      'tools/setOpacity',
    ),

  /**
   * Set font size
   */
  setFontSize: (size: number) =>
    set(
      (state) => {
        state.toolSettings.fontSize = Math.max(1, size);
      },
      undefined,
      'tools/setFontSize',
    ),

  /**
   * Set font family
   */
  setFontFamily: (family: string) =>
    set(
      (state) => {
        state.toolSettings.fontFamily = family;
      },
      undefined,
      'tools/setFontFamily',
    ),

  /**
   * Set font weight
   */
  setFontWeight: (weight: 'normal' | 'bold') =>
    set(
      (state) => {
        state.toolSettings.fontWeight = weight;
      },
      undefined,
      'tools/setFontWeight',
    ),

  /**
   * Set text alignment
   */
  setTextAlign: (align: 'left' | 'center' | 'right') =>
    set(
      (state) => {
        state.toolSettings.textAlign = align;
      },
      undefined,
      'tools/setTextAlign',
    ),

  /**
   * Reset tool settings to defaults
   */
  resetToolSettings: () =>
    set(
      (state) => {
        state.toolSettings = DEFAULT_TOOL_SETTINGS;
      },
      undefined,
      'tools/resetToolSettings',
    ),

  // Snap settings actions

  /**
   * Toggle snap to grid
   */
  toggleSnapToGrid: () =>
    set(
      (state) => {
        state.toolSettings.snapToGrid = !state.toolSettings.snapToGrid;
      },
      undefined,
      'tools/toggleSnapToGrid',
    ),

  /**
   * Toggle snap to objects
   */
  toggleSnapToObjects: () =>
    set(
      (state) => {
        state.toolSettings.snapToObjects = !state.toolSettings.snapToObjects;
      },
      undefined,
      'tools/toggleSnapToObjects',
    ),

  /**
   * Set grid size
   */
  setGridSize: (size: number) =>
    set(
      (state) => {
        state.toolSettings.gridSize = Math.max(1, size);
      },
      undefined,
      'tools/setGridSize',
    ),

  /**
   * Set snap tolerance
   */
  setSnapTolerance: (tolerance: number) =>
    set(
      (state) => {
        state.toolSettings.snapTolerance = Math.max(0, tolerance);
      },
      undefined,
      'tools/setSnapTolerance',
    ),

  // Drawing state actions

  /**
   * Set drawing state
   */
  setIsDrawing: (isDrawing: boolean) =>
    set(
      (state) => {
        state.isDrawing = isDrawing;
      },
      undefined,
      'tools/setIsDrawing',
    ),

  // Utility functions

  /**
   * Get active tool
   */
  getActiveTool: () => {
    return get().activeTool;
  },

  /**
   * Get tool settings
   */
  getToolSettings: () => {
    return get().toolSettings;
  },

  /**
   * Check if select tool is active
   */
  isSelectTool: () => {
    return get().activeTool === 'select';
  },

  /**
   * Check if a drawing tool is active
   */
  isDrawingTool: () => {
    const tool = get().activeTool;
    return tool === 'rectangle' || tool === 'circle' || tool === 'text';
  },
});
