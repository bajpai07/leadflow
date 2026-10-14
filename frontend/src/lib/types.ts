export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "won"
  | "lost";

export type Lead = {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  next_follow_up_at: string | null;
  last_discussion_at: string | null;
  last_note: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadCreateInput = {
  name: string;
  company?: string;
  phone?: string;
};

export type LeadFilters = {
  status?: LeadStatus;
  q?: string;
};

export type Discussion = {
  id: number;
  lead_id: number;
  note: string;
  follow_up_at: string | null;
  created_at: string;
};

export type DiscussionCreateInput = {
  note: string;
  follow_up_at?: string;
};

export type DiscussionCreateResult = {
  discussion: Discussion;
  lead: Lead;
};
