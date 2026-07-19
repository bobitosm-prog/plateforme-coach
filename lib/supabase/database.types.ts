// GENERATED FILE — DO NOT EDIT MANUALLY.
// Source: canonical local Supabase schema (public), rebuilt from versioned migrations.
// Regenerate with: npm run supabase:types:generate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string | null
          condition_type: string | null
          condition_value: number | null
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          condition_type?: string | null
          condition_value?: number | null
          description?: string | null
          icon?: string | null
          id: string
          name: string
          sort_order?: number | null
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          condition_type?: string | null
          condition_value?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      activity_feed: {
        Row: {
          coach_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          title: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          title?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          title?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          success: boolean | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          success?: boolean | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          success?: boolean | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          level: string
          message: string
          page_url: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level: string
          message: string
          page_url?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          message?: string
          page_url?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          condition_type: string
          condition_value: number
          description: string
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          xp_reward: number
        }
        Insert: {
          category: string
          condition_type: string
          condition_value: number
          description: string
          icon?: string | null
          id: string
          name: string
          sort_order?: number | null
          xp_reward?: number
        }
        Update: {
          category?: string
          condition_type?: string
          condition_value?: number
          description?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          xp_reward?: number
        }
        Relationships: []
      }
      beta_campaigns: {
        Row: {
          created_at: string
          free_days: number
          id: string
          is_active: boolean
          max_slots: number
          name: string
          used_slots: number
        }
        Insert: {
          created_at?: string
          free_days: number
          id?: string
          is_active?: boolean
          max_slots: number
          name: string
          used_slots?: number
        }
        Update: {
          created_at?: string
          free_days?: number
          id?: string
          is_active?: boolean
          max_slots?: number
          name?: string
          used_slots?: number
        }
        Relationships: []
      }
      body_analyses: {
        Row: {
          body_fat_estimate: number | null
          created_at: string | null
          id: string
          improvements: string[] | null
          lean_mass_estimate: number | null
          photos_used: number | null
          strengths: string[] | null
          summary: string | null
          symmetry_score: number | null
          user_id: string | null
        }
        Insert: {
          body_fat_estimate?: number | null
          created_at?: string | null
          id?: string
          improvements?: string[] | null
          lean_mass_estimate?: number | null
          photos_used?: number | null
          strengths?: string[] | null
          summary?: string | null
          symmetry_score?: number | null
          user_id?: string | null
        }
        Update: {
          body_fat_estimate?: number | null
          created_at?: string | null
          id?: string
          improvements?: string[] | null
          lean_mass_estimate?: number | null
          photos_used?: number | null
          strengths?: string[] | null
          summary?: string | null
          symmetry_score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      body_assessments: {
        Row: {
          ai_assessment: string | null
          created_at: string | null
          id: string
          muscle_balance: Json | null
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          recommendations: string[] | null
          strong_zones: string[] | null
          user_id: string | null
          weak_zones: string[] | null
        }
        Insert: {
          ai_assessment?: string | null
          created_at?: string | null
          id?: string
          muscle_balance?: Json | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          recommendations?: string[] | null
          strong_zones?: string[] | null
          user_id?: string | null
          weak_zones?: string[] | null
        }
        Update: {
          ai_assessment?: string | null
          created_at?: string | null
          id?: string
          muscle_balance?: Json | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          recommendations?: string[] | null
          strong_zones?: string[] | null
          user_id?: string | null
          weak_zones?: string[] | null
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          biceps: number | null
          calves: number | null
          chest: number | null
          created_at: string | null
          date: string
          hips: number | null
          id: string
          thighs: number | null
          user_id: string | null
          waist: number | null
        }
        Insert: {
          biceps?: number | null
          calves?: number | null
          chest?: number | null
          created_at?: string | null
          date?: string
          hips?: number | null
          id?: string
          thighs?: number | null
          user_id?: string | null
          waist?: number | null
        }
        Update: {
          biceps?: number | null
          calves?: number | null
          chest?: number | null
          created_at?: string | null
          date?: string
          hips?: number | null
          id?: string
          thighs?: number | null
          user_id?: string | null
          waist?: number | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string
          id: string
          page_url: string | null
          priority: string | null
          screenshot_url: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description: string
          id?: string
          page_url?: string | null
          priority?: string | null
          screenshot_url?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string
          id?: string
          page_url?: string | null
          priority?: string | null
          screenshot_url?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      cardio_sessions: {
        Row: {
          calories_burned: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          duration_min: number
          exercises: Json | null
          id: string
          name: string
          notes: string | null
          scheduled_date: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          calories_burned?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          duration_min: number
          exercises?: Json | null
          id?: string
          name: string
          notes?: string | null
          scheduled_date?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          calories_burned?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          duration_min?: number
          exercises?: Json | null
          id?: string
          name?: string
          notes?: string | null
          scheduled_date?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_ai_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_ai_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meal_plans: {
        Row: {
          client_id: string | null
          coach_id: string | null
          created_at: string | null
          id: string
          plan: Json
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          plan?: Json
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          plan?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      client_programs: {
        Row: {
          client_id: string | null
          coach_id: string | null
          created_at: string | null
          id: string
          program: Json
          training_program_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          program?: Json
          training_program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          id?: string
          program?: Json
          training_program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_programs_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_appointments: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          duration_minutes: number
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          session_type: string
          status: string
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          session_type?: string
          status?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          session_type?: string
          status?: string
        }
        Relationships: []
      }
      coach_clients: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string | null
          id: string
          invited_by_coach: boolean | null
          status: string
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string | null
          id?: string
          invited_by_coach?: boolean | null
          status?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string | null
          id?: string
          invited_by_coach?: boolean | null
          status?: string
        }
        Relationships: []
      }
      coach_invitations: {
        Row: {
          coach_id: string
          consumed_at: string | null
          consumed_by: string | null
          created_at: string
          delivery_attempted_at: string | null
          delivery_status: string
          expires_at: string
          id: string
          invitation_type: string
          metadata: Json
          recipient_email: string
          revoked_at: string | null
          revoked_by: string | null
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          delivery_attempted_at?: string | null
          delivery_status?: string
          expires_at: string
          id?: string
          invitation_type?: string
          metadata?: Json
          recipient_email: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          delivery_attempted_at?: string | null
          delivery_status?: string
          expires_at?: string
          id?: string
          invitation_type?: string
          metadata?: Json
          recipient_email?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_invitations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invitations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notes: {
        Row: {
          client_id: string | null
          coach_id: string | null
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          client_id?: string | null
          coach_id?: string | null
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          client_id?: string | null
          coach_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          coach_id: string | null
          created_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          amount: number
          coach_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          amount?: number
          coach_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_foods: {
        Row: {
          barcode: string | null
          brand: string | null
          calories_per_100g: number
          carbs_per_100g: number | null
          created_at: string | null
          created_by: string | null
          fat_per_100g: number | null
          fiber_per_100g: number | null
          id: string
          name: string
          protein_per_100g: number | null
          serving_name: string | null
          serving_size_g: number | null
          uses_count: number | null
          verified: boolean | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories_per_100g: number
          carbs_per_100g?: number | null
          created_at?: string | null
          created_by?: string | null
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          id?: string
          name: string
          protein_per_100g?: number | null
          serving_name?: string | null
          serving_size_g?: number | null
          uses_count?: number | null
          verified?: boolean | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories_per_100g?: number
          carbs_per_100g?: number | null
          created_at?: string | null
          created_by?: string | null
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          id?: string
          name?: string
          protein_per_100g?: number | null
          serving_name?: string | null
          serving_size_g?: number | null
          uses_count?: number | null
          verified?: boolean | null
        }
        Relationships: []
      }
      completed_sessions: {
        Row: {
          client_id: string
          coach_id: string | null
          completed_at: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          program_id: string | null
          session_index: number
          session_name: string
        }
        Insert: {
          client_id: string
          coach_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          program_id?: string | null
          session_index: number
          session_name: string
        }
        Update: {
          client_id?: string
          coach_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          program_id?: string | null
          session_index?: number
          session_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "client_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_exercises: {
        Row: {
          created_at: string | null
          description: string | null
          equipment: string | null
          id: string
          image_url: string | null
          is_private: boolean | null
          muscle_group: string | null
          name: string
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          equipment?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean | null
          muscle_group?: string | null
          name: string
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          equipment?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean | null
          muscle_group?: string | null
          name?: string
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      custom_foods: {
        Row: {
          barcode: string | null
          calories: number | null
          carbs: number | null
          created_at: string | null
          fat: number | null
          id: string
          image_url: string | null
          name: string
          proteins: number | null
          scan_count: number | null
          scanned_at: string | null
          user_id: string | null
        }
        Insert: {
          barcode?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          name: string
          proteins?: number | null
          scan_count?: number | null
          scanned_at?: string | null
          user_id?: string | null
        }
        Update: {
          barcode?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          name?: string
          proteins?: number | null
          scan_count?: number | null
          scanned_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      custom_programs: {
        Row: {
          created_at: string | null
          current_week: number | null
          days: Json
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          phases: Json | null
          scheduled: boolean | null
          source: string | null
          start_date: string | null
          total_weeks: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_week?: number | null
          days?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phases?: Json | null
          scheduled?: boolean | null
          source?: string | null
          start_date?: string | null
          total_weeks?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_week?: number | null
          days?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phases?: Json | null
          scheduled?: boolean | null
          source?: string | null
          start_date?: string | null
          total_weeks?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string | null
          date: string
          id: string
          mood: string
          note: string | null
          sleep_hours: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          mood: string
          note?: string | null
          sleep_hours?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          mood?: string
          note?: string | null
          sleep_hours?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_food_logs: {
        Row: {
          calories: number
          carbs: number | null
          created_at: string | null
          custom_name: string | null
          date: string
          fat: number | null
          food_id: string | null
          id: string
          meal_type: string
          protein: number | null
          quantity_g: number
          user_id: string | null
        }
        Insert: {
          calories: number
          carbs?: number | null
          created_at?: string | null
          custom_name?: string | null
          date?: string
          fat?: number | null
          food_id?: string | null
          id?: string
          meal_type: string
          protein?: number | null
          quantity_g?: number
          user_id?: string | null
        }
        Update: {
          calories?: number
          carbs?: number | null
          created_at?: string | null
          custom_name?: string | null
          date?: string
          fat?: number | null
          food_id?: string | null
          id?: string
          meal_type?: string
          protein?: number | null
          quantity_g?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_food_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "community_foods"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_habits: {
        Row: {
          created_at: string | null
          date: string
          habits: Json
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          habits?: Json
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          habits?: Json
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      exercise_feedback: {
        Row: {
          client_id: string | null
          coach_id: string | null
          created_at: string | null
          exercise_name: string
          feedback: string | null
          id: string
          status: string | null
          video_url: string | null
        }
        Insert: {
          client_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          exercise_name: string
          feedback?: string | null
          id?: string
          status?: string | null
          video_url?: string | null
        }
        Update: {
          client_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          exercise_name?: string
          feedback?: string | null
          id?: string
          status?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      exercises_db: {
        Row: {
          created_at: string | null
          description: string | null
          description_de: string | null
          description_en: string | null
          equipment: string | null
          equipment_legacy: string | null
          execution_tips: string | null
          gif_url: string | null
          id: string
          instructions: string | null
          muscle_group: string | null
          name: string
          name_de: string | null
          name_en: string | null
          tips: string | null
          tips_de: string | null
          tips_en: string | null
          variant_group: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          description_de?: string | null
          description_en?: string | null
          equipment?: string | null
          equipment_legacy?: string | null
          execution_tips?: string | null
          gif_url?: string | null
          id?: string
          instructions?: string | null
          muscle_group?: string | null
          name: string
          name_de?: string | null
          name_en?: string | null
          tips?: string | null
          tips_de?: string | null
          tips_en?: string | null
          variant_group?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          description_de?: string | null
          description_en?: string | null
          equipment?: string | null
          equipment_legacy?: string | null
          execution_tips?: string | null
          gif_url?: string | null
          id?: string
          instructions?: string | null
          muscle_group?: string | null
          name?: string
          name_de?: string | null
          name_en?: string | null
          tips?: string | null
          tips_de?: string | null
          tips_en?: string | null
          variant_group?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      food_items: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number | null
          carbs: number | null
          created_at: string | null
          fat: number | null
          id: string
          name: string
          protein: number | null
          serving_size_g: number | null
          source: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: string
          name: string
          protein?: number | null
          serving_size_g?: number | null
          source?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: string
          name?: string
          protein?: number | null
          serving_size_g?: number | null
          source?: string | null
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string
          fat: number | null
          food_name: string | null
          id: string
          logged_at: string
          meal_type: string | null
          protein: number | null
          quantity_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          food_name?: string | null
          id?: string
          logged_at?: string
          meal_type?: string | null
          protein?: number | null
          quantity_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          food_name?: string | null
          id?: string
          logged_at?: string
          meal_type?: string | null
          protein?: number | null
          quantity_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string | null
          plan: Json
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          plan?: Json
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          plan?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      meal_tracking: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          id: string
          meal_type: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          meal_type?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          meal_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
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
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          coach_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          status: string | null
          stripe_event_id: string | null
          stripe_id: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          stripe_event_id?: string | null
          stripe_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          stripe_event_id?: string | null
          stripe_id?: string | null
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          exercise_name: string
          id: string
          previous_value: number | null
          record_type: string
          unit: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string | null
          exercise_name: string
          id?: string
          previous_value?: number | null
          record_type: string
          unit?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          achieved_at?: string | null
          created_at?: string | null
          exercise_name?: string
          id?: string
          previous_value?: number | null
          record_type?: string
          unit?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          allergies: string[] | null
          avatar_url: string | null
          beta_campaign_id: string | null
          birth_date: string | null
          body_fat_pct: number | null
          calorie_goal: number | null
          carbs_goal: number | null
          cardio_enabled: boolean | null
          cardio_frequency: number | null
          cardio_preference: string | null
          coach_available_days: string[] | null
          coach_experience_years: string | null
          coach_max_clients: number | null
          coach_monthly_rate: number | null
          coach_onboarding_complete: boolean
          coach_speciality: string | null
          created_at: string
          current_weight: number | null
          dietary_type: string | null
          email: string | null
          fat_goal: number | null
          fitness_level: string | null
          fitness_objectives: string[] | null
          fitness_score: number | null
          full_name: string | null
          gender: string | null
          height: number | null
          home_equipment: string[] | null
          id: string
          last_streak_reminder_at: string | null
          last_workout_at: string | null
          liked_foods: string[] | null
          meal_preferences: Json | null
          needs_initial_generation: boolean
          next_diagnostic_at: string | null
          next_program_regen_at: string | null
          objective: string | null
          onboarding_answers: Json | null
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_photo_completed_at: string | null
          phone: string | null
          preferred_locale: string
          preferred_training_time: string | null
          protein_goal: number | null
          reminder_enabled: boolean | null
          reminder_minutes_before: number | null
          rir_scale_advanced: boolean | null
          rir_tracking_enabled: boolean | null
          role: string | null
          start_weight: number | null
          status: string | null
          streak_best: number | null
          streak_current: number | null
          streak_last_date: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          subscription_type: string | null
          target_weight: number | null
          tdee: number | null
          training_location: string
          trial_ends_at: string | null
          updated_at: string
          water_goal: number | null
        }
        Insert: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          beta_campaign_id?: string | null
          birth_date?: string | null
          body_fat_pct?: number | null
          calorie_goal?: number | null
          carbs_goal?: number | null
          cardio_enabled?: boolean | null
          cardio_frequency?: number | null
          cardio_preference?: string | null
          coach_available_days?: string[] | null
          coach_experience_years?: string | null
          coach_max_clients?: number | null
          coach_monthly_rate?: number | null
          coach_onboarding_complete?: boolean
          coach_speciality?: string | null
          created_at?: string
          current_weight?: number | null
          dietary_type?: string | null
          email?: string | null
          fat_goal?: number | null
          fitness_level?: string | null
          fitness_objectives?: string[] | null
          fitness_score?: number | null
          full_name?: string | null
          gender?: string | null
          height?: number | null
          home_equipment?: string[] | null
          id: string
          last_streak_reminder_at?: string | null
          last_workout_at?: string | null
          liked_foods?: string[] | null
          meal_preferences?: Json | null
          needs_initial_generation?: boolean
          next_diagnostic_at?: string | null
          next_program_regen_at?: string | null
          objective?: string | null
          onboarding_answers?: Json | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_photo_completed_at?: string | null
          phone?: string | null
          preferred_locale?: string
          preferred_training_time?: string | null
          protein_goal?: number | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          rir_scale_advanced?: boolean | null
          rir_tracking_enabled?: boolean | null
          role?: string | null
          start_weight?: number | null
          status?: string | null
          streak_best?: number | null
          streak_current?: number | null
          streak_last_date?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          target_weight?: number | null
          tdee?: number | null
          training_location?: string
          trial_ends_at?: string | null
          updated_at?: string
          water_goal?: number | null
        }
        Update: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          beta_campaign_id?: string | null
          birth_date?: string | null
          body_fat_pct?: number | null
          calorie_goal?: number | null
          carbs_goal?: number | null
          cardio_enabled?: boolean | null
          cardio_frequency?: number | null
          cardio_preference?: string | null
          coach_available_days?: string[] | null
          coach_experience_years?: string | null
          coach_max_clients?: number | null
          coach_monthly_rate?: number | null
          coach_onboarding_complete?: boolean
          coach_speciality?: string | null
          created_at?: string
          current_weight?: number | null
          dietary_type?: string | null
          email?: string | null
          fat_goal?: number | null
          fitness_level?: string | null
          fitness_objectives?: string[] | null
          fitness_score?: number | null
          full_name?: string | null
          gender?: string | null
          height?: number | null
          home_equipment?: string[] | null
          id?: string
          last_streak_reminder_at?: string | null
          last_workout_at?: string | null
          liked_foods?: string[] | null
          meal_preferences?: Json | null
          needs_initial_generation?: boolean
          next_diagnostic_at?: string | null
          next_program_regen_at?: string | null
          objective?: string | null
          onboarding_answers?: Json | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_photo_completed_at?: string | null
          phone?: string | null
          preferred_locale?: string
          preferred_training_time?: string | null
          protein_goal?: number | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          rir_scale_advanced?: boolean | null
          rir_tracking_enabled?: boolean | null
          role?: string | null
          start_weight?: number | null
          status?: string | null
          streak_best?: number | null
          streak_current?: number | null
          streak_last_date?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          target_weight?: number | null
          tdee?: number | null
          training_location?: string
          trial_ends_at?: string | null
          updated_at?: string
          water_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_beta_campaign_id_fkey"
            columns: ["beta_campaign_id"]
            isOneToOne: false
            referencedRelation: "beta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          adjustments: Json | null
          ai_analysis: string | null
          ai_analyzed_at: string | null
          created_at: string | null
          date: string | null
          id: string
          photo_url: string
          user_id: string
          view_type: string | null
        }
        Insert: {
          adjustments?: Json | null
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          photo_url: string
          user_id: string
          view_type?: string | null
        }
        Update: {
          adjustments?: Json | null
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          photo_url?: string
          user_id?: string
          view_type?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          subscription: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          carbs_per_serving: number | null
          category: string
          cook_time_min: number | null
          created_at: string | null
          description: string | null
          fat_per_serving: number | null
          id: string
          image_url: string | null
          ingredients: Json
          instructions: Json
          is_favorite: boolean | null
          is_public: boolean | null
          prep_time_min: number | null
          proteins_per_serving: number | null
          servings: number | null
          source: string | null
          tags: string[] | null
          title: string
          user_id: string | null
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          category: string
          cook_time_min?: number | null
          created_at?: string | null
          description?: string | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_favorite?: boolean | null
          is_public?: boolean | null
          prep_time_min?: number | null
          proteins_per_serving?: number | null
          servings?: number | null
          source?: string | null
          tags?: string[] | null
          title: string
          user_id?: string | null
        }
        Update: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          category?: string
          cook_time_min?: number | null
          created_at?: string | null
          description?: string | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_favorite?: boolean | null
          is_public?: boolean | null
          prep_time_min?: number | null
          proteins_per_serving?: number | null
          servings?: number | null
          source?: string | null
          tags?: string[] | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saved_meals: {
        Row: {
          created_at: string | null
          foods: Json
          id: string
          meal_type: string | null
          name: string
          total_calories: number | null
          total_carbs: number | null
          total_fat: number | null
          total_protein: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          foods?: Json
          id?: string
          meal_type?: string | null
          name: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          foods?: Json
          id?: string
          meal_type?: string | null
          name?: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_sessions: {
        Row: {
          client_id: string | null
          coach_id: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          duration_min: number | null
          duration_minutes: number | null
          id: string
          notes: string | null
          reminder_enabled: boolean | null
          reminder_minutes_before: number | null
          scheduled_at: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          session_type: string | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          coach_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          duration_min?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          scheduled_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          session_type?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          coach_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          duration_min?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          scheduled_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          session_type?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          attempt_count: number
          completed_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          payload: Json | null
          processed_at: string
          processing_started_at: string | null
          processing_status: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          payload?: Json | null
          processed_at?: string
          processing_started_at?: string | null
          processing_status?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          payload?: Json | null
          processed_at?: string
          processing_started_at?: string | null
          processing_status?: string
        }
        Relationships: []
      }
      training_programs: {
        Row: {
          coach_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          program: Json
          tags: string[] | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          program?: Json
          tags?: string[] | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          program?: Json
          tags?: string[] | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string | null
          badge_type: string | null
          celebrated: boolean
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          badge_id?: string | null
          badge_type?: string | null
          celebrated?: boolean
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          badge_id?: string | null
          badge_type?: string | null
          celebrated?: boolean
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_programs: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          started_at: string | null
          training_program_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          training_program_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          training_program_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_programs_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          id: string
          level: number | null
          level_name: string | null
          total_xp: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          level?: number | null
          level_name?: string | null
          total_xp?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          level?: number | null
          level_name?: string | null
          total_xp?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      water_intake: {
        Row: {
          amount_ml: number
          created_at: string | null
          date: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          amount_ml: number
          created_at?: string | null
          date?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          amount_ml?: number
          created_at?: string | null
          date?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      weekly_diagnostics: {
        Row: {
          adherence_pct: number | null
          ai_model: string | null
          ai_tokens_used: number | null
          ajustements: Json | null
          applied_at: string | null
          applied_changes: Json | null
          calorie_avg_real: number | null
          calorie_avg_target: number | null
          created_at: string | null
          exercice_a_ajouter: string | null
          id: string
          objectif_semaine_prochaine: string | null
          points_alerte: Json | null
          points_forts: Json | null
          protein_avg_g: number | null
          protein_compliance_pct: number | null
          raisonnement: string | null
          score_semaine: number | null
          sessions_done: number | null
          sessions_planned: number | null
          training_volume_total: number | null
          user_id: string
          week_start: string
          weight_delta_kg: number | null
        }
        Insert: {
          adherence_pct?: number | null
          ai_model?: string | null
          ai_tokens_used?: number | null
          ajustements?: Json | null
          applied_at?: string | null
          applied_changes?: Json | null
          calorie_avg_real?: number | null
          calorie_avg_target?: number | null
          created_at?: string | null
          exercice_a_ajouter?: string | null
          id?: string
          objectif_semaine_prochaine?: string | null
          points_alerte?: Json | null
          points_forts?: Json | null
          protein_avg_g?: number | null
          protein_compliance_pct?: number | null
          raisonnement?: string | null
          score_semaine?: number | null
          sessions_done?: number | null
          sessions_planned?: number | null
          training_volume_total?: number | null
          user_id: string
          week_start: string
          weight_delta_kg?: number | null
        }
        Update: {
          adherence_pct?: number | null
          ai_model?: string | null
          ai_tokens_used?: number | null
          ajustements?: Json | null
          applied_at?: string | null
          applied_changes?: Json | null
          calorie_avg_real?: number | null
          calorie_avg_target?: number | null
          created_at?: string | null
          exercice_a_ajouter?: string | null
          id?: string
          objectif_semaine_prochaine?: string | null
          points_alerte?: Json | null
          points_forts?: Json | null
          protein_avg_g?: number | null
          protein_compliance_pct?: number | null
          raisonnement?: string | null
          score_semaine?: number | null
          sessions_done?: number | null
          sessions_planned?: number | null
          training_volume_total?: number | null
          user_id?: string
          week_start?: string
          weight_delta_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_diagnostics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_related_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_diagnostics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          poids: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          poids: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          poids?: number
          user_id?: string | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          muscles_worked: string[] | null
          name: string | null
          notes: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          muscles_worked?: string[] | null
          name?: string | null
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          muscles_worked?: string[] | null
          name?: string | null
          notes?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
          completed: boolean | null
          created_at: string | null
          exercise_id: string | null
          exercise_name: string
          id: string
          reps: number | null
          rir: number | null
          session_id: string | null
          set_number: number
          user_id: string | null
          weight: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          reps?: number | null
          rir?: number | null
          session_id?: string | null
          set_number: number
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          reps?: number | null
          rir?: number | null
          session_id?: string | null
          set_number?: number
          user_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises_db"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_related_profiles: {
        Row: {
          activity_level: string | null
          allergies: string[] | null
          avatar_url: string | null
          birth_date: string | null
          body_fat_pct: number | null
          calorie_goal: number | null
          carbs_goal: number | null
          coach_experience_years: string | null
          coach_monthly_rate: number | null
          coach_speciality: string | null
          created_at: string | null
          current_weight: number | null
          dietary_type: string | null
          email: string | null
          fat_goal: number | null
          full_name: string | null
          gender: string | null
          height: number | null
          id: string | null
          liked_foods: string[] | null
          meal_preferences: Json | null
          objective: string | null
          phone: string | null
          protein_goal: number | null
          start_weight: number | null
          status: string | null
          subscription_type: string | null
          target_weight: number | null
          tdee: number | null
        }
        Insert: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          birth_date?: string | null
          body_fat_pct?: number | null
          calorie_goal?: number | null
          carbs_goal?: number | null
          coach_experience_years?: string | null
          coach_monthly_rate?: number | null
          coach_speciality?: string | null
          created_at?: string | null
          current_weight?: number | null
          dietary_type?: string | null
          email?: string | null
          fat_goal?: number | null
          full_name?: string | null
          gender?: string | null
          height?: number | null
          id?: string | null
          liked_foods?: string[] | null
          meal_preferences?: Json | null
          objective?: string | null
          phone?: string | null
          protein_goal?: number | null
          start_weight?: number | null
          status?: string | null
          subscription_type?: string | null
          target_weight?: number | null
          tdee?: number | null
        }
        Update: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          birth_date?: string | null
          body_fat_pct?: number | null
          calorie_goal?: number | null
          carbs_goal?: number | null
          coach_experience_years?: string | null
          coach_monthly_rate?: number | null
          coach_speciality?: string | null
          created_at?: string | null
          current_weight?: number | null
          dietary_type?: string | null
          email?: string | null
          fat_goal?: number | null
          full_name?: string | null
          gender?: string | null
          height?: number | null
          id?: string | null
          liked_foods?: string[] | null
          meal_preferences?: Json | null
          objective?: string | null
          phone?: string | null
          protein_goal?: number | null
          start_weight?: number | null
          status?: string | null
          subscription_type?: string | null
          target_weight?: number | null
          tdee?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_default_coach: {
        Args: { p_client_id: string; p_coach_id: string }
        Returns: Json
      }
      claim_beta_slot: { Args: never; Returns: Json }
      claim_stripe_webhook_event: {
        Args: { p_event_id: string; p_event_type: string; p_payload: Json }
        Returns: string
      }
      consume_coach_invitation: {
        Args: { p_token_hash: string }
        Returns: Json
      }
      delete_user_account: { Args: { target_user_id: string }; Returns: Json }
      finalize_stripe_webhook_event: {
        Args: { p_error_message?: string; p_event_id: string; p_status: string }
        Returns: boolean
      }
      get_workout_session_summary: {
        Args: { exclude_session_id?: string; target_user_id: string }
        Returns: Json
      }
      is_active_messaging_pair: {
        Args: { p_receiver_id: string; p_sender_id: string }
        Returns: boolean
      }
      set_initial_trial: { Args: { p_days?: number }; Returns: Json }
      set_role: { Args: { p_role: string }; Returns: Json }
      update_active_client_profile: {
        Args: { changes: Json; target_client_id: string }
        Returns: Json
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
