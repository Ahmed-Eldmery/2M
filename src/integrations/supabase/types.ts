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
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          customer_type: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          total_orders: number
          total_spent: number
        }
        Insert: {
          created_at?: string | null
          customer_type?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          total_orders?: number
          total_spent?: number
        }
        Update: {
          created_at?: string | null
          customer_type?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          total_orders?: number
          total_spent?: number
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          hire_date: string
          id: string
          name: string
          phone: string | null
          position: string
          salary: number
        }
        Insert: {
          created_at?: string | null
          hire_date?: string
          id?: string
          name: string
          phone?: string | null
          position: string
          salary?: number
        }
        Update: {
          created_at?: string | null
          hire_date?: string
          id?: string
          name?: string
          phone?: string | null
          position?: string
          salary?: number
        }
        Relationships: []
      }
      inventory: {
        Row: {
          alert_threshold: number
          category: string
          code: string | null
          created_at: string | null
          id: string
          name: string
          purchase_price: number
          quantity: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          alert_threshold?: number
          category: string
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          purchase_price?: number
          quantity?: number
          unit: string
          updated_at?: string | null
        }
        Update: {
          alert_threshold?: number
          category?: string
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          purchase_price?: number
          quantity?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_receipt_items: {
        Row: {
          id: string
          inventory_id: string | null
          item_code: string | null
          item_name: string
          quantity: number
          receipt_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          inventory_id?: string | null
          item_code?: string | null
          item_name: string
          quantity?: number
          receipt_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          id?: string
          inventory_id?: string | null
          item_code?: string | null
          item_name?: string
          quantity?: number
          receipt_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_receipt_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "inventory_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_receipts: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          receipt_number: string
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          receipt_number: string
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          receipt_number?: string
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_inventory_items: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string
          order_id: string
          quantity_used: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id: string
          order_id: string
          quantity_used?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string
          order_id?: string
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_inventory_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_inventory_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "print_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          description: string | null
          id: string
          is_delivered: boolean
          item_name: string
          order_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          is_delivered?: boolean
          item_name: string
          order_id: string
          quantity?: number
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          is_delivered?: boolean
          item_name?: string
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "print_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      print_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string
          dimensions: string | null
          id: string
          notes: string | null
          order_number: string
          paid: number
          price: number
          quantity: number
          remaining: number | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string | null
          work_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          dimensions?: string | null
          id?: string
          notes?: string | null
          order_number: string
          paid?: number
          price?: number
          quantity?: number
          remaining?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string | null
          work_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          dimensions?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          paid?: number
          price?: number
          quantity?: number
          remaining?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          amount: number
          created_at: string | null
          employee_id: string
          id: string
          month: string
          notes: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          employee_id: string
          id?: string
          month: string
          notes?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          employee_id?: string
          id?: string
          month?: string
          notes?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_items: {
        Row: {
          id: string
          item_name: string
          notes: string | null
          price: number
          supplier_id: string
        }
        Insert: {
          id?: string
          item_name: string
          notes?: string | null
          price?: number
          supplier_id: string
        }
        Update: {
          id?: string
          item_name?: string
          notes?: string | null
          price?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          total_owed: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          total_owed?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          total_owed?: number
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          order_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          recipient: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recipient?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recipient?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "print_orders"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner_or_accountant: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "accountant" | "designer" | "printer" | "warehouse"
      order_status:
        | "new"
        | "design"
        | "printing"
        | "printed"
        | "waiting_outside"
        | "delivered"
      payment_method:
        | "cash"
        | "instapay_alaa"
        | "instapay_amr"
        | "vodafone_alaa"
        | "vodafone_amr"
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
      app_role: ["owner", "accountant", "designer", "printer", "warehouse"],
      order_status: [
        "new",
        "design",
        "printing",
        "printed",
        "waiting_outside",
        "delivered",
      ],
      payment_method: [
        "cash",
        "instapay_alaa",
        "instapay_amr",
        "vodafone_alaa",
        "vodafone_amr",
      ],
    },
  },
} as const
