/**
 * Supabase Database Types
 * Generated from database schema - includes all tables, enums, and relationships
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================================
// ENUM TYPES
// ============================================================================

export type PartyType = 'bachelor' | 'bachelorette';
export type EventStatus = 'draft' | 'planning' | 'booked' | 'completed' | 'cancelled';
export type GatheringSize = 'intimate' | 'small_group' | 'party';
export type SocialApproach = 'wallflower' | 'butterfly' | 'observer' | 'mingler';
export type EnergyLevel = 'low_key' | 'moderate' | 'high_energy';
export type AgeRange = '21-25' | '26-30' | '31-35' | '35+';
export type GroupCohesion = 'close_friends' | 'mixed_group' | 'strangers';
export type ParticipantRole = 'organizer' | 'guest' | 'honoree';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type PackageTier = 'essential' | 'classic' | 'grand';
export type BookingPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type ChannelCategory = 'general' | 'accommodation' | 'activities' | 'budget';
export type PollCategory = 'accommodation' | 'activities' | 'budget' | 'general';
export type PollStatus = 'draft' | 'active' | 'closing_soon' | 'closed';

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          language: string;
          push_notifications_enabled: boolean;
          email_notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          language?: string;
          push_notifications_enabled?: boolean;
          email_notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          language?: string;
          push_notifications_enabled?: boolean;
          email_notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cities: {
        Row: {
          id: string;
          name: string;
          country: string;
          is_active: boolean;
          hero_image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          country?: string;
          is_active?: boolean;
          hero_image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          country?: string;
          is_active?: boolean;
          hero_image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          party_type: PartyType;
          honoree_name: string;
          city_id: string;
          start_date: string;
          end_date: string;
          vibe: string | null;
          status: EventStatus;
          hero_image_url: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          party_type: PartyType;
          honoree_name: string;
          city_id: string;
          start_date: string;
          end_date: string;
          vibe?: string | null;
          status?: EventStatus;
          hero_image_url?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          title?: string;
          party_type?: PartyType;
          honoree_name?: string;
          city_id?: string;
          start_date?: string;
          end_date?: string;
          vibe?: string | null;
          status?: EventStatus;
          hero_image_url?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_city_id_fkey';
            columns: ['city_id'];
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      event_preferences: {
        Row: {
          id: string;
          event_id: string;
          gathering_size: GatheringSize | null;
          social_approach: SocialApproach | null;
          energy_level: EnergyLevel | null;
          average_age: AgeRange | null;
          group_cohesion: GroupCohesion | null;
          vibe_preferences: string[] | null;
          selected_package_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          gathering_size?: GatheringSize | null;
          social_approach?: SocialApproach | null;
          energy_level?: EnergyLevel | null;
          average_age?: AgeRange | null;
          group_cohesion?: GroupCohesion | null;
          vibe_preferences?: string[] | null;
          selected_package_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          gathering_size?: GatheringSize | null;
          social_approach?: SocialApproach | null;
          energy_level?: EnergyLevel | null;
          average_age?: AgeRange | null;
          group_cohesion?: GroupCohesion | null;
          vibe_preferences?: string[] | null;
          selected_package_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_preferences_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          role: ParticipantRole;
          payment_status: PaymentStatus;
          contribution_amount_cents: number;
          invited_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          role: ParticipantRole;
          payment_status?: PaymentStatus;
          contribution_amount_cents?: number;
          invited_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          role?: ParticipantRole;
          payment_status?: PaymentStatus;
          contribution_amount_cents?: number;
          invited_at?: string;
          confirmed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'event_participants_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      packages: {
        Row: {
          id: string;
          name: string;
          tier: PackageTier;
          city_id: string;
          base_price_cents: number;
          price_per_person_cents: number;
          description: string | null;
          features: Json;
          premium_highlights: Json;
          hero_image_url: string | null;
          rating: number;
          review_count: number;
          ideal_gathering_size: string[] | null;
          ideal_energy_level: string[] | null;
          ideal_vibe: string[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tier: PackageTier;
          city_id: string;
          base_price_cents: number;
          price_per_person_cents: number;
          description?: string | null;
          features?: Json;
          premium_highlights?: Json;
          hero_image_url?: string | null;
          rating?: number;
          review_count?: number;
          ideal_gathering_size?: string[] | null;
          ideal_energy_level?: string[] | null;
          ideal_vibe?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tier?: PackageTier;
          city_id?: string;
          base_price_cents?: number;
          price_per_person_cents?: number;
          description?: string | null;
          features?: Json;
          premium_highlights?: Json;
          hero_image_url?: string | null;
          rating?: number;
          review_count?: number;
          ideal_gathering_size?: string[] | null;
          ideal_energy_level?: string[] | null;
          ideal_vibe?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'packages_city_id_fkey';
            columns: ['city_id'];
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          event_id: string;
          package_id: string;
          package_base_cents: number;
          service_fee_cents: number;
          total_amount_cents: number;
          exclude_honoree: boolean;
          paying_participants: number;
          per_person_cents: number;
          payment_status: BookingPaymentStatus;
          stripe_payment_intent_id: string | null;
          reference_number: string | null;
          audit_log: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          package_id: string;
          package_base_cents: number;
          service_fee_cents: number;
          total_amount_cents: number;
          exclude_honoree?: boolean;
          paying_participants: number;
          per_person_cents: number;
          payment_status?: BookingPaymentStatus;
          stripe_payment_intent_id?: string | null;
          reference_number?: string | null;
          audit_log?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          package_id?: string;
          package_base_cents?: number;
          service_fee_cents?: number;
          total_amount_cents?: number;
          exclude_honoree?: boolean;
          paying_participants?: number;
          per_person_cents?: number;
          payment_status?: BookingPaymentStatus;
          stripe_payment_intent_id?: string | null;
          reference_number?: string | null;
          audit_log?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_package_id_fkey';
            columns: ['package_id'];
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_channels: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          category: ChannelCategory;
          unread_count: number;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          category: ChannelCategory;
          unread_count?: number;
          last_message_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          category?: ChannelCategory;
          unread_count?: number;
          last_message_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_channels_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_channel_id_fkey';
            columns: ['channel_id'];
            referencedRelation: 'chat_channels';
            referencedColumns: ['id'];
          },
        ];
      };
      polls: {
        Row: {
          id: string;
          event_id: string;
          channel_id: string | null;
          category: PollCategory;
          title: string;
          description: string | null;
          status: PollStatus;
          ends_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          channel_id?: string | null;
          category: PollCategory;
          title: string;
          description?: string | null;
          status?: PollStatus;
          ends_at?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          channel_id?: string | null;
          category?: PollCategory;
          title?: string;
          description?: string | null;
          status?: PollStatus;
          ends_at?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'polls_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'polls_channel_id_fkey';
            columns: ['channel_id'];
            referencedRelation: 'chat_channels';
            referencedColumns: ['id'];
          },
        ];
      };
      poll_options: {
        Row: {
          id: string;
          poll_id: string;
          label: string;
          vote_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          label: string;
          vote_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          label?: string;
          vote_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'poll_options_poll_id_fkey';
            columns: ['poll_id'];
            referencedRelation: 'polls';
            referencedColumns: ['id'];
          },
        ];
      };
      poll_votes: {
        Row: {
          id: string;
          poll_id: string;
          option_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          option_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          option_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'poll_votes_poll_id_fkey';
            columns: ['poll_id'];
            referencedRelation: 'polls';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'poll_votes_option_id_fkey';
            columns: ['option_id'];
            referencedRelation: 'poll_options';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          event_id: string | null;
          type: string;
          title: string;
          body: string;
          action_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id?: string | null;
          type: string;
          title: string;
          body: string;
          action_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string | null;
          type?: string;
          title?: string;
          body?: string;
          action_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      invite_codes: {
        Row: {
          id: string;
          event_id: string;
          code: string;
          created_by: string;
          expires_at: string;
          max_uses: number | null;
          use_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          code: string;
          created_by: string;
          expires_at?: string;
          max_uses?: number | null;
          use_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          code?: string;
          created_by?: string;
          expires_at?: string;
          max_uses?: number | null;
          use_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invite_codes_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {};
    Functions: {
      generate_booking_reference: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      party_type: PartyType;
      event_status: EventStatus;
      gathering_size: GatheringSize;
      social_approach: SocialApproach;
      energy_level: EnergyLevel;
      age_range: AgeRange;
      group_cohesion: GroupCohesion;
      participant_role: ParticipantRole;
      payment_status: PaymentStatus;
      package_tier: PackageTier;
      booking_payment_status: BookingPaymentStatus;
      channel_category: ChannelCategory;
      poll_category: PollCategory;
      poll_status: PollStatus;
    };
    CompositeTypes: {};
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// ============================================================================
// CONVENIENCE TYPE ALIASES
// ============================================================================

export type Profile = Tables<'profiles'>;
export type City = Tables<'cities'>;
export type Event = Tables<'events'>;
export type EventPreferences = Tables<'event_preferences'>;
export type EventParticipant = Tables<'event_participants'>;
export type Package = Tables<'packages'>;
export type Booking = Tables<'bookings'>;
export type ChatChannel = Tables<'chat_channels'>;
export type Message = Tables<'messages'>;
export type Poll = Tables<'polls'>;
export type PollOption = Tables<'poll_options'>;
export type PollVote = Tables<'poll_votes'>;
export type Notification = Tables<'notifications'>;
export type InviteCode = Tables<'invite_codes'>;

// ============================================================================
// JOINED TYPES (for queries with relationships)
// ============================================================================

export interface EventWithCity extends Event {
  city: City;
}

export interface EventWithPreferences extends Event {
  preferences: EventPreferences | null;
  city: City;
}

export interface EventWithParticipants extends Event {
  participants: EventParticipant[];
  city: City;
}

export interface BookingWithPackage extends Booking {
  package: Package;
}

export interface MessageWithUser extends Message {
  user: Profile;
}

export interface PollWithOptions extends Poll {
  options: PollOption[];
}

export interface InviteCodeWithEvent extends InviteCode {
  event: EventWithCity;
}
