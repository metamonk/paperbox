/**
 * SizeProperty - Width and height controls
 * W4.D2: Number inputs for dimensions with optional aspect ratio lock
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, Link2Off } from 'lucide-react';
import { usePaperboxStore } from '@/stores';
import type { CanvasObject } from '@/types/canvas';

interface SizePropertyProps {
  object: CanvasObject;
}

export function SizeProperty({ object }: SizePropertyProps) {
  const updateObject = usePaperboxStore((state) => state.updateObject);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  const aspectRatio = object.width / object.height;

  const handleWidthChange = (newWidth: number) => {
    if (aspectRatioLocked) {
      const newHeight = newWidth / aspectRatio;
      updateObject(object.id, { width: newWidth, height: newHeight });
    } else {
      updateObject(object.id, { width: newWidth });
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (aspectRatioLocked) {
      const newWidth = newHeight * aspectRatio;
      updateObject(object.id, { width: newWidth, height: newHeight });
    } else {
      updateObject(object.id, { height: newHeight });
    }
  };

  return (
    <div className="space-y-3">
      {/* Width */}
      <div className="grid grid-cols-[1fr,80px] gap-2 items-center">
        <Label className="text-xs">Width</Label>
        <Input
          type="number"
          value={Math.round(object.width)}
          onChange={(e) => handleWidthChange(Number(e.target.value))}
          className="h-8 text-xs"
          min={1}
        />
      </div>

      {/* Aspect Ratio Lock */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
          className="h-6 px-2"
          aria-label={
            aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'
          }
        >
          {aspectRatioLocked ? (
            <Link2 className="h-3 w-3" />
          ) : (
            <Link2Off className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Height */}
      <div className="grid grid-cols-[1fr,80px] gap-2 items-center">
        <Label className="text-xs">Height</Label>
        <Input
          type="number"
          value={Math.round(object.height)}
          onChange={(e) => handleHeightChange(Number(e.target.value))}
          className="h-8 text-xs"
          min={1}
        />
      </div>
    </div>
  );
}
