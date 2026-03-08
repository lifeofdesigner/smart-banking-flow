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
      account_types: {
        Row: {
          category: Database["public"]["Enums"]["account_type_category"]
          created_at: string
          id: string
          is_user_facing: boolean
          name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["account_type_category"]
          created_at?: string
          id?: string
          is_user_facing?: boolean
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["account_type_category"]
          created_at?: string
          id?: string
          is_user_facing?: boolean
          name?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          account_number: string
          account_type: string
          account_type_id: string | null
          available_balance: number
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          ledger_balance: number
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_number: string
          account_type: string
          account_type_id?: string | null
          available_balance?: number
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ledger_balance?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_number?: string
          account_type?: string
          account_type_id?: string | null
          available_balance?: number
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ledger_balance?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_account_type_id_fkey"
            columns: ["account_type_id"]
            isOneToOne: false
            referencedRelation: "account_types"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          account_id: string | null
          account_number: string
          bank_name: string
          created_at: string
          id: string
          nickname: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_number: string
          bank_name?: string
          created_at?: string
          id?: string
          nickname: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          nickname?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          address_document_url: string | null
          created_at: string
          document_type: string
          document_url: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          address_document_url?: string | null
          created_at?: string
          document_type?: string
          document_url?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          address_document_url?: string | null
          created_at?: string
          document_type?: string
          document_url?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries_archive: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_01: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_02: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_03: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_04: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_05: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_06: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_07: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_08: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_09: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_10: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_11: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_entries_archive_2026_12: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          kyc_status: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          kyc_status?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          kyc_status?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_number: string | null
          status: string | null
          transaction_type: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_number?: string | null
          status?: string | null
          transaction_type: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_number?: string | null
          status?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_limits: {
        Row: {
          account_id: string
          created_at: string
          currency: string
          daily_limit: number
          id: string
          per_transaction_limit: number
        }
        Insert: {
          account_id: string
          created_at?: string
          currency?: string
          daily_limit?: number
          id?: string
          per_transaction_limit?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          currency?: string
          daily_limit?: number
          id?: string
          per_transaction_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfer_limits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
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
      wire_transfer_codes: {
        Row: {
          attempts: number
          code_type: string
          code_value: string
          created_at: string | null
          id: string
          is_verified: boolean | null
          verified_at: string | null
          wire_transfer_id: string
        }
        Insert: {
          attempts?: number
          code_type: string
          code_value: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          verified_at?: string | null
          wire_transfer_id: string
        }
        Update: {
          attempts?: number
          code_type?: string
          code_value?: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          verified_at?: string | null
          wire_transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wire_transfer_codes_wire_transfer_id_fkey"
            columns: ["wire_transfer_id"]
            isOneToOne: false
            referencedRelation: "wire_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      wire_transfers: {
        Row: {
          account_id: string
          amount: number
          beneficiary_account: string
          beneficiary_bank: string
          beneficiary_country: string
          beneficiary_name: string
          created_at: string | null
          currency: string | null
          current_stage: number | null
          id: string
          purpose: string | null
          status: string | null
          swift_code: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          beneficiary_account: string
          beneficiary_bank: string
          beneficiary_country: string
          beneficiary_name: string
          created_at?: string | null
          currency?: string | null
          current_stage?: number | null
          id?: string
          purpose?: string | null
          status?: string | null
          swift_code?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          beneficiary_account?: string
          beneficiary_bank?: string
          beneficiary_country?: string
          beneficiary_name?: string
          created_at?: string | null
          currency?: string | null
          current_stage?: number | null
          id?: string
          purpose?: string | null
          status?: string | null
          swift_code?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wire_transfers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wire_transfers_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_ledger_entries: {
        Args: { p_before_date?: string }
        Returns: number
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_max_requests?: number
          p_user_id: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      execute_transaction: {
        Args: {
          p_amount: number
          p_credit_account: string
          p_debit_account: string
          p_description: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: string
      }
      generate_account_number: { Args: never; Returns: string }
      get_account_balance: { Args: { p_account_id: string }; Returns: number }
      get_daily_transfer_usage: {
        Args: { p_account_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      transfer_between_accounts: {
        Args: {
          p_amount: number
          p_from_account: string
          p_to_account: string
          p_user_id: string
        }
        Returns: string
      }
      verify_wire_transfer_code: {
        Args: {
          p_code: string
          p_code_type: string
          p_wire_transfer_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type_category:
        | "asset"
        | "liability"
        | "equity"
        | "revenue"
        | "expense"
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
      account_type_category: [
        "asset",
        "liability",
        "equity",
        "revenue",
        "expense",
      ],
      app_role: ["admin", "user"],
    },
  },
} as const
