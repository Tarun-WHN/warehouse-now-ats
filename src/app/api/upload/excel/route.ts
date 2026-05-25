import { NextRequest, NextResponse } from 'next/server';
import { insertCandidate } from '@/lib/db';
import * as XLSX from 'xlsx';

const FIELD_MAP: Record<string, string> = {
  'full name': 'full_name', 'name': 'full_name', 'candidate name': 'full_name',
  'phone': 'phone', 'phone number': 'phone', 'mobile': 'phone', 'contact': 'phone', 'mobile number': 'phone',
  'email': 'email', 'email id': 'email', 'email address': 'email',
  'current location': 'current_location', 'location': 'current_location', 'city': 'current_location',
  'current employer': 'current_employer', 'company': 'current_employer', 'employer': 'current_employer', 'organization': 'current_employer',
  'current designation': 'current_designation', 'designation': 'current_designation', 'title': 'current_designation', 'role': 'current_designation', 'position': 'current_designation',
  'previous employer': 'previous_employer', 'prev employer': 'previous_employer', 'last company': 'previous_employer',
  'previous designation': 'previous_designation', 'prev designation': 'previous_designation', 'last role': 'previous_designation',
  'date of birth': 'date_of_birth', 'dob': 'date_of_birth', 'birth date': 'date_of_birth',
  'preferred cities': 'preferred_cities', 'preferred location': 'preferred_cities',
  'hometown': 'hometown', 'home town': 'hometown', 'native place': 'hometown',
  'notice period': 'notice_period', 'notice': 'notice_period',
  'current ctc': 'current_ctc', 'ctc': 'current_ctc', 'salary': 'current_ctc', 'current salary': 'current_ctc',
  'expected ctc': 'expected_ctc', 'expected salary': 'expected_ctc',
  'family background': 'family_background', 'family': 'family_background',
  'source': 'source',
  'status': 'status',
  'notes': 'notes', 'remarks': 'notes', 'comments': 'notes',
  'referrer': 'referrer_name', 'referrer name': 'referrer_name', 'referred by': 'referrer_name',
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const workbook = XLSX.read(bytes, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No data found in spreadsheet' }, { status: 400 });
  }

  const headers = Object.keys(rows[0]);
  const mappedHeaders: Record<string, string> = {};
  for (const h of headers) {
    const normalized = h.toLowerCase().trim();
    if (FIELD_MAP[normalized]) {
      mappedHeaders[h] = FIELD_MAP[normalized];
    }
  }

  const results = [];
  let skipped = 0;

  for (const row of rows) {
    const candidate: Record<string, string> = {
      full_name: '', phone: '', email: '', current_location: '',
      current_employer: '', current_designation: '', previous_employer: '',
      previous_designation: '', date_of_birth: '', preferred_cities: '',
      hometown: '', notice_period: '', current_ctc: '', expected_ctc: '',
      family_background: '', source: 'Excel Import', resume_file: '',
      resume_filename: '', date_added: new Date().toISOString(),
      status: 'New', referrer_name: '', referrer_email: '', notes: '',
    };

    for (const [originalHeader, mappedField] of Object.entries(mappedHeaders)) {
      const value = row[originalHeader];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        candidate[mappedField] = String(value).trim();
      }
    }

    if (!candidate.full_name && !candidate.phone && !candidate.email) {
      skipped++;
      continue;
    }

    const inserted = insertCandidate(candidate as never);
    results.push(inserted);
  }

  return NextResponse.json({
    total_rows: rows.length,
    imported: results.length,
    skipped,
    mapped_fields: Object.values(mappedHeaders),
    candidates: results.slice(0, 5),
  });
}
