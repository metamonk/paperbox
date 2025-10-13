/**
 * Canvas object types and interfaces
 */

export type ShapeType = 'rectangle' | 'circle' | 'text';

export interface BaseCanvasObject {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  fill: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  locked_by: string | null;
  lock_acquired_at: string | null;
}

export interface RectangleObject extends BaseCanvasObject {
  type: 'rectangle';
  width: number;
  height: number;
}

export interface CircleObject extends BaseCanvasObject {
  type: 'circle';
  radius: number;
}

export interface TextObject extends BaseCanvasObject {
  type: 'text';
  text_content: string;
  font_size: number;
  width?: number;
  height?: number;
}

export type CanvasObject = RectangleObject | CircleObject | TextObject;

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

