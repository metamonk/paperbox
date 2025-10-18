/**
 * PositionProperty - Position and rotation controls
 * W4.D2: Number inputs for X, Y coordinates and rotation angle
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { usePaperboxStore } from '@/stores';
import type { CanvasObject } from '@/types/canvas';

interface PositionPropertyProps {
  object: CanvasObject;
}

export function PositionProperty({ object }: PositionPropertyProps) {
  const updateObject = usePaperboxStore((state) => state.updateObject);

  return (
    <div className="space-y-3">
      {/* X Position */}
      <div className="grid grid-cols-[1fr,80px] gap-2 items-center">
        <Label className="text-xs">X</Label>
        <Input
          type="number"
          value={Math.round(object.x)}
          onChange={(e) => {
            const newX = Number(e.target.value);
            if (!isNaN(newX)) {
              updateObject(object.id, { x: newX });
            }
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
            const newY = Number(e.target.value);
            if (!isNaN(newY)) {
              updateObject(object.id, { y: newY });
            }
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
            updateObject(object.id, { rotation: values[0] });
          }}
        />
      </div>
    </div>
  );
}
