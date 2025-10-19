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
import { Separator } from '@/components/ui/separator';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useSliderInput } from '@/hooks/useSliderInput';
import { ColorProperty } from './ColorProperty';
import { PositionProperty } from './PositionProperty';
import { SizeProperty } from './SizeProperty';
import { TextProperty } from './TextProperty';

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
  const [textOpen, setTextOpen] = useState(true);
  const [styleOpen, setStyleOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Slider inputs for smooth dragging
  const opacitySlider = useSliderInput(
    activeObject ? activeObject.opacity * 100 : 100,
    (value) => {
      if (activeObject) {
        updateObject(activeObject.id, { opacity: value / 100 });
      }
    }
  );

  const strokeWidthSlider = useSliderInput(
    activeObject?.stroke_width ?? 0,
    (value) => {
      if (activeObject) {
        updateObject(activeObject.id, { stroke_width: value });
      }
    }
  );

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
      <div className="p-3 space-y-3">
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
              className="w-full justify-between py-1.5 px-2 h-auto font-medium text-xs"
            >
              Position
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  positionOpen ? 'transform rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-1 pb-3">
            <PositionProperty object={activeObject} />
          </CollapsibleContent>
        </Collapsible>

        <Separator className="my-3" />

        {/* Size */}
        <Collapsible open={sizeOpen} onOpenChange={setSizeOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between py-1.5 px-2 h-auto font-medium text-xs"
            >
              Size
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  sizeOpen ? 'transform rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-1 pb-3">
            <SizeProperty object={activeObject} />
          </CollapsibleContent>
        </Collapsible>

        <Separator className="my-3" />

        {/* Text Formatting (W6.D2: Only for text objects) */}
        {activeObject.type === 'text' && (
          <>
            <Collapsible open={textOpen} onOpenChange={setTextOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between py-1.5 px-2 h-auto font-medium text-xs"
                >
                  Text
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      textOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-1 pb-3">
                <TextProperty
                  object={activeObject}
                  onChange={(updates) => {
                    updateObject(activeObject.id, updates);
                  }}
                />
              </CollapsibleContent>
            </Collapsible>
            <Separator className="my-3" />
          </>
        )}

        {/* Style */}
        <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between py-1.5 px-2 h-auto font-medium text-xs"
            >
              Style
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  styleOpen ? 'transform rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-1 pb-3 space-y-3">
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

            {/* Stroke Width with smooth slider */}
            {activeObject.stroke_width !== null && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Stroke Width
                  </Label>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {Math.round(strokeWidthSlider.value)}px
                  </span>
                </div>
                <Slider
                  value={[strokeWidthSlider.value]}
                  onValueChange={strokeWidthSlider.onValueChange}
                  onValueCommit={strokeWidthSlider.onValueCommit}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>
            )}

            {/* Opacity with smooth slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Opacity
                </Label>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {Math.round(opacitySlider.value)}%
                </span>
              </div>
              <Slider
                value={[opacitySlider.value]}
                onValueChange={opacitySlider.onValueChange}
                onValueCommit={opacitySlider.onValueCommit}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator className="my-3" />

        {/* Advanced (Shadow, Effects) */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between py-1.5 px-2 h-auto font-medium text-xs"
            >
              Advanced
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  advancedOpen ? 'transform rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-1 pb-3">
            <p className="text-[10px] text-muted-foreground">
              Shadow and effects coming soon...
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
