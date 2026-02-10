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
      bookings: {
        Row: {
          audit_log: Json | null
          created_at: string | null
          event_id: string
          exclude_honoree: boolean | null
          id: string
          package_base_cents: number
          package_id: string
          paying_participants: number
          payment_status:
            | Database["public"]["Enums"]["booking_payment_status"]
            | null
          per_person_cents: number
          reference_number: string | null
          service_fee_cents: number
          stripe_payment_intent_id: string | null
          total_amount_cents: number
          updated_at: string | null
        }
        Insert: {
          audit_log?: Json | null
          created_at?: string | null
          event_id: string
          exclude_honoree?: boolean | null
          id?: string
          package_base_cents: number
          package_id: string
          paying_participants: number
          payment_status?:
            | Database["public"]["Enums"]["booking_payment_status"]
            | null
          per_person_cents: number
          reference_number?: string | null
          service_fee_cents: number
          stripe_payment_intent_id?: string | null
          total_amount_cents: number
          updated_at?: string | null
        }
        Update: {
          audit_log?: Json | null
          created_at?: string | null
          event_id?: string
          exclude_honoree?: boolean | null
          id?: string
          package_base_cents?: number
          package_id?: string
          paying_participants?: number
          payment_status?:
            | Database["public"]["Enums"]["booking_payment_status"]
            | null
          per_person_cents?: number
          reference_number?: string | null
          service_fee_cents?: number
          stripe_payment_intent_id?: string | null
          total_amount_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          category: Database["public"]["Enums"]["channel_category"]
          created_at: string | null
          event_id: string
          id: string
          last_message_at: string | null
          name: string
          unread_count: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["channel_category"]
          created_at?: string | null
          event_id: string
          id?: string
          last_message_at?: string | null
          name: string
          unread_count?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["channel_category"]
          created_at?: string | null
          event_id?: string
          id?: string
          last_message_at?: string | null
          name?: string
          unread_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country: string | null
          created_at: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          country?: string | null
          created_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          confirmed_at: string | null
          contribution_amount_cents: number | null
          event_id: string
          id: string
          invited_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          role: Database["public"]["Enums"]["participant_role"]
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          contribution_amount_cents?: number | null
          event_id: string
          id?: string
          invited_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          role: Database["public"]["Enums"]["participant_role"]
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          contribution_amount_cents?: number | null
          event_id?: string
          id?: string
          invited_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          role?: Database["public"]["Enums"]["participant_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_preferences: {
        Row: {
          average_age: Database["public"]["Enums"]["age_range"] | null
          created_at: string | null
          energy_level: Database["public"]["Enums"]["energy_level"] | null
          event_id: string
          gathering_size: Database["public"]["Enums"]["gathering_size"] | null
          group_cohesion: Database["public"]["Enums"]["group_cohesion"] | null
          id: string
          social_approach: Database["public"]["Enums"]["social_approach"] | null
          updated_at: string | null
          vibe_preferences: string[] | null
        }
        Insert: {
          average_age?: Database["public"]["Enums"]["age_range"] | null
          created_at?: string | null
          energy_level?: Database["public"]["Enums"]["energy_level"] | null
          event_id: string
          gathering_size?: Database["public"]["Enums"]["gathering_size"] | null
          group_cohesion?: Database["public"]["Enums"]["group_cohesion"] | null
          id?: string
          social_approach?:
            | Database["public"]["Enums"]["social_approach"]
            | null
          updated_at?: string | null
          vibe_preferences?: string[] | null
        }
        Update: {
          average_age?: Database["public"]["Enums"]["age_range"] | null
          created_at?: string | null
          energy_level?: Database["public"]["Enums"]["energy_level"] | null
          event_id?: string
          gathering_size?: Database["public"]["Enums"]["gathering_size"] | null
          group_cohesion?: Database["public"]["Enums"]["group_cohesion"] | null
          id?: string
          social_approach?:
            | Database["public"]["Enums"]["social_approach"]
            | null
          updated_at?: string | null
          vibe_preferences?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "event_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city_id: string
          created_at: string | null
          created_by: string
          deleted_at: string | null
          end_date: string
          hero_image_url: string | null
          honoree_name: string
          id: string
          party_type: Database["public"]["Enums"]["party_type"]
          start_date: string
          status: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at: string | null
          vibe: string | null
        }
        Insert: {
          city_id: string
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          end_date: string
          hero_image_url?: string | null
          honoree_name: string
          id?: string
          party_type: Database["public"]["Enums"]["party_type"]
          start_date: string
          status?: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at?: string | null
          vibe?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          end_date?: string
          hero_image_url?: string | null
          honoree_name?: string
          id?: string
          party_type?: Database["public"]["Enums"]["party_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["event_status"] | null
          title?: string
          updated_at?: string | null
          vibe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          event_id: string
          expires_at: string
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          event_id: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          event_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string | null
          event_id: string | null
          id: string
          is_read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          base_price_cents: number
          city_id: string
          created_at: string | null
          description: string | null
          features: Json | null
          hero_image_url: string | null
          id: string
          ideal_energy_level: string[] | null
          ideal_gathering_size: string[] | null
          ideal_vibe: string[] | null
          is_active: boolean | null
          name: string
          premium_highlights: Json | null
          price_per_person_cents: number
          rating: number | null
          review_count: number | null
          tier: Database["public"]["Enums"]["package_tier"]
          updated_at: string | null
        }
        Insert: {
          base_price_cents: number
          city_id: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          hero_image_url?: string | null
          id?: string
          ideal_energy_level?: string[] | null
          ideal_gathering_size?: string[] | null
          ideal_vibe?: string[] | null
          is_active?: boolean | null
          name: string
          premium_highlights?: Json | null
          price_per_person_cents: number
          rating?: number | null
          review_count?: number | null
          tier: Database["public"]["Enums"]["package_tier"]
          updated_at?: string | null
        }
        Update: {
          base_price_cents?: number
          city_id?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          hero_image_url?: string | null
          id?: string
          ideal_energy_level?: string[] | null
          ideal_gathering_size?: string[] | null
          ideal_vibe?: string[] | null
          is_active?: boolean | null
          name?: string
          premium_highlights?: Json | null
          price_per_person_cents?: number
          rating?: number | null
          review_count?: number | null
          tier?: Database["public"]["Enums"]["package_tier"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string | null
          id: string
          label: string
          poll_id: string
          vote_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          poll_id: string
          vote_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          poll_id?: string
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          category: Database["public"]["Enums"]["poll_category"]
          channel_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          ends_at: string | null
          event_id: string
          id: string
          status: Database["public"]["Enums"]["poll_status"] | null
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["poll_category"]
          channel_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          ends_at?: string | null
          event_id: string
          id?: string
          status?: Database["public"]["Enums"]["poll_status"] | null
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["poll_category"]
          channel_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          ends_at?: string | null
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["poll_status"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          email_notifications_enabled: boolean | null
          full_name: string | null
          id: string
          language: string | null
          push_notifications_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id: string
          language?: string | null
          push_notifications_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id?: string
          language?: string | null
          push_notifications_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_booking_reference: { Args: never; Returns: string }
    }
    Enums: {
      age_range: "21-25" | "26-30" | "31-35" | "35+"
      booking_payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
      channel_category: "general" | "accommodation" | "activities" | "budget"
      energy_level: "low_key" | "moderate" | "high_energy"
      event_status: "draft" | "planning" | "booked" | "completed" | "cancelled"
      gathering_size: "intimate" | "small_group" | "party"
      group_cohesion: "close_friends" | "mixed_group" | "strangers"
      package_tier: "essential" | "classic" | "grand"
      participant_role: "organizer" | "guest" | "honoree"
      party_type: "bachelor" | "bachelorette"
      payment_status: "pending" | "paid" | "refunded"
      poll_category: "accommodation" | "activities" | "budget" | "general"
      poll_status: "draft" | "active" | "closing_soon" | "closed"
      social_approach: "wallflower" | "butterfly" | "observer" | "mingler"
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
      age_range: ["21-25", "26-30", "31-35", "35+"],
      booking_payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
      ],
      channel_category: ["general", "accommodation", "activities", "budget"],
      energy_level: ["low_key", "moderate", "high_energy"],
      event_status: ["draft", "planning", "booked", "completed", "cancelled"],
      gathering_size: ["intimate", "small_group", "party"],
      group_cohesion: ["close_friends", "mixed_group", "strangers"],
      package_tier: ["essential", "classic", "grand"],
      participant_role: ["organizer", "guest", "honoree"],
      party_type: ["bachelor", "bachelorette"],
      payment_status: ["pending", "paid", "refunded"],
      poll_category: ["accommodation", "activities", "budget", "general"],
      poll_status: ["draft", "active", "closing_soon", "closed"],
      social_approach: ["wallflower", "butterfly", "observer", "mingler"],
    },
  },
} as const
