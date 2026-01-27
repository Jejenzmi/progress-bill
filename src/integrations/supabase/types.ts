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
      activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_completed: boolean
          lead_id: string | null
          project_id: string | null
          reminder_at: string | null
          reminder_sent: boolean
          scheduled_at: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          lead_id?: string | null
          project_id?: string | null
          reminder_at?: string | null
          reminder_sent?: boolean
          scheduled_at?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          lead_id?: string | null
          project_id?: string | null
          reminder_at?: string | null
          reminder_sent?: boolean
          scheduled_at?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          created_at: string
          id: string
          name: string
          pic_email: string | null
          pic_name: string | null
          pic_phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          id?: string
          name: string
          pic_email?: string | null
          pic_name?: string | null
          pic_phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          id?: string
          name?: string
          pic_email?: string | null
          pic_name?: string | null
          pic_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          id: string
          notification_type: string
          recipient_email: string
          related_id: string | null
          sent_at: string
          status: string | null
          subject: string
        }
        Insert: {
          id?: string
          notification_type: string
          recipient_email: string
          related_id?: string | null
          sent_at?: string
          status?: string | null
          subject: string
        }
        Update: {
          id?: string
          notification_type?: string
          recipient_email?: string
          related_id?: string | null
          sent_at?: string
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          payment_proof_file: string | null
          project_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          tax_invoice_number: string | null
          term_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          payment_proof_file?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_invoice_number?: string | null
          term_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          payment_proof_file?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_invoice_number?: string | null
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "payment_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          company_name: string | null
          company_size: string | null
          converted_at: string | null
          converted_to_client_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          estimated_value: number | null
          id: string
          industry: string | null
          last_contacted_at: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          score: number
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          company_name?: string | null
          company_size?: string | null
          converted_at?: string | null
          converted_to_client_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          score?: number
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          company_name?: string | null
          company_size?: string | null
          converted_at?: string | null
          converted_to_client_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          score?: number
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_to_client_id_fkey"
            columns: ["converted_to_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_terms: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          is_locked: boolean | null
          percentage: number
          project_id: string
          term_name: string
          term_order: number
          trigger_condition: Database["public"]["Enums"]["term_trigger"]
          trigger_description: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          is_locked?: boolean | null
          percentage?: number
          project_id: string
          term_name: string
          term_order?: number
          trigger_condition?: Database["public"]["Enums"]["term_trigger"]
          trigger_description?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          is_locked?: boolean | null
          percentage?: number
          project_id?: string
          term_name?: string
          term_order?: number
          trigger_condition?: Database["public"]["Enums"]["term_trigger"]
          trigger_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_terms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"] | null
          probability: number | null
          project_name: string
          spk_file_path: string | null
          start_date: string
          status: Database["public"]["Enums"]["project_status"]
          total_value: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          probability?: number | null
          project_name: string
          spk_file_path?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          total_value?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          probability?: number | null
          project_name?: string
          spk_file_path?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          grand_total: number | null
          hosting_cost: number | null
          id: string
          maintenance_cost: number | null
          maintenance_period: string | null
          man_days: Json
          project_name: string
          status: string | null
          total_development: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          grand_total?: number | null
          hosting_cost?: number | null
          id?: string
          maintenance_cost?: number | null
          maintenance_period?: string | null
          man_days?: Json
          project_name: string
          status?: string | null
          total_development?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          grand_total?: number | null
          hosting_cost?: number | null
          id?: string
          maintenance_cost?: number | null
          maintenance_period?: string | null
          man_days?: Json
          project_name?: string
          status?: string | null
          total_development?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_targets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          target_amount: number
          target_period: string
          target_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          target_amount?: number
          target_period: string
          target_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          target_amount?: number
          target_period?: string
          target_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      signed_documents: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string
          id: string
          original_file_name: string
          original_file_path: string
          qr_position: string
          signed_at: string
          signed_file_path: string | null
          signer_name: string
          signer_position: string
          updated_at: string
          user_id: string
          verification_id: string | null
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type: string
          id?: string
          original_file_name: string
          original_file_path: string
          qr_position?: string
          signed_at?: string
          signed_file_path?: string | null
          signer_name: string
          signer_position: string
          updated_at?: string
          user_id: string
          verification_id?: string | null
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          id?: string
          original_file_name?: string
          original_file_path?: string
          qr_position?: string
          signed_at?: string
          signed_file_path?: string | null
          signer_name?: string
          signer_position?: string
          updated_at?: string
          user_id?: string
          verification_id?: string | null
        }
        Relationships: []
      }
      term_evidences: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: Database["public"]["Enums"]["evidence_type"]
          id: string
          term_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: Database["public"]["Enums"]["evidence_type"]
          id?: string
          term_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["evidence_type"]
          id?: string
          term_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "term_evidences_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "payment_terms"
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_tte_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          signer_name: string
          signer_position: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          signer_name: string
          signer_position: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          signer_name?: string
          signer_position?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      document_verifications: {
        Row: {
          file_type: string | null
          original_file_name: string | null
          signed_at: string | null
          signer_name: string | null
          signer_position: string | null
          verification_id: string | null
        }
        Insert: {
          file_type?: string | null
          original_file_name?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_position?: string | null
          verification_id?: string | null
        }
        Update: {
          file_type?: string | null
          original_file_name?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_position?: string | null
          verification_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
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
      activity_type:
        | "meeting"
        | "call"
        | "email"
        | "whatsapp"
        | "note"
        | "follow_up"
      app_role:
        | "admin"
        | "marketing"
        | "finance"
        | "project_manager"
        | "bdo"
        | "coo"
      client_type: "Pemerintah" | "Swasta"
      evidence_type:
        | "BAST"
        | "Laporan Progress"
        | "Faktur Pajak"
        | "Bukti Potong PPh"
        | "SPK"
        | "Lainnya"
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue"
      lead_status: "cold" | "warm" | "hot"
      pipeline_stage: "Meeting" | "Proposal" | "Negosiasi" | "Closing"
      project_status: "Pipeline" | "Won" | "Lost" | "Completed"
      term_trigger:
        | "SPK_SIGNED"
        | "PROGRESS_REPORT"
        | "BAST"
        | "MAINTENANCE"
        | "CUSTOM"
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
      activity_type: [
        "meeting",
        "call",
        "email",
        "whatsapp",
        "note",
        "follow_up",
      ],
      app_role: [
        "admin",
        "marketing",
        "finance",
        "project_manager",
        "bdo",
        "coo",
      ],
      client_type: ["Pemerintah", "Swasta"],
      evidence_type: [
        "BAST",
        "Laporan Progress",
        "Faktur Pajak",
        "Bukti Potong PPh",
        "SPK",
        "Lainnya",
      ],
      invoice_status: ["Draft", "Sent", "Paid", "Overdue"],
      lead_status: ["cold", "warm", "hot"],
      pipeline_stage: ["Meeting", "Proposal", "Negosiasi", "Closing"],
      project_status: ["Pipeline", "Won", "Lost", "Completed"],
      term_trigger: [
        "SPK_SIGNED",
        "PROGRESS_REPORT",
        "BAST",
        "MAINTENANCE",
        "CUSTOM",
      ],
    },
  },
} as const
