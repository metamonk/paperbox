/**
 * LeftSidebar - Combined Canvases and Layers panels
 * Figma-style left sidebar layout
 */

import { PagesPanel } from './PagesPanel';
import { LayersPanel } from '../layers/LayersPanel';
import { Separator } from '@/components/ui/separator';

export function LeftSidebar() {
  return (
    <div className="flex flex-col h-full">
      {/* Canvases Panel - Top section */}
      <div className="flex-shrink-0">
        <PagesPanel />
      </div>

      {/* Separator */}
      <Separator />

      {/* Layers Panel - Bottom section (flexible) */}
      <div className="flex-1 min-h-0">
        <LayersPanel />
      </div>
    </div>
  );
}

