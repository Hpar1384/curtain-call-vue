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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      booking_items: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          show_seat_id: string
          unit_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          show_seat_id: string
          unit_price?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          show_seat_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_show_seat_id_fkey"
            columns: ["show_seat_id"]
            isOneToOne: true
            referencedRelation: "show_seats"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          id: string
          seat_count: number
          session_id: string
          show_id: string
          status: string
          total_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          seat_count?: number
          session_id: string
          show_id: string
          status?: string
          total_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          seat_count?: number
          session_id?: string
          show_id?: string
          status?: string
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "show_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      halls: {
        Row: {
          created_at: string
          id: string
          name: string
          rows_count: number
          seats_per_row: number
          theater_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          rows_count?: number
          seats_per_row?: number
          theater_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          rows_count?: number
          seats_per_row?: number
          theater_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "halls_theater_id_fkey"
            columns: ["theater_id"]
            isOneToOne: false
            referencedRelation: "theaters"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          created_at: string
          hall_id: string
          id: string
          row_label: string
          seat_number: number
        }
        Insert: {
          created_at?: string
          hall_id: string
          id?: string
          row_label: string
          seat_number: number
        }
        Update: {
          created_at?: string
          hall_id?: string
          id?: string
          row_label?: string
          seat_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "seats_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
        ]
      }
      show_seats: {
        Row: {
          created_at: string
          id: string
          price: number | null
          seat_id: string
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number | null
          seat_id: string
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number | null
          seat_id?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_seats_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_seats_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "show_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      show_sessions: {
        Row: {
          created_at: string
          date_label: string
          id: string
          show_id: string
          sort_order: number
          starts_at: string | null
          time_label: string
          weekday_label: string
        }
        Insert: {
          created_at?: string
          date_label: string
          id?: string
          show_id: string
          sort_order?: number
          starts_at?: string | null
          time_label: string
          weekday_label: string
        }
        Update: {
          created_at?: string
          date_label?: string
          id?: string
          show_id?: string
          sort_order?: number
          starts_at?: string | null
          time_label?: string
          weekday_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_sessions_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          age_rating: string | null
          created_at: string
          description: string
          director: string | null
          duration_minutes: number
          genre: string | null
          hall_id: string
          id: string
          poster_key: string
          price: number
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          age_rating?: string | null
          created_at?: string
          description?: string
          director?: string | null
          duration_minutes?: number
          genre?: string | null
          hall_id: string
          id?: string
          poster_key: string
          price?: number
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          age_rating?: string | null
          created_at?: string
          description?: string
          director?: string | null
          duration_minutes?: number
          genre?: string | null
          hall_id?: string
          id?: string
          poster_key?: string
          price?: number
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shows_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
        ]
      }
      theaters: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_booking: {
        Args: { p_seat_labels: string[]; p_session_id: string; p_slug: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
