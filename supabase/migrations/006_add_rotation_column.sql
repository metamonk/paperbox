-- Add rotation column to canvas_objects table
-- Supports rotation transformation for all shape types

ALTER TABLE canvas_objects 
ADD COLUMN rotation FLOAT DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN canvas_objects.rotation IS 'Rotation angle in degrees (0-360) for shape transformation';

