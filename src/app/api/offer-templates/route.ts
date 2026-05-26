import { NextRequest, NextResponse } from 'next/server';
import { getOfferTemplates, addOfferTemplate } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getOfferTemplates());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || !body.body) {
    return NextResponse.json({ error: 'Name and body are required' }, { status: 400 });
  }
  const template = addOfferTemplate({
    name: body.name,
    body: body.body,
    variables: body.variables || [],
    is_active: body.is_active !== false,
  });
  return NextResponse.json(template, { status: 201 });
}
