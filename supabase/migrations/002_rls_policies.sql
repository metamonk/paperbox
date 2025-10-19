-- Paperbox Row Level Security Policies
-- Implements collaborative model: any authenticated user can read/write any object

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- All profiles are publicly viewable (for displaying user names, presence, etc.)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- CANVAS OBJECTS POLICIES (Collaborative Model)
-- ============================================================================
-- All authenticated users can view all canvas objects
CREATE POLICY "Canvas objects are viewable by everyone"
  ON canvas_objects FOR SELECT
  USING (true);

-- Any authenticated user can create new canvas objects
CREATE POLICY "Authenticated users can insert canvas objects"
  ON canvas_objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Any authenticated user can update any canvas object (collaborative model)
-- Object locking is handled at the application layer
CREATE POLICY "Authenticated users can update any canvas object"
  ON canvas_objects FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Any authenticated user can delete any canvas object (collaborative model)
CREATE POLICY "Authenticated users can delete any canvas object"
  ON canvas_objects FOR DELETE
  USING (auth.role() = 'authenticated');

