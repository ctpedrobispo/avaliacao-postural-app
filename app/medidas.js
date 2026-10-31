// Medidas corporais (perimetria) por aluno e sua evolução. Valores em cm, lados direito e esquerdo.
// Descreve; não classifica: sem faixa "normal", sem diagnóstico, sem nota. Dado ausente fica vazio, nunca zero.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Medidas = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Cada grupo tem uma medida (k) ou um par direito/esquerdo (kD, kE).
  const GRUPOS = [
    { id: 'braco', nome: 'Bíceps (braço relaxado)', par: true },
    { id: 'bracoC', nome: 'Bíceps contraído', par: true },
    { id: 'ant', nome: 'Antebraço', par: true },
    { id: 'coxa', nome: 'Coxa', par: true },
    { id: 'pant', nome: 'Panturrilha', par: true },
    { id: 'pescoco', nome: 'Pescoço', par: false },
    { id: 'torax', nome: 'Tórax (tronco)', par: false },
    { id: 'cintura', nome: 'Cintura', par: false },
    { id: 'abdomen', nome: 'Abdômen', par: false },
    { id: 'quadril', nome: 'Quadril', par: false },
  ];
  // Chaves guardadas no registro: braco_D, braco_E, torax…
  const key = (g, lado) => (g.par ? g.id + '_' + lado : g.id);
  const CAMPOS = GRUPOS.flatMap((g) => (g.par ? [{ k: key(g, 'D'), g, lado: 'D', nome: g.nome + ' (direito)' }, { k: key(g, 'E'), g, lado: 'E', nome: g.nome + ' (esquerdo)' }] : [{ k: g.id, g, lado: '', nome: g.nome }]));
  const nomeDe = (k) => (CAMPOS.find((c) => c.k === k) || { nome: k }).nome;

  const num = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(x) ? null : x; };
  const r1 = (v) => Math.round(v * 10) / 10;

  // Limpa um registro: só campos numéricos positivos; vazio fica de fora (não vira zero).
  function limpa(vals) {
    const out = {};
    CAMPOS.forEach((c) => { const x = num(vals && vals[c.k]); if (x != null && x > 0) out[c.k] = r1(x); });
    return out;
  }

  // Aviso, não bloqueio: valor fora do que é plausível para uma circunferência em cm (provável erro de digitação).
  function aviso(vals) {
    const out = [];
    CAMPOS.forEach((c) => { const x = num(vals && vals[c.k]); if (x != null && (x < 8 || x > 200)) out.push(`${c.nome}: ${String(x).replace('.', ',')} cm parece fora do possível. Confira.`); });
    return out;
  }

  const ordena = (list) => (list || []).slice().sort((a, b) => String(a.data).localeCompare(String(b.data)) || String(a.criado || '').localeCompare(String(b.criado || '')));

  // Série de uma medida: [{ data, value }] só onde há valor.
  function serie(list, k) {
    return ordena(list).filter((r) => r.v && r.v[k] != null).map((r) => ({ data: r.data, value: r.v[k] }));
  }

  // Relação cintura/quadril: valor contínuo, sem classificação (sem ponto de corte universal).
  function rcq(v) {
    const c = num(v && v.cintura), q = num(v && v.quadril);
    return c && q ? Math.round((c / q) * 100) / 100 : null;
  }
  const serieRcq = (list) => ordena(list).map((r) => ({ data: r.data, value: rcq(r.v) })).filter((p) => p.value != null);

  // Linhas para tabela de evolução: primeiro, anterior, atual e variações em cm (atual − primeiro, atual − anterior).
  function evolucao(list) {
    return CAMPOS.map((c) => {
      const s = serie(list, c.k);
      if (!s.length) return null;
      const atual = s[s.length - 1], ant = s.length > 1 ? s[s.length - 2] : null, prim = s[0];
      return {
        k: c.k, nome: c.nome, n: s.length, atual: atual.value, dataAtual: atual.data,
        desdePrimeiro: s.length > 1 ? r1(atual.value - prim.value) : null,
        desdeAnterior: ant ? r1(atual.value - ant.value) : null,
        dataPrimeiro: prim.data,
      };
    }).filter(Boolean);
  }

  // Diferença direito − esquerdo na avaliação mais recente em que os dois lados existem. Descritiva.
  function assimetria(list) {
    const rs = ordena(list).reverse();
    return GRUPOS.filter((g) => g.par).map((g) => {
      const r = rs.find((x) => x.v && x.v[key(g, 'D')] != null && x.v[key(g, 'E')] != null);
      if (!r) return null;
      const d = r.v[key(g, 'D')], e = r.v[key(g, 'E')];
      return { id: g.id, nome: g.nome, data: r.data, D: d, E: e, dif: r1(d - e) };
    }).filter(Boolean);
  }

  // Linhas do CSV: uma por medida e data.
  function linhasCsv(list) {
    const rows = [];
    ordena(list).forEach((r) => {
      CAMPOS.forEach((c) => { if (r.v && r.v[c.k] != null) rows.push([r.data, c.nome, String(r.v[c.k]).replace('.', ','), 'cm', r.obs || '']); });
      const q = rcq(r.v);
      if (q != null) rows.push([r.data, 'Relação cintura/quadril', String(q).replace('.', ','), 'razão', r.obs || '']);
    });
    return rows;
  }

  return { GRUPOS, CAMPOS, key, nomeDe, num, limpa, aviso, ordena, serie, serieRcq, rcq, evolucao, assimetria, linhasCsv };
});
