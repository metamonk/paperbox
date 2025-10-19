/**
 * SizeProperty - Width and height controls
 * W4.D2: Number inputs for dimensions with optional aspect ratio lock
 * 
 * Fixed: Glitchy input behavior by using debounced local state
 * - Local state prevents database writes from interrupting typing
 * - Debounced persistence (500ms) reduces database load
 * - Blur persistence ensures changes are saved
 * - Aspect ratio lock works with debounced inputs
 */

import { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, Link2Off } from 'lucide-react';
import { usePaperboxStore } from '@/stores';
import { usePropertyInput } from '@/hooks/usePropertyInput';
import type { CanvasObject } from '@/types/canvas';

interface SizePropertyProps {
  object: CanvasObject;
}

export function SizeProperty({ object }: SizePropertyProps) {
  const updateObject = usePaperboxStore((state) => state.updateObject);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  
  // Store the aspect ratio when lock is first enabled
  const lockedAspectRatioRef = useRef<number>(object.width / object.height);
  
  // Update locked aspect ratio when object changes externally and lock is off
  useEffect(() => {
    if (!aspectRatioLocked) {
      lockedAspectRatioRef.current = object.width / object.height;
    }
  }, [object.width, object.height, aspectRatioLocked]);

  // Use debounced inputs for width and height
  const widthInput = usePropertyInput(
    Math.round(object.width),
    (value) => {
      if (aspectRatioLocked) {
        const newHeight = value / lockedAspectRatioRef.current;
        updateObject(object.id, { width: value, height: newHeight });
      } else {
        updateObject(object.id, { width: value });
      }
    }
  );

  const heightInput = usePropertyInput(
    Math.round(object.height),
    (value) => {
      if (aspectRatioLocked) {
        const newWidth = value * lockedAspectRatioRef.current;
        updateObject(object.id, { width: newWidth, height: value });
      } else {
        updateObject(object.id, { height: value });
      }
    }
  );

  return (
    <div className="space-y-2">
      {/* Width */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Width
        </Label>
        <Input
          type="number"
          value={widthInput.value}
          onChange={(e) => {
            const newWidth = Number(e.target.value);
            if (!isNaN(newWidth) && newWidth >= 1) {
              widthInput.onChange(newWidth);
            }
          }}
          onBlur={widthInput.onBlur}
          className="h-7 text-xs"
          min={1}
        />
      </div>

      {/* Compact Aspect Ratio Lock */}
      <div className="flex justify-center -my-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Update the locked ratio when enabling the lock
            if (!aspectRatioLocked) {
              lockedAspectRatioRef.current = object.width / object.height;
            }
            setAspectRatioLocked(!aspectRatioLocked);
          }}
          className="h-5 px-1.5"
          aria-label={
            aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'
          }
        >
          {aspectRatioLocked ? (
            <Link2 className="h-2.5 w-2.5" />
          ) : (
            <Link2Off className="h-2.5 w-2.5" />
          )}
        </Button>
      </div>

      {/* Height */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Height
        </Label>
        <Input
          type="number"
          value={heightInput.value}
          onChange={(e) => {
            const newHeight = Number(e.target.value);
            if (!isNaN(newHeight) && newHeight >= 1) {
              heightInput.onChange(newHeight);
            }
          }}
          onBlur={heightInput.onBlur}
          className="h-7 text-xs"
          min={1}
        />
      </div>
    </div>
  );
}
