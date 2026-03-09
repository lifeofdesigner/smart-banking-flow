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
      bill_payments: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          id: string
          provider: string
          reference_number: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string
          created_at?: string
          id?: string
          provider: string
          reference_number?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          id?: string
          provider?: string
          reference_number?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          category: string
          id: string
          monthly_limit: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          id?: string
          monthly_limit?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          id?: string
          monthly_limit?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          account_id: string
          card_number: string
          card_type: string
          created_at: string
          daily_limit: number
          expires_at: string
          frozen_at: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          card_number?: string
          card_type?: string
          created_at?: string
          daily_limit?: number
          expires_at?: string
          frozen_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          card_number?: string
          card_type?: string
          created_at?: string
          daily_limit?: number
          expires_at?: string
          frozen_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cashback_rewards: {
        Row: {
          cashback_amount: number
          created_at: string
          credited_at: string | null
          id: string
          reward_type: string
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          cashback_amount?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          reward_type?: string
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          cashback_amount?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          reward_type?: string
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cashback_rules: {
        Row: {
          cashback_percentage: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_cashback: number | null
          min_transaction_amount: number
          transaction_type: string
        }
        Insert: {
          cashback_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_cashback?: number | null
          min_transaction_amount?: number
          transaction_type: string
        }
        Update: {
          cashback_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_cashback?: number | null
          min_transaction_amount?: number
          transaction_type?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          display_order: number
          id: string
          page_id: string | null
          product_id: string | null
          question: string
        }
        Insert: {
          answer: string
          created_at?: string
          display_order?: number
          id?: string
          page_id?: string | null
          product_id?: string | null
          question: string
        }
        Update: {
          answer?: string
          created_at?: string
          display_order?: number
          id?: string
          page_id?: string | null
          product_id?: string | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_rules: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          fee_type: string
          id: string
          is_active: boolean
          max_fee: number | null
          min_fee: number | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          fee_type: string
          id?: string
          is_active?: boolean
          max_fee?: number | null
          min_fee?: number | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          fee_type?: string
          id?: string
          is_active?: boolean
          max_fee?: number | null
          min_fee?: number | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string
          details: Json
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score: number
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          details?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          details?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          content: string | null
          created_at: string
          display_order: number
          id: string
          image: string | null
          section_name: string
          status: string
          subtitle: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image?: string | null
          section_name: string
          status?: string
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image?: string | null
          section_name?: string
          status?: string
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          account_id: string | null
          created_at: string
          current_value: number
          id: string
          interest_rate: number
          investment_type: string
          maturity_date: string | null
          principal: number
          product_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          current_value?: number
          id?: string
          interest_rate?: number
          investment_type?: string
          maturity_date?: string | null
          principal: number
          product_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          current_value?: number
          id?: string
          interest_rate?: number
          investment_type?: string
          maturity_date?: string | null
          principal?: number
          product_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      loan_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          interest_rate: number
          is_active: boolean
          max_amount: number
          min_amount: number
          name: string
          term_months: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          interest_rate: number
          is_active?: boolean
          max_amount: number
          min_amount?: number
          name: string
          term_months: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          interest_rate?: number
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          name?: string
          term_months?: number
        }
        Relationships: []
      }
      loan_repayments: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          interest_portion: number
          loan_id: string
          paid_at: string | null
          principal_portion: number
          status: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          interest_portion: number
          loan_id: string
          paid_at?: string | null
          principal_portion: number
          status?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          interest_portion?: number
          loan_id?: string
          paid_at?: string | null
          principal_portion?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          disbursement_account_id: string | null
          id: string
          interest_rate: number
          monthly_payment: number
          principal: number
          product_id: string
          rejection_reason: string | null
          status: string
          term_months: number
          total_payable: number
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disbursement_account_id?: string | null
          id?: string
          interest_rate: number
          monthly_payment: number
          principal: number
          product_id: string
          rejection_reason?: string | null
          status?: string
          term_months: number
          total_payable: number
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disbursement_account_id?: string | null
          id?: string
          interest_rate?: number
          monthly_payment?: number
          principal?: number
          product_id?: string
          rejection_reason?: string | null
          status?: string
          term_months?: number
          total_payable?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_disbursement_account_id_fkey"
            columns: ["disbursement_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "loan_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
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
      page_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          page_id: string
          section_content: string | null
          section_image: string | null
          section_title: string | null
          section_type: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          page_id: string
          section_content?: string | null
          section_image?: string | null
          section_title?: string | null
          section_type?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          page_id?: string
          section_content?: string | null
          section_image?: string | null
          section_title?: string | null
          section_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pages: {
        Row: {
          created_at: string
          display_order: number
          full_description: string | null
          hero_image: string | null
          icon: string | null
          id: string
          meta_description: string | null
          og_image: string | null
          product_name: string
          short_description: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          full_description?: string | null
          hero_image?: string | null
          icon?: string | null
          id?: string
          meta_description?: string | null
          og_image?: string | null
          product_name: string
          short_description?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          full_description?: string | null
          hero_image?: string | null
          icon?: string | null
          id?: string
          meta_description?: string | null
          og_image?: string | null
          product_name?: string
          short_description?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          product_id: string
          section_content: string | null
          section_image: string | null
          section_title: string | null
          section_type: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          product_id: string
          section_content?: string | null
          section_image?: string | null
          section_title?: string | null
          section_type?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          product_id?: string
          section_content?: string | null
          section_image?: string | null
          section_title?: string | null
          section_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_pages"
            referencedColumns: ["id"]
          },
        ]
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
          referral_code: string | null
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
          referral_code?: string | null
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
          referral_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_user_id: string
          reward_amount: number
          reward_issued: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_user_id: string
          reward_amount?: number
          reward_issued?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_user_id?: string
          reward_amount?: number
          reward_issued?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      savings_accounts: {
        Row: {
          account_id: string | null
          balance: number
          created_at: string
          id: string
          last_interest_date: string | null
          product_id: string
          status: string
          total_interest_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          balance?: number
          created_at?: string
          id?: string
          last_interest_date?: string | null
          product_id: string
          status?: string
          total_interest_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          balance?: number
          created_at?: string
          id?: string
          last_interest_date?: string | null
          product_id?: string
          status?: string
          total_interest_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_accounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "savings_products"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          color: string | null
          created_at: string
          current_amount: number
          deadline: string | null
          description: string | null
          id: string
          name: string
          status: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          target_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          interest_frequency: string
          interest_rate: number
          is_active: boolean
          minimum_balance: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          interest_frequency?: string
          interest_rate: number
          is_active?: boolean
          minimum_balance?: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          interest_frequency?: string
          interest_rate?: number
          is_active?: boolean
          minimum_balance?: number
          name?: string
        }
        Relationships: []
      }
      scheduled_transfers: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          frequency: string
          from_account_id: string
          id: string
          last_run_date: string | null
          next_run_date: string
          status: string
          to_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          frequency?: string
          from_account_id: string
          id?: string
          last_run_date?: string | null
          next_run_date: string
          status?: string
          to_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          frequency?: string
          from_account_id?: string
          id?: string
          last_run_date?: string | null
          next_run_date?: string
          status?: string
          to_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_transfers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          created_at: string
          hero_image: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          meta_description: string | null
          og_image: string | null
          page_slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          meta_description?: string | null
          og_image?: string | null
          page_slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          meta_description?: string | null
          og_image?: string | null
          page_slug?: string
          status?: string
          title?: string
          updated_at?: string
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
      apply_referral_code: { Args: { p_code: string }; Returns: string }
      approve_loan: {
        Args: { p_admin_id: string; p_loan_id: string }
        Returns: string
      }
      archive_old_ledger_entries: {
        Args: { p_before_date?: string }
        Returns: number
      }
      calculate_savings_interest: {
        Args: { p_savings_account_id: string }
        Returns: string
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
      claim_cashback_reward: {
        Args: { p_cashback_id: string }
        Returns: string
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
      generate_unique_referral_code: { Args: never; Returns: string }
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
      make_loan_repayment: {
        Args: { p_repayment_id: string; p_user_id: string }
        Returns: string
      }
      pay_bill: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category: string
          p_provider: string
          p_reference?: string
        }
        Returns: string
      }
      reject_loan: {
        Args: { p_admin_id: string; p_loan_id: string; p_reason: string }
        Returns: string
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
      app_role:
        | "admin"
        | "user"
        | "super_admin"
        | "content_manager"
        | "finance_admin"
        | "support_admin"
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
      app_role: [
        "admin",
        "user",
        "super_admin",
        "content_manager",
        "finance_admin",
        "support_admin",
      ],
    },
  },
} as const
