import { NextResponse } from 'next/server';
import { admin } from '../../../lib/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const H = { 'cache-control': 'no-store' };
const fail = (status, error) => NextResponse.json({ error: error }, { status: status, headers: H });

// حد بسيط لكل مستخدم في ذاكرة النسخة الحالية من الخادم (للحماية من التكلفة غير المتوقعة)
const hits = new Map();

export async function POST(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return fail(401, 'unauthorized');
  if (!process.env.ANTHROPIC_API_KEY) return fail(501, 'ai_disabled');

  let user;
  try {
    const { data, error } = await admin().auth.getUser(token);
    if (error || !data || !data.user) return fail(401, 'unauthorized');
    user = data.user;
  } catch (e) { return fail(500, 'server'); }

  const limit = Number(process.env.AI_HOURLY_LIMIT || 40), now = Date.now();
  const recent = (hits.get(user.id) || []).filter(t => now - t < 3600000);
  if (recent.length >= limit) return fail(429, 'rate_limited');
  recent.push(now); hits.set(user.id, recent);

  let prompt;
  try { prompt = (await req.json()).prompt; } catch (e) { return fail(400, 'bad_json'); }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 120000) return fail(400, 'bad_prompt');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) return fail(502, 'upstream');
    const j = await r.json();
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    return NextResponse.json({ text: text }, { headers: H });
  } catch (e) {
    return fail(502, 'upstream');
  }
}
