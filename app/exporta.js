// Exportações: medidas em CSV (planilha, sem nome do aluno) e modelos de ângulos livres criados pelo avaliador.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./angles.js'), require('./corrida.js'), require('./medidas.js'));
  else root.Exporta = factory(root.Angles, root.Corrida, root.Medidas);
})(typeof self !== 'undefined' ? self : this, function (Angles, Corrida, Medidas) {
  'use strict';

  const VIEW_KEYS = ['ant', 'post', 'latD', 'latE'];
  // Vírgula decimal e ponto e vírgula entre colunas: abre direto no Excel em português. Dado ausente fica vazio, nunca zero.
  const num = (v) => (v == null || isNaN(v) ? '' : String(Angles.round1(v)).replace('.', ','));
  const cell = (s) => { s = String(s == null ? '' : s); return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = (rows) => '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';

  const CABECALHO = ['data', 'vista ou foto', 'codigo', 'medida', 'valor', 'unidade', 'descricao', 'origem'];

  // Uma linha por medida completa, de todas as avaliações da lista, da mais antiga para a mais nova.
  // opts.testNome(id): nome do teste de movimento (sem ele, usa o identificador).
  function medidas(list, opts) {
    const testNome = (opts && opts.testNome) || ((id) => id);
    const rows = [CABECALHO];
    const livre = (data, onde, f, origem) => { const fv = Angles.freeValue(f); if (fv) rows.push([data, onde, '', f.label, num(fv.value), 'graus', fv.text, origem]); };
    list.slice().sort((x, y) => String(x.data).localeCompare(String(y.data))).forEach((a) => {
      VIEW_KEYS.forEach((k) => {
        const v = a.views && a.views[k];
        if (!v) return;
        const onde = Angles.VIEWS[k].label;
        Angles.computeView(k, v.pts || {}, v.facing, v.calib).forEach((r) =>
          rows.push([a.data, onde, r.code, r.label, num(r.signed != null ? r.signed : r.value), r.unit === 'cm' ? 'cm' : 'graus', r.text, 'protocolo']));
        (v.free || []).forEach((f) => livre(a.data, onde, f, 'ângulo livre'));
      });
      Object.entries((a.mov && a.mov.fotos) || {}).forEach(([tid, L]) => (L || []).forEach((p) => (p.free || []).forEach((f) => livre(a.data, p.nome, f, 'teste de movimento: ' + testNome(tid)))));
      (a.livres || []).forEach((p) => (p.free || []).forEach((f) => livre(a.data, p.nome, f, 'foto avulsa')));
      if (Corrida && a.corrida) Corrida.VISTAS.forEach((x) => {
        const v = a.corrida.vistas && a.corrida.vistas[x.id];
        if (!v || !v.usada) return;
        const desc = 'velocidade ' + (v.velocidade || 'não registrada');
        const t = x.tempos && (v.passos || []).length ? Corrida.tempos(v.passos, Corrida.fator(v)) : null;
        if (t) {
          if (t.cadencia != null) rows.push([a.data, x.nome, '', 'Cadência', num(t.cadencia), 'passos/min', desc, 'corrida']);
          ['D', 'E'].forEach((s) => {
            const L = t.lados[s], lado = s === 'D' ? 'direito' : 'esquerdo';
            if (L.contato.media != null) rows.push([a.data, x.nome, '', 'Tempo de contato ' + lado, num(L.contato.media), 'ms', desc + ' · ' + L.n + ' passadas', 'corrida']);
            if (L.voo.media != null) rows.push([a.data, x.nome, '', 'Tempo de voo ' + lado, num(L.voo.media), 'ms', desc + ' · ' + L.n + ' passadas', 'corrida']);
          });
        }
        (v.quadros || []).forEach((q) => (q.free || []).forEach((f) => livre(a.data, x.nome + ' · ' + q.nome, f, 'corrida')));
      });
    });
    return rows;
  }

  // Modelo a partir dos ângulos de uma foto: guarda nome, tipo e dicas, nunca os pontos (nada da foto do aluno).
  function modelo(nome, free, dicasPadrao) {
    return {
      nome: String(nome || '').trim() || 'Meu modelo',
      angulos: (free || []).map((f) => {
        const tipo = f.tipo || '3pt';
        return { label: f.label || 'Ângulo', tipo, dicas: (f.dicas || (dicasPadrao && dicasPadrao[tipo]) || []).slice() };
      }),
    };
  }

  // Medidas corporais do aluno (circunferências em cm), sem o nome do aluno.
  const CABECALHO_CORPORAIS = ['data', 'medida', 'valor', 'unidade', 'observacao'];
  const csvCorporais = (list) => csv([CABECALHO_CORPORAIS].concat(Medidas.linhasCsv(list)));

  return { csv, medidas, modelo, csvCorporais, CABECALHO, CABECALHO_CORPORAIS };
});
