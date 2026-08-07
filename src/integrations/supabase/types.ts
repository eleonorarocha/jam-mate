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
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      booking_events: {
        Row: {
          actor_id: string | null
          booking_id: string
          created_at: string
          event_type: string
          id: string
          reason: string | null
        }
        Insert: {
          actor_id?: string | null
          booking_id: string
          created_at?: string
          event_type: string
          id?: string
          reason?: string | null
        }
        Update: {
          actor_id?: string | null
          booking_id?: string
          created_at?: string
          event_type?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          duration_hours: number
          id: string
          message: string | null
          musician_id: string
          reminder_sent: boolean
          requester_id: string
          scheduled_date: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string
          duration_hours?: number
          id?: string
          message?: string | null
          musician_id: string
          reminder_sent?: boolean
          requester_id: string
          scheduled_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string
          duration_hours?: number
          id?: string
          message?: string | null
          musician_id?: string
          reminder_sent?: boolean
          requester_id?: string
          scheduled_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          musician_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          musician_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          musician_id?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          id: string
          message: string
          rating: number | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          rating?: number | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          rating?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      jam_media: {
        Row: {
          booking_id: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          media_type: string
          media_url: string
          thumbnail_url: string | null
          title: string | null
          uploader_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          media_type: string
          media_url: string
          thumbnail_url?: string | null
          title?: string | null
          uploader_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          media_type?: string
          media_url?: string
          thumbnail_url?: string | null
          title?: string | null
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jam_media_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_snippets: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number
          id: string
          storage_path: string
          title: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds: number
          id?: string
          storage_path: string
          title: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          storage_path?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_stripe_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approx_geom: unknown
          approx_latitude: number | null
          approx_longitude: number | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          email_verified: boolean | null
          first_name: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          genres: string[]
          id: string
          identity_verified: boolean | null
          instrument: string
          language: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          onboarding_completed: boolean
          phone: string | null
          phone_verified: boolean | null
          preferred_instruments: string[] | null
          preferred_skill_levels: string[] | null
          pro_until: string | null
          skill_level: Database["public"]["Enums"]["skill_level"]
          time_zone: string | null
          total_ratings: number | null
          updated_at: string
          username: string
        }
        Insert: {
          approx_geom?: unknown
          approx_latitude?: number | null
          approx_longitude?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email_verified?: boolean | null
          first_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          genres?: string[]
          id: string
          identity_verified?: boolean | null
          instrument: string
          language?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_verified?: boolean | null
          preferred_instruments?: string[] | null
          preferred_skill_levels?: string[] | null
          pro_until?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
          time_zone?: string | null
          total_ratings?: number | null
          updated_at?: string
          username: string
        }
        Update: {
          approx_geom?: unknown
          approx_latitude?: number | null
          approx_longitude?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email_verified?: boolean | null
          first_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          genres?: string[]
          id?: string
          identity_verified?: boolean | null
          instrument?: string
          language?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_verified?: boolean | null
          preferred_instruments?: string[] | null
          preferred_skill_levels?: string[] | null
          pro_until?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
          time_zone?: string | null
          total_ratings?: number | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          enjoyment_rating: number | null
          id: string
          location_rating: number | null
          punctuality_rating: number | null
          rated_user_id: string
          rater_id: string
          rating: number
          respect_rating: number | null
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          enjoyment_rating?: number | null
          id?: string
          location_rating?: number | null
          punctuality_rating?: number | null
          rated_user_id: string
          rater_id: string
          rating: number
          respect_rating?: number | null
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          enjoyment_rating?: number | null
          id?: string
          location_rating?: number | null
          punctuality_rating?: number | null
          rated_user_id?: string
          rater_id?: string
          rating?: number
          respect_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rated_user_id_fkey"
            columns: ["rated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rated_user_id_fkey"
            columns: ["rated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rated_user_id_fkey"
            columns: ["rated_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          environment: string
          id: string
          price_id: string | null
          provider: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          provider?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          provider?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          approx_latitude: number | null
          approx_longitude: number | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string | null
          instrument: string | null
          onboarding_completed: boolean | null
          preferred_instruments: string[] | null
          preferred_skill_levels: string[] | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          total_ratings: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          approx_latitude?: number | null
          approx_longitude?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string | null
          instrument?: string | null
          onboarding_completed?: boolean | null
          preferred_instruments?: string[] | null
          preferred_skill_levels?: string[] | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          total_ratings?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          approx_latitude?: number | null
          approx_longitude?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string | null
          instrument?: string | null
          onboarding_completed?: boolean | null
          preferred_instruments?: string[] | null
          preferred_skill_levels?: string[] | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          total_ratings?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          approx_latitude: number | null
          approx_longitude: number | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email_verified: boolean | null
          first_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string | null
          instrument: string | null
          onboarding_completed: boolean | null
          phone_verified: boolean | null
          preferred_instruments: string[] | null
          preferred_skill_levels: string[] | null
          pro_until: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          total_ratings: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          approx_latitude?: number | null
          approx_longitude?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string | null
          instrument?: string | null
          onboarding_completed?: boolean | null
          phone_verified?: boolean | null
          preferred_instruments?: string[] | null
          preferred_skill_levels?: string[] | null
          pro_until?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          total_ratings?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          approx_latitude?: number | null
          approx_longitude?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string | null
          instrument?: string | null
          onboarding_completed?: boolean | null
          phone_verified?: boolean | null
          preferred_instruments?: string[] | null
          preferred_skill_levels?: string[] | null
          pro_until?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          total_ratings?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_sensitive_profile: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      get_map_clusters: {
        Args: {
          _max_lat: number
          _max_lng: number
          _min_lat: number
          _min_lng: number
          _zoom: number
        }
        Returns: {
          cluster_key: string
          lat: number
          lng: number
          point_count: number
          pro_count: number
          profile_id: string
        }[]
      }
      get_musician_busy_slots: {
        Args: { _musician_id: string }
        Returns: {
          duration_hours: number
          scheduled_date: string
        }[]
      }
      get_profile_sensitive: {
        Args: { _profile_id: string }
        Returns: {
          email_verified: boolean
          identity_verified: boolean
          last_name: string
          latitude: number
          longitude: number
          phone: string
          phone_verified: boolean
        }[]
      }
      has_accepted_booking_with: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      has_block_between: {
        Args: { _user1: string; _user2: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: {
        Args: { _by_user_id: string; _user_id: string }
        Returns: boolean
      }
      is_pro: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      booking_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
      gender_type: "male" | "female"
      skill_level: "beginner" | "intermediate" | "advanced" | "professional"
      subscription_status: "active" | "cancelled" | "expired"
      subscription_tier: "free" | "pro"
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
      app_role: ["admin", "moderator", "user"],
      booking_status: [
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
      gender_type: ["male", "female"],
      skill_level: ["beginner", "intermediate", "advanced", "professional"],
      subscription_status: ["active", "cancelled", "expired"],
      subscription_tier: ["free", "pro"],
    },
  },
} as const
