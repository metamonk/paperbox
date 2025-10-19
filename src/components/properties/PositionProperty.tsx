/**
 * PositionProperty - Position and rotation controls
 * W4.D2: Number inputs for X, Y coordinates and rotation angle
 * 
 * Fixed: Glitchy input behavior by using debounced local state
 * - Local state prevents database writes from interrupting typing
 * - Debounced persistence (500ms) reduces database load
 * - Blur persistence ensures changes are saved
 * 
 * Fixed: Glitchy slider by using onValueCommit
 * - Slider updates local state during drag (smooth)
 * - Database write only happens on release
 * 
 * Compact layout with X/Y side-by-side
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { usePaperboxStore } from '@/stores';
import { usePropertyInput } from '@/hooks/usePropertyInput';
import { useSliderInput } from '@/hooks/useSliderInput';
import type { CanvasObject } from '@/types/canvas';

interface PositionPropertyProps {
  object: CanvasObject;
}

export function PositionProperty({ object }: PositionPropertyProps) {
  const updateObject = usePaperboxStore((state) => state.updateObject);

  // Use debounced inputs for X and Y coordinates
  const xInput = usePropertyInput(
    Math.round(object.x),
    (value) => updateObject(object.id, { x: value })
  );

  const yInput = usePropertyInput(
    Math.round(object.y),
    (value) => updateObject(object.id, { y: value })
  );

  // Use slider input for rotation (smooth dragging, persist on release)
  const rotationSlider = useSliderInput(
    object.rotation,
    (value) => updateObject(object.id, { rotation: value })
  );

  return (
    <div className="space-y-2">
      {/* X and Y in a single row for compactness */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            X
          </Label>
          <Input
            type="number"
            value={xInput.value}
            onChange={(e) => {
              const newX = Number(e.target.value);
              if (!isNaN(newX)) {
                xInput.onChange(newX);
              }
            }}
            onBlur={xInput.onBlur}
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Y
          </Label>
          <Input
            type="number"
            value={yInput.value}
            onChange={(e) => {
              const newY = Number(e.target.value);
              if (!isNaN(newY)) {
                yInput.onChange(newY);
              }
            }}
            onBlur={yInput.onBlur}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Rotation slider with smooth dragging */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Rotation
          </Label>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {Math.round(rotationSlider.value)}°
          </span>
        </div>
        <Slider
          value={[rotationSlider.value]}
          onValueChange={rotationSlider.onValueChange}
          onValueCommit={rotationSlider.onValueCommit}
          min={0}
          max={360}
          step={1}
        />
      </div>
    </div>
  );
}
