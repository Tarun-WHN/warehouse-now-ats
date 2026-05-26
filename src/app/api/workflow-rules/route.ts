import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowRules, addWorkflowRule } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getWorkflowRules());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.from_status || !body.to_status) {
    return NextResponse.json({ error: 'from_status and to_status are required' }, { status: 400 });
  }
  const rule = addWorkflowRule({ ...body, is_active: body.is_active !== false });
  return NextResponse.json(rule, { status: 201 });
}
