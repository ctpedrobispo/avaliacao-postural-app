// Testes de movimento: agachamento overhead, step-down, joelho na parede, Thomas modificado e testes livres.
// Registro de observações e medidas; descreve o que foi visto, sem diagnóstico e sem pontos de corte próprios.
// PENDENTE DE VALIDAÇÃO: conferir protocolos e termos com o manual de movimento do Pedro.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Mov = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DOR = ['', 'Sem dor', 'Dor leve', 'Dor moderada', 'Dor forte'];
  const CTRL = ['', 'Sem alteração', 'Alteração leve', 'Alteração marcada'];

  // t: chk (marcou/não), bi (lado D e E), n2 (número D e E), tri (3 tentativas por lado), sel, sel2 (select D e E),
  // num (número), txt (texto).
  const TESTS = [
    {
      id: 'ohs', nome: 'Agachamento overhead',
      protocolo: 'Pés na largura dos ombros, braços estendidos acima da cabeça (com bastão, se usar), descer o quanto conseguir com controle. Filmar ou fotografar de frente e de lado. Observar durante a descida e a subida.',
      campos: [
        { k: 'rep', t: 'num', label: 'Repetições observadas' },
        { k: 'calcado', t: 'sel', label: 'Calçado', opts: ['', 'Descalço', 'Calçado'] },
        { g: 'Vista anterior' },
        { k: 'pe_fora', t: 'bi', label: 'Pé: ponta voltada para fora' },
        { k: 'calc_sobe', t: 'bi', label: 'Calcanhar: sai do chão' },
        { k: 'jo_med', t: 'bi', label: 'Joelho: projeção medial durante a descida' },
        { k: 'jo_lat', t: 'bi', label: 'Joelho: projeção lateral durante a descida' },
        { k: 'shift', t: 'bi', label: 'Quadril: deslocamento lateral para o lado' },
        { g: 'Vista lateral' },
        { k: 'tronco', t: 'chk', label: 'Tronco: inclinação anterior acentuada' },
        { k: 'lomb_aum', t: 'chk', label: 'Região lombar: aumento da curvatura' },
        { k: 'lomb_red', t: 'chk', label: 'Região lombar: redução da curvatura (flexão)' },
        { k: 'bracos', t: 'chk', label: 'Braços: caem à frente do tronco' },
        { k: 'cabeca', t: 'chk', label: 'Cabeça: projeta à frente' },
        { k: 'prof', t: 'sel', label: 'Profundidade alcançada', opts: ['', 'Coxa abaixo da horizontal', 'Coxa na horizontal', 'Coxa acima da horizontal'] },
        { g: 'Geral' },
        { k: 'dor', t: 'sel', label: 'Dor durante o movimento', opts: DOR },
        { k: 'dor_local', t: 'txt', label: 'Local da dor (se houver)' },
      ],
    },
    {
      id: 'stepdown', nome: 'Step-down unipodal',
      protocolo: 'Em pé sobre um degrau, apoio em uma perna, descer lentamente o outro pé até tocar o chão com o calcanhar e voltar. Repetir, observando de frente. Registrar a altura do degrau e fazer dos dois lados.',
      campos: [
        { k: 'altura', t: 'num', label: 'Altura do degrau (cm)' },
        { k: 'rep', t: 'num', label: 'Repetições por lado' },
        { g: 'Observações (marque o lado da perna de apoio)' },
        { k: 'jo_med', t: 'bi', label: 'Joelho: projeção medial' },
        { k: 'jo_lat', t: 'bi', label: 'Joelho: projeção lateral' },
        { k: 'pelve', t: 'bi', label: 'Pelve: queda do lado oposto' },
        { k: 'tronco', t: 'bi', label: 'Tronco: inclinação lateral' },
        { k: 'equil', t: 'bi', label: 'Perda de equilíbrio ou apoio do pé livre' },
        { k: 'calc', t: 'bi', label: 'Calcanhar de apoio sai do chão' },
        { k: 'ctrl', t: 'sel2', label: 'Controle durante a descida', opts: CTRL },
        { k: 'dor', t: 'sel2', label: 'Dor', opts: DOR },
      ],
    },
    {
      id: 'jpar', nome: 'Joelho na parede (dorsiflexão em apoio)',
      protocolo: 'Pé apoiado, joelho avança em direção à parede sem levantar o calcanhar. Medir a maior distância entre a ponta do hálux e a parede em que o joelho ainda toca a parede. Três tentativas por lado, descalço.',
      campos: [
        { k: 'dist', t: 'tri', label: 'Distância do hálux à parede (cm)', unit: 'cm' },
        { k: 'ang', t: 'n2', label: 'Inclinação da tíbia (°), se medida', unit: '°' },
        { k: 'calc', t: 'bi', label: 'Calcanhar sai do chão antes do fim' },
        { k: 'pinc', t: 'bi', label: 'Desconforto ou pinçamento na frente do tornozelo' },
        { k: 'dor', t: 'sel2', label: 'Dor', opts: DOR },
      ],
    },
    {
      id: 'thomas', nome: 'Thomas modificado',
      protocolo: 'Deitado na ponta da maca, abraçar um joelho ao peito e deixar a outra perna pendente. Observar posição da coxa e do joelho da perna que fica pendente, dos dois lados.',
      campos: [
        { k: 'quadril', t: 'n2', label: 'Ângulo do quadril (coxa em relação à horizontal)', unit: '°' },
        { k: 'joelho', t: 'n2', label: 'Ângulo do joelho', unit: '°' },
        { k: 'coxa_alta', t: 'bi', label: 'Coxa: não encosta na maca' },
        { k: 'abd', t: 'bi', label: 'Quadril: abdução da coxa' },
        { k: 'rot', t: 'bi', label: 'Perna: rotação externa' },
        { k: 'dor', t: 'sel2', label: 'Dor', opts: DOR },
      ],
    },
  ];

  // Modelos de medida: sugestões para conferir com o manual do Pedro (PENDENTE DE VALIDAÇÃO).
  // tipo: '3pt' (ângulo no 2º ponto), 'h' (linha × horizontal), 'v' (linha × vertical). dicas: nome de cada ponto, na ordem.
  const pick = (id) => TESTS.find((t) => t.id === id);
  pick('ohs').modelos = [
    { id: 'lat', nome: 'Vista lateral', angulos: [
      { label: 'Tronco × vertical', tipo: 'v', dicas: ['Acrômio', 'Trocânter maior'] },
      { label: 'Tíbia × vertical', tipo: 'v', dicas: ['Joelho (linha articular)', 'Maléolo lateral'] },
      { label: 'Flexão do joelho', tipo: '3pt', dicas: ['Trocânter maior', 'Joelho (vértice)', 'Maléolo lateral'] },
      { label: 'Flexão do quadril', tipo: '3pt', dicas: ['Acrômio', 'Trocânter maior (vértice)', 'Joelho'] },
      { label: 'Braços × vertical', tipo: 'v', dicas: ['Punho', 'Acrômio'] },
    ] },
    { id: 'ant', nome: 'Vista anterior', angulos: [
      { label: 'Ombros × horizontal', tipo: 'h', dicas: ['Acrômio D', 'Acrômio E'] },
      { label: 'Pelve × horizontal', tipo: 'h', dicas: ['EIAS D', 'EIAS E'] },
      { label: 'Quadril–joelho–tornozelo D', tipo: '3pt', dicas: ['EIAS D', 'Centro da patela D (vértice)', 'Tornozelo D'] },
      { label: 'Quadril–joelho–tornozelo E', tipo: '3pt', dicas: ['EIAS E', 'Centro da patela E (vértice)', 'Tornozelo E'] },
    ] },
  ];
  pick('stepdown').modelos = [
    { id: 'ant', nome: 'Vista anterior', angulos: [
      { label: 'Pelve × horizontal', tipo: 'h', dicas: ['EIAS D', 'EIAS E'] },
      { label: 'Quadril–joelho–tornozelo (perna de apoio)', tipo: '3pt', dicas: ['EIAS', 'Centro da patela (vértice)', 'Tornozelo'] },
      { label: 'Tronco × vertical', tipo: 'v', dicas: ['Incisura jugular', 'Meio das EIAS'] },
    ] },
  ];
  pick('jpar').modelos = [
    { id: 'lat', nome: 'Vista lateral', angulos: [
      { label: 'Tíbia × vertical', tipo: 'v', dicas: ['Joelho (linha articular)', 'Maléolo lateral'] },
      { label: 'Pé × horizontal', tipo: 'h', dicas: ['Calcanhar', 'Ponta do hálux'] },
    ] },
  ];
  pick('thomas').modelos = [
    { id: 'lat', nome: 'Vista lateral', angulos: [
      { label: 'Coxa × horizontal', tipo: 'h', dicas: ['Trocânter maior', 'Joelho (linha articular)'] },
      { label: 'Flexão do joelho', tipo: '3pt', dicas: ['Trocânter maior', 'Joelho (vértice)', 'Maléolo lateral'] },
    ] },
  ];

  const fmtN = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  const num = (v) => { const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; };
  const sidesText = (o) => (o.D && o.E ? 'ambos os lados' : o.D ? 'lado direito' : 'lado esquerdo');

  // Resumo para o laudo e para a comparação. mov = { t: { testId: { campo: valor } }, livres: [...] }
  function summarize(mov) {
    const out = [], metrics = [];
    if (!mov) return { tests: out, metrics };
    TESTS.forEach((t) => {
      const d = (mov.t && mov.t[t.id]) || {};
      const lines = [];
      t.campos.forEach((c) => {
        if (c.g) return;
        const v = d[c.k];
        if (c.t === 'chk') { if (v) lines.push(c.label); }
        else if (c.t === 'bi') { if (v && (v.D || v.E)) lines.push(`${c.label} — ${sidesText(v)}`); }
        else if (c.t === 'num') { const x = num(v); if (x != null) lines.push(`${c.label}: ${fmtN(x)}`); }
        else if (c.t === 'txt') { if (v && String(v).trim()) lines.push(`${c.label}: ${String(v).trim()}`); }
        else if (c.t === 'sel') { if (v) lines.push(`${c.label}: ${v}`); }
        else if (c.t === 'sel2') { if (v && (v.D || v.E)) lines.push(`${c.label}: direito ${v.D || '—'} · esquerdo ${v.E || '—'}`); }
        else if (c.t === 'n2') {
          const D = v && num(v.D), E = v && num(v.E);
          if (D != null || E != null) {
            let s = `${c.label}: direito ${D != null ? fmtN(D) + ' ' + c.unit : '—'} · esquerdo ${E != null ? fmtN(E) + ' ' + c.unit : '—'}`;
            if (D != null && E != null) { const df = Math.abs(D - E), mx = Math.max(Math.abs(D), Math.abs(E)); s += ` · diferença ${fmtN(df)} ${c.unit}${mx ? ` (${fmtN((df / mx) * 100)}%)` : ''}`; metrics.push({ key: t.id + '.' + c.k, label: `${t.nome}: ${c.label}`, unit: c.unit, D, E }); }
            lines.push(s);
          }
        } else if (c.t === 'tri') {
          const side = (s) => (v && v[s] ? v[s].map(num).filter((x) => x != null) : []);
          const [dD, dE] = [side('D'), side('E')];
          if (dD.length || dE.length) {
            const f = (a) => (a.length ? `${a.map(fmtN).join(' / ')} (máx. ${fmtN(Math.max(...a))}, média ${fmtN(a.reduce((x, y) => x + y, 0) / a.length)})` : '—');
            let s = `${c.label}: direito ${f(dD)} · esquerdo ${f(dE)}`;
            if (dD.length && dE.length) { const D = Math.max(...dD), E = Math.max(...dE); s += ` · diferença entre os máximos ${fmtN(Math.abs(D - E))} ${c.unit}`; metrics.push({ key: t.id + '.' + c.k, label: `${t.nome}: ${c.label} (máx.)`, unit: c.unit, D, E }); }
            lines.push(s);
          }
        }
      });
      if (d.obs && String(d.obs).trim()) lines.push('Observação: ' + String(d.obs).trim());
      if (lines.length) out.push({ id: t.id, nome: t.nome, lines });
    });
    (mov.livres || []).forEach((l) => {
      const D = num(l.d), E = num(l.e);
      if (!l.nome && D == null && E == null && !l.obs) return;
      const lines = [];
      if (D != null || E != null) {
        let s = `direito ${D != null ? fmtN(D) : '—'} · esquerdo ${E != null ? fmtN(E) : '—'}${l.unidade ? ' ' + l.unidade : ''}`;
        if (D != null && E != null) { s += ` · diferença ${fmtN(Math.abs(D - E))}${l.unidade ? ' ' + l.unidade : ''}`; metrics.push({ key: 'livre.' + (l.nome || ''), label: l.nome || 'Teste livre', unit: l.unidade || '', D, E }); }
        lines.push(s);
      }
      if (l.obs) lines.push('Observação: ' + l.obs);
      out.push({ id: 'livre', nome: l.nome || 'Teste livre', lines });
    });
    return { tests: out, metrics };
  }

  return { TESTS, DOR, CTRL, summarize };
});
