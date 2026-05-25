import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ai_parsing_enabled: !!process.env.ANTHROPIC_API_KEY,
  });
}
