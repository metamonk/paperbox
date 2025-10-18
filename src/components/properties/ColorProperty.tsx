/**
 * ColorProperty - Color picker component for object properties
 * W4.D2: Uses react-colorful for color selection
 *
 * Features:
 * - HexColorPicker from react-colorful
 * - Color preview swatch
 * - Popover UI with shadcn Popover
 * - Hex input field
 */

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ColorPropertyProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export function ColorProperty({ label, value, onChange }: ColorPropertyProps) {
  const [color, setColor] = useState(value);
  const [inputValue, setInputValue] = useState(value);

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setInputValue(newColor);
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Validate hex color format
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setColor(value);
      onChange(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        {/* Color Swatch + Picker Trigger */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="w-10 h-10 rounded border border-border flex-shrink-0 cursor-pointer hover:border-ring transition-colors"
              style={{ backgroundColor: color }}
              aria-label={`Pick ${label.toLowerCase()} color`}
            />
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-3"
            onMouseDown={(e) => {
              // W4.D4 CRITICAL FIX: Prevent Fabric.js deselection when clicking color picker
              // PopoverContent renders in a portal (document.body), outside PropertyPanel tree
              // PropertyPanel's stopPropagation doesn't affect portal content
              e.stopPropagation();
            }}
          >
            <HexColorPicker color={color} onChange={handleColorChange} />
          </PopoverContent>
        </Popover>

        {/* Hex Input */}
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className="h-10 text-xs font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}
