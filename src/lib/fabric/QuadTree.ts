/**
 * QuadTree Data Structure for Spatial Indexing
 * 
 * PERFORMANCE OPTIMIZATION #6: Spatial indexing for efficient object lookup
 * 
 * QuadTree provides O(log n) spatial queries instead of O(n) linear search.
 * Essential for performance with 500+ objects on canvas.
 * 
 * Use cases:
 * - Viewport culling (which objects are visible?)
 * - Collision detection
 * - Proximity queries
 * - Spatial partitioning
 * 
 * References:
 * - https://en.wikipedia.org/wiki/Quadtree
 * - http://gamedevelopment.tutsplus.com/tutorials/quick-tip-use-quadtrees-to-detect-likely-collisions-in-2d-space--gamedev-374
 */

/**
 * Rectangle bounds for QuadTree regions and object bounding boxes
 */
export interface Bounds {
  x: number;      // Left edge
  y: number;      // Top edge
  width: number;  // Width
  height: number; // Height
}

/**
 * Object stored in QuadTree with ID and spatial bounds
 */
export interface QuadTreeObject {
  id: string;
  bounds: Bounds;
}

/**
 * QuadTree node configuration
 */
interface QuadTreeConfig {
  bounds: Bounds;
  maxObjects?: number;  // Max objects per node before subdivision (default: 10)
  maxLevels?: number;   // Max tree depth to prevent infinite recursion (default: 5)
  level?: number;       // Current depth level (internal)
}

/**
 * QuadTree implementation for efficient spatial indexing
 * 
 * Each node can contain objects or be subdivided into 4 child quadrants:
 * - Top-left (NW)
 * - Top-right (NE)
 * - Bottom-left (SW)
 * - Bottom-right (SE)
 */
export class QuadTree {
  private bounds: Bounds;
  private maxObjects: number;
  private maxLevels: number;
  private level: number;
  
  private objects: QuadTreeObject[] = [];
  private children: QuadTree[] | null = null;

  constructor(config: QuadTreeConfig) {
    this.bounds = config.bounds;
    this.maxObjects = config.maxObjects ?? 10;
    this.maxLevels = config.maxLevels ?? 5;
    this.level = config.level ?? 0;
  }

  /**
   * Clear all objects from the QuadTree
   */
  public clear(): void {
    this.objects = [];
    this.children = null;
  }

  /**
   * Subdivide this node into 4 child quadrants
   * Called automatically when maxObjects threshold is exceeded
   */
  private subdivide(): void {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const nextLevel = this.level + 1;

    // Create 4 child quadrants
    this.children = [
      // Top-left (NW)
      new QuadTree({
        bounds: { x, y, width: halfWidth, height: halfHeight },
        maxObjects: this.maxObjects,
        maxLevels: this.maxLevels,
        level: nextLevel,
      }),
      // Top-right (NE)
      new QuadTree({
        bounds: { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        maxObjects: this.maxObjects,
        maxLevels: this.maxLevels,
        level: nextLevel,
      }),
      // Bottom-left (SW)
      new QuadTree({
        bounds: { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        maxObjects: this.maxObjects,
        maxLevels: this.maxLevels,
        level: nextLevel,
      }),
      // Bottom-right (SE)
      new QuadTree({
        bounds: { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
        maxObjects: this.maxObjects,
        maxLevels: this.maxLevels,
        level: nextLevel,
      }),
    ];

    // Redistribute existing objects to children
    for (const obj of this.objects) {
      this.insertIntoChildren(obj);
    }

    // Clear objects from parent after redistribution
    this.objects = [];
  }

  /**
   * Determine which child quadrants an object belongs to
   * Returns array of quadrant indices (0-3)
   */
  private getQuadrants(objBounds: Bounds): number[] {
    const { x, y, width, height } = this.bounds;
    const midX = x + width / 2;
    const midY = y + height / 2;

    const quadrants: number[] = [];

    const objLeft = objBounds.x;
    const objRight = objBounds.x + objBounds.width;
    const objTop = objBounds.y;
    const objBottom = objBounds.y + objBounds.height;

    // Top-left (0)
    if (objLeft < midX && objTop < midY) {
      quadrants.push(0);
    }
    // Top-right (1)
    if (objRight > midX && objTop < midY) {
      quadrants.push(1);
    }
    // Bottom-left (2)
    if (objLeft < midX && objBottom > midY) {
      quadrants.push(2);
    }
    // Bottom-right (3)
    if (objRight > midX && objBottom > midY) {
      quadrants.push(3);
    }

    return quadrants;
  }

  /**
   * Insert object into appropriate child quadrants
   */
  private insertIntoChildren(obj: QuadTreeObject): void {
    if (!this.children) return;

    const quadrants = this.getQuadrants(obj.bounds);
    for (const quadrant of quadrants) {
      this.children[quadrant].insert(obj);
    }
  }

  /**
   * Insert an object into the QuadTree
   * 
   * @param obj - Object to insert with id and bounds
   */
  public insert(obj: QuadTreeObject): void {
    // If object doesn't intersect this node's bounds, skip it
    if (!this.intersects(obj.bounds, this.bounds)) {
      return;
    }

    // If we have children, insert into children
    if (this.children) {
      this.insertIntoChildren(obj);
      return;
    }

    // Add to this node
    this.objects.push(obj);

    // Check if we need to subdivide
    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      this.subdivide();
    }
  }

  /**
   * Query all objects that intersect with given bounds
   * 
   * @param range - Bounds to query
   * @returns Array of objects that intersect the query bounds
   */
  public query(range: Bounds): QuadTreeObject[] {
    const results: QuadTreeObject[] = [];

    // If query doesn't intersect this node, return empty
    if (!this.intersects(range, this.bounds)) {
      return results;
    }

    // Add objects from this node that intersect query
    for (const obj of this.objects) {
      if (this.intersects(range, obj.bounds)) {
        results.push(obj);
      }
    }

    // If we have children, query them recursively
    if (this.children) {
      for (const child of this.children) {
        results.push(...child.query(range));
      }
    }

    return results;
  }

  /**
   * Check if two bounds intersect (overlap)
   * 
   * @param a - First bounds
   * @param b - Second bounds
   * @returns true if bounds overlap, false otherwise
   */
  private intersects(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }

  /**
   * Get total number of objects in this tree (including children)
   * Useful for debugging and stats
   */
  public getObjectCount(): number {
    let count = this.objects.length;

    if (this.children) {
      for (const child of this.children) {
        count += child.getObjectCount();
      }
    }

    return count;
  }

  /**
   * Get tree depth (max level of any node)
   * Useful for debugging and performance analysis
   */
  public getDepth(): number {
    if (!this.children) {
      return this.level;
    }

    let maxDepth = this.level;
    for (const child of this.children) {
      const childDepth = child.getDepth();
      if (childDepth > maxDepth) {
        maxDepth = childDepth;
      }
    }

    return maxDepth;
  }
}

