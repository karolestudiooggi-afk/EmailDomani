export type ContactStatus = 'active' | 'unsubscribed' | 'bounced';
export type CampaignStatus = 'draft' | 'queued' | 'sending' | 'sent' | 'paused';
export type SendStatus = 'pending' | 'sent' | 'failed';
export type EventType = 'open' | 'click' | 'bounce';

export interface Client {
  id: string;
  name: string;
  brand_name: string;
  from_name: string;
  from_email: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  daily_limit: number;
  brand_fields: Record<string, string>;
  created_at: string;
  // smtp_pass_enc nunca é exposto ao client
}

export type Role = 'admin' | 'operator';

export interface Profile {
  id: string;
  email: string | null;
  role: Role;
  created_at: string;
}

export interface ContactList {
  id: string;
  client_id: string;
  name: string;
  source_file: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  list_id: string;
  email: string;
  name: string | null;
  fields: Record<string, string>;
  status: ContactStatus;
  created_at: string;
}

export interface Template {
  id: string;
  client_id: string;
  name: string;
  subject: string;
  html: string;
  design: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  name: string;
  list_id: string | null;
  template_id: string | null;
  subject: string;
  html: string;
  from_name: string;
  from_email: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  created_at: string;
}

export interface EmailSend {
  id: string;
  campaign_id: string;
  contact_id: string | null;
  email: string;
  status: SendStatus;
  message_id: string | null;
  error: string | null;
  sent_at: string | null;
  bounced_at: string | null;
  opened_at: string | null;
  open_count: number;
  clicked_at: string | null;
  click_count: number;
  created_at: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  bounced: number;
  opened: number;
  clicked: number;
}
