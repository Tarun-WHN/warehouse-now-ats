export interface ParsedResume {
  is_resume?: boolean;
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
  raw_text: string;
}

const PHONE_REGEX = /(?:\+91[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{5,10}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const DOB_REGEX = /(?:d\.?o\.?b\.?|date\s*of\s*birth|born|birth\s*date)\s*[:|\-]?\s*(\d{1,2}[\s/.\-]\w{3,9}[\s/.\-]\d{2,4}|\d{1,2}[\s/.\-]\d{1,2}[\s/.\-]\d{2,4})/i;
const CTC_REGEX = /(?:current\s*)?(?:ctc|salary|compensation|package)\s*[:|\-]?\s*([\d,.]+\s*(?:lpa|lakhs?|lacs?|k|cr|crore)?(?:\s*(?:per\s*(?:annum|year|month))?)?)/gi;
const EXPECTED_CTC_REGEX = /(?:expected|desired|looking\s*for)\s*(?:ctc|salary|compensation|package)\s*[:|\-]?\s*([\d,.]+\s*(?:lpa|lakhs?|lacs?|k|cr|crore)?(?:\s*(?:per\s*(?:annum|year|month))?)?)/gi;
const NOTICE_REGEX = /(?:notice\s*period)\s*[:|\-]?\s*(\d+\s*(?:days?|months?|weeks?)(?:\s*(?:or\s*(?:less|more|immediate))?)?|immediate(?:ly)?|serving)/gi;
const LOCATION_REGEX = /(?:location|city|address|residing|based\s*(?:in|at|out\s*of))\s*[:|\-]?\s*([A-Za-z][A-Za-z\s,]{2,30})/gi;

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad',
  'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi',
  'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Noida', 'Gurgaon', 'Gurugram',
  'Coimbatore', 'Kochi', 'Chandigarh', 'Mysore', 'Mysuru', 'Guwahati',
  'Bhubaneswar', 'Dehradun', 'Ranchi', 'Raipur', 'Mangalore', 'Mangaluru',
  'Trivandrum', 'Thiruvananthapuram', 'Vijayawada', 'Madurai', 'Jodhpur',
  'Surat', 'Navi Mumbai', 'Greater Noida', 'Panvel', 'Bhiwandi'
];

const SKIP_NAME_WORDS = new Set([
  'resume', 'curriculum vitae', 'cv', 'about me', 'about', 'personal information',
  'personal details', 'personal data', 'profile', 'summary', 'objective',
  'experience', 'work experience', 'education', 'skills', 'contact',
  'contact information', 'contact details', 'references', 'declaration',
  'professional summary', 'career objective', 'career summary',
]);

const DESIGNATIONS = [
  'manager', 'executive', 'engineer', 'developer', 'analyst', 'consultant',
  'director', 'lead', 'head', 'officer', 'supervisor', 'coordinator',
  'associate', 'specialist', 'architect', 'administrator', 'assistant',
  'trainee', 'intern', 'sr', 'senior', 'junior', 'vp', 'avp', 'ceo', 'cto',
  'warehouse', 'logistics', 'supply chain', 'operations', 'procurement',
  'inventory', 'dispatch', 'store', 'floor', 'shift', 'forklift', 'picker',
  'packer', 'loader', 'driver', 'delivery', 'helper', 'labour', 'labor'
];

// Heuristic resume detector — used as a fallback when AI classification is
// unavailable (no ANTHROPIC_API_KEY) to keep non-resumes out of the pipeline.
const RESUME_POSITIVE = [
  'curriculum vitae', 'resume', 'work experience', 'professional experience',
  'employment history', 'educational qualification', 'education', 'skills',
  'career objective', 'objective', 'projects', 'certifications', 'declaration',
  'references', 'date of birth', 'marital status', 'languages known',
  'professional summary', 'key skills', 'achievements', 'hobbies',
];
const RESUME_NEGATIVE = [
  'offer letter', 'appointment letter', 'letter of intent', 'employment agreement',
  'this agreement', 'terms and conditions', 'we are pleased to offer',
  'pleased to offer you', 'your employment', 'hereby appointed', 'annexure',
  'ctc break-up', 'ctc breakup', 'salary slip', 'payslip', 'pay slip', 'invoice',
  'purchase order', 'non-disclosure', 'probation period', 'date of joining',
  'relieving letter', 'experience certificate', 'to whom it may concern',
];
const RESUME_NAME_RE = /(resume|cv|bio[\s_-]?data|curriculum|profile)/i;
const NON_RESUME_NAME_RE = /(offer|appointment|agreement|contract|pay[\s_-]?slip|salary|invoice|purchase|nda|non[\s_-]?disclosure|relieving|certificate|letter)/i;

/** Rough resume/CV detector from extracted text + filename. */
export function looksLikeResume(text: string, filename = ''): boolean {
  const lower = (text || '').toLowerCase();
  let score = 0;
  for (const p of RESUME_POSITIVE) if (lower.includes(p)) score += 1;
  for (const n of RESUME_NEGATIVE) if (lower.includes(n)) score -= 2;
  if (RESUME_NAME_RE.test(filename)) score += 2;
  else if (NON_RESUME_NAME_RE.test(filename)) score -= 2;
  // Needs at least a couple of resume signals and a net-positive balance.
  return score >= 2;
}

export function parseResumeText(text: string): ParsedResume {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result: ParsedResume = {
    full_name: '',
    phone: '',
    email: '',
    current_location: '',
    current_employer: '',
    current_designation: '',
    previous_employer: '',
    previous_designation: '',
    date_of_birth: '',
    preferred_cities: '',
    hometown: '',
    notice_period: '',
    current_ctc: '',
    expected_ctc: '',
    family_background: '',
    raw_text: text,
  };

  // Email
  const emails = text.match(EMAIL_REGEX);
  if (emails) result.email = emails[0].toLowerCase();

  // Phone
  const phones = text.match(PHONE_REGEX);
  if (phones) {
    const cleaned = phones
      .map(p => p.replace(/[\s\-()]/g, ''))
      .filter(p => p.length >= 10 && p.length <= 13);
    if (cleaned.length > 0) result.phone = cleaned[0];
  }

  // Name extraction - try explicit "Name:" pattern first (most reliable)
  const nameMatch = text.match(/(?:full\s*name|name|candidate)\s*[:|\-]\s*([A-Za-z\s.]+?)(?:\s+(?:phone|email|mob|tel|dob|date|address|age|father|gender|marital|nationality|contact|mail|:|\d)|\n|$)/i);
  if (nameMatch) {
    const extracted = nameMatch[1].trim().replace(/\s+/g, ' ');
    // Filter out section headers caught accidentally
    if (extracted.length > 2 && extracted.length < 50 && !SKIP_NAME_WORDS.has(extracted.toLowerCase())) {
      result.full_name = extracted;
    }
  }

  // Fallback: first non-empty line that looks like a person's name
  if (!result.full_name) {
    for (const line of lines.slice(0, 10)) {
      const clean = line.replace(/\s+/g, ' ').trim();
      if (clean.match(EMAIL_REGEX) || clean.match(/^\+?\d/) || clean.match(/^[:;@]/)) continue;
      if (SKIP_NAME_WORDS.has(clean.toLowerCase())) continue;
      if (clean.length > 3 && clean.length < 40 && /^[A-Za-z][A-Za-z\s.]+$/.test(clean)) {
        // Must look like a person name (2-5 words, no common section headers)
        const words = clean.split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2 && words.length <= 5) {
          result.full_name = clean;
          break;
        }
      }
    }
  }

  // DOB
  const dobMatch = text.match(DOB_REGEX);
  if (dobMatch) result.date_of_birth = dobMatch[1].trim();

  // CTC
  const ctcMatches = [...text.matchAll(CTC_REGEX)];
  if (ctcMatches.length > 0) result.current_ctc = ctcMatches[0][1].trim();

  const expectedCtcMatches = [...text.matchAll(EXPECTED_CTC_REGEX)];
  if (expectedCtcMatches.length > 0) result.expected_ctc = expectedCtcMatches[0][1].trim();

  // Notice Period
  const noticeMatches = [...text.matchAll(NOTICE_REGEX)];
  if (noticeMatches.length > 0) result.notice_period = noticeMatches[0][1].trim();

  // Location
  const locationMatches = [...text.matchAll(LOCATION_REGEX)];
  if (locationMatches.length > 0) {
    result.current_location = locationMatches[0][1].trim().replace(/[,\s]+$/, '');
  }

  // Find cities mentioned
  const foundCities: string[] = [];
  for (const city of INDIAN_CITIES) {
    if (text.toLowerCase().includes(city.toLowerCase())) {
      foundCities.push(city);
    }
  }
  if (!result.current_location && foundCities.length > 0) {
    result.current_location = foundCities[0];
  }
  if (foundCities.length > 1) {
    result.preferred_cities = foundCities.join(', ');
  }

  // Employer and Designation extraction
  const expSections = extractExperienceSection(text);
  if (expSections.length > 0) {
    const current = expSections[0];
    result.current_employer = current.employer || '';
    result.current_designation = current.designation || '';
    if (expSections.length > 1) {
      result.previous_employer = expSections[1].employer || '';
      result.previous_designation = expSections[1].designation || '';
    }
  }

  return result;
}

