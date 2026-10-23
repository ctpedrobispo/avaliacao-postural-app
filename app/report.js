// Gera o laudo de avaliação postural (HTML para imprimir ou salvar em PDF).
// Dois tipos: "registro técnico" (completo, para o avaliador) e "relatório do aluno" (resumo em linguagem simples).
// Estrutura inspirada no relatório do APECS (uma página por vista, tabela e miniaturas por medida),
// com as regras do Manual de Avaliação Postural e Fotogrametria e do complemento técnico.
/* global Angles, Mov */
(function (root) {
  'use strict';

  const LIMITACOES = [
    'A fotografia registra a postura adotada naquele momento, em apoio estático. Não representa automaticamente o comportamento durante movimento, corrida ou exercício.',
    'Os ângulos são medidas de imagem bidimensional, sujeitas a erro de marcação, posicionamento, perspectiva e roupa. Não equivalem a eixo mecânico radiográfico.',
    'Os achados não estabelecem diagnóstico, causa de dor, fraqueza, encurtamento ou risco individual de lesão.',
    'Não existe uma escala angular única para o corpo todo. Cada medida é interpretada pela sua própria referência; sem referência, como valor contínuo.',
    'Comparações entre avaliações só são válidas em condições de aquisição equivalentes e devem considerar o erro de medida.',
    'Achados posturais orientam o treino apenas quando combinados com movimento, sintomas, tarefa e objetivo do aluno.',
    'Medidas em cm só existem em fotos calibradas e valem para o plano da calibração. O app não corrige rotação do aluno ou da câmera em torno do eixo vertical nem distorção de perspectiva.',
  ];
  const LIMITES_ALUNO = [
    'As fotos mostram a sua postura em um momento. Não dizem como você se move nem se há doença.',
    'Os números vêm de fotos e têm uma margem de erro. Pequenas diferenças podem ser só da foto.',
    'Nada aqui é diagnóstico. O que fazer com cada achado depende de como você se move, de como se sente e dos seus objetivos.',
  ];

  const PEDRO = {
    nome: 'Pedro de Souza Bispo',
    titulo: 'Profissional de Educação Física — Treinador',
    cref: 'CREF 017067-G/PE (CREF12/PE)',
    formacao: 'Graduação em Educação Física',
    quals: ['Treinamento Funcional', 'Cross Training e Treinamento Multimodal', 'Treinamento para Grupos Especiais — do treinamento à reabilitação', 'Treinamento de Corredores (certificação profissional)'],
    areas: ['Treinamento de força e hipertrofia', 'Preparação física para corredores', 'Treinamento híbrido (força e corrida)', 'Avaliação física, postural e do gesto esportivo', 'Avaliação por bioimpedância', 'Avaliação e prescrição para idosos', 'Gestão de academias e centros de treinamento'],
  };

  function credenciais(perfil, esc) {
    const mesmo = !perfil.nome || perfil.nome.trim() === PEDRO.nome;
    const li = (l) => l.map((x) => '<li>' + esc(x) + '</li>').join('');
    return '<h2>Credenciais profissionais</h2><div class="cred">' +
      '<p><b>' + esc(PEDRO.nome) + '</b> — ' + esc(PEDRO.titulo) + ' · ' + esc(PEDRO.cref) + '<br>' +
      '<span class="note">' + (mesmo ? 'Responsável pelo método, pelo app e por esta avaliação.' : 'Responsável pelo método e pelo app.') + '</span></p>' +
      '<div class="cols"><div><b>Formação:</b> ' + esc(PEDRO.formacao) + '<br><b>Qualificações:</b><ul>' + li(PEDRO.quals) + '</ul></div>' +
      '<div><b>Áreas de atuação:</b><ul>' + li(PEDRO.areas) + '</ul></div></div>' +
      (mesmo ? '' : '<p><b>Avaliador desta avaliação:</b> ' + esc(perfil.nome) + (perfil.cref ? ' · ' + esc(perfil.cref) : '') + '</p>') +
      '<p class="note">CT Pedro Bispo | Corre+ Assessoria para Corredores</p></div>';
  }

  const NO_ERROR_NOTE = 'Houve diferença numérica entre as avaliações, mas a ausência de informação sobre erro de medida impede afirmar com segurança que se trata de mudança real.';

  const validacaoTxt = (a, h) => (a.validado && a.validado.em
    ? 'Marcações conferidas e validadas pelo avaliador em ' + new Date(a.validado.em).toLocaleString('pt-BR') + '.'
    : 'Marcações não validadas pelo avaliador.');
  const consentTxt = (s, h) => (s.consent && s.consent.ok ? 'Consentimento de uso de imagem registrado em ' + h.fmtDate(s.consent.data) + '.' : 'Consentimento de uso de imagem não registrado.');

  function header(a, perfil, h, titulo, sub) {
    return `<div class="brandbar"><img src="logo-ct.png" alt="CT Pedro Bispo"><img src="logo-correplus.webp" alt="Corre+ Assessoria para Corredores"></div>
      <div class="head"><div><h1>${h.esc(titulo)}</h1><div class="note">${h.esc(sub)}</div></div>
      <div class="note" style="text-align:right">Data: <b>${h.fmtDate(a.data)}</b><br>Avaliador: ${h.esc(a.avaliador || perfil.nome)}<br>${h.esc(perfil.cref || '')}</div></div>`;
  }

  async function build({ a, s, prev, history, perfil, opts, helpers: h }) {
    const tipo = (opts && opts.tipo) || 'tecnico';
    const mask = opts ? opts.mascara !== false : true;
    return tipo === 'aluno' ? buildAluno({ a, s, perfil, mask, h }) : buildTecnico({ a, s, prev, history: history || [a], perfil, mask, fotosMov: !!(opts && opts.fotosMov), h });
  }

  // ---------- Relatório do aluno ----------
  async function buildAluno({ a, s, perfil, mask, h }) {
    const { esc } = h;
    const head = header(a, perfil, h, 'Relatório Postural — resumo para você', 'Avaliação postural por fotos');
    const groups = h.allResults(a);
    let imgs = '';
    for (const g of groups) {
      const v = a.views[g.key];
      if (!v.photo) continue;
      const img = await h.loadImg(v.photo);
      imgs += `<div class="crop"><img src="${renderFull(img, g.key, v, h, { style: 'plain', mask })}" alt="${esc(g.def.label)}"><div><b>${esc(g.def.label)}</b></div></div>`;
    }
    const prios = (a.prioridades || []).filter((p) => p.achado);
    return `<div class="page">${head}
      <h2>Aluno</h2><p><b>${esc(s.nome)}</b></p>
      <h2>O que observamos</h2>
      ${a.linguagemSimples ? `<p style="white-space:pre-wrap">${esc(a.linguagemSimples)}</p>` : '<p class="note">O avaliador ainda não escreveu o resumo em linguagem simples (campo na aba "Ficha e conduta").</p>'}
      <h2>O que vamos fazer</h2>
      ${prios.length ? `<table><tr><th>O que chamou a atenção</th><th>O que vamos ajustar</th><th>Como vamos acompanhar</th></tr>
        ${prios.map((p) => `<tr><td>${esc(p.achado)}</td><td>${esc([p.ajuste, p.dose, p.progressao].filter(Boolean).join(' · '))}</td><td>${esc(p.reavaliacao)}</td></tr>`).join('')}</table>`
        : '<p>Nenhum ajuste prioritário por enquanto: os achados ficam registrados para acompanhamento.</p>'}
      <h2>Como ler este relatório</h2><ul class="note">${LIMITES_ALUNO.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    </div>
    <div class="page">${head}<h2>Suas fotos</h2><div class="crops" style="grid-template-columns:repeat(2,1fr)">${imgs || '<p>Sem fotos.</p>'}</div>
      <p class="note">${esc(consentTxt(s, h))} ${esc(validacaoTxt(a, h))}</p>
      ${credenciais(perfil, esc)}
    </div>`;
  }

  // ---------- Registro técnico ----------
  async function buildTecnico({ a, s, prev, history, perfil, mask, fotosMov, h }) {
    const { esc, fmtDate } = h;
    const groups = h.allResults(a);
    const imc = s.altura && s.peso ? (+s.peso / Math.pow(+s.altura / 100, 2)).toFixed(1) : '';
    const idade = s.nascimento ? Math.floor((new Date(a.data) - new Date(s.nascimento)) / 3.15576e10) : '';
    const head = header(a, perfil, h, 'Avaliação Postural por Fotogrametria', 'Registro técnico — vistas anterior, posterior e laterais');
    const chk = h.CHECKLIST.filter(([k]) => a.checklist && a.checklist[k]).length;
    const naoChk = h.CHECKLIST.filter(([k]) => !(a.checklist && a.checklist[k]));
    const cnotes = h.calibNotes(a);
    const rr = h.reproRows(a);

    let html = `<div class="page">${head}
      <h2>Dados do aluno</h2>
      <table><tr><th>Nome</th><th>Nascimento</th><th>Idade</th><th>Sexo</th><th>Altura</th><th>Peso</th><th>IMC</th></tr>
      <tr><td>${esc(s.nome)}</td><td>${fmtDate(s.nascimento)}</td><td>${idade !== '' ? idade + ' anos' : ''}</td><td>${esc(s.sexo)}</td><td>${s.altura ? esc(s.altura) + ' cm' : ''}</td><td>${s.peso ? esc(s.peso) + ' kg' : ''}</td><td>${imc}</td></tr></table>
      <h2>Condições de aquisição</h2>
      <table>${h.CONDICOES.filter(([k]) => a.condicoes[k]).map(([k, l]) => `<tr><th style="width:35%">${l}</th><td>${esc(a.condicoes[k])}</td></tr>`).join('') || '<tr><td>Não registradas.</td></tr>'}</table>
      <p class="note"><b>Checklist de captura:</b> ${chk} de ${h.CHECKLIST.length} itens confirmados.${naoChk.length && chk ? ' Não confirmados: ' + esc(naoChk.map(([, l]) => l).join('; ')) + '.' : ''}</p>
      ${cnotes.length ? `<p class="note"><b>Calibração e captura:</b></p><ul class="note">${cnotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      ${a.observacao ? `<h2>Observação do avaliador</h2><p>${esc(a.observacao)}</p>` : ''}
      ${a.sintomas ? `<h2>Sintomas e dor relatados</h2><p>${esc(a.sintomas)}</p>` : ''}
      ${a.movimento ? `<h2>Movimento e testes complementares</h2><p>${esc(a.movimento)}</p>` : ''}
      <h2>Resumo das medidas</h2>
      ${summaryTable(groups, a, h)}
    </div>`;

    for (const g of groups) {
      const v = a.views[g.key];
      if (!v.photo) continue;
      const img = await h.loadImg(v.photo);
      const full = renderFull(img, g.key, v, h, { style: 'apecs', mask });
      const crops = g.def.measures
        .filter((m) => g.res.find((r) => r.code === m.code && r.unit !== 'cm'))
        .map((m) => ({ m, r: g.res.find((r) => r.code === m.code), src: renderCrop(img, g.key, v, m, h, mask) }));
      html += `<div class="page">${head}
        <h2>${esc(g.def.label)}</h2>
        <div class="view"><img class="full" src="${full}" alt="${esc(g.def.label)}">
        <div><table><tr><th>Código</th><th>Medida</th><th>Valor</th><th>Descrição</th></tr>
        ${g.res.map((r) => `<tr><td>${r.code}</td><td>${esc(r.label)}</td><td><b>${Angles.fmtVal(r)}</b></td><td>${esc(r.text)}</td></tr>`).join('') || '<tr><td colspan="4">Sem medidas completas.</td></tr>'}
        </table>
        ${v.free.some((f) => Angles.freeValue(f)) ? `<p class="note"><b>Ângulos livres:</b> ${v.free.filter((f) => Angles.freeValue(f)).map((f) => `${esc(f.label)} ${Angles.fmt(Angles.freeValue(f).value)}°`).join(' · ')}</p>` : ''}
        ${v.facing ? `<p class="note">Aluno olhando para a ${v.facing === 'dir' ? 'direita' : 'esquerda'} da foto.</p>` : ''}
        </div></div>
        <div class="crops">${crops.map((c) => `<div class="crop"><div><b>${c.m.code}</b> · ${Angles.fmtVal(c.r)}</div><img src="${c.src}" alt=""><div>${esc(c.m.label)}</div></div>`).join('')}</div>
        <p class="note"><b>Método:</b> ${[...new Set(g.res.map((r) => r.type))].map((t) => esc(Angles.METHOD[t])).join(' ')}</p>
      </div>`;
    }

    // Testes de movimento
    const mov = typeof Mov !== 'undefined' ? Mov.summarize(a.mov) : { tests: [], metrics: [] };
    const testNome = (id) => (id === 'livres' ? 'Ângulo livre (foto avulsa)' : typeof Mov !== 'undefined' ? (Mov.TESTS.find((t) => t.id === id) || { nome: id }).nome : id);
    const fotosAng = [];
    Object.entries((a.mov && a.mov.fotos) || {}).forEach(([tid, L]) => (L || []).forEach((f) => {
      const vals = (f.free || []).map((x) => ({ x, fv: Angles.freeValue(x) })).filter((o) => o.fv);
      if (vals.length) fotosAng.push({ tid, f, vals });
    }));
    (a.livres || []).forEach((f) => {
      const vals = (f.free || []).map((x) => ({ x, fv: Angles.freeValue(x) })).filter((o) => o.fv);
      if (vals.length) fotosAng.push({ tid: 'livres', f, vals });
    });
    if (fotosMov) for (const fa of fotosAng) fa.img = await h.freeImage(fa.f.photo, fa.f.free);
    if (mov.tests.length || fotosAng.length) {
      const pm = typeof Mov !== 'undefined' && prev ? Mov.summarize(prev.mov) : { metrics: [] };
      const cmp = mov.metrics.map((m) => {
        const o = pm.metrics.find((x) => x.key === m.key);
        return o ? `<tr><td>${esc(m.label)}</td><td>D ${fmtN(o.D)} · E ${fmtN(o.E)} ${esc(m.unit)}</td><td>D ${fmtN(m.D)} · E ${fmtN(m.E)} ${esc(m.unit)}</td></tr>` : '';
      }).join('');
      html += `<div class="page">${head}<h2>${mov.tests.length ? 'Testes de movimento' : 'Ângulos medidos nas fotos'}</h2>
        <p class="note">Observação visual e medidas simples, sem escala validada própria e sem diagnóstico. Os termos descrevem o que foi visto durante o movimento.</p>
        ${mov.tests.map((t) => `<h3>${esc(t.nome)}</h3><ul>${t.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`).join('')}
        ${fotosAng.length ? `<h3>Ângulos medidos nas fotos dos testes</h3><table><tr><th>Teste</th><th>Foto</th><th>Medida</th><th>Valor</th><th>Tipo</th></tr>
          ${fotosAng.map((fa) => fa.vals.map((o) => `<tr><td>${esc(testNome(fa.tid))}</td><td>${esc(fa.f.nome)}</td><td>${esc(o.x.label)}</td><td><b>${Angles.fmt(o.fv.value)}°</b></td><td>${esc(o.fv.text)}</td></tr>`).join('')).join('')}</table>
          <p class="note">Ângulos de foto: medidas de imagem bidimensional, sujeitas a erro de marcação e de perspectiva. Descrevem o quadro fotografado, não o movimento inteiro.</p>` : ''}
        ${fotosMov && fotosAng.length ? `<div class="crops" style="grid-template-columns:repeat(2,1fr)">${fotosAng.map((fa) => `<div class="crop"><img src="${fa.img}" alt=""><div><b>${esc(testNome(fa.tid))}</b> · ${esc(fa.f.nome)}</div></div>`).join('')}</div>` : ''}
        ${cmp ? `<h3>Comparação com ${fmtDate(prev.data)}</h3><table><tr><th>Medida</th><th>Anterior</th><th>Atual</th></tr>${cmp}</table><p class="note">Sem erro de medida informado para estes testes: a comparação é descritiva.</p>` : ''}
      </div>`;
    }

    // Antes e depois
    if (prev) {
      let ba = '', escalaMsg = true;
      for (const g of groups) {
        const va = a.views[g.key], vp = prev.views[g.key];
        if (!va.photo || !vp.photo) continue;
        const [ia, ip] = [await h.loadImg(va.photo), await h.loadImg(vp.photo)];
        const r = h.beforeAfterCanvas({ img: ip, v: vp, data: prev.data }, { img: ia, v: va, data: a.data }, g.key, { mask });
        if (!r.mesmaEscala) escalaMsg = false;
        ba += `<div class="crop"><div><b>${esc(g.def.label)}</b></div><img src="${r.canvas.toDataURL('image/jpeg', 0.85)}" alt=""></div>`;
      }
      if (ba) {
        html += `<div class="page">${head}<h2>Antes e depois</h2>
          <p class="note">${escalaMsg ? 'Fotos na mesma escala real (calibradas nas duas avaliações).' : 'Sem calibração nas duas fotos de alguma vista: o tamanho foi ajustado pela altura da foto, não pela escala real. Compare com cautela.'}</p>
          <div class="crops" style="grid-template-columns:1fr">${ba}</div></div>`;
      }
    }

    // Evolução ao longo do tempo
    if (history.length >= 2) {
      const rows = [];
      groups.forEach((g) => g.res.forEach((r) => {
        const ser = h.seriesFor(history, r.code);
        if (ser.length >= 2) rows.push({ code: r.code, label: r.label, ser, change: Math.abs(ser[ser.length - 1].value - ser[0].value) });
      }));
      rows.sort((x, y) => y.change - x.change);
      if (rows.length) {
        const dates = history.map((x) => x.data).slice(-6);
        html += `<div class="page">${head}<h2>Evolução das medidas</h2>
          <p class="note">Mudanças só indicam mudança real se superarem o erro de medida (ver referências). Valores com sinal (joelho, pé, retropé) aparecem com o sinal.</p>
          <table><tr><th>Código</th><th>Medida</th>${dates.map((d) => `<th>${fmtDate(d)}</th>`).join('')}</tr>
          ${rows.slice(0, 14).map((r) => `<tr><td>${r.code}</td><td>${esc(r.label)}</td>${dates.map((d) => { const p = r.ser.find((x) => x.data === d); return `<td>${p ? Angles.fmtVal({ value: p.value, unit: p.unit }) : ''}</td>`; }).join('')}</tr>`).join('')}</table>
          <div class="crops" style="grid-template-columns:repeat(2,1fr)">${rows.slice(0, 6).map((r) => `<div class="crop"><img src="${h.chartImage(r.ser, r.code + ' — ' + r.label)}" alt=""></div>`).join('')}</div></div>`;
      }
    }

    html += `<div class="page">${head}`;
    if (prev) html += comparison(a, prev, h);
    if (rr.length) {
      html += `<h2>Repetição da marcação</h2><p class="note">Mesmo avaliador, mesma foto, duas marcações. A diferença mostra o erro de marcação desta avaliação.</p>
        <table><tr><th>Código</th><th>Medida</th><th>Marcação 1</th><th>Marcação 2</th><th>Diferença</th></tr>
        ${rr.map((r) => `<tr><td>${r.code}</td><td>${esc(r.label)}</td><td>${Angles.fmtVal({ value: r.v1, unit: r.unit })}</td><td>${Angles.fmtVal({ value: r.v2, unit: r.unit })}</td><td><b>${Angles.fmtVal({ value: Math.abs(r.d), unit: r.unit })}</b></td></tr>`).join('')}</table>`;
    }
    const prios = (a.prioridades || []).filter((p) => p.achado);
    html += `<h2>Conduta</h2>
      ${prios.length ? `<table><tr><th>Achado</th><th>Tarefa afetada</th><th>Hipótese</th><th>Ajuste</th><th>Dose / progressão</th><th>Reavaliação</th></tr>
      ${prios.map((p) => `<tr><td>${esc(p.achado)}${p.situacao ? `<br><span class="note">${esc(p.situacao)}</span>` : ''}</td><td>${esc(p.tarefa)}</td><td>${esc(p.hipotese)}</td><td>${esc(p.ajuste)}</td><td>${esc(p.dose)}${p.progressao ? ' · ' + esc(p.progressao) : ''}</td><td>${esc(p.reavaliacao)}</td></tr>`).join('')}</table>`
      : '<p>Nenhuma prioridade registrada: os achados ficam documentados, sem correção obrigatória.</p>'}
      ${a.linguagemSimples ? `<h2>Em linguagem simples</h2><p>${esc(a.linguagemSimples)}</p>` : ''}
      <h2>Limites desta avaliação</h2><ul class="note">${LIMITACOES.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <p class="note">${esc(consentTxt(s, h))} ${esc(validacaoTxt(a, h))}</p>
      ${credenciais(perfil, esc)}
    </div>`;
    return html;
  }

  const fmtN = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

  function summaryTable(groups, a, h) {
    const rows = [];
    groups.forEach((g) => g.res.forEach((r) => {
      const f = h.flagFor(r);
      rows.push(`<tr><td>${r.code}</td><td>${h.esc(g.def.label)}</td><td>${h.esc(r.label)}</td><td><b>${Angles.fmtVal(r)}</b></td><td>${h.esc(r.text)}</td><td>${h.esc(f.txt)}</td><td>${h.esc(a.conduta[r.code] || '')}</td></tr>`);
    }));
    if (!rows.length) return '<p>Nenhuma medida completa.</p>';
    return `<table><tr><th>Código</th><th>Vista</th><th>Medida</th><th>Valor</th><th>Descrição</th><th>Referência</th><th>Conduta</th></tr>${rows.join('')}</table>`;
  }

  function comparison(a, prev, h) {
    const cur = h.allResults(a), old = h.allResults(prev);
    const oldMap = {};
    old.forEach((g) => g.res.forEach((r) => (oldMap[r.code] = r)));
    const diffCond = h.CONDICOES.filter(([k]) => a.condicoes[k] && prev.condicoes[k] && a.condicoes[k] !== prev.condicoes[k]).map(([, l]) => l);
    const rows = [];
    let anyNoError = false;
    cur.forEach((g) => g.res.forEach((r) => {
      const o = oldMap[r.code];
      if (!o) return;
      const vNow = r.signed != null ? r.signed : r.value;
      const vOld = o.signed != null ? o.signed : o.value;
      const d = Angles.round1(vNow - vOld);
      const ref = h.refFor(r.code);
      const un = r.unit === 'cm' ? ' cm' : '°';
      let note;
      if (d === 0) note = 'sem diferença numérica';
      else if (ref && ref.erro !== '' && ref.erro != null && !isNaN(+ref.erro)) note = Math.abs(d) > +ref.erro ? `diferença maior que o erro informado (${ref.erro}${un})` : `diferença dentro do erro informado (${ref.erro}${un})`;
      else { note = 'sem erro de medida informado'; anyNoError = true; }
      rows.push(`<tr><td>${r.code}</td><td>${h.esc(r.label)}</td><td>${Angles.fmtVal({ value: vOld, unit: r.unit })}</td><td>${Angles.fmtVal({ value: vNow, unit: r.unit })}</td><td>${d > 0 ? '+' : ''}${Angles.fmtVal({ value: d, unit: r.unit })}</td><td>${note}</td></tr>`);
    }));
    return `<h2>Comparação com a avaliação de ${h.fmtDate(prev.data)}</h2>
      ${diffCond.length ? `<p class="note"><b>Atenção:</b> condições de aquisição diferentes (${h.esc(diffCond.join(', '))}). A comparação é limitada.</p>` : ''}
      ${rows.length ? `<table><tr><th>Código</th><th>Medida</th><th>Anterior</th><th>Atual</th><th>Diferença</th><th>Interpretação</th></tr>${rows.join('')}</table>` : '<p>Nenhuma medida em comum entre as avaliações.</p>'}
      <p class="note">Valores com sinal (joelho, pé, retropé) são comparados com o sinal. ${anyNoError ? h.esc(NO_ERROR_NOTE) : ''}</p>`;
  }

  function renderFull(img, key, v, h, o) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    h.drawView(c.getContext('2d'), img, key, v, { s: 1, x: 0, y: 0 }, img.naturalWidth / 650, { grid: !(o && o.style === 'plain'), style: (o && o.style) || 'apecs', mask: o && o.mask, noLabels: !!(o && o.style === 'plain') });
    return c.toDataURL('image/jpeg', 0.85);
  }

  function renderCrop(img, key, v, m, h, mask) {
    const line = Angles.geometry(m, v.pts)[0];
    const xs = line.map((p) => p.x), ys = line.map((p) => p.y);
    let w = Math.max(...xs) - Math.min(...xs), hh = Math.max(...ys) - Math.min(...ys);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    w = Math.max(w * 1.5, img.naturalWidth * 0.22);
    hh = Math.max(hh * 1.5, w * 0.75);
    w = Math.max(w, hh / 0.75);
    const W = 400, H = 300, s = W / w;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    h.drawView(ctx, img, key, v, { s, x: W / 2 - cx * s, y: H / 2 - cy * s }, 1, { grid: false, only: m.code, noLabels: true, mask });
    return c.toDataURL('image/jpeg', 0.85);
  }

  root.Report = { build };
})(typeof self !== 'undefined' ? self : this);
