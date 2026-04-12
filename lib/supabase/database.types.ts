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
          user_id: string;
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
          user_id: string;
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
          user_id?: string;
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
      courses: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: "draft" | "published";
          locale: string;
          scorm_passing_score_percent: number;
          manifest_description: string | null;
          estimated_duration_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          status?: "draft" | "published";
          locale?: string;
          scorm_passing_score_percent?: number;
          manifest_description?: string | null;
          estimated_duration_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          status?: "draft" | "published";
          locale?: string;
          scorm_passing_score_percent?: number;
          manifest_description?: string | null;
          estimated_duration_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          sort_order: number;
          content: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title?: string;
          sort_order?: number;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
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
