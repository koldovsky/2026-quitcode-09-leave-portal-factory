// Типи схеми бази. Оновлюйте разом із міграцією: готовий файл — у Summary прогону job db-check у CI
// (supabase gen types typescript --local на одноразовій базі); або PM/техлід: npm run db:types (після supabase link). Ця версія написана вручну й описує таблиці з міграцій
// 20261012000000_profiles_and_roles.sql, 20261013000000_leave_requests.sql і 20261016000000_leave_rules_v0_2.sql
// (20261017000000_require_leave_records.sql додає тригер і перевірку ролі в політиці, 20261018000000_manager_helpers_require_role.sql —
// перевірку ролі в хелперах черг; типи обидві не змінюють); 20261020000000_admin_user_management.sql — функцію admin_set_role
// (20261020000100_admin_set_role_private.sql переносить її логіку в private; сигнатура public.admin_set_role та сама).

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
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      divisions: {
        Row: {
          id: string;
          code: string;
          name: string;
          manager_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          manager_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          manager_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      positions: {
        Row: {
          id: string;
          employee_id: string;
          division_id: string;
          kind: string;
          title: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          division_id: string;
          kind: string;
          title: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          division_id?: string;
          kind?: string;
          title?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      blocked_days: {
        Row: {
          day: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          day: string;
          reason?: string;
          created_at?: string;
        };
        Update: {
          day?: string;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      leave_requests: {
        Row: {
          id: string;
          employee_id: string;
          leave_type: string;
          start_date: string;
          end_date: string;
          substitute_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id?: string;
          leave_type: string;
          start_date: string;
          end_date: string;
          substitute_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          leave_type?: string;
          start_date?: string;
          end_date?: string;
          substitute_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leave_records: {
        Row: {
          id: string;
          request_id: string;
          position_id: string;
          kind: string;
          division_id: string;
          status: string;
          decided_by: string | null;
          decided_at: string | null;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          position_id: string;
          kind: string;
          division_id: string;
          status?: string;
          decided_by?: string | null;
          decided_at?: string | null;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          position_id?: string;
          kind?: string;
          division_id?: string;
          status?: string;
          decided_by?: string | null;
          decided_at?: string | null;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      // 20261020000000_admin_user_management.sql — зміна ролі лише адміністратором.
      admin_set_role: {
        Args: {
          p_user: string;
          p_role: string;
        };
        Returns: undefined;
      };
      // 20261102120000_bulk_decisions.sql — масове схвалення записів черги.
      approve_leave_records: {
        Args: {
          p_record_ids: string[];
        };
        Returns: number;
      };
      submit_leave_request: {
        Args: {
          p_leave_type: string;
          p_start_date: string;
          p_end_date: string;
          p_position_ids: string[];
          p_substitute_note?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
