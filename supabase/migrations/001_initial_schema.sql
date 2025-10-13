-- CollabCanvas Initial Schema Migration
-- Creates tables, triggers, and functions for the collaborative canvas application

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Stores user profile information (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CANVAS_OBJECTS TABLE
-- ============================================================================
-- Stores all canvas objects (rectangles, circles, text) with locking mechanism
CREATE TABLE canvas_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('rectangle', 'circle', 'text')),
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT,
  height FLOAT,
  radius FLOAT,
  fill TEXT NOT NULL,
  text_content TEXT,
  font_size INT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Locking mechanism for conflict resolution
  locked_by UUID REFERENCES profiles(id),
  lock_acquired_at TIMESTAMPTZ
);

-- ============================================================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================================================
-- Automatically creates a profile when a new user signs up
-- Display name is extracted from email (prefix before @)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================
-- Automatically updates the updated_at column on canvas_objects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on canvas_objects update
CREATE TRIGGER update_canvas_objects_updated_at
  BEFORE UPDATE ON canvas_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

