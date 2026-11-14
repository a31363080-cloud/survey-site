import { NextResponse } from 'next/server';
import { admin, UUID } from '../../../lib/admin';
const { processSubmission } = require('../../../lib/submit');

export const dynamic = 'force-dynamic';
const H = { 'cache-control': 'no-store' };
const fail = (status, error) => NextResponse.json({ error: error }, { status: status, headers: H });

export async function POST(req) {
  let body;
  try {
    const txt = await req.text();
    if (txt.length > 300000) return fail(413, 'too_large');
    body = JSON.parse(txt);
  } catch (e) { return fail(400, 'bad_json'); }

  const formId = body && body.formId, answers = body && body.answers;
  const token = body && typeof body.token === 'string' ? body.token.slice(0, 100) : '';
  if (!UUID.test(String(formId))) return fail(404, 'not_found');

  try {
    const db = admin();
    const { data: row } = await db.from('forms').select('id,data').eq('id', formId).maybeSingle();
    if (!row) return fail(404, 'not_found');
    const f = row.data;

    if (f.accepting === false) return fail(403, 'closed');
    if (f.closeAt && Date.now() > new Date(f.closeAt).getTime()) return fail(403, 'closed');

    const respondent = f.oneResp && token ? token : null;
    let existing = null;
    if (respondent) {
      const r = await db.from('responses').select('id').eq('form_id', formId).eq('respondent', respondent).maybeSingle();
      existing = r.data;
    }
    if (Number(f.maxResponses) > 0 && !existing) {
      const { count } = await db.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', formId);
      if ((count || 0) >= Number(f.maxResponses)) return fail(403, 'closed');
    }

    const r = processSubmission(f, answers);
    if (r.status !== 200) return fail(r.status, r.error);

    const rec = {
      form_id: formId,
      answers: r.answers,
      score: r.result ? r.result.score : null,
      max: r.result ? r.result.max : null,
      respondent: respondent,
    };
    let err;
    if (respondent) {
      rec.created_at = new Date().toISOString();
      err = (await db.from('responses').upsert(rec, { onConflict: 'form_id,respondent' })).error;
    } else {
      err = (await db.from('responses').insert(rec)).error;
    }
    if (err) return fail(500, 'save_failed');

    return NextResponse.json(
      { ok: true, result: f.quiz && f.showScore !== false ? r.result : null },
      { headers: H }
    );
  } catch (e) {
    return fail(500, 'server');
  }
}
