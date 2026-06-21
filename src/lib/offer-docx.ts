import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import type { OfferLetterFields, SalaryLineItem } from './types';

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

// Sum salary line items, tolerating commas / currency symbols in the amounts.
function sumAmounts(items: SalaryLineItem[]): number {
  return items.reduce((total, it) => {
    const n = parseFloat(String(it.amount).replace(/[^0-9.]/g, ''));
    return total + (isNaN(n) ? 0 : n);
  }, 0);
}

function formatINR(n: number): string {
  return n.toLocaleString('en-IN');
}

// The placeholder data made available to the .docx template.
// In Word, authors use {employee_name}, {designation}, ... and for the
// salary break-up: {#salary_items}{component}: {amount}{/salary_items} and {total_salary}.
export function buildTemplateData(fields: OfferLetterFields): Record<string, unknown> {
  const items = (fields.salary_items || []).filter(it => (it.component || '').trim() || (it.amount || '').trim());
  const total = sumAmounts(items);
  return {
    employee_name: fields.employee_name || '',
    reporting_manager: fields.reporting_manager || '',
    offer_date: formatDate(fields.offer_date),
    joining_date: formatDate(fields.joining_date),
    designation: fields.designation || '',
    reporting_location: fields.reporting_location || '',
    key_responsibilities: fields.key_responsibilities || '',
    salary_offered: fields.salary_offered || '',
    salary_items: items.map(it => ({ component: it.component || '', amount: it.amount || '' })),
    total_salary: total ? formatINR(total) : '',
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
