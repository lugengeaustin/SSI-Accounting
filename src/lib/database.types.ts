export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          category: string
          code: string
          description: string | null
          name: string
          normal_balance: string | null
          sort: number | null
          status: string | null
          sub_category: string | null
        }
        Insert: {
          category: string
          code: string
          description?: string | null
          name: string
          normal_balance?: string | null
          sort?: number | null
          status?: string | null
          sub_category?: string | null
        }
        Update: {
          category?: string
          code?: string
          description?: string | null
          name?: string
          normal_balance?: string | null
          sort?: number | null
          status?: string | null
          sub_category?: string | null
        }
        Relationships: []
      }
      allowed_emails: {
        Row: { added_by: string | null; created_at: string | null; email: string }
        Insert: { added_by?: string | null; created_at?: string | null; email: string }
        Update: { added_by?: string | null; created_at?: string | null; email?: string }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string | null
          actor: string | null
          created_at: string | null
          detail: Json | null
          id: number
          row_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          actor?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: number
          row_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          actor?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: number
          row_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      budget_lines: {
        Row: {
          account_code: string | null
          budget_amount: number | null
          budget_id: string | null
          id: string
          line_item: string | null
        }
        Insert: {
          account_code?: string | null
          budget_amount?: number | null
          budget_id?: string | null
          id?: string
          line_item?: string | null
        }
        Update: {
          account_code?: string | null
          budget_amount?: number | null
          budget_id?: string | null
          id?: string
          line_item?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          period: string | null
          project_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          period?: string | null
          project_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          period?: string | null
          project_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tin: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tin?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tin?: string | null
        }
        Relationships: []
      }
      counters: {
        Row: { doc_type: string; val: number | null; yr: number }
        Insert: { doc_type: string; val?: number | null; yr: number }
        Update: { doc_type?: string; val?: number | null; yr?: number }
        Relationships: []
      }
      currencies: {
        Row: { code: string; is_base: boolean | null; name: string | null; symbol: string | null }
        Insert: { code: string; is_base?: boolean | null; name?: string | null; symbol?: string | null }
        Update: { code?: string; is_base?: boolean | null; name?: string | null; symbol?: string | null }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          doc_type: string | null
          entity_id: string | null
          entity_type: string | null
          file_url: string | null
          id: string
          ref_no: string | null
        }
        Insert: {
          created_at?: string | null
          doc_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_url?: string | null
          id?: string
          ref_no?: string | null
        }
        Update: {
          created_at?: string | null
          doc_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_url?: string | null
          id?: string
          ref_no?: string | null
        }
        Relationships: []
      }
      fx_rates: {
        Row: { as_of: string; currency: string | null; id: number; rate_to_base: number }
        Insert: { as_of?: string; currency?: string | null; id?: number; rate_to_base: number }
        Update: { as_of?: string; currency?: string | null; id?: number; rate_to_base?: number }
        Relationships: []
      }
      imprest_lines: {
        Row: {
          amount: number | null
          description: string | null
          id: string
          imprest_id: string | null
          qty: number | null
          remarks: string | null
          supplier: string | null
        }
        Insert: {
          amount?: number | null
          description?: string | null
          id?: string
          imprest_id?: string | null
          qty?: number | null
          remarks?: string | null
          supplier?: string | null
        }
        Update: {
          amount?: number | null
          description?: string | null
          id?: string
          imprest_id?: string | null
          qty?: number | null
          remarks?: string | null
          supplier?: string | null
        }
        Relationships: []
      }
      imprest_retirements: {
        Row: {
          account_code: string | null
          amount: number | null
          created_at: string | null
          description: string | null
          id: string
          imprest_id: string | null
          receipt_id: string | null
          receipt_no: string | null
          remarks: string | null
          supplier: string | null
          vat: number | null
        }
        Insert: {
          account_code?: string | null
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          imprest_id?: string | null
          receipt_id?: string | null
          receipt_no?: string | null
          remarks?: string | null
          supplier?: string | null
          vat?: number | null
        }
        Update: {
          account_code?: string | null
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          imprest_id?: string | null
          receipt_id?: string | null
          receipt_no?: string | null
          remarks?: string | null
          supplier?: string | null
          vat?: number | null
        }
        Relationships: []
      }
      imprests: {
        Row: {
          amount_issued: number | null
          amount_requested: number | null
          approved_by: string | null
          checked_by: string | null
          created_at: string | null
          currency: string | null
          department: string | null
          fx_rate: number | null
          id: string
          imprest_no: string | null
          issue_date: string | null
          issue_journal_id: string | null
          officer_id: string | null
          officer_name: string | null
          project_id: string | null
          purpose: string | null
          request_date: string | null
          requested_by: string | null
          retire_date: string | null
          retire_journal_id: string | null
          status: string | null
        }
        Insert: {
          amount_issued?: number | null
          amount_requested?: number | null
          approved_by?: string | null
          checked_by?: string | null
          created_at?: string | null
          currency?: string | null
          department?: string | null
          fx_rate?: number | null
          id?: string
          imprest_no?: string | null
          issue_date?: string | null
          issue_journal_id?: string | null
          officer_id?: string | null
          officer_name?: string | null
          project_id?: string | null
          purpose?: string | null
          request_date?: string | null
          requested_by?: string | null
          retire_date?: string | null
          retire_journal_id?: string | null
          status?: string | null
        }
        Update: {
          amount_issued?: number | null
          amount_requested?: number | null
          approved_by?: string | null
          checked_by?: string | null
          created_at?: string | null
          currency?: string | null
          department?: string | null
          fx_rate?: number | null
          id?: string
          imprest_no?: string | null
          issue_date?: string | null
          issue_journal_id?: string | null
          officer_id?: string | null
          officer_name?: string | null
          project_id?: string | null
          purpose?: string | null
          request_date?: string | null
          requested_by?: string | null
          retire_date?: string | null
          retire_journal_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          amount: number | null
          description: string | null
          id: string
          invoice_id: string | null
          qty: number | null
          unit_price: number | null
          vat_rate: number | null
        }
        Insert: {
          amount?: number | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          qty?: number | null
          unit_price?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          qty?: number | null
          unit_price?: number | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string | null
          currency: string | null
          date_paid: string | null
          due_date: string | null
          id: string
          invoice_no: string | null
          issue_date: string | null
          notes: string | null
          project_id: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          vat: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          date_paid?: string | null
          due_date?: string | null
          id?: string
          invoice_no?: string | null
          issue_date?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          vat?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          date_paid?: string | null
          due_date?: string | null
          id?: string
          invoice_no?: string | null
          issue_date?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          vat?: number | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          entry_date: string
          fx_rate: number | null
          id: string
          project_id: string | null
          ref_no: string | null
          source: string | null
          source_id: string | null
          status: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          entry_date?: string
          fx_rate?: number | null
          id?: string
          project_id?: string | null
          ref_no?: string | null
          source?: string | null
          source_id?: string | null
          status?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          entry_date?: string
          fx_rate?: number | null
          id?: string
          project_id?: string | null
          ref_no?: string | null
          source?: string | null
          source_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_code: string
          base_credit: number | null
          base_debit: number | null
          credit: number
          currency: string | null
          debit: number
          description: string | null
          entry_id: string
          fx_rate: number | null
          id: string
        }
        Insert: {
          account_code: string
          base_credit?: number | null
          base_debit?: number | null
          credit?: number
          currency?: string | null
          debit?: number
          description?: string | null
          entry_id: string
          fx_rate?: number | null
          id?: string
        }
        Update: {
          account_code?: string
          base_credit?: number | null
          base_debit?: number | null
          credit?: number
          currency?: string | null
          debit?: number
          description?: string | null
          entry_id?: string
          fx_rate?: number | null
          id?: string
        }
        Relationships: []
      }
      org_settings: {
        Row: {
          base_currency: string | null
          company_name: string | null
          fiscal_year_start_month: number | null
          id: number
          locked_through: string | null
          tin: string | null
          updated_at: string | null
          vat_registered: boolean | null
          vrn: string | null
          wht_nonresident_rate: number | null
          wht_resident_rate: number | null
        }
        Insert: {
          base_currency?: string | null
          company_name?: string | null
          fiscal_year_start_month?: number | null
          id?: number
          locked_through?: string | null
          tin?: string | null
          updated_at?: string | null
          vat_registered?: boolean | null
          vrn?: string | null
          wht_nonresident_rate?: number | null
          wht_resident_rate?: number | null
        }
        Update: {
          base_currency?: string | null
          company_name?: string | null
          fiscal_year_start_month?: number | null
          id?: number
          locked_through?: string | null
          tin?: string | null
          updated_at?: string | null
          vat_registered?: boolean | null
          vrn?: string | null
          wht_nonresident_rate?: number | null
          wht_resident_rate?: number | null
        }
        Relationships: []
      }
      report_snapshots: {
        Row: { created_at: string | null; data: Json | null; id: string; kind: string | null; period: string | null }
        Insert: { created_at?: string | null; data?: Json | null; id?: string; kind?: string | null; period?: string | null }
        Update: { created_at?: string | null; data?: Json | null; id?: string; kind?: string | null; period?: string | null }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          title?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          code: string | null
          contract_value: number | null
          created_at: string | null
          currency: string | null
          domain: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          code?: string | null
          contract_value?: number | null
          created_at?: string | null
          currency?: string | null
          domain?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          code?: string | null
          contract_value?: number | null
          created_at?: string | null
          currency?: string | null
          domain?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      receipts: {
        Row: {
          account_code: string | null
          amount: number | null
          card_last4: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          efd_no: string | null
          fx_rate: number | null
          id: string
          image_url: string | null
          imprest_id: string | null
          journal_entry_id: string | null
          payee: string | null
          payment_method: string | null
          project_id: string | null
          raw_json: Json | null
          receipt_date: string | null
          ref_no: string | null
          status: string | null
          vat: number | null
          vat_able: boolean | null
          vendor_tin: string | null
        }
        Insert: {
          account_code?: string | null
          amount?: number | null
          card_last4?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          efd_no?: string | null
          fx_rate?: number | null
          id?: string
          image_url?: string | null
          imprest_id?: string | null
          journal_entry_id?: string | null
          payee?: string | null
          payment_method?: string | null
          project_id?: string | null
          raw_json?: Json | null
          receipt_date?: string | null
          ref_no?: string | null
          status?: string | null
          vat?: number | null
          vat_able?: boolean | null
          vendor_tin?: string | null
        }
        Update: {
          account_code?: string | null
          amount?: number | null
          card_last4?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          efd_no?: string | null
          fx_rate?: number | null
          id?: string
          image_url?: string | null
          imprest_id?: string | null
          journal_entry_id?: string | null
          payee?: string | null
          payment_method?: string | null
          project_id?: string | null
          raw_json?: Json | null
          receipt_date?: string | null
          ref_no?: string | null
          status?: string | null
          vat?: number | null
          vat_able?: boolean | null
          vendor_tin?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: { category: string | null; created_at: string | null; id: string; name: string; tin: string | null }
        Insert: { category?: string | null; created_at?: string | null; id?: string; name: string; tin?: string | null }
        Update: { category?: string | null; created_at?: string | null; id?: string; name?: string; tin?: string | null }
        Relationships: []
      }
    }
    Views: {
      v_ar_aging: {
        Row: {
          client_name: string | null
          currency: string | null
          days_outstanding: number | null
          due_date: string | null
          id: string | null
          invoice_no: string | null
          issue_date: string | null
          status: string | null
          total: number | null
        }
        Relationships: []
      }
      v_ledger: {
        Row: {
          account_code: string | null
          account_name: string | null
          base_credit: number | null
          base_debit: number | null
          category: string | null
          currency: string | null
          description: string | null
          domain: string | null
          entry_date: string | null
          entry_id: string | null
          line_id: string | null
          normal_balance: string | null
          period: string | null
          project_id: string | null
          project_name: string | null
          ref_no: string | null
          source: string | null
          status: string | null
          sub_category: string | null
        }
        Relationships: []
      }
      v_budget_actual: {
        Row: {
          account_code: string | null
          account_name: string | null
          actual: number | null
          budget_amount: number | null
          project_id: string | null
          project_name: string | null
        }
        Relationships: []
      }
      v_cash_book: {
        Row: {
          account_code: string | null
          balance: number | null
          description: string | null
          entry_date: string | null
          payments: number | null
          receipts: number | null
          ref_no: string | null
        }
        Relationships: []
      }
      v_vat_summary: {
        Row: {
          input_vat: number | null
          net_vat: number | null
          output_vat: number | null
          period: string | null
        }
        Relationships: []
      }
      v_account_balances: {
        Row: {
          balance: number | null
          category: string | null
          code: string | null
          name: string | null
          net_debit: number | null
          normal_balance: string | null
          sort: number | null
          sub_category: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      v_cash_position: {
        Row: { cash_on_hand: number | null }
        Relationships: []
      }
      v_outstanding_imprests: {
        Row: {
          age_days: number | null
          amount_issued: number | null
          amount_spent: number | null
          balance: number | null
          currency: string | null
          id: string | null
          imprest_no: string | null
          issue_date: string | null
          officer_name: string | null
          project_id: string | null
          purpose: string | null
          status: string | null
        }
        Relationships: []
      }
      v_project_financials: {
        Row: {
          code: string | null
          contract_value: number | null
          currency: string | null
          domain: string | null
          id: string | null
          imprest_issued: number | null
          imprest_retired: number | null
          name: string | null
          status: string | null
          total_invoiced: number | null
          total_received: number | null
        }
        Relationships: []
      }
      v_trial_balance: {
        Row: {
          category: string | null
          code: string | null
          credit: number | null
          debit: number | null
          name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_close_period: { Args: { p_through: string }; Returns: undefined }
      fn_reopen_period: { Args: Record<string, never>; Returns: undefined }
      fn_pnl: { Args: { p_from: string; p_to: string }; Returns: { code: string; name: string; category: string; amount: number }[] }
      fn_trial_balance: { Args: { p_as_at: string }; Returns: { code: string; name: string; category: string; debit: number; credit: number }[] }
      fn_balance_sheet: { Args: { p_as_at: string }; Returns: { section: string; code: string; name: string; amount: number }[] }
      fn_cash_flow: { Args: { p_from: string; p_to: string }; Returns: { category: string; inflow: number; outflow: number }[] }
      fn_role: { Args: Record<string, never>; Returns: string }
      fn_close_year: { Args: { p_through: string }; Returns: string }
      fn_snapshot_month: { Args: { p_period?: string }; Returns: string }
      fn_issue_imprest: {
        Args: { p_cash_account?: string; p_imprest_id: string }
        Returns: string
      }
      fn_issue_invoice: {
        Args: { p_ar?: string; p_invoice_id: string; p_revenue: string; p_vat?: string }
        Returns: string
      }
      fn_pay_invoice: {
        Args: { p_cash?: string; p_invoice_id: string }
        Returns: string
      }
      fn_next_number: {
        Args: { p_prefix?: string; p_type: string }
        Returns: string
      }
      fn_post_journal: {
        Args: {
          p_currency: string
          p_date: string
          p_description: string
          p_fx: number
          p_lines: Json
          p_project: string
          p_ref?: string
          p_source: string
          p_source_id: string
        }
        Returns: string
      }
      fn_post_receipt: {
        Args: { p_cash_account?: string; p_receipt_id: string }
        Returns: string
      }
      fn_retire_imprest: {
        Args: { p_cash_account?: string; p_imprest_id: string }
        Returns: string
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
