-- Add CASCADE DELETE to profiles foreign key
-- This allows automatic deletion of profiles when auth users are deleted

-- Drop the existing foreign key constraint
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Recreate it with CASCADE DELETE
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Add CASCADE to canvas_objects foreign keys as well for consistency
ALTER TABLE canvas_objects
  DROP CONSTRAINT IF EXISTS canvas_objects_created_by_fkey;

ALTER TABLE canvas_objects
  ADD CONSTRAINT canvas_objects_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

ALTER TABLE canvas_objects
  DROP CONSTRAINT IF EXISTS canvas_objects_locked_by_fkey;

ALTER TABLE canvas_objects
  ADD CONSTRAINT canvas_objects_locked_by_fkey
  FOREIGN KEY (locked_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

