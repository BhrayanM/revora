export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  badge?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  score: number;
  source: LeadSource;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  notes?: LeadNote[];
  tags?: string[];
}

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource =
  | "website"
  | "referral"
  | "linkedin"
  | "email"
  | "cold_call"
  | "event"
  | "other";

export interface LeadNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  type:
    | "lead_created"
    | "lead_updated"
    | "email_sent"
    | "sms_sent"
    | "meeting_booked"
    | "ai_analysis"
    | "integration_sync";
  title: string;
  description: string;
  timestamp: string;
  leadId?: string;
  leadName?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  previousValue?: number;
  color?: string;
}

export interface KPIData {
  label: string;
  value: number | string;
  change: number;
  changeLabel: string;
  trend: "up" | "down" | "neutral";
  icon: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  leads: Lead[];
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "manager" | "agent";
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notifications: boolean;
  theme: "light" | "dark" | "system";
  timezone: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: "info" | "success" | "warning" | "error";
  duration?: number;
}
