'use client';

import { useAuth } from '@/components/AuthProvider';
import {
  HelpCircle, LayoutDashboard, Users, Briefcase, Calendar, ClipboardCheck,
  FileText, Upload, Mail, Globe, UserPlus, Settings, UserCircle, ChevronDown, LucideIcon,
} from 'lucide-react';

type Feature = {
  label: string;
  icon: LucideIcon;
  roles: string[];
  desc: string;
  uses: string[];
};

// Roles mirror the sidebar so each person sees a guide only for the tabs they can open.
const FEATURES: Feature[] = [
  {
    label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'],
    desc: 'Your home screen — a live snapshot of the whole hiring pipeline.',
    uses: [
      'See headline numbers: total candidates, new this week, and how many are in Screening, Interviewing, Offered, Hired, Rejected and On Hold.',
      'Glance at the most recent candidates, open jobs, and upcoming interviews.',
      'Check which sources bring the best candidates and how long people spend at each stage.',
      'Jump straight to “Upload Resumes” or the “Referral Portal” with the quick buttons.',
    ],
  },
  {
    label: 'Candidates', icon: Users, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'],
    desc: 'The full database of everyone in your pipeline.',
    uses: [
      'Candidates are grouped by Location, then by Department — use “Collapse all / Expand all” or each location’s arrow to tidy the view.',
      'Search by name, email, phone or employer, and use Filters for status, source, department, location, designation or notice period.',
      'Switch between Table and Kanban (drag a card to change status).',
      'Click the eye icon to open a candidate — the Info tab is editable (click “Edit info” to fix missing details), plus tabs for Resume, Remarks and Activity.',
      'Add feedback under Remarks with a rating and an outcome (Shortlisted / Selected / Rejected / On Hold).',
      'Tick several rows to bulk-change status, send a templated email, or delete; use Export for a CSV.',
    ],
  },
  {
    label: 'Jobs', icon: Briefcase, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'],
    desc: 'Create and manage open positions (requisitions).',
    uses: [
      'Click “New Job Requisition” to post a role (Recruiters and Hiring Managers can both post).',
      'Set title, department, location/site, number of positions, salary range, priority and description.',
      'Search by title and filter by status (Open / On Hold / Closed / Filled) or department.',
      'Edit or close a job, and see how many applicants each role has.',
    ],
  },
  {
    label: 'Interviews', icon: Calendar, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'],
    desc: 'Schedule interviews and track their outcomes.',
    uses: [
      'Click “Schedule Interview” and pick the candidate, job, interviewer, date/time and type (Video / Phone / In-person / Panel).',
      'Switch between a List view and a monthly Calendar view.',
      'Update an interview’s status (Scheduled / Completed / Cancelled / No Show) from the dropdown.',
    ],
  },
  {
    label: 'Reviews', icon: ClipboardCheck, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'],
    desc: 'A single place to see all screening & interview feedback.',
    uses: [
      'Every reviewer’s feedback on a candidate is shown as one line — click “Show all comments” to expand their notes.',
      'Filter by outcome (Shortlisted / Selected / Rejected / On Hold) or stage, or search by candidate/reviewer.',
      'See who reviewed each candidate, their rating, the outcome and the date.',
    ],
  },
  {
    label: 'Offer Letters', icon: FileText, roles: ['Admin'],
    desc: 'Generate offer letters from your Word formats (Admin only).',
    uses: [
      'In “Letter Formats”, upload your Word (.docx) templates (Corporate / Warehouse / Temp) — add the placeholder tokens shown in the Placeholders panel.',
      'In “Generate Letter”, optionally pick a candidate to auto-fill name, role, location and email.',
      'Fill the details and build the Salary Break-up: Earnings make Gross, + Employer contributions = CTC, − Deductions = Net take-home (use “% of Basic” for HRA, PF, etc.).',
      'Tick Variable Pay and choose a payout frequency if applicable; Save/Load reusable salary structures.',
      'Preview, then Download Word, Download PDF, or Email the letter to the candidate with a cover note.',
    ],
  },
  {
    label: 'Upload Resumes', icon: Upload, roles: ['Admin', 'Recruiter'],
    desc: 'Add candidates by file, spreadsheet, or email.',
    uses: [
      'Drag-and-drop or browse to upload resumes (PDF, DOC, DOCX, TXT) — details are parsed automatically.',
      'Pick the source (Naukri, Indeed, LinkedIn, Referral, Walk-in, etc.) before uploading.',
      'Import many candidates at once from an Excel/CSV file (columns auto-map).',
      'Forward CVs to the HR inbox; use “Check inbox now” to pull them in immediately.',
    ],
  },
  {
    label: 'Email Templates', icon: Mail, roles: ['Admin', 'Recruiter'],
    desc: 'Reusable, branded email templates for candidate communication.',
    uses: [
      'Click “New Template” and set a name, subject, body and category (Outreach / Interview / Offer / Automated / General).',
      'Insert variables like {{candidate_name}} or {{interview_date}} that fill in automatically when sent.',
      'Preview before saving, and edit or delete existing templates.',
      'These templates are what the bulk “Send email” action on Candidates uses.',
    ],
  },
  {
    label: 'Career Page', icon: Globe, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'],
    desc: 'The public job page external candidates see and apply through.',
    uses: [
      'Open jobs are listed grouped by department, with location, positions and salary range.',
      'Candidates click “Apply Now”, fill a short form and upload their CV — they land in your Candidates list automatically.',
      'Share the page link so applicants can browse and apply directly.',
    ],
  },
  {
    label: 'Referral Portal', icon: UserPlus, roles: ['Admin', 'Recruiter', 'Hiring Manager'],
    desc: 'Let employees refer candidates and track their progress.',
    uses: [
      'Under “Refer a Candidate”, enter your details and the candidate’s, and optionally attach their resume.',
      'Under “Track My Referrals”, enter your email to see where each referral is in the pipeline.',
      'Share the portal link or QR code with colleagues.',
    ],
  },
  {
    label: 'Settings', icon: Settings, roles: ['Admin', 'Recruiter'],
    desc: 'Manage the team, departments, automations and integrations.',
    uses: [
      'Team & Roles: “Add Member” (they get a welcome email with login details), edit roles, reset passwords, or deactivate people.',
      'Departments: add and manage the departments used across jobs and candidates.',
      'Workflow Rules: auto-send an email when a candidate moves between statuses.',
      'Email Setup: configure SMTP and the resume-forwarding inbox. Data Management: export all candidates to CSV.',
    ],
  },
  {
    label: 'My Account', icon: UserCircle, roles: ['Admin', 'Recruiter', 'Hiring Manager', 'Viewer'],
    desc: 'Your personal profile and password.',
    uses: [
      'See your name, email and role.',
      'Change your password — enter your current password, then a new one (at least 6 characters).',
    ],
  },
];

