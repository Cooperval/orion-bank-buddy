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
<<<<<<< HEAD
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cash_flow_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string
          entry_date: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description: string
          entry_date: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string
          entry_date?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ofx_files: {
        Row: {
          account_id: string | null
          bank_name: string | null
          file_size: number | null
          filename: string
          id: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          bank_name?: string | null
          file_size?: number | null
          filename: string
          id?: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          bank_name?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ofx_transactions: {
        Row: {
          amount: number
          bank_name: string | null
          classification: string | null
          created_at: string | null
          description: string
          id: string
          ofx_file_id: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_name?: string | null
          classification?: string | null
          created_at?: string | null
          description: string
          id?: string
          ofx_file_id?: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          classification?: string | null
          created_at?: string | null
          description?: string
          id?: string
          ofx_file_id?: string | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ofx_transactions_ofx_file_id_fkey"
            columns: ["ofx_file_id"]
            isOneToOne: false
            referencedRelation: "ofx_files"
=======
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      banks: {
        Row: {
          account_number: string
          account_type: string | null
          agency: string | null
          bank_code: string
          bank_name: string
          company_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          account_number: string
          account_type?: string | null
          agency?: string | null
          bank_code: string
          bank_name: string
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_type?: string | null
          agency?: string | null
          bank_code?: string
          bank_name?: string
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          actual_amount: number
          budgeted_amount: number
          company_id: string
          created_at: string
          id: string
          month_year: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number
          budgeted_amount?: number
          company_id: string
          created_at?: string
          id?: string
          month_year: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number
          budgeted_amount?: number
          company_id?: string
          created_at?: string
          id?: string
          month_year?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cfop_classifications: {
        Row: {
          cfop: string
          classification: string
          company_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          cfop: string
          classification: string
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          cfop?: string
          classification?: string
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      classification_rules: {
        Row: {
          commitment_group_id: string | null
          commitment_id: string | null
          commitment_type_id: string | null
          company_id: string
          created_at: string
          description_contains: string
          id: string
          is_active: boolean
          rule_name: string
          updated_at: string
        }
        Insert: {
          commitment_group_id?: string | null
          commitment_id?: string | null
          commitment_type_id?: string | null
          company_id: string
          created_at?: string
          description_contains: string
          id?: string
          is_active?: boolean
          rule_name: string
          updated_at?: string
        }
        Update: {
          commitment_group_id?: string | null
          commitment_id?: string | null
          commitment_type_id?: string | null
          company_id?: string
          created_at?: string
          description_contains?: string
          id?: string
          is_active?: boolean
          rule_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classification_rules_commitment_group_id_fkey"
            columns: ["commitment_group_id"]
            isOneToOne: false
            referencedRelation: "commitment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_rules_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_rules_commitment_type_id_fkey"
            columns: ["commitment_type_id"]
            isOneToOne: false
            referencedRelation: "commitment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_groups: {
        Row: {
          color: string | null
          commitment_type_id: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          commitment_type_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          commitment_type_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_groups_commitment_type_id_fkey"
            columns: ["commitment_type_id"]
            isOneToOne: false
            referencedRelation: "commitment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_types: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      commitments: {
        Row: {
          commitment_group_id: string
          commitment_type_id: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          commitment_group_id: string
          commitment_type_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          commitment_group_id?: string
          commitment_type_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_commitment_group_id_fkey"
            columns: ["commitment_group_id"]
            isOneToOne: false
            referencedRelation: "commitment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_commitment_type_id_fkey"
            columns: ["commitment_type_id"]
            isOneToOne: false
            referencedRelation: "commitment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          segment: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          segment?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          segment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dre_line_configurations: {
        Row: {
          commitment_group_id: string | null
          commitment_id: string | null
          company_id: string
          created_at: string
          id: string
          line_type: string
          updated_at: string
        }
        Insert: {
          commitment_group_id?: string | null
          commitment_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          line_type: string
          updated_at?: string
        }
        Update: {
          commitment_group_id?: string | null
          commitment_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          line_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dre_line_configurations_commitment_group_id_fkey"
            columns: ["commitment_group_id"]
            isOneToOne: false
            referencedRelation: "commitment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dre_line_configurations_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          hire_date: string | null
          id: string
          monthly_cost: number
          name: string
          position: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          hire_date?: string | null
          id?: string
          monthly_cost?: number
          name: string
          position?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          hire_date?: string | null
          id?: string
          monthly_cost?: number
          name?: string
          position?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_metrics: {
        Row: {
          average_ticket: number
          company_id: string
          costs: number
          created_at: string
          expenses: number
          id: string
          month_year: string
          net_profit: number | null
          revenue: number
          updated_at: string
        }
        Insert: {
          average_ticket?: number
          company_id: string
          costs?: number
          created_at?: string
          expenses?: number
          id?: string
          month_year: string
          net_profit?: number | null
          revenue?: number
          updated_at?: string
        }
        Update: {
          average_ticket?: number
          company_id?: string
          costs?: number
          created_at?: string
          expenses?: number
          id?: string
          month_year?: string
          net_profit?: number | null
          revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      future_entries: {
        Row: {
          amount: number
          commitment_group_id: string | null
          commitment_id: string | null
          commitment_type_id: string | null
          company_id: string
          created_at: string
          description: string
          due_date: string
          entry_type: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          commitment_group_id?: string | null
          commitment_id?: string | null
          commitment_type_id?: string | null
          company_id: string
          created_at?: string
          description: string
          due_date: string
          entry_type: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          commitment_group_id?: string | null
          commitment_id?: string | null
          commitment_type_id?: string | null
          company_id?: string
          created_at?: string
          description?: string
          due_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      nfe_documents: {
        Row: {
          cfop: string | null
          company_id: string
          created_at: string
          emission_date: string
          fatura_numero: string | null
          fatura_valor_desconto: number | null
          fatura_valor_liquido: number | null
          fatura_valor_original: number | null
          id: string
          nfe_number: string
          operation_nature: string
          serie: string
          total_cofins_value: number
          total_icms_value: number
          total_ipi_value: number
          total_iss_value: number
          total_nfe_value: number
          total_pis_value: number
          total_products_value: number
          updated_at: string
          xml_content: string
        }
        Insert: {
          cfop?: string | null
          company_id: string
          created_at?: string
          emission_date: string
          fatura_numero?: string | null
          fatura_valor_desconto?: number | null
          fatura_valor_liquido?: number | null
          fatura_valor_original?: number | null
          id?: string
          nfe_number: string
          operation_nature: string
          serie: string
          total_cofins_value?: number
          total_icms_value?: number
          total_ipi_value?: number
          total_iss_value?: number
          total_nfe_value?: number
          total_pis_value?: number
          total_products_value?: number
          updated_at?: string
          xml_content: string
        }
        Update: {
          cfop?: string | null
          company_id?: string
          created_at?: string
          emission_date?: string
          fatura_numero?: string | null
          fatura_valor_desconto?: number | null
          fatura_valor_liquido?: number | null
          fatura_valor_original?: number | null
          id?: string
          nfe_number?: string
          operation_nature?: string
          serie?: string
          total_cofins_value?: number
          total_icms_value?: number
          total_ipi_value?: number
          total_iss_value?: number
          total_nfe_value?: number
          total_pis_value?: number
          total_products_value?: number
          updated_at?: string
          xml_content?: string
        }
        Relationships: []
      }
      nfe_duplicatas: {
        Row: {
          created_at: string
          data_vencimento: string
          id: string
          nfe_document_id: string
          numero_parcela: string
          updated_at: string
          valor_parcela: number
        }
        Insert: {
          created_at?: string
          data_vencimento: string
          id?: string
          nfe_document_id: string
          numero_parcela: string
          updated_at?: string
          valor_parcela?: number
        }
        Update: {
          created_at?: string
          data_vencimento?: string
          id?: string
          nfe_document_id?: string
          numero_parcela?: string
          updated_at?: string
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "nfe_duplicatas_nfe_document_id_fkey"
            columns: ["nfe_document_id"]
            isOneToOne: false
            referencedRelation: "nfe_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_emitters: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          municipio: string
          nfe_document_id: string
          razao_social: string
          uf: string
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          municipio: string
          nfe_document_id: string
          razao_social: string
          uf: string
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          municipio?: string
          nfe_document_id?: string
          razao_social?: string
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_nfe_emitters_document"
            columns: ["nfe_document_id"]
            isOneToOne: false
            referencedRelation: "nfe_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_items: {
        Row: {
          created_at: string
          id: string
          ncm: string
          nfe_document_id: string
          product_code: string
          product_description: string
          quantity: number
          total_value: number
          unit_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ncm: string
          nfe_document_id: string
          product_code: string
          product_description: string
          quantity: number
          total_value: number
          unit_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ncm?: string
          nfe_document_id?: string
          product_code?: string
          product_description?: string
          quantity?: number
          total_value?: number
          unit_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_nfe_items_document"
            columns: ["nfe_document_id"]
            isOneToOne: false
            referencedRelation: "nfe_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_recipients: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          municipio: string
          nfe_document_id: string
          razao_social: string
          uf: string
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          municipio: string
          nfe_document_id: string
          razao_social: string
          uf: string
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          municipio?: string
          nfe_document_id?: string
          razao_social?: string
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_nfe_recipients_document"
            columns: ["nfe_document_id"]
            isOneToOne: false
            referencedRelation: "nfe_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_taxes: {
        Row: {
          base_calculation: number
          created_at: string
          id: string
          nfe_item_id: string
          tax_rate: number
          tax_type: string
          tax_value: number
          updated_at: string
        }
        Insert: {
          base_calculation?: number
          created_at?: string
          id?: string
          nfe_item_id: string
          tax_rate?: number
          tax_type: string
          tax_value?: number
          updated_at?: string
        }
        Update: {
          base_calculation?: number
          created_at?: string
          id?: string
          nfe_item_id?: string
          tax_rate?: number
          tax_type?: string
          tax_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_nfe_taxes_item"
            columns: ["nfe_item_id"]
            isOneToOne: false
            referencedRelation: "nfe_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ofx_uploads: {
        Row: {
          bank_id: string | null
          company_id: string
          created_at: string
          error_message: string | null
          file_size: number
          filename: string
          id: string
          status: string
          transactions_count: number | null
          updated_at: string
          upload_date: string
        }
        Insert: {
          bank_id?: string | null
          company_id: string
          created_at?: string
          error_message?: string | null
          file_size: number
          filename: string
          id?: string
          status?: string
          transactions_count?: number | null
          updated_at?: string
          upload_date?: string
        }
        Update: {
          bank_id?: string | null
          company_id?: string
          created_at?: string
          error_message?: string | null
          file_size?: number
          filename?: string
          id?: string
          status?: string
          transactions_count?: number | null
          updated_at?: string
          upload_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ofx_uploads_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          company_id: string
          cost_price: number
          created_at: string
          id: string
          margin_percentage: number | null
          name: string
          selling_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          cost_price?: number
          created_at?: string
          id?: string
          margin_percentage?: number | null
          name: string
          selling_price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          cost_price?: number
          created_at?: string
          id?: string
          margin_percentage?: number | null
          name?: string
          selling_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
>>>>>>> cdabeeb (Alterações)
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
<<<<<<< HEAD
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      xml_files: {
        Row: {
          file_size: number | null
          filename: string
          id: string
          nf_date: string | null
          nf_number: string | null
          status: string | null
          total_value: number | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          file_size?: number | null
          filename: string
          id?: string
          nf_date?: string | null
          nf_number?: string | null
          status?: string | null
          total_value?: number | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          file_size?: number | null
          filename?: string
          id?: string
          nf_date?: string | null
          nf_number?: string | null
          status?: string | null
          total_value?: number | null
          uploaded_at?: string | null
=======
          avatar_url: string | null
          company_id: string | null
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_classifications: {
        Row: {
          classification_date: string
          classified_by: string | null
          commitment_group_id: string | null
          commitment_id: string | null
          commitment_type_id: string | null
          created_at: string
          id: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          classification_date?: string
          classified_by?: string | null
          commitment_group_id?: string | null
          commitment_id?: string | null
          commitment_type_id?: string | null
          created_at?: string
          id?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          classification_date?: string
          classified_by?: string | null
          commitment_group_id?: string | null
          commitment_id?: string | null
          commitment_type_id?: string | null
          created_at?: string
          id?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_classifications_commitment_group_id_fkey"
            columns: ["commitment_group_id"]
            isOneToOne: false
            referencedRelation: "commitment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_classifications_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_classifications_commitment_type_id_fkey"
            columns: ["commitment_type_id"]
            isOneToOne: false
            referencedRelation: "commitment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_classifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance: number | null
          bank_id: string
          company_id: string
          created_at: string
          description: string
          fitid: string | null
          id: string
          memo: string | null
          ofx_import_date: string | null
          ofx_upload_id: string
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          balance?: number | null
          bank_id: string
          company_id: string
          created_at?: string
          description: string
          fitid?: string | null
          id?: string
          memo?: string | null
          ofx_import_date?: string | null
          ofx_upload_id: string
          transaction_date: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number | null
          bank_id?: string
          company_id?: string
          created_at?: string
          description?: string
          fitid?: string | null
          id?: string
          memo?: string | null
          ofx_import_date?: string | null
          ofx_upload_id?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_ofx_upload_id_fkey"
            columns: ["ofx_upload_id"]
            isOneToOne: false
            referencedRelation: "ofx_uploads"
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
>>>>>>> cdabeeb (Alterações)
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
<<<<<<< HEAD
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
=======
      calculate_company_storage_size: {
        Args: { company_uuid: string }
        Returns: number
      }
      cleanup_orphaned_banks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_company_access: {
        Args: { company_uuid: string }
        Returns: boolean
      }
      user_has_company_access_via_profile: {
        Args: { company_uuid: string }
        Returns: boolean
      }
      user_has_demo_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "gestor"
      transaction_category:
        | "receita_operacional"
        | "receita_financeira"
        | "custo_operacional"
        | "despesa_administrativa"
        | "despesa_comercial"
        | "investimento"
        | "outros"
>>>>>>> cdabeeb (Alterações)
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
<<<<<<< HEAD
    Enums: {},
=======
    Enums: {
      app_role: ["admin", "operador", "gestor"],
      transaction_category: [
        "receita_operacional",
        "receita_financeira",
        "custo_operacional",
        "despesa_administrativa",
        "despesa_comercial",
        "investimento",
        "outros",
      ],
    },
>>>>>>> cdabeeb (Alterações)
  },
} as const
