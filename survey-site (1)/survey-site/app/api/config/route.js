import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// إعدادات عامة يحتاجها المتصفح (المفتاح العام فقط، لا أسرار هنا)
export async function GET() {
  return NextResponse.json(
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      ai: !!process.env.ANTHROPIC_API_KEY,
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
