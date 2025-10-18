/**
 * Canvas object types and interfaces
 * Updated for hybrid schema with JSONB properties
 * 
 * Note: JSONB property types use `any` for maximum flexibility
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ShapeType = 'rectangle' | 'circle' | 'text';

export type ToolMode = 'select' | 'hand';

/**
 * Canvas workspace metadata
 * Each canvas is an isolated design workspace (Figma-style multi-canvas architecture)
 */
export interface Canvas {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Base properties all shapes share
 * These are stored as columns for fast indexed queries
 */
export interface BaseCanvasObject {
  id: string;
  type: ShapeType;

  // Canvas scoping (multi-canvas architecture)
  canvas_id: string;

  // Core geometry (always present)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;

  // Hierarchy & organization
  group_id: string | null;
  z_index: number;
  
  // Common styles (indexed for queries)
  fill: string;
  stroke: string | null;
  stroke_width: number | null;
  opacity: number;
  
  // Flexible properties (JSONB)
  type_properties: Record<string, any>;
  style_properties: Record<string, any>;
  metadata: Record<string, any>;
  
  // Collaboration metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  locked_by: string | null;
  lock_acquired_at: string | null;
}

/**
 * Type-specific properties for each shape
 * These are stored in the type_properties JSONB column
 */
export interface RectangleTypeProperties {
  corner_radius?: number;
}

export interface CircleTypeProperties {
  radius: number;
}

export interface TextTypeProperties {
  text_content: string;
  font_size: number;
  font_family?: string;
  font_weight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  font_style?: 'normal' | 'italic';
  text_align?: 'left' | 'center' | 'right' | 'justify';
  line_height?: number;
  letter_spacing?: number;
}

/**
 * Style extensions that can apply to any shape
 * These are stored in the style_properties JSONB column
 */
export interface StyleExtensions {
  shadow_blur?: number;
  shadow_offset_x?: number;
  shadow_offset_y?: number;
  shadow_color?: string;
  gradient_type?: 'linear' | 'radial';
  gradient_stops?: Array<{ color: string; offset: number }>;
}

/**
 * AI/Agent metadata
 * These are stored in the metadata JSONB column
 */
export interface ObjectMetadata {
  ai_generated?: boolean;
  ai_prompt?: string;
  ai_confidence?: number;
  ai_model?: string;
  [key: string]: any; // Allow arbitrary keys
}

/**
 * Typed shape objects (discriminated union)
 */
export interface RectangleObject extends BaseCanvasObject {
  type: 'rectangle';
  type_properties: RectangleTypeProperties;
}

export interface CircleObject extends BaseCanvasObject {
  type: 'circle';
  type_properties: CircleTypeProperties;
}

export interface TextObject extends BaseCanvasObject {
  type: 'text';
  type_properties: TextTypeProperties;
}

export type CanvasObject = RectangleObject | CircleObject | TextObject;

/**
 * Canvas group for hierarchical organization
 */
export interface CanvasGroup {
  id: string;
  name: string;
  parent_group_id: string | null;
  locked: boolean;
  z_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Multi-selection state
 */
export interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
}

/**
 * Shape defaults (for creation)
 */
export interface ShapeDefaults {
  rectangle: {
    width: number;
    height: number;
    fill: string;
  };
  circle: {
    radius: number;
    fill: string;
  };
  text: {
    textContent: string;
    fontSize: number;
    fill: string;
  };
}

/**
 * Object filter for queries
 */
export interface ObjectFilter {
  type?: ShapeType;
  group_id?: string | null;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fill?: string;
  metadata?: Record<string, any>;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  success: boolean;
  affectedIds: string[];
  error?: string;
}
