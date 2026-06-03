import Anthropic from '@anthropic-ai/sdk';
import { ParsedResume } from './parser';

const SYSTEM_PROMPT = `You are a resume parser for an Indian warehouse/logistics recruitment company. Extract structured fields from the document text provided. Return ONLY a valid JSON object with these exact keys:

- is_resume: true ONLY if this document is a person's resume / CV / bio-data (a job seeker describing their own experience, education and skills). Return false for ANY other document type — offer letters, appointment letters, employment agreements/contracts, relieving or experience certificates, salary slips/payslips, invoices, purchase orders, NDAs, marketing emails, newsletters, or anything that is not a candidate's own resume.
- full_name: candidate's full name
- phone: phone number (Indian format preferred, digits only with optional +91)
- email: email address
- current_location: current city/location
- current_employer: most recent/current employer company name
- current_designation: most recent/current job title/designation
- previous_employer: second most recent employer company name
- previous_designation: second most recent job title/designation
- date_of_birth: DOB if mentioned (any format)
- preferred_cities: cities candidate prefers to work in (comma-separated)
- hometown: hometown if mentioned
- notice_period: notice period (e.g. "30 days", "Immediate", "2 months")
- current_ctc: current salary/CTC (e.g. "8 LPA", "50000/month")
- expected_ctc: expected salary/CTC
- family_background: family details if mentioned

Rules:
- Return empty string "" for any field not found in the resume
- For Indian phone numbers, include country code if present
- For CTC, preserve the original format (LPA, per month, etc.)
- Extract the MOST RECENT employer/designation as current
- Be precise — don't guess or hallucinate. Only extract what's clearly stated.
- Return ONLY the JSON object, no markdown, no explanation.`;

export async function parseResumeWithAI(text: string): Promise<ParsedResume | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || text.trim().length < 20) return null;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Parse this resume:\n\n${text.substring(0, 6000)}` }
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    // Parse JSON - handle potential markdown wrapping
    let jsonStr = content.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    return {
      is_resume: parsed.is_resume !== false, // default to true unless the model is sure it isn't
      full_name: parsed.full_name || '',
      phone: parsed.phone || '',
      email: parsed.email || '',
      current_location: parsed.current_location || '',
      current_employer: parsed.current_employer || '',
      current_designation: parsed.current_designation || '',
      previous_employer: parsed.previous_employer || '',
      previous_designation: parsed.previous_designation || '',
      date_of_birth: parsed.date_of_birth || '',
      preferred_cities: parsed.preferred_cities || '',
      hometown: parsed.hometown || '',
      notice_period: parsed.notice_period || '',
      current_ctc: parsed.current_ctc || '',
      expected_ctc: parsed.expected_ctc || '',
      family_background: parsed.family_background || '',
      raw_text: text,
    };
  } catch (e) {
    console.error('AI parsing failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
