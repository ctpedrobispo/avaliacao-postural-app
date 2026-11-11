// Testes de movimento: agachamento overhead, step-down, joelho na parede, Thomas modificado e testes livres.
// Registro de observações e medidas; descreve o que foi visto, sem diagnóstico e sem pontos de corte próprios.
// v24 (11/11/2026): step-down com rubrica de Piva/Rabin (lateral, 0–6, só com todos os itens observáveis), joelho na parede com
// referência populacional de McBride et al., 2026 (P25–P75 do pé dominante) e Thomas com convenção de sinal explícita.
// PENDENTE DE VALIDAÇÃO: (1) tabela de McBride: transcrita de documento conferido pelo Pedro, não reconferida no artigo (acesso pago);
// (2) modelos de ângulo (abaixo): só o FPPA (EIAS–centro da patela–tornozelo) tem correspondência com o Manual de Movimento 2.0 §25.7.
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
        { k: 'base', t: 'txt', label: 'Base: largura e rotação dos pés' },
        { k: 'carga', t: 'txt', label: 'Carga e implemento (ex.: sem carga, bastão)' },
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
      protocolo: 'Em pé sobre um degrau, apoio em uma perna, descer lentamente o outro pé até tocar o chão com o calcanhar e voltar. Versão padronizada do Manual de Movimento 2.0 (lateral): degrau de 20 cm, mãos na cintura, 5 repetições de familiarização e 5 observadas, câmera frontal, dos dois lados. A altura muda a tarefa: use a mesma no acompanhamento. O escore abaixo é da versão lateral; no step-down anterior, descreva só o que foi visto. Concordância entre avaliadores ao ler vídeos (Mansfield et al.): kappa de 0,40 a 0,65; a categoria intermediária é a que menos concorda.',
      campos: [
        { k: 'variante', t: 'sel', label: 'Variante', opts: ['', 'Lateral (rubrica de Piva/Rabin)', 'Anterior (forward)', 'Outra'] },
        { k: 'altura', t: 'num', label: 'Altura do degrau (cm)' },
        { k: 'rep', t: 'num', label: 'Repetições por lado' },
        { g: 'Rubrica de Piva/Rabin — só no step-down lateral (marque o lado da perna de apoio)' },
        { k: 'mao', t: 'bi', label: 'Braços: retira a mão da cintura (1)' },
        { k: 'tronco', t: 'bi', label: 'Tronco: inclinação ou deslocamento evidente (1)' },
        { k: 'pelve', t: 'bi', label: 'Pelve: perda do plano horizontal (1)' },
        { k: 'jo2', t: 'bi', label: 'Joelho: tuberosidade tibial medial ao 2º dedo (1)' },
        { k: 'jo3', t: 'bi', label: 'Joelho: tuberosidade tibial medial à borda medial do pé (2; conta só o maior nível)' },
        { k: 'equil', t: 'bi', label: 'Equilíbrio: apoia o pé livre ou oscila muito (1)' },
        { k: 'visib', t: 'sel', label: 'Todos os itens foram observáveis nos dois lados? (sem isso, o escore não é calculado)', opts: ['', 'Sim', 'Não'] },
        { g: 'Outras observações' },
        { k: 'jo_med', t: 'bi', label: 'Joelho: projeção medial' },
        { k: 'jo_lat', t: 'bi', label: 'Joelho: projeção lateral' },
        { k: 'calc', t: 'bi', label: 'Calcanhar de apoio sai do chão' },
        { k: 'ctrl', t: 'sel2', label: 'Controle durante a descida', opts: CTRL },
        { k: 'dor', t: 'sel2', label: 'Dor', opts: DOR },
      ],
    },
    {
      id: 'jpar', nome: 'Joelho na parede (dorsiflexão em apoio)',
      protocolo: 'Pé apoiado, joelho avança em direção à parede sem levantar o calcanhar. Medir a maior distância entre a ponta do hálux e a parede em que o joelho ainda toca a parede. Três tentativas por lado, descalço. Para comparar com a referência por idade e sexo (McBride et al., 2026; a tabela ainda está pendente de conferência no artigo), informe o pé dominante (o que chuta uma bola) e se o protocolo foi compatível: fita no chão, parede sem rodapé, pé perpendicular, calcanhar apoiado, joelho toca a parede.',
      campos: [
        { k: 'dist', t: 'tri', label: 'Distância do hálux à parede (cm)', unit: 'cm' },
        { k: 'dom', t: 'sel', label: 'Pé dominante (o que chuta uma bola)', opts: ['', 'Direito', 'Esquerdo'] },
        { k: 'proto', t: 'sel', label: 'Protocolo compatível com a referência (hálux–parede, calcanhar apoiado, joelho toca a parede)?', opts: ['', 'Sim', 'Não'] },
        { k: 'apoio', t: 'sel', label: 'Apoio das mãos na parede', opts: ['', 'Sem apoio', 'Apoio leve para equilíbrio'] },
        { k: 'ang', t: 'n2', label: 'Inclinação da tíbia (°), se medida', unit: '°' },
        { k: 'calc', t: 'bi', label: 'Calcanhar sai do chão antes do fim' },
        { k: 'pinc', t: 'bi', label: 'Desconforto ou pinçamento na frente do tornozelo' },
        { k: 'dor', t: 'sel2', label: 'Dor', opts: DOR },
      ],
    },
    {
      id: 'thomas', nome: 'Thomas modificado',
      protocolo: 'Deitado na ponta da maca, abraçar um joelho ao peito e deixar a outra perna pendente. Observar posição da coxa e do joelho da perna que fica pendente, dos dois lados. Sem controle da pelve, só a posição observada é segura: entre o Thomas e a extensão real do quadril, os limites de concordância foram de cerca de ±19° (Vigotsky et al., 29 adultos).',
      campos: [
        { k: 'quadril', t: 'n2', label: 'Coxa em relação à horizontal (0 = horizontal; + abaixo do plano da maca; − acima)', unit: '°', sinal: true },
        { k: 'joelho', t: 'n2', label: 'Flexão do joelho (0 = extensão completa)', unit: '°' },
        { k: 'ctrl_pelve', t: 'sel', label: 'Controle da pelve durante o teste', opts: ['', 'Controlada e verificada', 'Não controlada', 'Não verificada'] },
        { k: 'instr', t: 'txt', label: 'Instrumento e marcos (ex.: goniômetro; trocânter, côndilo lateral, maléolo)' },
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

  // McBride et al., Musculoskelet Sci Pract 2026 (899 adultos), Tabela 2, coluna "Normal" = P25–P75, pé dominante, cm.
  // Origem: transcrição de documento conferido pelo Pedro em 11/11/2026; NÃO reconferida no artigo (acesso pago).
  const WBLT_REF = {
    M: [[18, 29, 8.0, 13.2], [30, 39, 8.8, 14.0], [40, 49, 8.0, 14.0], [50, 59, 7.5, 13.8], [60, 69, 7.0, 10.6], [70, 79, 5.8, 9.9], [80, 200, 5.0, 8.0]],
    F: [[18, 29, 9.8, 12.8], [30, 39, 9.8, 13.8], [40, 49, 8.6, 13.0], [50, 59, 7.5, 11.5], [60, 69, 7.0, 9.0], [70, 79, 5.0, 8.0], [80, 200, 5.0, 6.2]],
  };
  // Chisholm et al.: MDC90 teste–reteste do escore bilateral (lado não afetado − afetado), 37 pacientes com lesão de tornozelo; Tabela 2 (conferida em 11/11/2026).
  const ERRO_WBLT = 'Joelho na parede: erro teste–reteste de referência para a diferença entre os lados, MDC90 de Chisholm et al. (pacientes com lesão de tornozelo): 1,2 a 1,3 cm; vale só para procedimento comparável e não mede relevância funcional.';
  // Posição do valor (cm) frente à faixa P25–P75 do estrato; extremos publicados ficam na faixa central (convenção de apresentação).
  function wbltRef(sexo, idade, cm) {
    const k = sexo === 'Masculino' ? 'M' : sexo === 'Feminino' ? 'F' : null;
    if (!k || idade == null || idade < 18 || cm == null) return null;
    const r = WBLT_REF[k].find((x) => idade >= x[0] && idade <= x[1]);
    if (!r) return null;
    const faixa = r[1] >= 80 ? '80+' : r[0] + '–' + r[1];
    return { sexo: k === 'M' ? 'homens' : 'mulheres', faixa, lo: r[2], hi: r[3], pos: cm < r[2] ? 'abaixo de P25' : cm > r[3] ? 'acima de P75' : 'na faixa central P25–P75' };
  }
  // Contexto para as referências por idade e sexo: aluno e data da avaliação (AAAA-MM-DD).
  function ctxOf(s, data) {
    let idade = null;
    if (s && s.nascimento && data) {
      const n = new Date(s.nascimento + 'T00:00:00'), d = new Date(data + 'T00:00:00');
      if (!isNaN(n) && !isNaN(d)) { idade = d.getFullYear() - n.getFullYear(); if (d.getMonth() < n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() < n.getDate())) idade--; }
    }
    return { sexo: (s && s.sexo) || '', idade };
  }

  const fmtN = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  const num = (v) => { const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; };
  const sidesText = (o) => (o.D && o.E ? 'ambos os lados' : o.D ? 'lado direito' : 'lado esquerdo');

  // Resumo para o laudo e para a comparação. mov = { t: { testId: { campo: valor } }, livres: [...] }
  function summarize(mov, ctx) {
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
            if (D != null && E != null) { const df = Math.abs(D - E), mx = Math.max(Math.abs(D), Math.abs(E)); s += ` · diferença ${fmtN(df)} ${c.unit}${mx && !c.sinal ? ` (${fmtN((df / mx) * 100)}%)` : ''}`; metrics.push({ key: t.id + '.' + c.k, label: `${t.nome}: ${c.label}`, unit: c.unit, D, E }); }
            lines.push(s);
          }
        } else if (c.t === 'tri') {
          const side = (s) => (v && v[s] ? v[s].map(num).filter((x) => x != null) : []);
          const [dD, dE] = [side('D'), side('E')];
          if (dD.length || dE.length) {
            const f = (a) => (a.length ? `${a.map(fmtN).join(' / ')} (máx. ${fmtN(Math.max(...a))}, média ${fmtN(a.reduce((x, y) => x + y, 0) / a.length)})` : '—');
            let s = `${c.label}: direito ${f(dD)} · esquerdo ${f(dE)}`;
            if (dD.length && dE.length) { const D = Math.max(...dD), E = Math.max(...dE); s += ` · diferença entre os máximos ${fmtN(Math.abs(D - E))} ${c.unit}`; metrics.push({ key: t.id + '.' + c.k, label: `${t.nome}: ${c.label} (máx.)`, unit: c.unit, D, E, erro: t.id === 'jpar' ? ERRO_WBLT : undefined }); }
            lines.push(s);
          }
        }
      });
      if (t.id === 'stepdown' && /^Lateral/.test(d.variante || '')) {
        const marc = ['mao', 'tronco', 'pelve', 'jo2', 'jo3', 'equil'].some((k) => d[k] && (d[k].D || d[k].E));
        const sc = (sd) => ['mao', 'tronco', 'pelve', 'equil'].reduce((n, k) => n + (d[k] && d[k][sd] ? 1 : 0), 0) + (d.jo3 && d.jo3[sd] ? 2 : d.jo2 && d.jo2[sd] ? 1 : 0);
        if (d.visib === 'Sim') {
          lines.push(`Escore de Piva/Rabin (lateral, 0–6): direito ${sc('D')} · esquerdo ${sc('E')} — escala observacional, sem diagnóstico nem risco de lesão; vale para a versão registrada (altura ${num(d.altura) != null ? fmtN(num(d.altura)) + ' cm' : 'não informada'}).`);
          metrics.push({ key: 'stepdown.piva', label: 'Step-down lateral: escore de Piva/Rabin', unit: 'pontos', D: sc('D'), E: sc('E') });
        } else if (marc) lines.push('Escore de Piva/Rabin não calculado: só com todos os itens observáveis nos dois lados; valem os itens marcados acima.');
      }
      if (t.id === 'jpar' && (d.dom || d.proto)) {
        const tr = d.dist && d.dom ? d.dist[d.dom === 'Direito' ? 'D' : 'E'] : null;
        const vals = tr ? tr.map(num).filter((x) => x != null) : [];
        const ref = d.proto === 'Sim' && vals.length && ctx ? wbltRef(ctx.sexo, ctx.idade, Math.max(...vals)) : null;
        if (ref) lines.push(`Referência populacional (McBride et al., 2026; ${ref.sexo} de ${ref.faixa} anos; P25–P75 do pé dominante): ${fmtN(Math.max(...vals))} cm no pé ${d.dom.toLowerCase()} — ${ref.pos} (${fmtN(ref.lo)}–${fmtN(ref.hi)} cm). Comparação descritiva, não classificação de risco.`);
        else lines.push('Comparação com a referência de McBride não aplicada: precisa de pé dominante, protocolo compatível, medidas desse pé, sexo (feminino ou masculino) e idade de 18 anos ou mais no cadastro.');
      }
      if (t.id === 'thomas' && d.quadril && (num(d.quadril.D) != null || num(d.quadril.E) != null) && d.ctrl_pelve !== 'Controlada e verificada') lines.push('Controle da pelve não confirmado: a posição da coxa é descrita como observada e a estimativa quantitativa da extensão do quadril fica inconclusiva.');
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

  return { TESTS, DOR, CTRL, summarize, wbltRef, ctxOf };
});
