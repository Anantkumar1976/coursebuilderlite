export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      assets: {
        Row: {
          id: string;
          user_id: string | null;
          course_id: string | null;
          bucket: string;
          storage_path: string;
          filename: string;
          mime_type: string | null;
          bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          course_id?: string | null;
          bucket?: string;
          storage_path: string;
          filename: string;
          mime_type?: string | null;
          bytes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          course_id?: string | null;
          bucket?: string;
          storage_path?: string;
          filename?: string;
          mime_type?: string | null;
          bytes?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      billing_export_events: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string;
          course_id: string;
          export_format: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id: string;
          course_id: string;
          export_format: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string;
          course_id?: string;
          export_format?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      billing_subscription_memberships: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string;
          plan_key: string;
          authors_limit: number;
          monthly_exports_limit: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id: string;
          plan_key: string;
          authors_limit: number;
          monthly_exports_limit: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string;
          plan_key?: string;
          authors_limit?: number;
          monthly_exports_limit?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      billing_team_invites: {
        Row: {
          id: string;
          subscription_id: string;
          invited_by_user_id: string;
          email_normalized: string;
          token: string;
          status: string;
          plan_key: string;
          authors_limit: number;
          monthly_exports_limit: number;
          workspace_name: string | null;
          expires_at: string;
          accepted_user_id: string | null;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          invited_by_user_id: string;
          email_normalized: string;
          token: string;
          status?: string;
          plan_key: string;
          authors_limit: number;
          monthly_exports_limit: number;
          workspace_name?: string | null;
          expires_at: string;
          accepted_user_id?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          invited_by_user_id?: string;
          email_normalized?: string;
          token?: string;
          status?: string;
          plan_key?: string;
          authors_limit?: number;
          monthly_exports_limit?: number;
          workspace_name?: string | null;
          expires_at?: string;
          accepted_user_id?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      billing_subscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          subscription_id: string;
          provider: string;
          plan_key: string | null;
          workspace_name: string | null;
          status: string;
          last_event_type: string | null;
          activated_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          subscription_id: string;
          provider?: string;
          plan_key?: string | null;
          workspace_name?: string | null;
          status?: string;
          last_event_type?: string | null;
          activated_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          subscription_id?: string;
          provider?: string;
          plan_key?: string | null;
          workspace_name?: string | null;
          status?: string;
          last_event_type?: string | null;
          activated_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_reference_materials: {
        Row: {
          id: string;
          course_id: string;
          asset_id: string;
          label: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          asset_id: string;
          label?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          asset_id?: string;
          label?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string | null;
          title: string;
          description: string | null;
          status: "draft" | "published";
          locale: string;
          scorm_passing_score_percent: number;
          manifest_description: string | null;
          estimated_duration_minutes: number | null;
          navigation_flow: "linear" | "open" | "website";
          attempts_limit: number | null;
          assessment_attempts_limit: number | null;
          custom_css: string | null;
          banner_asset_id: string | null;
          theme_fonts: Json;
          theme_colors: Json;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id?: string | null;
          title: string;
          description?: string | null;
          status?: "draft" | "published";
          locale?: string;
          scorm_passing_score_percent?: number;
          manifest_description?: string | null;
          estimated_duration_minutes?: number | null;
          navigation_flow?: "linear" | "open" | "website";
          attempts_limit?: number | null;
          assessment_attempts_limit?: number | null;
          custom_css?: string | null;
          banner_asset_id?: string | null;
          theme_fonts?: Json;
          theme_colors?: Json;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string | null;
          title?: string;
          description?: string | null;
          status?: "draft" | "published";
          locale?: string;
          scorm_passing_score_percent?: number;
          manifest_description?: string | null;
          estimated_duration_minutes?: number | null;
          navigation_flow?: "linear" | "open" | "website";
          attempts_limit?: number | null;
          assessment_attempts_limit?: number | null;
          custom_css?: string | null;
          banner_asset_id?: string | null;
          theme_fonts?: Json;
          theme_colors?: Json;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          id: string;
          course_id: string;
          lesson_id: string;
          title: string;
          sort_order: number;
          content: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          lesson_id: string;
          title?: string;
          sort_order?: number;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          lesson_id?: string;
          title?: string;
          sort_order?: number;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      course_status: "draft" | "published";
    };
    CompositeTypes: Record<string, never>;
  };
};
