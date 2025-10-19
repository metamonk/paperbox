/**
 * Minimap Component
 * 
 * Displays a mini-map in the bottom-left corner showing:
 * - Simplified view of all canvas objects
 * - Current viewport rectangle
 * - Interactive: click to jump, drag viewport to pan
 */

import { useEffect, useRef, useState } from 'react';
import { Point } from 'fabric';
import { usePaperboxStore } from '@/stores';
import type { FabricCanvasManager } from '@/lib/fabric/FabricCanvasManager';
import { cn } from '@/lib/utils';
import { centerToFabric } from '@/lib/fabric/coordinateTranslation';

interface MinimapProps {
  fabricManager: FabricCanvasManager | null;
}

const MINIMAP_SIZE = 150; // 150x150px
const CANVAS_SIZE = 8000; // Full canvas size (8000x8000)
const SCALE = MINIMAP_SIZE / CANVAS_SIZE; // Scale factor

export function Minimap({ fabricManager }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Get canvas objects and viewport from store
  // Use a stable selector with shallow comparison of object IDs and update timestamps
  const objectsMap = usePaperboxStore((state) => state.objects);
  
  // Convert to array for rendering and create a render key that changes when objects change
  // Using updated_at timestamps ensures we re-render when properties change
  const objects = Object.values(objectsMap);
  const renderKey = objects.map(obj => `${obj.id}-${obj.updated_at}`).join(',');

  /**
   * Render the minimap
   */
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get theme-aware colors dynamically
    const computedStyle = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.classList.contains('dark');
    
    // Helper to convert CSS color values to usable format
    const getCSSColor = (variable: string): string => {
      const value = computedStyle.getPropertyValue(variable).trim();
      if (value && (value.startsWith('oklch(') || value.startsWith('hsl(') || value.startsWith('var('))) {
        const temp = document.createElement('div');
        temp.style.color = value;
        document.body.appendChild(temp);
        const computed = getComputedStyle(temp).color;
        document.body.removeChild(temp);
        return computed;
      }
      return value;
    };
    
    // Invert colors: use light colors in dark mode, dark colors in light mode
    const bgColor = isDark ? getCSSColor('--muted') : getCSSColor('--sidebar');
    const borderColor = isDark ? getCSSColor('--border') : getCSSColor('--sidebar-border');

    // Clear canvas
    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw background with theme-aware color
    ctx.fillStyle = bgColor || (isDark ? '#e5e5e5' : '#1a1a1a');
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw border with theme-aware color
    ctx.strokeStyle = borderColor || (isDark ? '#d4d4d4' : '#404040');
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw objects (simplified view)
    objects.forEach((obj) => {
      ctx.save();

      // Translate center-origin (-4000 to +4000) to Fabric (0 to 8000)
      const fabricCoords = centerToFabric(obj.x, obj.y);
      
      // Scale Fabric coordinates to minimap
      const x = fabricCoords.x * SCALE;
      const y = fabricCoords.y * SCALE;
      const width = obj.width * SCALE;
      const height = obj.height * SCALE;

      // Apply rotation transform (rotation is in degrees)
      if (obj.rotation && obj.rotation !== 0) {
        // Move to object center, rotate, then offset to top-left
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((obj.rotation * Math.PI) / 180);
        ctx.translate(-width / 2, -height / 2);
      } else {
        // No rotation, just translate to position
        ctx.translate(x, y);
      }

      // Draw based on type (now at 0,0 due to translation)
      if (obj.type === 'rectangle') {
        ctx.fillStyle = obj.fill || '#3B82F6';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(0, 0, width, height);
        
        // Draw border
        ctx.globalAlpha = 1;
        ctx.strokeStyle = obj.stroke || '#60A5FA';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(0, 0, width, height);
      } else if (obj.type === 'circle') {
        const radius = (obj.type_properties.radius || 50) * SCALE;
        ctx.fillStyle = obj.fill || '#EF4444';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw border
        ctx.globalAlpha = 1;
        ctx.strokeStyle = obj.stroke || '#F87171';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else if (obj.type === 'text') {
        // Represent text as a small rectangle
        ctx.fillStyle = '#10B981';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(0, 0, width, height);
        
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(0, 0, width, height);
      }

      ctx.restore();
    });

    // Draw viewport rectangle (current view indicator)
    if (fabricManager) {
      const canvas = fabricManager.getCanvas();
      if (canvas) {
        const vpt = canvas.viewportTransform;
        if (!vpt) return;
        
        // Get actual viewport dimensions (visible area on screen)
        const canvasEl = canvas.getElement();
        const scrollContainer = canvasEl.parentElement;
        
        // Get viewport width/height in screen pixels
        const viewportWidthPx = scrollContainer?.clientWidth || 1920;
        const viewportHeightPx = scrollContainer?.clientHeight || 1080;
        
        // Convert viewport dimensions to canvas units (unzoom)
        // Use the actual zoom from viewport transform, not Zustand zoom
        const viewportWidthCanvas = viewportWidthPx / vpt[0];
        const viewportHeightCanvas = viewportHeightPx / vpt[3];
        
        // Get viewport position in Fabric canvas coordinates (0 to 8000)
        // The viewport transform matrix [a, b, c, d, e, f] where e=translateX, f=translateY
        // To get canvas position from screen (0, 0): apply inverse transform
        // For screen point (0, 0), canvas coordinates are: x = -vpt[4]/zoom, y = -vpt[5]/zoom
        const fabricX = -vpt[4] / vpt[0]; // vpt[0] is the zoom scale
        const fabricY = -vpt[5] / vpt[3]; // vpt[3] is the zoom scale
        
        // Scale to minimap coordinates (0 to 150)
        const vpX = fabricX * SCALE;
        const vpY = fabricY * SCALE;
        const vpW = viewportWidthCanvas * SCALE;
        const vpH = viewportHeightCanvas * SCALE;
        
        // Draw viewport rectangle
        ctx.strokeStyle = '#60A5FA';
        ctx.lineWidth = 2;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
        
        // Fill with semi-transparent overlay
        ctx.fillStyle = 'rgba(96, 165, 250, 0.1)';
        ctx.fillRect(vpX, vpY, vpW, vpH);
      }
    }
  }, [renderKey, fabricManager, objects]);

  /**
   * Handle click/drag to navigate
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!fabricManager) return;
    setIsDragging(true);
    handleNavigation(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handleNavigation(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNavigation = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!fabricManager || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const minimapX = e.clientX - rect.left;
    const minimapY = e.clientY - rect.top;

    // Convert minimap coordinates to canvas coordinates
    const canvasX = minimapX / SCALE;
    const canvasY = minimapY / SCALE;

    // Get viewport dimensions
    const canvas = fabricManager.getCanvas();
    if (!canvas) return;

    const vpt = canvas.viewportTransform;
    if (!vpt) return;

    const canvasEl = canvas.getElement();
    // CRITICAL FIX: Get actual visible viewport from scroll container, not full canvas size
    const scrollContainer = canvasEl.parentElement;
    const viewportWidth = scrollContainer ? scrollContainer.clientWidth / vpt[0] : 1920 / vpt[0];
    const viewportHeight = scrollContainer ? scrollContainer.clientHeight / vpt[3] : 1080 / vpt[3];

    // Center viewport on clicked position
    const newScrollX = canvasX - viewportWidth / 2;
    const newScrollY = canvasY - viewportHeight / 2;

    // Update pan (convert scroll position to pan coordinates)
    const newPanX = -newScrollX * vpt[0];
    const newPanY = -newScrollY * vpt[3];

    // Apply pan using Fabric.js absolutePan method
    canvas.absolutePan(new Point(newPanX, newPanY));
    canvas.requestRenderAll();
  };

  if (!fabricManager) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-50', // Fixed positioning relative to viewport
        'bg-background/95 backdrop-blur-sm',
        'border-2 border-border rounded-lg shadow-xl',
        'flex items-center justify-center', // Center the canvas
        'pointer-events-auto' // Ensure minimap receives mouse events
      )}
      style={{
        padding: '8px', // Explicit equal padding on all sides
        width: `${MINIMAP_SIZE + 16}px`, // 150 + 16 (8*2 padding)
        height: `${MINIMAP_SIZE + 16}px`
      }}
    >
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        className="cursor-pointer rounded-md block" // Block display with border radius
        style={{ 
          width: `${MINIMAP_SIZE}px`, 
          height: `${MINIMAP_SIZE}px`,
          display: 'block',
          margin: 0,
          padding: 0
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}

