/**
 * LayersPanel - Left sidebar panel for layer management
 * W4.D3: Layers Panel with Kibo Tree integration ✅ COMPLETE
 *
 * Features:
 * - Hierarchical layer list with Kibo Tree ✅
 * - Visibility toggle per layer ✅
 * - Lock/unlock toggle per layer ✅
 * - Layer renaming via double-click ✅ W4.D3.7-8
 * - Z-index reordering via drag-drop ✅ W4.D3.4-6
 * - Layer selection synced with canvas ✅
 * - Context menu operations ✅ W4.D3.9-10
 *   - Z-index controls (bring to front, send to back, move forward/backward)
 *   - Duplicate layer (TODO: needs userId integration)
 *   - Delete layer
 */

import { usePaperboxStore } from '@/stores';
import { 
  TreeProvider, 
  TreeView,
  TreeNode, 
  TreeNodeTrigger,
  TreeExpander,
  TreeIcon,
  TreeLabel
} from '@/components/kibo-ui/tree';
import { Eye, EyeOff, Lock, Unlock, Copy, Trash2, MoveUp, MoveDown, ArrowUpToLine, ArrowDownToLine, Circle, Square, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

export function LayersPanel() {
  // Subscribe to full objects state
  const objects = usePaperboxStore((state) => state.objects);
  const layers = usePaperboxStore((state) => state.layers);
  const layerOrder = usePaperboxStore((state) => state.layerOrder);
  const selectedIds = usePaperboxStore((state) => state.selectedIds);
  const selectObjects = usePaperboxStore((state) => state.selectObjects);
  const toggleLayerVisibility = usePaperboxStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = usePaperboxStore((state) => state.toggleLayerLock);
  const setZIndex = usePaperboxStore((state) => state.setZIndex);
  const renameLayer = usePaperboxStore((state) => state.renameLayer);
  const moveToFront = usePaperboxStore((state) => state.moveToFront);
  const moveToBack = usePaperboxStore((state) => state.moveToBack);
  const moveUp = usePaperboxStore((state) => state.moveUp);
  const moveDown = usePaperboxStore((state) => state.moveDown);
  const deleteObjects = usePaperboxStore((state) => state.deleteObjects);

  // Drag-drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Drag-drop handlers
  const handleDragStart = (e: React.DragEvent, objectId: string) => {
    setDraggedId(objectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', objectId);
  };

  const handleDragOver = (e: React.DragEvent, objectId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedId || draggedId === objectId) return;
    
    // Calculate if cursor is in top or bottom half of item
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isTopHalf = e.clientY < midpoint;
    
    setDropTargetId(objectId);
    setDropPosition(isTopHalf ? 'before' : 'after');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the entire item, not child elements
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !(e.currentTarget as HTMLElement).contains(relatedTarget)) {
      setDropTargetId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId || !dropPosition) {
      setDraggedId(null);
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    // Work with display order (top-to-bottom, reversed from layerOrder)
    const displayOrder = [...layerOrder].reverse();
    const draggedIdx = displayOrder.indexOf(draggedId);
    const targetIdx = displayOrder.indexOf(targetId);
    
    // Calculate insertion index
    let insertIdx = targetIdx;
    if (dropPosition === 'after') {
      insertIdx = targetIdx + 1;
    }
    
    // Adjust if dragging from above (item will shift down)
    if (draggedIdx < insertIdx) {
      insertIdx -= 1;
    }
    
    // Convert display index back to layerOrder index (bottom-to-top)
    const newZIndex = layerOrder.length - 1 - insertIdx;
    
    console.log('[LayersPanel] Drop:', {
      draggedId,
      targetId,
      dropPosition,
      draggedIdx,
      targetIdx,
      insertIdx,
      newZIndex,
    });
    
    setZIndex(draggedId, newZIndex);
    
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  // Rename handlers
  const handleDoubleClick = (objectId: string, currentName: string) => {
    setEditingId(objectId);
    setEditingName(currentName);
  };

  const handleRenameSubmit = (objectId: string) => {
    if (editingName.trim()) {
      renameLayer(objectId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, objectId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(objectId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Context menu handlers
  const handleDuplicate = (objectId: string) => {
    // PERFORMANCE OPTIMIZATION: Get full object from store directly (not subscription)
    // This avoids subscribing to all object updates when we only need it once
    const object = usePaperboxStore.getState().objects[objectId];
    if (!object) return;

    // Create duplicated object with slight offset
    const duplicatedObject = {
      ...object,
      id: crypto.randomUUID(),
      x: object.x + 20,
      y: object.y + 20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Note: This would need the createObject action with userId
    // For now, just log the intent
    console.log('[LayersPanel] Duplicate layer:', duplicatedObject);
    // TODO: Implement with createObject(duplicatedObject, userId)
  };

  const handleDelete = (objectId: string) => {
    deleteObjects([objectId]);
  };

  // Get icon for object type
  const getObjectIcon = (type: string) => {
    switch (type) {
      case 'circle':
        return <Circle className="h-4 w-4" />;
      case 'rectangle':
        return <Square className="h-4 w-4" />;
      case 'text':
        return <Type className="h-4 w-4" />;
      default:
        return null;
    }
  };

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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Fixed Header - Always visible */}
      <div className="flex-shrink-0 px-3 py-3 pb-2 border-b border-border">
        <h3 className="font-semibold text-sm">Layers</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {layerNodes.length} {layerNodes.length === 1 ? 'layer' : 'layers'}
        </p>
      </div>

      {/* Scrollable Body - items extend to edges */}
      <div className="flex-1 overflow-y-auto">
        <TreeProvider
          selectedIds={selectedIds}
          onSelectionChange={(ids) => {
            if (ids.length > 0) {
              selectObjects(ids);
            }
          }}
          selectable={true}
          multiSelect={false}
          showLines={false}
          showIcons={true}
          indent={12}
        >
          <TreeView>
            {layerNodes.map((node, index) => (
              <div key={node!.id} className="relative">
                {/* Top insertion line - shows when dropping BEFORE this item */}
                {dropTargetId === node!.id && 
                 dropPosition === 'before' && 
                 draggedId !== node!.id && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-10 pointer-events-none" />
                )}
                
                <div
                  draggable={!node!.locked}
                  onDragStart={(e) => handleDragStart(e, node!.id)}
                  onDragOver={(e) => handleDragOver(e, node!.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, node!.id)}
                  onDragEnd={handleDragEnd}
                >
                  <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <TreeNode
                      nodeId={node!.id}
                      isLast={index === layerNodes.length - 1}
                    >
                      <TreeNodeTrigger
                        className={cn(
                          'group relative',
                          !node!.locked && 'cursor-move',
                          node!.locked && 'cursor-not-allowed opacity-60',
                          draggedId === node!.id && 'opacity-40'
                        )}
                      >
                        {/* No expander for flat list (no children) */}
                        <TreeExpander />
                        
                        {/* Object Type Icon */}
                        <TreeIcon icon={getObjectIcon(node!.type)} />
                        
                        {/* Layer Name - Editable on double-click */}
                        {editingId === node!.id ? (
                          <Input
                            ref={inputRef}
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleRenameSubmit(node!.id)}
                            onKeyDown={(e) => handleRenameKeyDown(e, node!.id)}
                            className="h-6 px-1 py-0 text-sm flex-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <TreeLabel
                            className="flex-1"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleDoubleClick(node!.id, node!.name);
                            }}
                          >
                            {node!.name}
                          </TreeLabel>
                        )}

                        {/* Visibility Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
                          className="h-6 w-6 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      </TreeNodeTrigger>
                    </TreeNode>
                  </ContextMenuTrigger>

                  {/* Context Menu */}
                  <ContextMenuContent className="w-48">
                    {/* Z-index operations */}
                    <ContextMenuItem
                      onClick={() => moveToFront(node!.id)}
                      disabled={node!.locked}
                    >
                      <ArrowUpToLine className="mr-2 h-4 w-4" />
                      Bring to Front
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => moveToBack(node!.id)}
                      disabled={node!.locked}
                    >
                      <ArrowDownToLine className="mr-2 h-4 w-4" />
                      Send to Back
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => moveUp(node!.id)}
                      disabled={node!.locked}
                    >
                      <MoveUp className="mr-2 h-4 w-4" />
                      Move Forward
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => moveDown(node!.id)}
                      disabled={node!.locked}
                    >
                      <MoveDown className="mr-2 h-4 w-4" />
                      Move Backward
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    {/* Object operations */}
                    <ContextMenuItem
                      onClick={() => handleDuplicate(node!.id)}
                      disabled={node!.locked}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleDelete(node!.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                </div>
                
                {/* Bottom insertion line - shows when dropping AFTER this item */}
                {dropTargetId === node!.id && 
                 dropPosition === 'after' && 
                 draggedId !== node!.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10 pointer-events-none" />
                )}
              </div>
            ))}
          </TreeView>
        </TreeProvider>
      </div>
    </div>
  );
}
