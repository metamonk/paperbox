/**
 * Circle shape component
 * Uses BaseShape for all common logic - just handles rendering
 */

import { memo, useCallback } from 'react';
import Konva from 'konva';
import { Circle as KonvaCircle } from 'react-konva';
import { BaseShape, type ShapeRenderProps } from './BaseShape';
import type { CircleObject } from '../../../types/canvas';

interface CircleProps {
  shape: CircleObject;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<CircleObject>) => void;
  onAcquireLock: (id: string) => Promise<boolean>;
  onReleaseLock: (id: string) => Promise<void>;
  onActivity?: () => void;
}

function CircleComponent({ shape, isSelected, onSelect, onUpdate, onAcquireLock, onReleaseLock, onActivity }: CircleProps) {
  // Wrap onUpdate to handle radius calculation for circles
  const handleUpdate = useCallback((id: string, updates: Partial<CircleObject>) => {
    // If width or height is being updated (from transform), calculate radius
    if (updates.width !== undefined || updates.height !== undefined) {
      const newWidth = updates.width ?? shape.width;
      const newHeight = updates.height ?? shape.height;
      
      // Use the larger dimension for radius (circles are circular, so width === height ideally)
      // But during transform, they might temporarily differ
      const newRadius = Math.max(newWidth, newHeight) / 2;
      
      // Update type_properties with new radius
      updates.type_properties = {
        ...shape.type_properties,
        radius: newRadius,
      };
    }
    
    onUpdate(id, updates);
  }, [shape.width, shape.height, shape.type_properties, onUpdate]);
  
  return (
    <BaseShape
      shape={shape}
      isSelected={isSelected}
      onSelect={onSelect}
      onUpdate={handleUpdate}
      onAcquireLock={onAcquireLock}
      onReleaseLock={onReleaseLock}
      onActivity={onActivity}
    >
      {({ shapeRef, commonProps }: ShapeRenderProps<CircleObject>) => (
        <KonvaCircle
          ref={shapeRef as React.RefObject<Konva.Circle>}
          {...commonProps}
          radius={shape.type_properties.radius}
          fill={shape.fill}
        />
      )}
    </BaseShape>
  );
}

/**
 * Custom comparison function for React.memo
 * Only re-render if shape properties that affect rendering change
 */
const areEqual = (prevProps: CircleProps, nextProps: CircleProps) => {
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.shape.x === nextProps.shape.x &&
    prevProps.shape.y === nextProps.shape.y &&
    prevProps.shape.type_properties.radius === nextProps.shape.type_properties.radius &&
    prevProps.shape.fill === nextProps.shape.fill &&
    prevProps.shape.rotation === nextProps.shape.rotation &&
    prevProps.shape.opacity === nextProps.shape.opacity &&
    prevProps.shape.locked_by === nextProps.shape.locked_by &&
    prevProps.isSelected === nextProps.isSelected
  );
};

export const Circle = memo(CircleComponent, areEqual);
