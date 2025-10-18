/**
 * PropertyPanel - Right sidebar panel for object properties
 * W4.D2: Property Panels implementation with shadcn components
 *
 * Features:
 * - Collapsible sections for different property groups
 * - Real-time property updates
 * - Color picker integration
 * - Slider controls for opacity, size, spacing
 */

import { usePaperboxStore } from '@/stores';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { ColorProperty } from './ColorProperty';
import { PositionProperty } from './PositionProperty';
import { SizeProperty } from './SizeProperty';

export function PropertyPanel() {
  // Split selectors to avoid creating new objects on every render
  const activeObjectId = usePaperboxStore((state) => state.activeObjectId);
  const objects = usePaperboxStore((state) => state.objects);
  const updateObject = usePaperboxStore((state) => state.updateObject);

  // Get active object
  const activeObject = activeObjectId
    ? objects[activeObjectId]
    : null;

  // Collapsible section states
  const [positionOpen, setPositionOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);
  const [styleOpen, setStyleOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (!activeObject) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          <p className="text-sm font-medium">No object selected</p>
          <p className="text-xs mt-1">
            Select an object on the canvas to edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      onMouseDown={(e) => {
        // W4.D4 CRITICAL FIX: Prevent Fabric.js from detecting PropertyPanel clicks as "outside canvas"
        // Fabric.js v6 listens to document mousedown and clears selection when clicking outside canvas
        // Stopping propagation prevents the event from reaching Fabric's document listener
        e.stopPropagation();
      }}
    >
      <div className="p-4 space-y-4">
        {/* Object Info Header */}
        <div className="pb-3 border-b border-border">
          <h3 className="font-semibold text-sm capitalize">
            {activeObject.type}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeObject.id.slice(0, 8)}...
          </p>
        </div>

        {/* Position & Rotation */}
        <Collapsible open={positionOpen} onOpenChange={setPositionOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto font-medium text-sm"
            >
              Position & Rotation
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  positionOpen ? 'transform rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <PositionProperty object={activeObject} />
          </CollapsibleContent>
        </Collapsible>

        {/* Size */}
        <Collapsible open={sizeOpen} onOpenChange={setSizeOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto font-medium text-sm"
            >
              Size
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  sizeOpen ? 'transform rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <SizeProperty object={activeObject} />
          </CollapsibleContent>
        </Collapsible>

        {/* Style */}
        <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto font-medium text-sm"
            >
              Style
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  styleOpen ? 'transform rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-4">
            {/* Fill Color */}
            <ColorProperty
              label="Fill"
              value={activeObject.fill}
              onChange={(color) => {
                updateObject(activeObject.id, { fill: color });
              }}
            />

            {/* Stroke Color */}
            {activeObject.stroke && (
              <ColorProperty
                label="Stroke"
                value={activeObject.stroke}
                onChange={(color) => {
                  updateObject(activeObject.id, { stroke: color });
                }}
              />
            )}

            {/* Stroke Width */}
            {activeObject.stroke_width !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Stroke Width</Label>
                  <span className="text-xs text-muted-foreground">
                    {activeObject.stroke_width}px
                  </span>
                </div>
                <Slider
                  value={[activeObject.stroke_width]}
                  min={0}
                  max={20}
                  step={1}
                  onValueChange={(values) => {
                    updateObject(activeObject.id, { stroke_width: values[0] });
                  }}
                />
              </div>
            )}

            {/* Opacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Opacity</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(activeObject.opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[activeObject.opacity * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={(values) => {
                  updateObject(activeObject.id, { opacity: values[0] / 100 });
                }}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Advanced (Shadow, Effects) */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto font-medium text-sm"
            >
              Advanced
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  advancedOpen ? 'transform rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Shadow and effects coming soon...
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
