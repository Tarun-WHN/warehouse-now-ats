import { NextRequest, NextResponse } from 'next/server';
import { getTeamMembers, addTeamMember } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendEmail, isEmailConfigured } from '@/lib/mailer';

export async function GET() {
  const members = getTeamMembers();
  return NextResponse.json(members);
}

function welcomeEmailHtml(name: string, email: string, password: string, loginUrl: string): string {
  return `Hi ${name},

Welcome to the Warehouse Now Talent Acquisition Platform! An account has been created for you.

You can sign in here: ${loginUrl}

Your login details:
Email: ${email}
Temporary password: ${password}

For your security, please sign in and change your password right away from the "My Account" page.

If you have any questions, just reply to this email.

— Warehouse Now HR`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || !body.email || !body.role) {
    return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
  }

  // Hash password if provided, otherwise generate a default one
  const password = body.password || 'welcome123';
  const password_hash = hashPassword(password);

  try {
    const member = addTeamMember({
      ...body,
      is_active: body.is_active !== false,
      password_hash,
    });

    // Best-effort welcome email from HR with login credentials.
    let email_sent = false;
    let email_error: string | undefined;
    if (isEmailConfigured()) {
      const baseUrl = (process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, '');
      const loginUrl = `${baseUrl}/login`;
      const result = await sendEmail(
        member.email,
        'Welcome to Warehouse Now — Your Account Details',
        welcomeEmailHtml(member.name, member.email, password, loginUrl),
      );
      email_sent = result.success;
      email_error = result.error;
    }

    return NextResponse.json(
      { ...member, default_password: body.password ? undefined : 'welcome123', email_sent, email_error },
      { status: 201 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'A team member with this email already exists' }, { status: 409 });
    }
    throw e;
  }
}
