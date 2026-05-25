import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filePath = path.join(process.cwd(), 'uploads', filename);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();

    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    };

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
