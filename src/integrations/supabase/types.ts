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
      calendar_assignments: {
        Row: {
          calendar_id: string
          calendar_name: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          calendar_name?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plan: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          custom_meal_name: string | null
          id: string
          is_completed: boolean | null
          meal_date: string
          meal_type: string
          notes: string | null
          recipe_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          custom_meal_name?: string | null
          id?: string
          is_completed?: boolean | null
          meal_date: string
          meal_type: string
          notes?: string | null
          recipe_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          custom_meal_name?: string | null
          id?: string
          is_completed?: boolean | null
          meal_date?: string
          meal_type?: string
          notes?: string | null
          recipe_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          ingredient_name: string
          notes: string | null
          quantity: string | null
          recipe_id: string
          unit: string | null
        }
        Insert: {
          id?: string
          ingredient_name: string
          notes?: string | null
          quantity?: string | null
          recipe_id: string
          unit?: string | null
        }
        Update: {
          id?: string
          ingredient_name?: string
          notes?: string | null
          quantity?: string | null
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string | null
          cook_time_minutes: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_favorite: boolean | null
          name: string
          prep_time_minutes: number | null
          servings: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_favorite?: boolean | null
          name: string
          prep_time_minutes?: number | null
          servings?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_favorite?: boolean | null
          name?: string
          prep_time_minutes?: number | null
          servings?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          added_by: string | null
          category: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          id: string
          is_checked: boolean | null
          name: string
          notes: string | null
          quantity: string | null
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          category?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          name: string
          notes?: string | null
          quantity?: string | null
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          category?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          name?: string
          notes?: string | null
          quantity?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shopping_recurring_items: {
        Row: {
          category: string | null
          created_at: string | null
          frequency_days: number | null
          id: string
          is_active: boolean | null
          last_added: string | null
          name: string
          quantity: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          frequency_days?: number | null
          id?: string
          is_active?: boolean | null
          last_added?: string | null
          name: string
          quantity?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          frequency_days?: number | null
          id?: string
          is_active?: boolean | null
          last_added?: string | null
          name?: string
          quantity?: string | null
        }
        Relationships: []
      }
      todo_templates: {
        Row: {
          category: string | null
          created_at: string | null
          default_assigned_to: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_assigned_to?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_assigned_to?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean | null
          next_recurrence_date: string | null
          priority: string | null
          recurrence_days: number[] | null
          recurrence_pattern: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          next_recurrence_date?: string | null
          priority?: string | null
          recurrence_days?: number[] | null
          recurrence_pattern?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          next_recurrence_date?: string | null
          priority?: string | null
          recurrence_days?: number[] | null
          recurrence_pattern?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
