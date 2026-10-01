export const VERTICALS = ["clinical", "performance", "company"] as const;
export type Vertical = (typeof VERTICALS)[number];

export const VERTICAL_LABEL: Record<Vertical, string> = {
  clinical: "Clinical",
  performance: "Performance",
  company: "Company-wide",
};

export type Priority = "p0" | "p1" | "p2";
export type ItemStatus = "open" | "waiting" | "done";
export type ItemSource = "meeting" | "email" | "slack" | "founder" | "capture";

export interface Objective {
  id: number;
  vertical: Vertical;
  cycle: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;
  title: string;
  owner: string;
}

export interface KeyResult {
  id: number;
  objective_id: number;
  title: string;
  metric: string;
  start_value: number;
  current_value: number;
  target_value: number;
  updated_at: string;
}

export interface ObjectiveWithKRs extends Objective {
  key_results: KeyResult[];
  progress: number; // 0..1, average of KR progress
}

export interface ActionItem {
  id: number;
  title: string;
  vertical: Vertical;
  owner: string;
  due_date: string | null; // YYYY-MM-DD
  priority: Priority;
  status: ItemStatus;
  source: ItemSource;
  context: string | null;
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: number;
  title: string;
  vertical: Vertical;
  context: string;
  options: string[];
  deadline: string | null;
  requested_by: string;
  status: "pending" | "decided";
  outcome: string | null;
  decided_at: string | null;
}

export interface Blocker {
  id: number;
  title: string;
  vertical: Vertical;
  impact: string;
  owner: string;
  resolved: boolean;
  created_at: string;
}

export interface Meeting {
  id: number;
  title: string;
  vertical: Vertical;
  starts_at: string; // ISO
  attendees: string;
  prep_notes: string | null;
}

export interface CompanySnapshot {
  today: string;
  objectives: ObjectiveWithKRs[];
  items: ActionItem[];
  decisions: Decision[];
  blockers: Blocker[];
  meetings: Meeting[];
}
