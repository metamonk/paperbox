/**
 * Rectangle shape component
 * Uses BaseShape for all common logic - just handles rendering
 */

import { memo } from 'react';
import Konva from 'konva';
import { Rect } from 'react-konva';
import { BaseShape, type ShapeRenderProps } from './BaseShape';
import type { RectangleObject } from '../../../types/canvas';

interface RectangleProps {
  shape: RectangleObject;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<RectangleObject>) => void;
  onAcquireLock: (id: string) => Promise<boolean>;
  onReleaseLock: (id: string) => Promise<void>;
  onActivity?: () => void;
}

function RectangleComponent({ shape, isSelected, onSelect, onUpdate, onAcquireLock, onReleaseLock, onActivity }: RectangleProps) {
  return (
    <BaseShape
      shape={shape}
      isSelected={isSelected}
      onSelect={onSelect}
      onUpdate={onUpdate}
      onAcquireLock={onAcquireLock}
      onReleaseLock={onReleaseLock}
      onActivity={onActivity}
    >
      {({ shapeRef, commonProps }: ShapeRenderProps<RectangleObject>) => (
        <Rect
          ref={shapeRef as React.RefObject<Konva.Rect>}
          {...commonProps}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          cornerRadius={shape.type_properties.corner_radius}
        />
      )}
    </BaseShape>
  );
}

/**
 * Custom comparison function for React.memo
 * Only re-render if shape properties that affect rendering change
 */
const areEqual = (prevProps: RectangleProps, nextProps: RectangleProps) => {
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.shape.x === nextProps.shape.x &&
    prevProps.shape.y === nextProps.shape.y &&
    prevProps.shape.width === nextProps.shape.width &&
    prevProps.shape.height === nextProps.shape.height &&
    prevProps.shape.fill === nextProps.shape.fill &&
    prevProps.shape.rotation === nextProps.shape.rotation &&
    prevProps.shape.opacity === nextProps.shape.opacity &&
    prevProps.shape.locked_by === nextProps.shape.locked_by &&
    prevProps.shape.type_properties.corner_radius === nextProps.shape.type_properties.corner_radius &&
    prevProps.isSelected === nextProps.isSelected
  );
};

export const Rectangle = memo(RectangleComponent, areEqual);
