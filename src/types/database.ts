export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      canvas_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          locked: boolean | null
          name: string
          parent_group_id: string | null
          updated_at: string | null
          z_index: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          locked?: boolean | null
          name: string
          parent_group_id?: string | null
          updated_at?: string | null
          z_index?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          locked?: boolean | null
          name?: string
          parent_group_id?: string | null
          updated_at?: string | null
          z_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "canvas_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_objects: {
        Row: {
          canvas_id: string
          created_at: string | null
          created_by: string | null
          fill: string
          group_id: string | null
          height: number
          id: string
          lock_acquired_at: string | null
          locked_by: string | null
          metadata: Json | null
          opacity: number | null
          rotation: number | null
          stroke: string | null
          stroke_width: number | null
          style_properties: Json | null
          type: string
          type_properties: Json | null
          updated_at: string | null
          width: number
          x: number
          y: number
          z_index: number | null
        }
        Insert: {
          canvas_id: string
          created_at?: string | null
          created_by?: string | null
          fill?: string
          group_id?: string | null
          height?: number
          id?: string
          lock_acquired_at?: string | null
          locked_by?: string | null
          metadata?: Json | null
          opacity?: number | null
          rotation?: number | null
          stroke?: string | null
          stroke_width?: number | null
          style_properties?: Json | null
          type: string
          type_properties?: Json | null
          updated_at?: string | null
          width?: number
          x: number
          y: number
          z_index?: number | null
        }
        Update: {
          canvas_id?: string
          created_at?: string | null
          created_by?: string | null
          fill?: string
          group_id?: string | null
          height?: number
          id?: string
          lock_acquired_at?: string | null
          locked_by?: string | null
          metadata?: Json | null
          opacity?: number | null
          rotation?: number | null
          stroke?: string | null
          stroke_width?: number | null
          style_properties?: Json | null
          type?: string
          type_properties?: Json | null
          updated_at?: string | null
          width?: number
          x?: number
          y?: number
          z_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_objects_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "canvases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_objects_new_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_objects_new_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "canvas_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_objects_new_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_permissions: {
        Row: {
          canvas_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["canvas_permission"]
          user_id: string
        }
        Insert: {
          canvas_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["canvas_permission"]
          user_id: string
        }
        Update: {
          canvas_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["canvas_permission"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvas_permissions_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "canvases"
            referencedColumns: ["id"]
          },
        ]
      }
      canvases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      batch_update_z_index: {
        Args: {
          layer_ids: string[]
          new_z_indices: number[]
        }
        Returns: undefined
      }
      batch_update_canvas_objects: {
        Args: {
          object_ids: string[]
          x_values: number[]
          y_values: number[]
          width_values: number[]
          height_values: number[]
          rotation_values: number[]
        }
        Returns: undefined
      }
    }
    Enums: {
      canvas_permission: "owner" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      canvas_permission: ["owner", "editor", "viewer"],
    },
  },
} as const
