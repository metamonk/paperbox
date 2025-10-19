/**
 * TextProperty - Text formatting controls for text objects
 * W6.D2: Text Formatting (font family, size, weight, style, alignment, decoration)
 *
 * Features:
 * - Font family selector (dropdown)
 * - Font size control (number input + slider)
 * - Font weight selector (dropdown)
 * - Font style toggle (italic)
 * - Text alignment buttons (left, center, right, justify)
 * - Text decoration toggles (underline, line-through)
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Toggle } from '@/components/ui/toggle';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Italic,
  Underline,
  Strikethrough,
} from 'lucide-react';
import { usePropertyInput } from '@/hooks/usePropertyInput';
import { useSliderInput } from '@/hooks/useSliderInput';
import type { CanvasObject, TextTypeProperties } from '@/types/canvas';

interface TextPropertyProps {
  object: CanvasObject;
  onChange: (updates: Partial<CanvasObject>) => void;
}

// Common font families available in most systems
const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Comic Sans MS',
  'Impact',
  'Palatino',
] as const;

// Font weight options
const FONT_WEIGHTS = [
  { value: 'normal', label: 'Normal (400)' },
  { value: '300', label: 'Light (300)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi-Bold (600)' },
  { value: 'bold', label: 'Bold (700)' },
  { value: '800', label: 'Extra-Bold (800)' },
  { value: '900', label: 'Black (900)' },
] as const;

export function TextProperty({ object, onChange }: TextPropertyProps) {
  const textProps = (object.type_properties || {}) as TextTypeProperties;
  const styleProps = (object.style_properties || {}) as {
    underline?: boolean;
    linethrough?: boolean;
  };

  // Extract text-specific properties with defaults
  const fontFamily = textProps.font_family || 'Arial';
  const fontSize = textProps.font_size || 16;
  const fontWeight = textProps.font_weight || 'normal';
  const fontStyle = textProps.font_style || 'normal';
  const textAlign = textProps.text_align || 'left';
  const underline = styleProps.underline || false;
  const linethrough = styleProps.linethrough || false;

  const updateTextProperty = (updates: Partial<TextTypeProperties>) => {
    onChange({
      type_properties: {
        ...(object.type_properties as TextTypeProperties),
        ...updates,
      } as TextTypeProperties,
    });
  };

  const updateStyleProperty = (updates: Record<string, boolean>) => {
    onChange({
      style_properties: {
        ...object.style_properties,
        ...updates,
      },
    });
  };

  // Use debounced input for font size typing
  const fontSizeInput = usePropertyInput(
    fontSize,
    (value) => updateTextProperty({ font_size: value })
  );

  // Use slider input for font size slider (smooth dragging)
  const fontSizeSlider = useSliderInput(
    fontSize,
    (value) => updateTextProperty({ font_size: value })
  );

  return (
    <div className="space-y-4">
      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-xs">Font Family</Label>
        <Select
          value={fontFamily}
          onValueChange={(value) => {
            updateTextProperty({ font_family: value });
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font} value={font} className="text-xs">
                <span style={{ fontFamily: font }}>{font}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Font Size</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={fontSizeInput.value}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 8 && value <= 144) {
                  fontSizeInput.onChange(value);
                }
              }}
              onBlur={fontSizeInput.onBlur}
              className="h-7 w-16 text-xs"
              min={8}
              max={144}
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </div>
        <Slider
          value={[fontSizeSlider.value]}
          onValueChange={fontSizeSlider.onValueChange}
          onValueCommit={fontSizeSlider.onValueCommit}
          min={8}
          max={144}
          step={1}
        />
      </div>

      {/* Font Weight */}
      <div className="space-y-2">
        <Label className="text-xs">Font Weight</Label>
        <Select
          value={fontWeight}
          onValueChange={(value) => {
            updateTextProperty({ font_weight: value as TextTypeProperties['font_weight'] });
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_WEIGHTS.map((weight) => (
              <SelectItem key={weight.value} value={weight.value} className="text-xs">
                {weight.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Style (Italic) */}
      <div className="space-y-2">
        <Label className="text-xs">Font Style</Label>
        <Toggle
          pressed={fontStyle === 'italic'}
          onPressedChange={(pressed) => {
            updateTextProperty({ font_style: pressed ? 'italic' : 'normal' });
          }}
          aria-label="Toggle italic"
          className="h-9 w-full"
        >
          <Italic className="h-4 w-4 mr-2" />
          Italic
        </Toggle>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <Label className="text-xs">Text Alignment</Label>
        <ToggleGroup
          type="single"
          value={textAlign}
          onValueChange={(value) => {
            if (value) {
              updateTextProperty({ text_align: value as TextTypeProperties['text_align'] });
            }
          }}
          className="grid grid-cols-4 gap-1"
        >
          <ToggleGroupItem value="left" aria-label="Align left" className="h-9">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align center" className="h-9">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right" className="h-9">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="justify" aria-label="Align justify" className="h-9">
            <AlignJustify className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Text Decoration */}
      <div className="space-y-2">
        <Label className="text-xs">Text Decoration</Label>
        <div className="grid grid-cols-2 gap-2">
          <Toggle
            pressed={underline}
            onPressedChange={(pressed) => {
              updateStyleProperty({ underline: pressed });
            }}
            aria-label="Toggle underline"
            className="h-9"
          >
            <Underline className="h-4 w-4 mr-2" />
            Underline
          </Toggle>
          <Toggle
            pressed={linethrough}
            onPressedChange={(pressed) => {
              updateStyleProperty({ linethrough: pressed });
            }}
            aria-label="Toggle strikethrough"
            className="h-9"
          >
            <Strikethrough className="h-4 w-4 mr-2" />
            Strike
          </Toggle>
        </div>
      </div>
    </div>
  );
}
