/**
 * Supabase database types
 * Updated for hybrid schema with JSONB properties
 * 
 * Note: JSONB columns (type_properties, style_properties, metadata) use `any`
 * because their schemas are dynamic and shape-specific
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
        };
      };
      canvas_objects: {
        Row: {
          // Identity & Type
          id: string;
          type: 'rectangle' | 'circle' | 'text';
          
          // Core Geometry
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          
          // Hierarchy & Organization
          group_id: string | null;
          z_index: number;
          
          // Common Style Properties
          fill: string;
          stroke: string | null;
          stroke_width: number | null;
          opacity: number;
          
          // Flexible Properties (JSONB)
          type_properties: Record<string, any>;
          style_properties: Record<string, any>;
          metadata: Record<string, any>;
          
          // Collaboration
          created_by: string;
          created_at: string;
          updated_at: string;
          locked_by: string | null;
          lock_acquired_at: string | null;
        };
        Insert: {
          id?: string;
          type: 'rectangle' | 'circle' | 'text';
          x: number;
          y: number;
          width?: number;
          height?: number;
          rotation?: number;
          group_id?: string | null;
          z_index?: number;
          fill?: string;
          stroke?: string | null;
          stroke_width?: number | null;
          opacity?: number;
          type_properties?: Record<string, any>;
          style_properties?: Record<string, any>;
          metadata?: Record<string, any>;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          locked_by?: string | null;
          lock_acquired_at?: string | null;
        };
        Update: {
          id?: string;
          type?: 'rectangle' | 'circle' | 'text';
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          group_id?: string | null;
          z_index?: number;
          fill?: string;
          stroke?: string | null;
          stroke_width?: number | null;
          opacity?: number;
          type_properties?: Record<string, any>;
          style_properties?: Record<string, any>;
          metadata?: Record<string, any>;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          locked_by?: string | null;
          lock_acquired_at?: string | null;
        };
      };
      canvas_groups: {
        Row: {
          id: string;
          name: string;
          parent_group_id: string | null;
          locked: boolean;
          z_index: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          parent_group_id?: string | null;
          locked?: boolean;
          z_index?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          parent_group_id?: string | null;
          locked?: boolean;
          z_index?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
