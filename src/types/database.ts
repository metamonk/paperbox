/**
 * Supabase database types
 */

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
          id: string;
          type: 'rectangle' | 'circle' | 'text';
          x: number;
          y: number;
          width: number | null;
          height: number | null;
          radius: number | null;
          rotation: number | null;
          fill: string;
          text_content: string | null;
          font_size: number | null;
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
          width?: number | null;
          height?: number | null;
          radius?: number | null;
          rotation?: number | null;
          fill: string;
          text_content?: string | null;
          font_size?: number | null;
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
          width?: number | null;
          height?: number | null;
          radius?: number | null;
          rotation?: number | null;
          fill?: string;
          text_content?: string | null;
          font_size?: number | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          locked_by?: string | null;
          lock_acquired_at?: string | null;
        };
      };
    };
  };
}

