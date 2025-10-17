/**
 * Supabase Database Types
 *
 * Auto-generated TypeScript types for database schema
 * Generated with: npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
 *
 * NOTE: This is a placeholder. After database migration (W1.D4.4), regenerate with actual schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Database schema interface
 *
 * Tables:
 * - canvas_objects: Stores canvas object data (shapes, text)
 * - canvas_sessions: Stores canvas session metadata
 * - canvas_collaborators: Tracks who's collaborating on each canvas
 * - canvas_history: Stores undo/redo history (future enhancement)
 */
export interface Database {
  public: {
    Tables: {
      canvas_objects: {
        Row: {
          id: string;
          canvas_id: string;
          type: 'rectangle' | 'circle' | 'text';
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          opacity: number;
          fill_color: string;
          stroke_color: string | null;
          stroke_width: number;
          type_properties: Json;
          z_index: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          canvas_id: string;
          type: 'rectangle' | 'circle' | 'text';
          x: number;
          y: number;
          width: number;
          height: number;
          rotation?: number;
          opacity?: number;
          fill_color: string;
          stroke_color?: string | null;
          stroke_width?: number;
          type_properties?: Json;
          z_index?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          canvas_id?: string;
          type?: 'rectangle' | 'circle' | 'text';
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          opacity?: number;
          fill_color?: string;
          stroke_color?: string | null;
          stroke_width?: number;
          type_properties?: Json;
          z_index?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
      };
      canvas_sessions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
          last_accessed: string;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
          last_accessed?: string;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
          last_accessed?: string;
          is_public?: boolean;
        };
      };
      canvas_collaborators: {
        Row: {
          id: string;
          canvas_id: string;
          user_id: string;
          role: 'owner' | 'editor' | 'viewer';
          joined_at: string;
        };
        Insert: {
          id?: string;
          canvas_id: string;
          user_id: string;
          role?: 'owner' | 'editor' | 'viewer';
          joined_at?: string;
        };
        Update: {
          id?: string;
          canvas_id?: string;
          user_id?: string;
          role?: 'owner' | 'editor' | 'viewer';
          joined_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
