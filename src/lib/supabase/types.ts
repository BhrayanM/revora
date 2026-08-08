export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: "admin" | "manager" | "agent";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          role?: "admin" | "manager" | "agent";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: "admin" | "manager" | "agent";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      legal_document_versions: {
        Row: {
          id: string;
          document_type: "terms" | "privacy" | "marketing";
          version: string;
          title: string;
          content: string;
          effective_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_type: "terms" | "privacy" | "marketing";
          version: string;
          title: string;
          content: string;
          effective_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_type?: "terms" | "privacy" | "marketing";
          version?: string;
          title?: string;
          content?: string;
          effective_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_legal_consents: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          accepted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          accepted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_id?: string;
          accepted_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          profile_id: string;
          organization_id: string;
          role: "owner" | "admin" | "manager" | "agent";
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          organization_id: string;
          role?: "owner" | "admin" | "manager" | "agent";
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          organization_id?: string;
          role?: "owner" | "admin" | "manager" | "agent";
          created_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pipelines: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pipeline_stages: {
        Row: {
          id: string;
          pipeline_id: string;
          name: string;
          order_index: number;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pipeline_id: string;
          name: string;
          order_index?: number;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pipeline_id?: string;
          name?: string;
          order_index?: number;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          workspace_id: string | null;
          pipeline_id: string | null;
          pipeline_stage_id: string | null;
          assigned_to: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          source:
            | "website"
            | "referral"
            | "linkedin"
            | "email"
            | "cold_call"
            | "event"
            | "other";
          status:
            | "new"
            | "contacted"
            | "qualified"
            | "proposal"
            | "negotiation"
            | "won"
            | "lost";
          score: number;
          tags: string[] | null;
          metadata: Record<string, unknown>;
          source_external_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          workspace_id?: string | null;
          pipeline_id?: string | null;
          pipeline_stage_id?: string | null;
          assigned_to?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          source?:
            | "website"
            | "referral"
            | "linkedin"
            | "email"
            | "cold_call"
            | "event"
            | "other";
          status?:
            | "new"
            | "contacted"
            | "qualified"
            | "proposal"
            | "negotiation"
            | "won"
            | "lost";
          score?: number;
          tags?: string[] | null;
          metadata?: Record<string, unknown>;
          source_external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          workspace_id?: string | null;
          pipeline_id?: string | null;
          pipeline_stage_id?: string | null;
          assigned_to?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          source?:
            | "website"
            | "referral"
            | "linkedin"
            | "email"
            | "cold_call"
            | "event"
            | "other";
          status?:
            | "new"
            | "contacted"
            | "qualified"
            | "proposal"
            | "negotiation"
            | "won"
            | "lost";
          score?: number;
          tags?: string[] | null;
          metadata?: Record<string, unknown>;
          source_external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string;
          type: "email" | "sms" | "call" | "note" | "ai_summary";
          direction: "inbound" | "outbound";
          subject: string | null;
          content: string;
          metadata: Record<string, unknown>;
          source_external_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id: string;
          type: "email" | "sms" | "call" | "note" | "ai_summary";
          direction: "inbound" | "outbound";
          subject?: string | null;
          content: string;
          metadata?: Record<string, unknown>;
          source_external_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          lead_id?: string;
          type?: "email" | "sms" | "call" | "note" | "ai_summary";
          direction?: "inbound" | "outbound";
          subject?: string | null;
          content?: string;
          metadata?: Record<string, unknown>;
          source_external_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      automations: {
        Row: {
          id: string;
          organization_id: string;
          workspace_id: string | null;
          name: string;
          description: string | null;
          trigger_type:
            | "lead_created"
            | "lead_updated"
            | "score_threshold"
            | "scheduled"
            | "webhook";
          trigger_config: Record<string, unknown>;
          action_type:
            | "send_email"
            | "send_sms"
            | "update_lead"
            | "webhook"
            | "ai_qualify";
          action_config: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          workspace_id?: string | null;
          name: string;
          description?: string | null;
          trigger_type:
            | "lead_created"
            | "lead_updated"
            | "score_threshold"
            | "scheduled"
            | "webhook";
          trigger_config?: Record<string, unknown>;
          action_type:
            | "send_email"
            | "send_sms"
            | "update_lead"
            | "webhook"
            | "ai_qualify";
          action_config?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          workspace_id?: string | null;
          name?: string;
          description?: string | null;
          trigger_type?:
            | "lead_created"
            | "lead_updated"
            | "score_threshold"
            | "scheduled"
            | "webhook";
          trigger_config?: Record<string, unknown>;
          action_type?:
            | "send_email"
            | "send_sms"
            | "update_lead"
            | "webhook"
            | "ai_qualify";
          action_config?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          organization_id: string;
          provider:
            | "openai"
            | "twilio"
            | "hubspot"
            | "gohighlevel"
            | "slack"
            | "n8n"
            | "sendgrid";
          credentials: Record<string, unknown>;
          config: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider:
            | "openai"
            | "twilio"
            | "hubspot"
            | "gohighlevel"
            | "slack"
            | "n8n"
            | "sendgrid";
          credentials?: Record<string, unknown>;
          config?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider?:
            | "openai"
            | "twilio"
            | "hubspot"
            | "gohighlevel"
            | "slack"
            | "n8n"
            | "sendgrid";
          credentials?: Record<string, unknown>;
          config?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      source_api_keys: {
        Row: {
          id: string;
          organization_id: string;
          source: "website" | "tally" | "n8n" | "api";
          label: string;
          key_hash: string;
          is_active: boolean;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          source: "website" | "tally" | "n8n" | "api";
          label: string;
          key_hash: string;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          source?: "website" | "tally" | "n8n" | "api";
          label?: string;
          key_hash?: string;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      automation_executions: {
        Row: {
          id: string;
          organization_id: string;
          event_type: string;
          event_id: string;
          lead_id: string | null;
          provider: string;
          action: string;
          status: "pending" | "processing" | "success" | "failed";
          attempts: number;
          error_message: string | null;
          response_metadata: Record<string, unknown>;
          started_at: string | null;
          completed_at: string | null;
          next_retry_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_type: string;
          event_id: string;
          lead_id?: string | null;
          provider: string;
          action: string;
          status?: "pending" | "processing" | "success" | "failed";
          attempts?: number;
          error_message?: string | null;
          response_metadata?: Record<string, unknown>;
          started_at?: string | null;
          completed_at?: string | null;
          next_retry_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          event_type?: string;
          event_id?: string;
          lead_id?: string | null;
          provider?: string;
          action?: string;
          status?: "pending" | "processing" | "success" | "failed";
          attempts?: number;
          error_message?: string | null;
          response_metadata?: Record<string, unknown>;
          started_at?: string | null;
          completed_at?: string | null;
          next_retry_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      onboard_user: {
        Args: {
          p_user_id: string;
          p_org_name: string;
          p_org_slug: string;
          p_workspace_name?: string;
        };
        Returns:
          | {
              organization_id: string;
              workspace_id: string;
              slug: string;
            }
          | {
              error: string;
              slug: string;
            };
      };
    };
    Enums: Record<string, never>;
  };
}
