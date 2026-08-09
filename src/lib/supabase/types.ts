export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      automation_executions: {
        Row: {
          action: string;
          attempts: number;
          completed_at: string | null;
          created_at: string;
          error_message: string | null;
          event_id: string;
          event_type: string;
          id: string;
          lead_id: string | null;
          next_retry_at: string | null;
          organization_id: string;
          provider: string;
          response_metadata: Json;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          action: string;
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
          error_message?: string | null;
          event_id: string;
          event_type: string;
          id?: string;
          lead_id?: string | null;
          next_retry_at?: string | null;
          organization_id: string;
          provider: string;
          response_metadata?: Json;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          action?: string;
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
          error_message?: string | null;
          event_id?: string;
          event_type?: string;
          id?: string;
          lead_id?: string | null;
          next_retry_at?: string | null;
          organization_id?: string;
          provider?: string;
          response_metadata?: Json;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automation_executions_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "automation_executions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      automations: {
        Row: {
          action_config: Json;
          action_type: string;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          organization_id: string;
          trigger_config: Json;
          trigger_type: string;
          updated_at: string;
          workspace_id: string | null;
        };
        Insert: {
          action_config?: Json;
          action_type: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          organization_id: string;
          trigger_config?: Json;
          trigger_type: string;
          updated_at?: string;
          workspace_id?: string | null;
        };
        Update: {
          action_config?: Json;
          action_type?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          organization_id?: string;
          trigger_config?: Json;
          trigger_type?: string;
          updated_at?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "automations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          content: string;
          created_at: string;
          direction: string;
          id: string;
          lead_id: string;
          metadata: Json;
          organization_id: string;
          subject: string | null;
          type: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          direction: string;
          id?: string;
          lead_id: string;
          metadata?: Json;
          organization_id: string;
          subject?: string | null;
          type: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          direction?: string;
          id?: string;
          lead_id?: string;
          metadata?: Json;
          organization_id?: string;
          subject?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_audit_events: {
        Row: {
          actor_profile_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          organization_id: string;
          provider: string;
        };
        Insert: {
          actor_profile_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          organization_id: string;
          provider: string;
        };
        Update: {
          actor_profile_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          organization_id?: string;
          provider?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_oauth_states: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          organization_id: string;
          pkce_verifier_encrypted: string | null;
          provider: string;
          return_path: string | null;
          state_hash: string;
        };
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          id?: string;
          organization_id: string;
          pkce_verifier_encrypted?: string | null;
          provider: string;
          return_path?: string | null;
          state_hash: string;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          organization_id?: string;
          pkce_verifier_encrypted?: string | null;
          provider?: string;
          return_path?: string | null;
          state_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_oauth_states_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_webhook_events: {
        Row: {
          created_at: string;
          error_code: string | null;
          event_type: string;
          external_event_id: string;
          id: string;
          integration_id: string | null;
          organization_id: string;
          payload_hash: string | null;
          processed_at: string | null;
          provider: string;
          received_at: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          error_code?: string | null;
          event_type: string;
          external_event_id: string;
          id?: string;
          integration_id?: string | null;
          organization_id: string;
          payload_hash?: string | null;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          error_code?: string | null;
          event_type?: string;
          external_event_id?: string;
          id?: string;
          integration_id?: string | null;
          organization_id?: string;
          payload_hash?: string | null;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_webhook_events_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integrations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_webhook_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      integrations: {
        Row: {
          config: Json;
          connected_at: string | null;
          connected_by: string | null;
          created_at: string;
          credentials: Json;
          external_account_id: string | null;
          external_account_name: string | null;
          health_status: string;
          id: string;
          is_active: boolean;
          last_error_at: string | null;
          last_error_code: string | null;
          last_success_at: string | null;
          organization_id: string;
          provider: string;
          scopes: string[] | null;
          status: string;
          token_expires_at: string | null;
          updated_at: string;
        };
        Insert: {
          config?: Json;
          connected_at?: string | null;
          connected_by?: string | null;
          created_at?: string;
          credentials?: Json;
          external_account_id?: string | null;
          external_account_name?: string | null;
          health_status?: string;
          id?: string;
          is_active?: boolean;
          last_error_at?: string | null;
          last_error_code?: string | null;
          last_success_at?: string | null;
          organization_id: string;
          provider: string;
          scopes?: string[] | null;
          status?: string;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          config?: Json;
          connected_at?: string | null;
          connected_by?: string | null;
          created_at?: string;
          credentials?: Json;
          external_account_id?: string | null;
          external_account_name?: string | null;
          health_status?: string;
          id?: string;
          is_active?: boolean;
          last_error_at?: string | null;
          last_error_code?: string | null;
          last_success_at?: string | null;
          organization_id?: string;
          provider?: string;
          scopes?: string[] | null;
          status?: string;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          assigned_to: string | null;
          company: string | null;
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          last_name: string;
          metadata: Json;
          organization_id: string;
          phone: string | null;
          pipeline_id: string | null;
          pipeline_stage_id: string | null;
          score: number;
          source: string;
          source_external_id: string | null;
          status: string;
          tags: string[] | null;
          updated_at: string;
          workspace_id: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          first_name: string;
          id?: string;
          last_name: string;
          metadata?: Json;
          organization_id: string;
          phone?: string | null;
          pipeline_id?: string | null;
          pipeline_stage_id?: string | null;
          score?: number;
          source?: string;
          source_external_id?: string | null;
          status?: string;
          tags?: string[] | null;
          updated_at?: string;
          workspace_id?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          metadata?: Json;
          organization_id?: string;
          phone?: string | null;
          pipeline_id?: string | null;
          pipeline_stage_id?: string | null;
          score?: number;
          source?: string;
          source_external_id?: string | null;
          status?: string;
          tags?: string[] | null;
          updated_at?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey";
            columns: ["pipeline_stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_document_versions: {
        Row: {
          content: string;
          created_at: string;
          document_type: string;
          effective_at: string;
          id: string;
          title: string;
          version: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          document_type: string;
          effective_at: string;
          id?: string;
          title: string;
          version: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          document_type?: string;
          effective_at?: string;
          id?: string;
          title?: string;
          version?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          active_owner_organization_id: string | null;
          created_at: string;
          id: string;
          joined_at: string;
          organization_id: string;
          profile_id: string;
          removed_at: string | null;
          role: string;
          status: string;
          suspended_at: string | null;
        };
        Insert: {
          active_owner_organization_id?: string | null;
          created_at?: string;
          id?: string;
          joined_at?: string;
          organization_id: string;
          profile_id: string;
          removed_at?: string | null;
          role?: string;
          status?: string;
          suspended_at?: string | null;
        };
        Update: {
          active_owner_organization_id?: string | null;
          created_at?: string;
          id?: string;
          joined_at?: string;
          organization_id?: string;
          profile_id?: string;
          removed_at?: string | null;
          role?: string;
          status?: string;
          suspended_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_ai_qualification_windows: {
        Row: {
          created_at: string;
          organization_id: string;
          request_count: number;
          updated_at: string;
          window_started_at: string;
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          request_count?: number;
          updated_at?: string;
          window_started_at: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          request_count?: number;
          updated_at?: string;
          window_started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_ai_qualification_windows_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email_normalized: string;
          expires_at: string;
          id: string;
          invited_by: string;
          last_sent_at: string;
          organization_id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          role: string;
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email_normalized: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          last_sent_at?: string;
          organization_id: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role: string;
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email_normalized?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          last_sent_at?: string;
          organization_id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: string;
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_ownership_transfers: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          expired_at: string | null;
          expires_at: string;
          id: string;
          initiator_membership_id: string;
          organization_id: string;
          rejected_at: string | null;
          rejected_by: string | null;
          target_membership_id: string;
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          expired_at?: string | null;
          expires_at: string;
          id?: string;
          initiator_membership_id: string;
          organization_id: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          target_membership_id: string;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          expired_at?: string | null;
          expires_at?: string;
          id?: string;
          initiator_membership_id?: string;
          organization_id?: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          target_membership_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_ownership_transfers_initiator_membership_id_fkey";
            columns: ["initiator_membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_ownership_transfers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_ownership_transfers_target_membership_id_fkey";
            columns: ["target_membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          settings: Json;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          settings?: Json;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          settings?: Json;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pipeline_stages: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          name: string;
          order_index: number;
          pipeline_id: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          order_index?: number;
          pipeline_id: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          order_index?: number;
          pipeline_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
        ];
      };
      pipelines: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_default: boolean;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_default?: boolean;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_default?: boolean;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pipelines_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      source_api_keys: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          key_hash: string;
          label: string;
          last_used_at: string | null;
          organization_id: string;
          source: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          key_hash: string;
          label: string;
          last_used_at?: string | null;
          organization_id: string;
          source: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          key_hash?: string;
          label?: string;
          last_used_at?: string | null;
          organization_id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_api_keys_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      team_audit_events: {
        Row: {
          actor_profile_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          organization_id: string;
          subject_profile_id: string | null;
        };
        Insert: {
          actor_profile_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          organization_id: string;
          subject_profile_id?: string | null;
        };
        Update: {
          actor_profile_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          organization_id?: string;
          subject_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_audit_events_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_audit_events_subject_profile_id_fkey";
            columns: ["subject_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_legal_consents: {
        Row: {
          accepted_at: string;
          created_at: string;
          document_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          accepted_at?: string;
          created_at?: string;
          document_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string;
          created_at?: string;
          document_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_legal_consents_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "legal_document_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_organization_invitation: {
        Args: { p_token_hash: string };
        Returns: Json;
      };
      accept_organization_ownership_transfer: {
        Args: { p_token_hash: string };
        Returns: Json;
      };
      can_manage_organization_invitation_role: {
        Args: { p_actor_role: string; p_target_role: string };
        Returns: boolean;
      };
      can_manage_organization_membership_role: {
        Args: {
          p_actor_role: string;
          p_next_role: string;
          p_target_role: string;
        };
        Returns: boolean;
      };
      cancel_organization_ownership_transfer: {
        Args: { p_transfer_id: string };
        Returns: string;
      };
      create_organization_invitation: {
        Args: {
          p_email_normalized: string;
          p_expires_at: string;
          p_organization_id: string;
          p_role: string;
          p_token_hash: string;
        };
        Returns: string;
      };
      create_organization_ownership_transfer: {
        Args: {
          p_expires_at: string;
          p_target_membership_id: string;
          p_token_hash: string;
        };
        Returns: string;
      };
      current_user_has_current_legal_consent: { Args: never; Returns: boolean };
      current_user_satisfies_mfa_requirement: { Args: never; Returns: boolean };
      has_active_org_role: {
        Args: { p_organization_id: string; p_roles: string[] };
        Returns: boolean;
      };
      has_valid_lead_tenant_references: {
        Args: {
          p_organization_id: string;
          p_pipeline_id: string;
          p_pipeline_stage_id: string;
          p_workspace_id: string;
        };
        Returns: boolean;
      };
      is_active_org_member: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
      is_org_member: { Args: { org_id: string }; Returns: boolean };
      list_organization_pending_invitations: {
        Args: { p_organization_id: string };
        Returns: {
          created_at: string;
          email_normalized: string;
          expires_at: string;
          invitation_id: string;
          last_sent_at: string;
          role: string;
        }[];
      };
      list_organization_pending_ownership_transfers: {
        Args: { p_organization_id: string };
        Returns: {
          created_at: string;
          expires_at: string;
          status: string;
          target_email: string;
          target_full_name: string;
          target_membership_id: string;
          transfer_id: string;
        }[];
      };
      list_organization_team_audit_events: {
        Args: { p_limit?: number; p_organization_id: string };
        Returns: {
          actor_name: string;
          created_at: string;
          event_id: string;
          event_type: string;
          metadata: Json;
          subject_name: string;
        }[];
      };
      list_organization_team_members: {
        Args: { p_organization_id: string };
        Returns: {
          avatar_url: string;
          email: string;
          full_name: string;
          joined_at: string;
          membership_id: string;
          profile_id: string;
          removed_at: string;
          role: string;
          status: string;
          suspended_at: string;
        }[];
      };
      onboard_user: {
        Args: {
          p_org_name: string;
          p_org_slug: string;
          p_user_id: string;
          p_workspace_name?: string;
        };
        Returns: Json;
      };
      ownership_transfer_transition_matches: {
        Args: {
          p_initiator_membership_id?: string;
          p_organization_id: string;
          p_target_membership_id?: string;
        };
        Returns: boolean;
      };
      reject_organization_ownership_transfer: {
        Args: { p_token_hash: string };
        Returns: Json;
      };
      reserve_organization_ai_qualification_slot: {
        Args: { p_limit: number; p_organization_id: string };
        Returns: boolean;
      };
      revoke_organization_invitation: {
        Args: { p_invitation_id: string };
        Returns: string;
      };
      rotate_organization_invitation: {
        Args: {
          p_expires_at: string;
          p_invitation_id: string;
          p_token_hash: string;
        };
        Returns: string;
      };
      set_organization_membership_status: {
        Args: { p_membership_id: string; p_status: string };
        Returns: string;
      };
      shares_active_organization: {
        Args: { p_profile_id: string };
        Returns: boolean;
      };
      update_organization_membership_role: {
        Args: { p_membership_id: string; p_role: string };
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
