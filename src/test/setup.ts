/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Fabric.js Canvas for testing environment
// Fabric.js requires browser Canvas API which jsdom doesn't fully support
vi.mock('fabric', () => {
  class MockCanvas {
    private _width: number;
    private _height: number;
    public backgroundColor: string;
    public selection: boolean;
    public preserveObjectStacking: boolean;
    public enableRetinaScaling: boolean;
    public renderOnAddRemove: boolean;
    private objects: any[] = [];
    private eventHandlers: Map<string, Function[]> = new Map();

    constructor(_element: HTMLCanvasElement | string, config: any = {}) {
      this._width = config.width || 800;
      this._height = config.height || 600;
      this.backgroundColor = config.backgroundColor || '#ffffff';
      this.selection = config.selection !== false;
      this.preserveObjectStacking = config.preserveObjectStacking || false;
      this.enableRetinaScaling = config.enableRetinaScaling || false;
      this.renderOnAddRemove = config.renderOnAddRemove !== false;
    }

    getWidth() { return this._width; }
    getHeight() { return this._height; }
    setWidth(width: number) { this._width = width; }
    setHeight(height: number) { this._height = height; }
    add(...objs: any[]) { this.objects.push(...objs); }
    remove(...objs: any[]) {
      this.objects = this.objects.filter(o => !objs.includes(o));
    }
    clear() {
      this.objects = [];
      this.backgroundColor = '#ffffff';
    }
    getObjects() { return this.objects; }
    getActiveObjects() { return []; }
    discardActiveObject() {}
    requestRenderAll() {}
    dispose() {}

    on(event: string, handler: Function) {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, []);
      }
      this.eventHandlers.get(event)!.push(handler);
    }

    off(event: string, handler: Function) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    }

    fire(event: string, eventData: any) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.forEach(handler => handler(eventData));
      }
    }
  }

  class MockRect {
    public type = 'rect';
    public left: number;
    public top: number;
    public width: number;
    public height: number;
    public fill: string;
    public stroke?: string;
    public strokeWidth?: number;
    public angle?: number;
    public opacity?: number;
    public data?: any;
    public rx?: number;
    public ry?: number;

    constructor(config: any = {}) {
      this.left = config.left || 0;
      this.top = config.top || 0;
      this.width = config.width || 100;
      this.height = config.height || 100;
      this.fill = config.fill || '#000000';
      this.stroke = config.stroke;
      this.strokeWidth = config.strokeWidth;
      this.angle = config.angle;
      this.opacity = config.opacity;
      this.data = config.data;
      this.rx = config.rx;
      this.ry = config.ry;
    }
  }

  class MockCircle {
    public type = 'circle';
    public left: number;
    public top: number;
    public radius: number;
    public fill: string;
    public stroke?: string;
    public strokeWidth?: number;
    public angle?: number;
    public opacity?: number;
    public data?: any;

    constructor(config: any = {}) {
      this.left = config.left || 0;
      this.top = config.top || 0;
      this.radius = config.radius || 50;
      this.fill = config.fill || '#000000';
      this.stroke = config.stroke;
      this.strokeWidth = config.strokeWidth;
      this.angle = config.angle;
      this.opacity = config.opacity;
      this.data = config.data;
    }
  }

  class MockTextbox {
    public type = 'textbox';
    public left: number;
    public top: number;
    public width: number;
    public text: string;
    public fontSize: number;
    public fontFamily: string;
    public fontWeight: string;
    public fontStyle: string;
    public textAlign: string;
    public fill: string;
    public stroke?: string;
    public strokeWidth?: number;
    public angle?: number;
    public opacity?: number;
    public data?: any;

    constructor(text: string, config: any = {}) {
      this.text = text;
      this.left = config.left || 0;
      this.top = config.top || 0;
      this.width = config.width || 200;
      this.fontSize = config.fontSize || 16;
      this.fontFamily = config.fontFamily || 'Arial';
      this.fontWeight = config.fontWeight || 'normal';
      this.fontStyle = config.fontStyle || 'normal';
      this.textAlign = config.textAlign || 'left';
      this.fill = config.fill || '#000000';
      this.stroke = config.stroke;
      this.strokeWidth = config.strokeWidth;
      this.angle = config.angle;
      this.opacity = config.opacity;
      this.data = config.data;
    }
  }

  return {
    Canvas: MockCanvas,
    Rect: MockRect,
    Circle: MockCircle,
    Textbox: MockTextbox,
  };
});

