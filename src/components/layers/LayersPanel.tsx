/**
 * LayersPanel - Left sidebar panel for layer management
 * W4.D3: Layers Panel with Kibo Tree integration
 *
 * Features:
 * - Hierarchical layer list with Kibo Tree
 * - Visibility toggle per layer
 * - Lock/unlock toggle per layer
 * - Layer renaming (double-click)
 * - Z-index reordering (drag-drop in future)
 * - Layer selection synced with canvas
 */

import { usePaperboxStore } from '@/stores';
import { TreeProvider, TreeNode } from '@/components/kibo-ui/tree';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LayersPanel() {
  // Split selectors to avoid creating new objects on every render
  const objects = usePaperboxStore((state) => state.objects);
  const layers = usePaperboxStore((state) => state.layers);
  const layerOrder = usePaperboxStore((state) => state.layerOrder);
  const selectedIds = usePaperboxStore((state) => state.selectedIds);
  const selectObject = usePaperboxStore((state) => state.selectObject);
  const toggleLayerVisibility = usePaperboxStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = usePaperboxStore((state) => state.toggleLayerLock);

  // Create layer nodes from objects (reversed for top-to-bottom display)
  const layerNodes = [...layerOrder].reverse().map((objectId) => {
    const object = objects[objectId];
    const layerMeta = layers[objectId];

    if (!object) return null;

    const displayName = layerMeta?.name || `${object.type} ${objectId.slice(0, 6)}`;

    return {
      id: objectId,
      name: displayName,
      type: object.type,
      visible: layerMeta?.visible ?? true,
      locked: layerMeta?.locked ?? false,
      isSelected: selectedIds.includes(objectId),
    };
  }).filter(Boolean);

  if (layerNodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          <p className="text-sm font-medium">No layers yet</p>
          <p className="text-xs mt-1">
            Create objects on the canvas to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3">
        {/* Header */}
        <div className="mb-3 pb-2 border-b border-border">
          <h3 className="font-semibold text-sm">Layers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {layerNodes.length} {layerNodes.length === 1 ? 'layer' : 'layers'}
          </p>
        </div>

        {/* Layer List */}
        <TreeProvider
          selectedIds={selectedIds}
          onSelectionChange={(ids) => {
            if (ids.length > 0) {
              selectObject(ids[0]); // Single selection for now
            }
          }}
          selectable={true}
          multiSelect={false}
          showLines={false}
          showIcons={false}
          indent={12}
        >
          <div className="space-y-1">
            {layerNodes.map((node) => (
              <TreeNode
                key={node!.id}
                nodeId={node!.id}
                className={cn(
                  'group flex items-center gap-2 px-2 py-1.5 rounded text-sm',
                  'hover:bg-accent transition-colors cursor-pointer',
                  node!.isSelected && 'bg-accent ring-1 ring-ring'
                )}
              >
                {/* Layer Type Icon */}
                <span className="text-xs opacity-70 flex-shrink-0 w-12">
                  {node!.type === 'rectangle' && '▭'}
                  {node!.type === 'circle' && '●'}
                  {node!.type === 'text' && 'T'}
                </span>

                {/* Layer Name */}
                <span className="flex-1 truncate">{node!.name}</span>

                {/* Visibility Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(node!.id);
                  }}
                  aria-label={node!.visible ? 'Hide layer' : 'Show layer'}
                >
                  {node!.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3 opacity-50" />
                  )}
                </Button>

                {/* Lock Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(node!.id);
                  }}
                  aria-label={node!.locked ? 'Unlock layer' : 'Lock layer'}
                >
                  {node!.locked ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Unlock className="h-3 w-3 opacity-50" />
                  )}
                </Button>
              </TreeNode>
            ))}
          </div>
        </TreeProvider>
      </div>
    </div>
  );
}
