export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      app_users: {
        Row: {
          firebase_uid: string;
          first_name: string;
          last_name: string;
          email: string;
          role: 'client' | 'trainer' | 'admin';
          timezone: string;
          locale: string;
          is_adult_confirmed: boolean;
          privacy_consent_accepted: boolean;
          onboarding_completed: boolean;
          celebrated_date_keys: string[];
          pending_invite_token: string | null;
          notification_prefs: Json;
          referral_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['app_users']['Row']> & {
          firebase_uid: string;
          first_name: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['app_users']['Row']>;
        Relationships: [];
      };
      platform_admins: {
        Row: {
          firebase_uid: string;
          granted_by: string | null;
          granted_at: string;
        };
        Insert: {
          firebase_uid: string;
          granted_by?: string | null;
          granted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['platform_admins']['Row']>;
        Relationships: [];
      };
      trainer_profiles: {
        Row: {
          id: string;
          user_id: string;
          slug: string;
          display_name: string;
          headline: string;
          bio: string;
          coaching_style: string;
          city: string;
          coaching_mode: 'online' | 'in_person' | 'hybrid';
          specialties: string[];
          languages: string[];
          certifications: string[];
          experience_years: number;
          avatar_key: string;
          cover_key: string;
          photo_url: string | null;
          whatsapp_business_e164: string | null;
          verification_status: 'unverified' | 'pending' | 'verified';
          is_demo_verified: boolean;
          demo_verification_note: string;
          demo_phone_label: string;
          accepting_clients: boolean;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trainer_profiles']['Row']> & {
          id: string;
          user_id: string;
          slug: string;
          display_name: string;
        };
        Update: Partial<Database['public']['Tables']['trainer_profiles']['Row']>;
        Relationships: [];
      };
      client_profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          age: number | null;
          height_cm: number | null;
          weight_kg: number | null;
          target_weight_kg: number | null;
          primary_goal: string;
          experience_level: 'beginner' | 'intermediate' | 'experienced';
          days_per_week: number;
          environment: 'gym' | 'home' | 'outdoors';
          equipment: string[];
          dietary_preference: string;
          dietary_notes: string | null;
          food_allergies: string | null;
          health_limitations: string | null;
          preferred_language: string | null;
          coaching_preferences: string | null;
          coach_notes: string | null;
          scenario_tag: string | null;
          renewal_due_date: string | null;
          active_trainer_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['client_profiles']['Row']> & {
          id: string;
          user_id: string;
          first_name: string;
        };
        Update: Partial<Database['public']['Tables']['client_profiles']['Row']>;
        Relationships: [];
      };
      coaching_packages: {
        Row: {
          id: string;
          trainer_id: string;
          trainer_user_id: string;
          name: string;
          summary: string;
          price_inr: number;
          cadence: 'monthly' | 'quarterly' | 'free';
          duration_days: number;
          consultations_included: number;
          features: string[];
          status: 'active' | 'paused';
          is_demo_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['coaching_packages']['Row']> & {
          id: string;
          trainer_id: string;
          trainer_user_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['coaching_packages']['Row']>;
        Relationships: [];
      };
      coaching_relationships: {
        Row: {
          id: string;
          trainer_id: string;
          trainer_user_id: string;
          client_id: string;
          client_user_id: string;
          package_id: string | null;
          status: 'pending' | 'active' | 'ended';
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['coaching_relationships']['Row']> & {
          id: string;
          trainer_id: string;
          trainer_user_id: string;
          client_id: string;
          client_user_id: string;
        };
        Update: Partial<Database['public']['Tables']['coaching_relationships']['Row']>;
        Relationships: [];
      };
      trainer_invites: {
        Row: {
          id: string;
          token: string;
          trainer_id: string;
          trainer_user_id: string;
          client_email_or_label: string;
          suggested_package_id: string | null;
          status: 'active' | 'redeemed' | 'expired' | 'revoked';
          redeemed_by_client_id: string | null;
          redeemed_by_user_id: string | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trainer_invites']['Row']> & {
          id: string;
          token: string;
          trainer_id: string;
          trainer_user_id: string;
          client_email_or_label: string;
          expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['trainer_invites']['Row']>;
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_id: string;
          trainer_user_id: string;
          package_id: string;
          subscription_id: string | null;
          status: 'active' | 'ended';
          is_demo_checkout: boolean;
          enrolled_at: string;
          ended_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['enrollments']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_id: string;
          trainer_user_id: string;
          package_id: string;
        };
        Update: Partial<Database['public']['Tables']['enrollments']['Row']>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          client_user_id: string;
          trainer_user_id: string;
          package_id: string;
          status: 'active' | 'cancelled' | 'expired' | 'past_due';
          current_period_start: string;
          current_period_end: string;
          amount_inr: number;
          amount_paise: number;
          currency: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['subscriptions']['Row']> & {
          id: string;
          client_user_id: string;
          trainer_user_id: string;
          package_id: string;
          current_period_end: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>;
        Relationships: [];
      };
      payment_records: {
        Row: {
          id: string;
          client_user_id: string;
          trainer_user_id: string;
          package_id: string;
          subscription_id: string | null;
          amount_inr: number;
          amount_paise: number;
          currency: string;
          cashfree_order_id: string;
          cashfree_payment_id: string | null;
          status: 'pending' | 'captured' | 'failed' | 'refunded';
          gateway_status: string | null;
          payment_method: string | null;
          coupon_code: string | null;
          discount_inr: number;
          gst_inr: number;
          platform_fee_inr: number;
          trainer_net_inr: number;
          is_demo_order: boolean;
          raw_gateway_payload: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['payment_records']['Row']> & {
          id: string;
          client_user_id: string;
          trainer_user_id: string;
          package_id: string;
          amount_inr: number;
          amount_paise: number;
          cashfree_order_id: string;
        };
        Update: Partial<Database['public']['Tables']['payment_records']['Row']>;
        Relationships: [];
      };
      coupons: {
        Row: {
          code: string;
          discount_type: 'percentage' | 'flat';
          discount_value: number;
          max_discount_inr: number | null;
          min_order_inr: number;
          valid_from: string;
          valid_until: string;
          max_uses: number | null;
          used_count: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['coupons']['Row']> & {
          code: string;
          discount_type: 'percentage' | 'flat';
          discount_value: number;
          valid_until: string;
        };
        Update: Partial<Database['public']['Tables']['coupons']['Row']>;
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_user_id: string;
          referrer_name: string;
          referrer_role: 'client' | 'trainer';
          referral_code: string;
          referee_user_id: string | null;
          referee_name: string | null;
          referee_email: string | null;
          status: 'pending' | 'signed_up' | 'converted';
          reward_inr: number;
          reward_paise: number;
          reward_type: 'coaching_credit' | 'payout';
          package_id: string | null;
          package_name: string | null;
          payment_id: string | null;
          converted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['referrals']['Row']> & {
          id: string;
          referrer_user_id: string;
          referrer_name: string;
          referrer_role: 'client' | 'trainer';
          referral_code: string;
        };
        Update: Partial<Database['public']['Tables']['referrals']['Row']>;
        Relationships: [];
      };
      task_templates: {
        Row: {
          id: string;
          trainer_user_id: string;
          title: string;
          category: 'workout' | 'nutrition' | 'habit' | 'recovery' | 'check_in';
          instructions: string;
          duration_minutes: number;
          completion_type: 'checkbox' | 'log_value' | 'session_log';
          target_label: string | null;
          is_recovery_default: boolean;
          is_optional_default: boolean;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['task_templates']['Row']> & {
          id: string;
          trainer_user_id: string;
          title: string;
          category: 'workout' | 'nutrition' | 'habit' | 'recovery' | 'check_in';
          completion_type: 'checkbox' | 'log_value' | 'session_log';
        };
        Update: Partial<Database['public']['Tables']['task_templates']['Row']>;
        Relationships: [];
      };
      task_assignments: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_id: string | null;
          trainer_user_id: string | null;
          template_id: string | null;
          title: string;
          category: 'workout' | 'nutrition' | 'habit' | 'recovery' | 'check_in';
          instructions: string;
          duration_minutes: number;
          due_time: string;
          completion_type: 'checkbox' | 'log_value' | 'session_log';
          target_label: string | null;
          scheduled_dates: string[];
          is_optional: boolean;
          is_recovery: boolean;
          has_custom_override: boolean;
          override_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['task_assignments']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          title: string;
          category: 'workout' | 'nutrition' | 'habit' | 'recovery' | 'check_in';
          completion_type: 'checkbox' | 'log_value' | 'session_log';
        };
        Update: Partial<Database['public']['Tables']['task_assignments']['Row']>;
        Relationships: [];
      };
      task_completions: {
        Row: {
          id: string;
          assignment_id: string;
          client_id: string;
          client_user_id: string;
          trainer_user_id: string | null;
          date_key: string;
          completed_at: string;
          logged_value: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['task_completions']['Row']> & {
          id: string;
          assignment_id: string;
          client_id: string;
          client_user_id: string;
          date_key: string;
        };
        Update: Partial<Database['public']['Tables']['task_completions']['Row']>;
        Relationships: [];
      };
      workout_plans: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_id: string | null;
          trainer_user_id: string | null;
          name: string;
          focus: string;
          days: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['workout_plans']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['workout_plans']['Row']>;
        Relationships: [];
      };
      meal_plans: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_id: string | null;
          trainer_user_id: string | null;
          title: string;
          daily_calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          hydration_target_glasses: number;
          slots: Json;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['meal_plans']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['meal_plans']['Row']>;
        Relationships: [];
      };
      workout_program_templates: {
        Row: {
          id: string;
          trainer_id: string;
          trainer_user_id: string;
          title: string;
          description: string;
          category: string;
          tags: string[];
          week_count: number;
          days: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['workout_program_templates']['Row']> & {
          id: string;
          trainer_id: string;
          trainer_user_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['workout_program_templates']['Row']>;
        Relationships: [];
      };
      nutrition_program_templates: {
        Row: {
          id: string;
          trainer_id: string;
          trainer_user_id: string;
          title: string;
          description: string;
          dietary_type: string;
          target_kcal: number;
          target_protein_g: number;
          hydration_target_glasses: number;
          slots: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['nutrition_program_templates']['Row']> & {
          id: string;
          trainer_id: string;
          trainer_user_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['nutrition_program_templates']['Row']>;
        Relationships: [];
      };
      exercise_definitions: {
        Row: {
          id: string;
          name: string;
          muscle_group: string;
          secondary_muscles: string[];
          equipment_required: string;
          instructions: string[];
          tips: string[];
          gif_url: string | null;
          video_url: string | null;
          is_custom: boolean;
          created_by_user_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['exercise_definitions']['Row']> & {
          id: string;
          name: string;
          muscle_group: string;
        };
        Update: Partial<Database['public']['Tables']['exercise_definitions']['Row']>;
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_user_id: string | null;
          assignment_id: string | null;
          title: string;
          date_key: string;
          duration_minutes: number;
          total_volume_kg: number;
          exercises: Json;
          coach_feedback: string | null;
          coach_feedback_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['workout_sessions']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          title: string;
          date_key: string;
        };
        Update: Partial<Database['public']['Tables']['workout_sessions']['Row']>;
        Relationships: [];
      };
      nutrition_diary_entries: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_user_id: string | null;
          date_key: string;
          slot: string;
          foods: Json;
          total_kcal: number;
          total_protein_g: number;
          total_carbs_g: number;
          total_fat_g: number;
          photo_url: string | null;
          coach_feedback: string | null;
          coach_feedback_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['nutrition_diary_entries']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          date_key: string;
          slot: string;
        };
        Update: Partial<Database['public']['Tables']['nutrition_diary_entries']['Row']>;
        Relationships: [];
      };
      weekly_check_ins: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_user_id: string | null;
          date_key: string;
          weight_kg: number | null;
          energy_rating: number | null;
          sleep_rating: number | null;
          stress_rating: number | null;
          digestive_rating: number | null;
          win_of_the_week: string | null;
          struggle_of_the_week: string | null;
          coach_notes: string | null;
          photo_url: string | null;
          trainer_feedback: string | null;
          trainer_feedback_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['weekly_check_ins']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          date_key: string;
        };
        Update: Partial<Database['public']['Tables']['weekly_check_ins']['Row']>;
        Relationships: [];
      };
      progress_events: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_user_id: string | null;
          date_key: string;
          metric_type: string;
          numeric_value: number;
          photo_url: string | null;
          photo_key: string | null;
          share_with_trainer: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['progress_events']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          date_key: string;
          metric_type: string;
          numeric_value: number;
        };
        Update: Partial<Database['public']['Tables']['progress_events']['Row']>;
        Relationships: [];
      };
      daily_activity: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_user_id: string | null;
          date_key: string;
          water_glasses: number;
          step_count: number;
          sleep_hours: number | null;
          mood: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['daily_activity']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          date_key: string;
        };
        Update: Partial<Database['public']['Tables']['daily_activity']['Row']>;
        Relationships: [];
      };
      streak_records: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          trainer_user_id: string | null;
          current_streak: number;
          longest_streak: number;
          last_completed_date_key: string | null;
          streak_freeze_available: number;
          consistency_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['streak_records']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
        };
        Update: Partial<Database['public']['Tables']['streak_records']['Row']>;
        Relationships: [];
      };
      achievement_unlocks: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          badge_id: string;
          unlocked_at: string;
          celebrated: boolean;
        };
        Insert: Partial<Database['public']['Tables']['achievement_unlocks']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          badge_id: string;
        };
        Update: Partial<Database['public']['Tables']['achievement_unlocks']['Row']>;
        Relationships: [];
      };
      chat_conversations: {
        Row: {
          id: string;
          client_id: string;
          client_user_id: string;
          client_name: string;
          client_avatar: string | null;
          trainer_id: string;
          trainer_user_id: string;
          trainer_name: string;
          trainer_avatar: string | null;
          last_message_text: string | null;
          last_message_at: string | null;
          last_message_sender_id: string | null;
          unread_count_client: number;
          unread_count_trainer: number;
          is_blocked: boolean;
          blocked_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['chat_conversations']['Row']> & {
          id: string;
          client_id: string;
          client_user_id: string;
          client_name: string;
          trainer_id: string;
          trainer_user_id: string;
          trainer_name: string;
        };
        Update: Partial<Database['public']['Tables']['chat_conversations']['Row']>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_user_id: string;
          sender_role: 'client' | 'trainer' | 'admin';
          text: string;
          reply_to: Json | null;
          attachment: Json | null;
          reference: Json | null;
          read_by_recipient: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['chat_messages']['Row']> & {
          id: string;
          conversation_id: string;
          sender_user_id: string;
          sender_role: 'client' | 'trainer' | 'admin';
          text: string;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Row']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_user_id: string;
          category: 'workout' | 'nutrition' | 'check_in' | 'billing' | 'chat' | 'admin';
          title: string;
          body: string;
          action_url: string | null;
          metadata: Json | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notifications']['Row']> & {
          id: string;
          recipient_user_id: string;
          category: 'workout' | 'nutrition' | 'check_in' | 'billing' | 'chat' | 'admin';
          title: string;
          body: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
        Relationships: [];
      };
      scheduled_reminders: {
        Row: {
          id: string;
          recipient_user_id: string;
          category: 'workout' | 'check_in' | 'consultation' | 'subscription' | 'chat';
          title: string;
          body: string;
          scheduled_for: string;
          trigger_status: 'scheduled' | 'sent' | 'cancelled';
          idempotency_key: string;
          channel: 'in_app' | 'whatsapp_manual' | 'push';
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['scheduled_reminders']['Row']> & {
          id: string;
          recipient_user_id: string;
          category: 'workout' | 'check_in' | 'consultation' | 'subscription' | 'chat';
          title: string;
          body: string;
          scheduled_for: string;
          idempotency_key: string;
        };
        Update: Partial<Database['public']['Tables']['scheduled_reminders']['Row']>;
        Relationships: [];
      };
      consultation_slots: {
        Row: {
          id: string;
          trainer_user_id: string;
          start_time: string;
          end_time: string;
          status: 'available' | 'booked' | 'cancelled';
          meeting_link: string | null;
          booked_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['consultation_slots']['Row']> & {
          id: string;
          trainer_user_id: string;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Database['public']['Tables']['consultation_slots']['Row']>;
        Relationships: [];
      };
      consultation_bookings: {
        Row: {
          id: string;
          slot_id: string;
          trainer_user_id: string;
          client_user_id: string;
          status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          meeting_link: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['consultation_bookings']['Row']> & {
          id: string;
          slot_id: string;
          trainer_user_id: string;
          client_user_id: string;
        };
        Update: Partial<Database['public']['Tables']['consultation_bookings']['Row']>;
        Relationships: [];
      };
      ai_plan_drafts: {
        Row: {
          id: string;
          trainer_user_id: string;
          client_id: string;
          objective: string;
          level: string;
          days_per_week: number;
          split: string;
          dietary_pref: string;
          target_calories: number;
          target_protein_g: number;
          workout_days: Json;
          meal_slots: Json;
          trainer_approved: boolean;
          status: 'draft' | 'approved' | 'applied' | 'discarded';
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_plan_drafts']['Row']> & {
          id: string;
          trainer_user_id: string;
          client_id: string;
          objective: string;
          level: string;
        };
        Update: Partial<Database['public']['Tables']['ai_plan_drafts']['Row']>;
        Relationships: [];
      };
      client_groups: {
        Row: {
          id: string;
          trainer_user_id: string;
          name: string;
          description: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['client_groups']['Row']> & {
          id: string;
          trainer_user_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['client_groups']['Row']>;
        Relationships: [];
      };
      client_group_members: {
        Row: {
          id: string;
          group_id: string;
          trainer_user_id: string;
          client_id: string;
          client_user_id: string;
          joined_at: string;
        };
        Insert: Partial<Database['public']['Tables']['client_group_members']['Row']> & {
          id: string;
          group_id: string;
          trainer_user_id: string;
          client_id: string;
          client_user_id: string;
        };
        Update: Partial<Database['public']['Tables']['client_group_members']['Row']>;
        Relationships: [];
      };
      consent_records: {
        Row: {
          id: string;
          user_id: string;
          consent_type: string;
          policy_version: string;
          accepted_at: string;
          user_agent: string | null;
          ip_address: string | null;
        };
        Insert: Partial<Database['public']['Tables']['consent_records']['Row']> & {
          id: string;
          user_id: string;
          consent_type: string;
          policy_version: string;
        };
        Update: Partial<Database['public']['Tables']['consent_records']['Row']>;
        Relationships: [];
      };
      trainer_verification_requests: {
        Row: {
          id: string;
          trainer_user_id: string;
          qualification_title: string;
          issuing_body: string;
          document_url: string;
          status: 'pending' | 'approved' | 'rejected';
          reviewer_user_id: string | null;
          reviewer_note: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trainer_verification_requests']['Row']> & {
          id: string;
          trainer_user_id: string;
          qualification_title: string;
          issuing_body: string;
          document_url: string;
        };
        Update: Partial<Database['public']['Tables']['trainer_verification_requests']['Row']>;
        Relationships: [];
      };
      trainer_reviews: {
        Row: {
          id: string;
          trainer_user_id: string;
          client_user_id: string;
          rating: number;
          review_text: string;
          verified_enrollment: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trainer_reviews']['Row']> & {
          id: string;
          trainer_user_id: string;
          client_user_id: string;
          rating: number;
        };
        Update: Partial<Database['public']['Tables']['trainer_reviews']['Row']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          target_resource: string;
          details: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']> & {
          id: string;
          action: string;
          target_resource: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>;
        Relationships: [];
      };
      feature_flags: {
        Row: {
          flag_key: string;
          is_enabled: boolean;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          flag_key: string;
          is_enabled?: boolean;
          description?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['feature_flags']['Row']>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_payment_subscription: {
        Args: {
          p_order_id: string;
          p_payment_id: string;
          p_gateway_status: string;
          p_payment_method: string;
          p_raw_payload: Json;
        };
        Returns: Json;
      };
      recalculate_streak: {
        Args: {
          p_client_uid: string;
        };
        Returns: Json;
      };
      get_trainer_analytics: {
        Args: {
          p_trainer_uid: string;
        };
        Returns: Json;
      };
    };
  };
}
