export interface Candidate {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  current_location: string;
  current_employer: string;
  current_designation: string;
  previous_employer: string;
  previous_designation: string;
  date_of_birth: string;
  preferred_cities: string;
  hometown: string;
  notice_period: string;
  current_ctc: string;
  expected_ctc: string;
  family_background: string;
  source: string;
  resume_file: string;
  resume_filename: string;
  date_added: string;
  status: CandidateStatus;
  referrer_name: string;
  referrer_email: string;
  notes: string;
  portal_token?: string;
}

export type CandidateStatus = 'New' | 'Contacted' | 'Interviewing' | 'Hired' | 'Rejected';

export interface ActivityLog {
  id: string;
  candidate_id: string;
  action: string;
  details: string;
  performed_by: string;
  timestamp: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'missing_info' | 'interest_check' | 'interview_schedule' | 'vacancy_alert';
}

export interface DashboardStats {
  total_candidates: number;
  new_this_week: number;
  contacted: number;
  interviewing: number;
  hired: number;
  rejected: number;
  sources: { source: string; count: number }[];
  recent_candidates: Candidate[];
}

export interface FilterParams {
  search?: string;
  status?: string;
  source?: string;
  location?: string;
  min_ctc?: string;
  max_ctc?: string;
  notice_period?: string;
  designation?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export type TeamRole = 'Admin' | 'Recruiter' | 'Hiring Manager' | 'Viewer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  phone: string;
  department: string;
  is_active: boolean;
  created_at: string;
}

export interface Remark {
  id: string;
  candidate_id: string;
  author_name: string;
  author_role: string;
  rating: number;
  comment: string;
  stage: string;
  created_at: string;
}