const ROLE_OVERVIEW: Record<string, string> = {
  Admin: 'You have full access — manage candidates, jobs, interviews, team members, settings, and generate offer letters.',
  Recruiter: 'You can source and manage candidates, post jobs, schedule interviews, send emails, upload resumes, and manage settings.',
  'Hiring Manager': 'You can review candidates, post jobs, leave feedback and ratings, schedule interviews, and refer candidates.',
  Viewer: 'You have read-only access to browse candidates, jobs, interviews and reviews.',
};

export default function HelpPage() {
  const { user } = useAuth();
  const role = user?.role || 'Viewer';
  const features = FEATURES.filter(f => f.roles.includes(role));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-navy flex items-center gap-2"><HelpCircle size={24} /> Help &amp; FAQ</h1>
        <p className="text-text-secondary text-sm mt-1">A quick guide to each tab and how to use it.</p>
      </div>

      {/* Role overview */}
      <div className="bg-gold/10 border border-gold/40 rounded-xl p-4 mb-6">
        <p className="text-sm">
          <span className="font-bold text-navy">Signed in as {role}.</span>{' '}
          <span className="text-text-secondary">{ROLE_OVERVIEW[role] || ROLE_OVERVIEW.Viewer}</span>
        </p>
        <p className="text-xs text-text-secondary mt-2">The guides below cover only the tabs available to you. Use the sidebar on the left to move between them.</p>
      </div>

      {/* Per-tab accordions */}
      <div className="space-y-2">
        {features.map((f, i) => (
          <details key={f.label} open={i === 0} className="group bg-white border border-whn-border rounded-xl overflow-hidden">
            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none hover:bg-gray-50">
              <span className="w-8 h-8 rounded-lg bg-navy/5 flex items-center justify-center text-navy flex-shrink-0">
                <f.icon size={16} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-navy text-sm">{f.label}</span>
                <span className="block text-xs text-text-secondary">{f.desc}</span>
              </span>
              <ChevronDown size={16} className="text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-1">
              <ul className="space-y-1.5 pl-1">
                {f.uses.map((u, j) => (
                  <li key={j} className="flex gap-2 text-sm text-text-secondary">
                    <span className="text-gold mt-0.5 flex-shrink-0">•</span>
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>

      {/* General tips */}
      <div className="mt-6 bg-white border border-whn-border rounded-xl p-4">
        <h2 className="text-sm font-bold text-navy mb-2">General tips</h2>
        <ul className="space-y-1.5">
          {[
            'Collapse the sidebar with the arrow on its edge to get more screen space.',
            'Most lists support search and filters at the top — start there to find anything fast.',
            'Change your password anytime from “My Account”.',
            'Stuck or spot something wrong? Tell your Admin and they can adjust roles, templates and settings.',
          ].map((t, i) => (
            <li key={i} className="flex gap-2 text-sm text-text-secondary">
              <span className="text-gold mt-0.5 flex-shrink-0">•</span><span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
