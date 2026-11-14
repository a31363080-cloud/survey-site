import { NextResponse } from 'next/server';
import { admin, UUID } from '../../../../../lib/admin';

export const dynamic = 'force-dynamic';
const H = { 'cache-control': 'no-store' };

// رد هذا المتصفح السابق (لخيار تعديل الرد)
export async function GET(req, { params }) {
  const id = params.id;
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!UUID.test(id) || !token || token.length > 100) return NextResponse.json({ response: null }, { headers: H });
  try {
    const { data } = await admin().from('responses').select('answers').eq('form_id', id).eq('respondent', token).maybeSingle();
    return NextResponse.json({ response: data ? { answers: data.answers } : null }, { headers: H });
  } catch (e) {
    return NextResponse.json({ response: null }, { headers: H });
  }
}
