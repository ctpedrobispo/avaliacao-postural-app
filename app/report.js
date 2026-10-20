// Gera o laudo de avaliação postural (HTML para imprimir ou salvar em PDF).
// Estrutura inspirada no relatório do APECS (uma página por vista, tabela e miniaturas por medida),
// com as regras do Manual de Avaliação Postural e Fotogrametria e do complemento técnico.
/* global Angles */
(function (root) {
  'use strict';

  const LIMITACOES = [
    'A fotografia registra a postura adotada naquele momento, em apoio estático. Não representa automaticamente o comportamento durante movimento, corrida ou exercício.',
    'Os ângulos são medidas de imagem bidimensional, sujeitas a erro de marcação, posicionamento, perspectiva e roupa. Não equivalem a eixo mecânico radiográfico.',
    'Os achados não estabelecem diagnóstico, causa de dor, fraqueza, encurtamento ou risco individual de lesão.',
    'Não existe uma escala angular única para o corpo todo. Cada medida é interpretada pela sua própria referência; sem referência, como valor contínuo.',
    'Comparações entre avaliações só são válidas em condições de aquisição equivalentes e devem considerar o erro de medida.',
    'Achados posturais orientam o treino apenas quando combinados com movimento, sintomas, tarefa e objetivo do aluno.',
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

  async function build({ a, s, prev, perfil, helpers: h }) {
    const { esc, fmtDate } = h;
    const groups = h.allResults(a);
    const imc = s.altura && s.peso ? (+s.peso / Math.pow(+s.altura / 100, 2)).toFixed(1) : '';
    const idade = s.nascimento ? Math.floor((new Date(a.data) - new Date(s.nascimento)) / 3.15576e10) : '';
    const head = `<div class="brandbar"><img src="logo-ct.png" alt="CT Pedro Bispo"><img src="logo-correplus.webp" alt="Corre+ Assessoria para Corredores"></div>
      <div class="head"><div><h1>Avaliação Postural por Fotogrametria</h1><div class="note">Relatório postural — vistas anterior, posterior e laterais</div></div>
      <div class="note" style="text-align:right">Data: <b>${fmtDate(a.data)}</b><br>Avaliador: ${esc(a.avaliador || perfil.nome)}<br>${esc(perfil.cref || '')}</div></div>`;

    let html = `<div class="page">${head}
      <h2>Dados do aluno</h2>
      <table><tr><th>Nome</th><th>Nascimento</th><th>Idade</th><th>Sexo</th><th>Altura</th><th>Peso</th><th>IMC</th></tr>
      <tr><td>${esc(s.nome)}</td><td>${fmtDate(s.nascimento)}</td><td>${idade !== '' ? idade + ' anos' : ''}</td><td>${esc(s.sexo)}</td><td>${s.altura ? esc(s.altura) + ' cm' : ''}</td><td>${s.peso ? esc(s.peso) + ' kg' : ''}</td><td>${imc}</td></tr></table>
      <h2>Condições de aquisição</h2>
      <table>${h.CONDICOES.filter(([k]) => a.condicoes[k]).map(([k, l]) => `<tr><th style="width:35%">${l}</th><td>${esc(a.condicoes[k])}</td></tr>`).join('') || '<tr><td>Não registradas.</td></tr>'}</table>
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
      const full = renderFull(img, g.key, v, h);
      const crops = g.def.measures
        .filter((m) => g.res.find((r) => r.code === m.code))
        .map((m) => ({ m, r: g.res.find((r) => r.code === m.code), src: renderCrop(img, g.key, v, m, h) }));
      html += `<div class="page">${head}
        <h2>${esc(g.def.label)}</h2>
        <div class="view"><img class="full" src="${full}" alt="${esc(g.def.label)}">
        <div><table><tr><th>Código</th><th>Medida</th><th>Valor</th><th>Descrição</th></tr>
        ${g.res.map((r) => `<tr><td>${r.code}</td><td>${esc(r.label)}</td><td><b>${Angles.fmt(r.value)}°</b></td><td>${esc(r.text)}</td></tr>`).join('') || '<tr><td colspan="4">Sem medidas completas.</td></tr>'}
        </table>
        ${v.free.length ? `<p class="note"><b>Ângulos livres:</b> ${v.free.map((f) => `${esc(f.label)} ${Angles.fmt(Angles.angleAt(f.pts[0], f.pts[1], f.pts[2]))}°`).join(' · ')}</p>` : ''}
        ${v.facing ? `<p class="note">Aluno olhando para a ${v.facing === 'dir' ? 'direita' : 'esquerda'} da foto.</p>` : ''}
        </div></div>
        <div class="crops">${crops.map((c) => `<div class="crop"><div><b>${c.m.code}</b> · ${Angles.fmt(c.r.value)}°</div><img src="${c.src}" alt=""><div>${esc(c.m.label)}</div></div>`).join('')}</div>
        <p class="note"><b>Método:</b> ${[...new Set(g.res.map((r) => r.type))].map((t) => esc(Angles.METHOD[t])).join(' ')}</p>
      </div>`;
    }

    html += `<div class="page">${head}`;
    if (prev) html += comparison(a, prev, h);
    const prios = (a.prioridades || []).filter((p) => p.achado);
    html += `<h2>Conduta</h2>
      ${prios.length ? `<table><tr><th>Achado</th><th>Tarefa afetada</th><th>Hipótese</th><th>Ajuste</th><th>Dose / progressão</th><th>Reavaliação</th></tr>
      ${prios.map((p) => `<tr><td>${esc(p.achado)}${p.situacao ? `<br><span class="note">${esc(p.situacao)}</span>` : ''}</td><td>${esc(p.tarefa)}</td><td>${esc(p.hipotese)}</td><td>${esc(p.ajuste)}</td><td>${esc(p.dose)}${p.progressao ? ' · ' + esc(p.progressao) : ''}</td><td>${esc(p.reavaliacao)}</td></tr>`).join('')}</table>`
      : '<p>Nenhuma prioridade registrada: os achados ficam documentados, sem correção obrigatória.</p>'}
      ${a.linguagemSimples ? `<h2>Em linguagem simples</h2><p>${esc(a.linguagemSimples)}</p>` : ''}
      <h2>Limites desta avaliação</h2><ul class="note">${LIMITACOES.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <p class="note">${s.consent && s.consent.ok ? 'Consentimento de uso de imagem registrado em ' + fmtDate(s.consent.data) + '.' : 'Consentimento de uso de imagem não registrado.'}</p>
      ${credenciais(perfil, esc)}
    </div>`;
    return html;
  }

  function summaryTable(groups, a, h) {
    const rows = [];
    groups.forEach((g) => g.res.forEach((r) => {
      const f = h.flagFor(r);
      rows.push(`<tr><td>${r.code}</td><td>${h.esc(g.def.label)}</td><td>${h.esc(r.label)}</td><td><b>${Angles.fmt(r.value)}°</b></td><td>${h.esc(r.text)}</td><td>${h.esc(f.txt)}</td><td>${h.esc(a.conduta[r.code] || '')}</td></tr>`);
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
      let note;
      if (d === 0) note = 'sem diferença numérica';
      else if (ref && ref.erro !== '' && ref.erro != null && !isNaN(+ref.erro)) note = Math.abs(d) > +ref.erro ? `diferença maior que o erro informado (${ref.erro}°)` : `diferença dentro do erro informado (${ref.erro}°)`;
      else { note = 'sem erro de medida informado'; anyNoError = true; }
      rows.push(`<tr><td>${r.code}</td><td>${h.esc(r.label)}</td><td>${Angles.fmt(vOld)}°</td><td>${Angles.fmt(vNow)}°</td><td>${d > 0 ? '+' : ''}${Angles.fmt(d)}°</td><td>${note}</td></tr>`);
    }));
    return `<h2>Comparação com a avaliação de ${h.fmtDate(prev.data)}</h2>
      ${diffCond.length ? `<p class="note"><b>Atenção:</b> condições de aquisição diferentes (${h.esc(diffCond.join(', '))}). A comparação é limitada.</p>` : ''}
      ${rows.length ? `<table><tr><th>Código</th><th>Medida</th><th>Anterior</th><th>Atual</th><th>Diferença</th><th>Interpretação</th></tr>${rows.join('')}</table>` : '<p>Nenhuma medida em comum entre as avaliações.</p>'}
      <p class="note">Valores com sinal (joelho, pé, retropé) são comparados com o sinal. ${anyNoError ? h.esc(NO_ERROR_NOTE) : ''}</p>`;
  }

  function renderFull(img, key, v, h) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    h.drawView(c.getContext('2d'), img, key, v, { s: 1, x: 0, y: 0 }, img.naturalWidth / 650, { grid: true, style: 'apecs' });
    return c.toDataURL('image/jpeg', 0.85);
  }

  function renderCrop(img, key, v, m, h) {
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
    h.drawView(ctx, img, key, v, { s, x: W / 2 - cx * s, y: H / 2 - cy * s }, 1, { grid: false, only: m.code, noLabels: true });
    return c.toDataURL('image/jpeg', 0.85);
  }

  root.Report = { build };
})(typeof self !== 'undefined' ? self : this);
