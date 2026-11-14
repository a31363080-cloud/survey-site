/* منطق مشترك بين المتصفح والخادم: الأقسام، الشروط، التحقق، التصحيح */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SVLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const OPTT = new Set(['choice', 'multi', 'drop', 'rank']);
  const LOGSRC = new Set(['choice', 'drop', 'multi', 'scale', 'short']);
  const QUIZT = new Set(['choice', 'multi', 'drop', 'short']);
  const rowsOf = q => (q.rows || []).map(s => String(s).trim()).filter(Boolean);
  const colsOf = q => (q.cols || []).map(s => String(s).trim()).filter(Boolean);

  function pagesOf(f) {
    const P = [{ sec: null, items: [] }];
    (f.questions || []).forEach(q => {
      if (q.type === 'section') P.push({ sec: q, items: [] });
      else P[P.length - 1].items.push(q);
    });
    if (P.length > 1 && !P[0].items.length) P.shift();
    return P;
  }

  function condOk(q, eff, f) {
    const c = q.showIf; if (!c) return true;
    const src = (f.questions || []).find(x => x.id === c.q); if (!src) return true;
    const a = eff[src.id];
    const val = OPTT.has(src.type) ? (src.options || [])[c.vi] : c.v;
    const has = Array.isArray(a) ? a.indexOf(val) >= 0 : (a != null && a !== '' && String(a) === String(val));
    return c.op === 'ne' ? !has : has;
  }

  /* الإجابات الفعلية: تستبعد الأسئلة والأقسام المخفية بحسب الشروط */
  function effective(f, ans) {
    const eff = {}, sec = {}; let sv = true;
    (f.questions || []).forEach(q => {
      if (q.type === 'section') { sv = condOk(q, eff, f); sec[q.id] = sv; return; }
      if (sv && condOk(q, eff, f)) eff[q.id] = ans[q.id];
    });
    return { eff: eff, sec: sec };
  }

  const emptyV = v => v == null || v === '' || (Array.isArray(v) && !v.length);

  function complete(q, v) {
    if (q.type === 'grid') { const r = rowsOf(q); return !!v && r.every(x => v[x] != null && v[x] !== ''); }
    if (q.type === 'gridm') { const r = rowsOf(q); return !!v && r.every(x => Array.isArray(v[x]) && v[x].length); }
    if (q.type === 'rank') return Array.isArray(v) && v.length === (q.options || []).length;
    return !emptyV(v);
  }

  function gradeQ(q, a) {
    if (!QUIZT.has(q.type)) return null;
    if (q.type === 'short') {
      const ok = String(q.correctText || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!ok.length) return null;
      return a != null && ok.indexOf(String(a).trim().toLowerCase()) >= 0;
    }
    const cs = (q.correct || []).map(i => (q.options || [])[i]).filter(x => x != null);
    if (!cs.length) return null;
    if (q.type === 'multi') { const A = Array.isArray(a) ? a : []; return A.length === cs.length && cs.every(c => A.indexOf(c) >= 0); }
    return a === cs[0];
  }

  function gradeAll(f, eff) {
    let score = 0, max = 0; const wrong = [];
    (f.questions || []).forEach(q => {
      if (!Object.prototype.hasOwnProperty.call(eff, q.id)) return;
      const g = gradeQ(q, eff[q.id]); if (g === null) return;
      const p = Number(q.points) || 0; max += p;
      if (g) score += p;
      else wrong.push({ title: q.title, correct: q.type === 'short' ? q.correctText : (q.correct || []).map(i => (q.options || [])[i]).filter(Boolean).join(' | ') });
    });
    return { score: score, max: max, wrong: wrong };
  }

  return { OPTT, LOGSRC, QUIZT, rowsOf, colsOf, pagesOf, condOk, effective, emptyV, complete, gradeQ, gradeAll };
});
