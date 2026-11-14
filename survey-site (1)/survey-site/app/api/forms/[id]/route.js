import { NextResponse } from 'next/server';
import { admin, UUID } from '../../../../lib/admin';

export const dynamic = 'force-dynamic';
const H = { 'cache-control': 'no-store' };

// الاستبيان للمجيبين: بدون الإجابات الصحيحة للاختبارات
export async function GET(req, { params }) {
  const id = params.id;
  if (!UUID.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: H });
  try {
    const db = admin();
    const { data } = await db.from('forms').select('id,data').eq('id', id).maybeSingle();
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: H });
    const f = JSON.parse(JSON.stringify(data.data));
    (f.questions || []).forEach(q => { delete q.correct; delete q.correctText; });
    if (Number(f.maxResponses) > 0) {
      const { count } = await db.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', id);
      if ((count || 0) >= Number(f.maxResponses)) f.accepting = false;
    }
    return NextResponse.json(Object.assign(f, { id: id }), { headers: H });
  } catch (e) {
    return NextResponse.json({ error: 'server' }, { status: 500, headers: H });
  }
}
