import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import type { OfferLetterFields } from './types';
import { computeSalary, formatINR } from './salary';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Format a YYYY-MM-DD value (from <input type="date">) as "22 June 2026".
// Parsed manually to avoid timezone shifting that new Date('YYYY-MM-DD') causes.
export function formatDate(value: string): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const [, y, mo, d] = m;
  const month = MONTHS[parseInt(mo, 10) - 1] || '';
  return `${parseInt(d, 10)} ${month} ${y}`;
}

// The placeholder data made available to the .docx template.
// Scalars:  {employee_name}, {designation}, {offer_date}, {salary_offered}, ...
// Salary totals (monthly + annual): {gross_monthly}/{gross_annual}, {ctc_monthly}/{ctc_annual},
//   {net_monthly}/{net_annual}, {employer_total_monthly}/{employer_total_annual},
//   {deductions_total_monthly}/{deductions_total_annual}
// Variable pay: {variable_pay}, {variable_frequency}, {variable_annual}
// Line-item loops (each exposes {component} {monthly} {annual}):
//   {#earnings}…{/earnings}, {#employer_items}…{/employer_items}, {#deductions}…{/deductions}
//   {#salary_items}…{/salary_items} (alias of earnings, kept for older templates)
export function buildTemplateData(fields: OfferLetterFields): Record<string, unknown> {
  const c = computeSalary(fields.salary);
  const rows = (arr: { name: string; monthly: number; annual: number }[]) =>
    arr.map(r => ({ component: r.name, monthly: formatINR(r.monthly), annual: formatINR(r.annual), amount: formatINR(r.monthly) }));

  const earnings = rows(c.earnings);
  return {
    employee_name: fields.employee_name || '',
    reporting_manager: fields.reporting_manager || '',
    offer_date: formatDate(fields.offer_date),
    joining_date: formatDate(fields.joining_date),
    designation: fields.designation || '',
    reporting_location: fields.reporting_location || '',
    key_responsibilities: fields.key_responsibilities || '',
    // Free-text CTC if provided, else the computed annual CTC.
    salary_offered: fields.salary_offered || formatINR(c.ctcAnnual),

    earnings,
    salary_items: earnings,
    employer_items: rows(c.employer),
    deductions: rows(c.deductions),

    gross_monthly: formatINR(c.grossMonthly),
    gross_annual: formatINR(c.grossAnnual),
    employer_total_monthly: formatINR(c.employerMonthly),
    employer_total_annual: formatINR(c.employerAnnual),
    deductions_total_monthly: formatINR(c.deductionsMonthly),
    deductions_total_annual: formatINR(c.deductionsAnnual),
    ctc_monthly: formatINR(c.ctcMonthly),
    ctc_annual: formatINR(c.ctcAnnual),
    net_monthly: formatINR(c.netMonthly),
    net_annual: formatINR(c.netAnnual),
    total_salary: formatINR(c.ctcAnnual),

    variable_pay: c.variableEnabled ? formatINR(c.variablePerPayout) : '',
    variable_frequency: c.variableEnabled ? c.variableFrequency : '',
    variable_annual: c.variableEnabled ? formatINR(c.variableAnnual) : '',
  };
}

export class OfferDocError extends Error {}

// Fill an uploaded .docx template with the offer-letter values and return the rendered .docx buffer.
export function fillDocx(templateBuffer: Buffer, fields: OfferLetterFields): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch {
    throw new OfferDocError('The stored template is not a readable .docx file. Re-upload the Word format.');
  }
  let doc: Docxtemplater;
  try {
    doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(buildTemplateData(fields));
  } catch (e: unknown) {
    // docxtemplater throws aggregated tag errors — surface them so HR can fix the Word file.
    const err = e as { properties?: { errors?: Array<{ properties?: { explanation?: string } }> }; message?: string };
    const explanations = err?.properties?.errors?.map(x => x.properties?.explanation).filter(Boolean) || [];
    const detail = explanations.length ? explanations.join('; ') : (err?.message || 'Unknown templating error');
    throw new OfferDocError(`Could not fill this template — check the placeholders in the Word file. (${detail})`);
  }
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Convert a .docx buffer to HTML for on-screen preview / print-to-PDF.
export async function docxToHtml(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    return result.value || '';
  } catch {
    return '<p style="color:#b00">Preview unavailable for this document.</p>';
  }
}

// A safe file-name slug for the generated letter, e.g. "Offer_Letter_Jane_Doe.docx".
export function offerFileName(employeeName: string, ext: string): string {
  const slug = (employeeName || 'candidate').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'candidate';
  return `Offer_Letter_${slug}.${ext}`;
}
