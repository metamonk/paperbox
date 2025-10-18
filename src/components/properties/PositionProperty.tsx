/**
 * PositionProperty - Position and rotation controls
 * W4.D2: Number inputs for X, Y coordinates and rotation angle
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import type { CanvasObject } from '@/types/canvas';

interface PositionPropertyProps {
  object: CanvasObject;
}

export function PositionProperty({ object }: PositionPropertyProps) {
  return (
    <div className="space-y-3">
      {/* X Position */}
      <div className="grid grid-cols-[1fr,80px] gap-2 items-center">
        <Label className="text-xs">X</Label>
        <Input
          type="number"
          value={Math.round(object.x)}
          onChange={(e) => {
            // TODO: Wire to object update action
            console.log('X changed:', e.target.value);
          }}
          className="h-8 text-xs"
        />
      </div>

      {/* Y Position */}
      <div className="grid grid-cols-[1fr,80px] gap-2 items-center">
        <Label className="text-xs">Y</Label>
        <Input
          type="number"
          value={Math.round(object.y)}
          onChange={(e) => {
            // TODO: Wire to object update action
            console.log('Y changed:', e.target.value);
          }}
          className="h-8 text-xs"
        />
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Rotation</Label>
          <span className="text-xs text-muted-foreground">
            {Math.round(object.rotation)}°
          </span>
        </div>
        <Slider
          value={[object.rotation]}
          min={0}
          max={360}
          step={1}
          onValueChange={(values) => {
            // TODO: Wire to object update action
            console.log('Rotation changed:', values[0]);
          }}
        />
      </div>
    </div>
  );
}
