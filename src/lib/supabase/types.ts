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
          created_at?: string;
          updated_at?: string;
        };
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
          created_at?: string;
        };
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
