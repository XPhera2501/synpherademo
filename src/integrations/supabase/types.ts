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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_content: {
        Row: {
          content: string
          id: string
          section: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          id?: string
          section: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          id?: string
          section?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lineage_entries: {
        Row: {
          action: string
          asset_id: string
          created_at: string
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          asset_id: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          asset_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineage_entries_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "prompt_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineage_entries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "prompt_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          display_name: string | null
          id: string
          suspended: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          display_name?: string | null
          id: string
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          display_name?: string | null
          id?: string
          suspended?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      prompt_assets: {
        Row: {
          assigned_to: string | null
          category: string | null
          commit_message: string | null
          content: string
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["department"]
          fts: unknown
          id: string
          is_locked: boolean
          justification: string | null
          metadata: Json | null
          parent_id: string | null
          security_status: string
          status: Database["public"]["Enums"]["asset_status"]
          tags: string[] | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          commit_message?: string | null
          content?: string
          created_at?: string
          created_by: string
          department?: Database["public"]["Enums"]["department"]
          fts?: unknown
          id?: string
          is_locked?: boolean
          justification?: string | null
          metadata?: Json | null
          parent_id?: string | null
          security_status?: string
          status?: Database["public"]["Enums"]["asset_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          commit_message?: string | null
          content?: string
          created_at?: string
          created_by?: string
          department?: Database["public"]["Enums"]["department"]
          fts?: unknown
          id?: string
          is_locked?: boolean
          justification?: string | null
          metadata?: Json | null
          parent_id?: string | null
          security_status?: string
          status?: Database["public"]["Enums"]["asset_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_assets_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "prompt_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          prompt_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          prompt_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          prompt_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_comments_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      roi_configs: {
        Row: {
          category: string
          created_at: string | null
          department_id: string | null
          formula: string
          id: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          department_id?: string | null
          formula: string
          id?: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          department_id?: string | null
          formula?: string
          id?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roi_configs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      roi_facts: {
        Row: {
          asset_id: string
          category: string
          created_at: string
          description: string | null
          id: string
          value: number
        }
        Insert: {
          asset_id: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          value?: number
        }
        Update: {
          asset_id?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "roi_facts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "prompt_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_whitelist: {
        Row: {
          authorized_by: string | null
          created_at: string | null
          email: string
          id: string
          mfa_enabled: boolean | null
          revoked_at: string | null
        }
        Insert: {
          authorized_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          mfa_enabled?: boolean | null
          revoked_at?: string | null
        }
        Update: {
          authorized_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          mfa_enabled?: boolean | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_whitelist_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      version_snapshots: {
        Row: {
          asset_id: string
          commit_message: string
          content: string
          created_at: string
          id: string
          title: string
          user_id: string
          version: number
        }
        Insert: {
          asset_id: string
          commit_message?: string
          content: string
          created_at?: string
          id?: string
          title: string
          user_id: string
          version: number
        }
        Update: {
          asset_id?: string
          commit_message?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "version_snapshots_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "prompt_assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "creator" | "reviewer" | "viewer"
      asset_status: "draft" | "in_review" | "approved" | "released" | "created"
      department:
        | "Operations"
        | "Legal"
        | "R&D"
        | "Marketing"
        | "Finance"
        | "HR"
        | "IT"
        | "Executive"
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
      app_role: ["super_admin", "admin", "creator", "reviewer", "viewer"],
      asset_status: ["draft", "in_review", "approved", "released", "created"],
      department: [
        "Operations",
        "Legal",
        "R&D",
        "Marketing",
        "Finance",
        "HR",
        "IT",
        "Executive",
      ],
    },
  },
} as const
