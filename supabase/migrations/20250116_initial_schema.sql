-- Paperbox Initial Database Schema
-- W1.D4 Supabase Integration
-- Run this migration on your new Supabase project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-secret-jwt-token-with-at-least-32-characters';

-- Canvas Sessions Table
-- Stores metadata for canvas documents
CREATE TABLE IF NOT EXISTS public.canvas_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT FALSE
);

-- Canvas Objects Table
-- Stores individual canvas objects (shapes, text)
CREATE TABLE IF NOT EXISTS public.canvas_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES public.canvas_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('rectangle', 'circle', 'text')),
    x NUMERIC NOT NULL,
    y NUMERIC NOT NULL,
    width NUMERIC NOT NULL,
    height NUMERIC NOT NULL,
    rotation NUMERIC DEFAULT 0,
    opacity NUMERIC DEFAULT 1 CHECK (opacity >= 0 AND opacity <= 1),
    fill_color TEXT NOT NULL,
    stroke_color TEXT,
    stroke_width NUMERIC DEFAULT 0,
    type_properties JSONB DEFAULT '{}'::jsonb,
    z_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Canvas Collaborators Table
-- Tracks who has access to each canvas
CREATE TABLE IF NOT EXISTS public.canvas_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES public.canvas_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(canvas_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_canvas_objects_canvas_id ON public.canvas_objects(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_objects_z_index ON public.canvas_objects(z_index);
CREATE INDEX IF NOT EXISTS idx_canvas_sessions_owner_id ON public.canvas_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_canvas_collaborators_canvas_id ON public.canvas_collaborators(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_collaborators_user_id ON public.canvas_collaborators(user_id);

-- Row Level Security Policies

-- Canvas Sessions Policies
ALTER TABLE public.canvas_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view canvases they own or collaborate on
CREATE POLICY "Users can view own canvases" ON public.canvas_sessions
    FOR SELECT
    USING (
        owner_id = auth.uid()
        OR id IN (
            SELECT canvas_id FROM public.canvas_collaborators
            WHERE user_id = auth.uid()
        )
    );

-- Users can create canvases
CREATE POLICY "Users can create canvases" ON public.canvas_sessions
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Users can update own canvases or canvases they're editors on
CREATE POLICY "Users can update own canvases" ON public.canvas_sessions
    FOR UPDATE
    USING (
        owner_id = auth.uid()
        OR id IN (
            SELECT canvas_id FROM public.canvas_collaborators
            WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
        )
    );

-- Users can delete own canvases
CREATE POLICY "Users can delete own canvases" ON public.canvas_sessions
    FOR DELETE
    USING (owner_id = auth.uid());

-- Canvas Objects Policies
ALTER TABLE public.canvas_objects ENABLE ROW LEVEL SECURITY;

-- Users can view objects in canvases they have access to
CREATE POLICY "Users can view canvas objects" ON public.canvas_objects
    FOR SELECT
    USING (
        canvas_id IN (
            SELECT id FROM public.canvas_sessions
            WHERE owner_id = auth.uid()
            OR id IN (
                SELECT canvas_id FROM public.canvas_collaborators
                WHERE user_id = auth.uid()
            )
        )
    );

-- Users can create objects in canvases they have edit access to
CREATE POLICY "Users can create canvas objects" ON public.canvas_objects
    FOR INSERT
    WITH CHECK (
        canvas_id IN (
            SELECT id FROM public.canvas_sessions
            WHERE owner_id = auth.uid()
            OR id IN (
                SELECT canvas_id FROM public.canvas_collaborators
                WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
            )
        )
    );

-- Users can update objects in canvases they have edit access to
CREATE POLICY "Users can update canvas objects" ON public.canvas_objects
    FOR UPDATE
    USING (
        canvas_id IN (
            SELECT id FROM public.canvas_sessions
            WHERE owner_id = auth.uid()
            OR id IN (
                SELECT canvas_id FROM public.canvas_collaborators
                WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
            )
        )
    );

-- Users can delete objects in canvases they have edit access to
CREATE POLICY "Users can delete canvas objects" ON public.canvas_objects
    FOR DELETE
    USING (
        canvas_id IN (
            SELECT id FROM public.canvas_sessions
            WHERE owner_id = auth.uid()
            OR id IN (
                SELECT canvas_id FROM public.canvas_collaborators
                WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
            )
        )
    );

-- Canvas Collaborators Policies
ALTER TABLE public.canvas_collaborators ENABLE ROW LEVEL SECURITY;

-- Users can view collaborators of canvases they have access to
CREATE POLICY "Users can view canvas collaborators" ON public.canvas_collaborators
    FOR SELECT
    USING (
        canvas_id IN (
            SELECT id FROM public.canvas_sessions
            WHERE owner_id = auth.uid()
            OR id IN (
                SELECT canvas_id FROM public.canvas_collaborators
                WHERE user_id = auth.uid()
            )
        )
    );

-- Canvas owners can add collaborators
CREATE POLICY "Owners can add collaborators" ON public.canvas_collaborators
    FOR INSERT
    WITH CHECK (
        canvas_id IN (
            SELECT id FROM public.canvas_sessions
            WHERE owner_id = auth.uid()
        )
    );

-- Canvas owners can remove collaborators
CREATE POLICY "Owners can remove collaborators" ON public.canvas_collaborators
    FOR DELETE
    USING (
        canvas_id IN (
            SELECT id FROM public.canvas_sessions
            WHERE owner_id = auth.uid()
        )
    );

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canvas_sessions_updated_at
    BEFORE UPDATE ON public.canvas_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_objects_updated_at
    BEFORE UPDATE ON public.canvas_objects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for live collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_objects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_collaborators;

-- Comments for documentation
COMMENT ON TABLE public.canvas_sessions IS 'Stores canvas document metadata';
COMMENT ON TABLE public.canvas_objects IS 'Stores individual canvas objects (rectangles, circles, text)';
COMMENT ON TABLE public.canvas_collaborators IS 'Tracks user access and roles for each canvas';
COMMENT ON COLUMN public.canvas_objects.type_properties IS 'Type-specific properties stored as JSON (e.g., text content, radius)';