interface ExperienceEntry {
  employer: string;
  designation: string;
}

function extractExperienceSection(text: string): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  const lines = text.split('\n');

  // First try explicit "Company:" / "Employer:" / "Organization:" patterns
  const companyLabelMatch = text.match(/(?:company|organization|employer)\s*[:|\-]\s*(.+)/i);
  const titleLabelMatch = text.match(/(?:title|designation|position|role)\s*[:|\-]\s*(.+)/i);
  if (companyLabelMatch || titleLabelMatch) {
    entries.push({
      employer: companyLabelMatch?.[1]?.trim().substring(0, 60) || '',
      designation: titleLabelMatch?.[1]?.trim().substring(0, 60) || ''
    });
  }

  // Also try "Worked as X at/in Y" pattern
  const workedAtMatch = text.match(/worked\s+(?:as\s+)?(.+?)\s+(?:at|in|for|with)\s+(.+?)(?:\.|,|\n|$)/i);
  if (workedAtMatch && entries.length === 0) {
    entries.push({
      employer: workedAtMatch[2].trim().substring(0, 60),
      designation: workedAtMatch[1].trim().substring(0, 60)
    });
  }

  let inExperience = false;
  let currentEmployer = '';
  let currentDesignation = '';

  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    const trimmed = line.trim();

    if (lower.match(/^(?:experience|work\s*experience|employment\s*(?:history|details)?|professional\s*experience|career)/)) {
      inExperience = true;
      continue;
    }

    if (inExperience && lower.match(/^(?:education|skills|certification|project|achievement|hobby|reference|personal|expertise|language)/)) {
      if (currentEmployer || currentDesignation) {
        entries.push({ employer: currentEmployer, designation: currentDesignation });
      }
      break;
    }

    if (inExperience) {
      // Skip very long lines (descriptions, not names/titles)
      if (trimmed.length > 80) continue;
      // Skip lines starting with bullets/dashes (job descriptions)
      if (/^[-•●■▪*]/.test(trimmed)) continue;
      // Skip date-only lines
      if (/^\d{4}\s*[-–]\s*(present|\d{4})/i.test(trimmed)) continue;

      const isDesignation = DESIGNATIONS.some(d => lower.includes(d));

      if (isDesignation && !currentDesignation) {
        // Clean up designation — remove date ranges
        currentDesignation = trimmed.replace(/\d{4}\s*[-–]\s*(present|\d{4})/gi, '').trim().substring(0, 60);
      } else if (trimmed.length > 2 && !trimmed.match(/^\d/) && !currentEmployer) {
        // Look for company names — typically UPPERCASE or known patterns
        const companyMatch = trimmed.match(/(?:at|@|company|organization|employer)\s*[:|\-]?\s*(.+)/i);
        if (companyMatch) {
          currentEmployer = companyMatch[1].trim().substring(0, 60);
        } else if (!isDesignation && /^[A-Z]/.test(trimmed) && trimmed.length < 60 && trimmed.length > 3) {
          // Company names are usually short, uppercase, may contain Ltd/Pvt/Inc
          const looksLikeCompany = /(?:ltd|pvt|inc|limited|private|corp|llp|group|india|logistics|warehouse|pharma|tech|solutions|services|enterprises|industries|company)/i.test(trimmed) ||
            (trimmed === trimmed.toUpperCase() && trimmed.length > 4);
          if (looksLikeCompany) {
            currentEmployer = trimmed.substring(0, 60);
          }
        }
      }

      if (currentEmployer && currentDesignation) {
        entries.push({ employer: currentEmployer, designation: currentDesignation });
        currentEmployer = '';
        currentDesignation = '';
        if (entries.length >= 2) break;
      }
    }
  }

  if ((currentEmployer || currentDesignation) && entries.length < 2) {
    entries.push({ employer: currentEmployer, designation: currentDesignation });
  }

  return entries;
}

export function getMissingFields(candidate: Record<string, string>): string[] {
  const required = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'email', label: 'Email ID' },
    { key: 'current_location', label: 'Current Location' },
    { key: 'current_employer', label: 'Current Employer' },
    { key: 'current_designation', label: 'Current Designation' },
    { key: 'date_of_birth', label: 'Date of Birth' },
    { key: 'notice_period', label: 'Notice Period' },
    { key: 'current_ctc', label: 'Current CTC' },
    { key: 'expected_ctc', label: 'Expected CTC' },
  ];
  return required.filter(f => !candidate[f.key] || candidate[f.key].trim() === '').map(f => f.label);
}
