import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.redirect('https://telegram.me/APay_Protocol_Bot', {
    status: 307,
  });
}
