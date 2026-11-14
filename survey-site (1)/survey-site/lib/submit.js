// التحقق من الرد وتصحيحه على الخادم (دالة نقية قابلة للاختبار)
const L = require('../public/logic.js');

function sanitize(v, depth) {
  depth = depth || 0;
  if (typeof v === 'string') return v.slice(0, 5000);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v;
  if (Array.isArray(v)) return depth > 3 ? [] : v.slice(0, 200).map(x => sanitize(x, depth + 1));
  if (v && typeof v === 'object') {
    if (depth > 3) return {};
    const o = {};
    Object.keys(v).slice(0, 200).forEach(k => { o[String(k).slice(0, 300)] = sanitize(v[k], depth + 1); });
    return o;
  }
  return null;
}

function processSubmission(form, answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return { status: 400, error: 'bad_answers' };
  const eff = L.effective(form, answers).eff;
  const clean = {};
  for (const q of form.questions || []) {
    if (q.type === 'section') continue;
    if (!Object.prototype.hasOwnProperty.call(eff, q.id)) continue;
    const v = eff[q.id];
    if (q.required && !L.complete(q, v)) return { status: 400, error: 'required', question: q.id };
    if (L.emptyV(v)) continue;
    if (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) continue;
    clean[q.id] = sanitize(v);
  }
  const result = form.quiz ? L.gradeAll(form, eff) : null;
  return { status: 200, answers: clean, result: result };
}

module.exports = { processSubmission };
