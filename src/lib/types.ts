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
  department_id?: string;
  department_name?: string;
  status_changed_at?: string;
  job_id?: string;
}

export type CandidateStatus = 'New' | 'Contacted' | 'Screening' | 'Interviewing' | 'Offered' | 'Hired' | 'Rejected' | 'On Hold';

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
  type: string;
  category?: string;
}

export interface DashboardStats {
  total_candidates: number;
  new_this_week: number;
  contacted: number;
  screening: number;
  interviewing: number;
  offered: number;
  hired: number;
  rejected: number;
  on_hold: number;
  sources: { source: string; count: number }[];
  recent_candidates: Candidate[];
  pipeline_velocity: { status: string; avg_days: number }[];
  source_conversion: { source: string; total: number; advanced: number; rate: number }[];
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
  department_id?: string;
  job_id?: string;
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

// Department
export interface Department {
  id: string;
  name: string;
  description: string;
  head: string;
  is_active: boolean;
  created_at: string;
}

// Jobs / Requisitions
export type JobStatus = 'Open' | 'On Hold' | 'Closed' | 'Filled';
export type JobPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface Job {
  id: string;
  title: string;
  department_id: string;
  department_name?: string;
  posted_by: string;
  posted_by_name?: string;
  num_positions: number;
  warehouse_site: string;
  expected_salary_min: string;
  expected_salary_max: string;
  description: string;
  requirements: string;
  status: JobStatus;
  priority: JobPriority;
  created_at: string;
  updated_at: string;
  candidate_count?: number;
}

export interface CandidateJob {
  id: string;
  candidate_id: string;
  job_id: string;
  applied_at: string;
  status: string;
}

// Interviews
export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';
export type InterviewType = 'In Person' | 'Video Call' | 'Phone' | 'Panel';

export interface Interview {
  id: string;
  candidate_id: string;
  candidate_name?: string;
  job_id: string;
  job_title?: string;
  interviewer_id: string;
  interviewer_name?: string;
  scheduled_at: string;
  duration: number;
  type: InterviewType;
  location: string;
  notes: string;
  status: InterviewStatus;
  created_at: string;
}

// Scorecards
export interface ScorecardAttribute {
  name: string;
  rating: number;
  notes: string;
}

export interface Scorecard {
  id: string;
  interview_id: string;
  evaluator_id: string;
  evaluator_name: string;
  overall_rating: number;
  recommendation: 'Strong Hire' | 'Hire' | 'Maybe' | 'No Hire' | 'Strong No Hire' | '';
  notes: string;
  attributes: ScorecardAttribute[];
  created_at: string;
}

// Offer Templates
export interface OfferTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

// Workflow Rules
export interface WorkflowRule {
  id: string;
  from_status: string;
  to_status: string;
  template_id: string;
  template_name?: string;
  is_active: boolean;
  created_at: string;
}
