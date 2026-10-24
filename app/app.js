// App de avaliação postural por fotos — uso no iPad (Safari), dados só no aparelho.
/* global Angles, Report */
(function () {
  'use strict';

  // ---------- Armazenamento local (IndexedDB) ----------
  const DB = (() => {
    let dbp;
    const open = () =>
      (dbp = dbp || new Promise((res, rej) => {
        const r = indexedDB.open('avaliacao-postural', 1);
        r.onupgradeneeded = () => ['students', 'assessments', 'settings'].forEach((s) => r.result.createObjectStore(s, { keyPath: 'id' }));
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }));
    const run = async (store, mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction(store, mode);
        const rq = fn(t.objectStore(store));
        t.oncomplete = () => res(rq && rq.result);
        t.onerror = () => rej(t.error);
      });
    };
    return {
      all: (s) => run(s, 'readonly', (st) => st.getAll()),
      get: (s, id) => run(s, 'readonly', (st) => st.get(id)),
      put: (s, v) => run(s, 'readwrite', (st) => st.put(v)),
      del: (s, id) => run(s, 'readwrite', (st) => st.delete(id)),
    };
  })();

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el = document) => el.querySelector(sel);
  const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '');
  const VIEW_KEYS = ['ant', 'post', 'latD', 'latE'];

  const CONSENT_TEXT =
    'Autorizo a captura e o armazenamento das minhas fotografias e medidas posturais para fins de avaliação física e planejamento do treinamento. ' +
    'As imagens ficam guardadas no aparelho do avaliador, não são publicadas e podem ser apagadas a meu pedido.';

  const CLASSES = {
    A: 'Classe A — clínico ou consensual',
    B: 'Classe B — populacional',
    C: 'Classe C — alvo operacional interno',
    D: 'Classe D — sem ponto de corte (valor contínuo)',
  };

  const CONDUTA = ['', 'Documentar', 'Monitorar', 'Teste complementar', 'Modificar o treinamento', 'Encaminhar'];
  const SITUACOES = [
    '',
    'A — achado isolado, sem sintoma ou limitação: documentar',
    'B — coleta inconsistente: repetir antes de decidir',
    'C — menor amplitude com dificuldade na tarefa-alvo: testar variação e acompanhar',
    'D — dificuldade só sob carga ou fadiga: registrar a condição e progredir',
    'E — dor ou perda de função: avaliar encaminhamento',
  ];
  const AVOID_TERMS = /prever les|prevê les|previsão de les|músculo (?:fraco|encurtado)|corte universal|diagnóstico funcional|\bnormal\b|valgo|varo|genu|escoliose|hiperlordose|hipercifose|retificaç|pé plano|pe plano|pé cavo|hiperprona|encurtad|fraqueza|risco de lesão|palmilha/i;

  const CONDICOES = [
    ['camera', 'Câmera / aparelho'], ['lente', 'Lente / zoom'], ['distancia', 'Distância câmera–aluno (m)'],
    ['altura', 'Altura da câmera (m)'], ['base', 'Base / marcação dos pés'], ['roupa', 'Roupa'],
    ['marcadores', 'Marcadores na pele'], ['horario', 'Horário'], ['calcado', 'Calçado'], ['aquisicoes', 'Aquisições por vista'],
  ];

  let state = { refs: [], perfil: {} };

  async function loadSettings() {
    const refs = await DB.get('settings', 'refs');
    const perfil = await DB.get('settings', 'perfil');
    state.refs = refs ? refs.rows : [];
    state.pin = (await DB.get('settings', 'pin')) || null;
    state.perfil = perfil || { id: 'perfil', nome: 'Pedro de Souza Bispo', cref: 'CREF 017067-G/PE' };
  }

  // ---------- Navegação ----------
  const main = $('#main');
  const backBtn = $('#nav-back');
  let backTo = null;
  function setHeader(title, back) {
    $('#title').textContent = title;
    backTo = back || null;
    backBtn.hidden = !back;
  }
  backBtn.onclick = () => backTo && backTo();
  $('#nav-refs').onclick = () => showRefs();
  $('#nav-backup').onclick = () => showBackup();
  $('#nav-sec').onclick = () => showSecurity();

  // ---------- Alunos ----------
  async function showHome() {
    ED.active = false;
    setHeader('Avaliação Postural');
    const students = (await DB.all('students')).sort((a, b) => a.nome.localeCompare(b.nome));
    main.innerHTML = `
      <div class="card">
        <div class="row" style="justify-content:space-between"><h2>Alunos</h2><div class="row"><button id="guia">Guia de fotos para o aluno</button><button class="primary" id="new">+ Novo aluno</button></div></div>
        <input id="q" placeholder="Buscar aluno" style="margin-bottom:8px">
        <div class="list" id="list">${students.map((s) => `<a href="#" data-id="${s.id}" data-n="${esc(s.nome.toLowerCase())}"><b>${esc(s.nome)}</b><br><span class="muted">${s.consent && s.consent.ok ? 'Consentimento registrado' : 'Sem consentimento registrado'}</span></a>`).join('') || '<p class="muted">Nenhum aluno cadastrado.</p>'}</div>
      </div>
      <p class="muted">Os dados e as fotos ficam guardados só neste aparelho. Faça uma cópia de segurança com frequência.</p>`;
    $('#new').onclick = () => showStudentForm();
    $('#guia').onclick = () => showStudentGuide(showHome);
    $('#q').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      main.querySelectorAll('#list a').forEach((a) => (a.style.display = a.dataset.n.includes(q) ? '' : 'none'));
    };
    main.querySelectorAll('#list a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); showStudent(a.dataset.id); }));
  }

  async function showStudentForm(id) {
    const s = id ? await DB.get('students', id) : { id: uid(), nome: '', nascimento: '', sexo: '', altura: '', peso: '', obs: '', consent: { ok: false } };
    setHeader(id ? 'Editar aluno' : 'Novo aluno', id ? () => showStudent(id) : showHome);
    main.innerHTML = `
      <div class="card"><h2>${id ? 'Editar aluno' : 'Novo aluno'}</h2>
        <div class="grid2">
          <div><label>Nome</label><input id="nome" value="${esc(s.nome)}"></div>
          <div><label>Data de nascimento</label><input id="nascimento" type="date" value="${esc(s.nascimento)}"></div>
          <div><label>Sexo</label><select id="sexo">${['', 'Feminino', 'Masculino', 'Outro'].map((o) => `<option ${o === s.sexo ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div><label>Altura (cm)</label><input id="altura" inputmode="decimal" value="${esc(s.altura)}"></div>
          <div><label>Peso (kg)</label><input id="peso" inputmode="decimal" value="${esc(s.peso)}"></div>
        </div>
        <label>Observações (objetivo, modalidade, histórico relevante)</label><textarea id="obs">${esc(s.obs)}</textarea>
        <h3>Consentimento de imagem</h3>
        <p class="muted">${esc(CONSENT_TEXT)}</p>
        <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="cok" style="width:auto" ${s.consent.ok ? 'checked' : ''}> O aluno leu e concordou</label>
        <label>Data do consentimento</label><input id="cdata" type="date" value="${esc(s.consent.data || today())}">
        <div class="row" style="margin-top:14px"><button class="primary" id="save">Salvar</button>${id ? '<button class="danger" id="del">Apagar aluno e avaliações</button>' : ''}</div>
      </div>`;
    $('#save').onclick = async () => {
      const nome = $('#nome').value.trim();
      if (!nome) return alert('Informe o nome do aluno.');
      Object.assign(s, { nome, nascimento: $('#nascimento').value, sexo: $('#sexo').value, altura: $('#altura').value.replace(',', '.'), peso: $('#peso').value.replace(',', '.'), obs: $('#obs').value });
      s.consent = $('#cok').checked ? { ok: true, data: $('#cdata').value, texto: CONSENT_TEXT } : { ok: false };
      await DB.put('students', s);
      showStudent(s.id);
    };
    if (id) $('#del').onclick = async () => {
      if (!confirm('Apagar o aluno e todas as avaliações e fotos dele? Isso não pode ser desfeito.')) return;
      for (const a of (await DB.all('assessments')).filter((x) => x.studentId === id)) await DB.del('assessments', a.id);
      await DB.del('students', id);
      showHome();
    };
  }

  async function showStudent(id) {
    ED.active = false;
    const s = await DB.get('students', id);
    const list = (await DB.all('assessments')).filter((a) => a.studentId === id).sort((a, b) => b.data.localeCompare(a.data));
    setHeader(s.nome, showHome);
    main.innerHTML = `
      <div class="card">
        <div class="row" style="justify-content:space-between"><h2>${esc(s.nome)}</h2><div class="row"><button id="guia">Guia de fotos</button><button id="edit">Editar dados</button></div></div>
        <p class="muted">${s.nascimento ? 'Nascimento: ' + fmtDate(s.nascimento) + ' · ' : ''}${s.altura ? 'Altura: ' + esc(s.altura) + ' cm · ' : ''}${s.peso ? 'Peso: ' + esc(s.peso) + ' kg' : ''}</p>
        <p class="${s.consent.ok ? 'muted' : 'warn'}">${s.consent.ok ? 'Consentimento de imagem registrado em ' + fmtDate(s.consent.data) : 'Sem consentimento de imagem: registre antes de fotografar.'}</p>
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><h2>Avaliações</h2><button class="primary" id="nova" ${s.consent.ok ? '' : 'disabled'}>+ Nova avaliação</button></div>
        <div class="list">${list.map((a) => `<a href="#" data-id="${a.id}"><b>${fmtDate(a.data)}</b> <span class="muted">· ${VIEW_KEYS.filter((k) => a.views[k].photo).length} de 4 vistas com foto</span></a>`).join('') || '<p class="muted">Nenhuma avaliação.</p>'}</div>
      </div>`;
    $('#edit').onclick = () => showStudentForm(id);
    $('#guia').onclick = () => showStudentGuide(() => showStudent(id));
    $('#nova').onclick = async () => {
      const a = newAssessment(id);
      await DB.put('assessments', a);
      openEditor(a.id, 'home');
    };
    main.querySelectorAll('.list a').forEach((el) => (el.onclick = (e) => { e.preventDefault(); openEditor(el.dataset.id, 'home'); }));
  }

  function newAssessment(studentId) {
    const views = {};
    VIEW_KEYS.forEach((k) => (views[k] = { photo: null, pts: {}, pts2: {}, free: [], facing: Angles.VIEWS[k].defaultFacing || null, plumbX: null, calib: null, captureTilt: null }));
    return {
      id: uid(), studentId, data: today(), avaliador: state.perfil.nome, views,
      condicoes: {}, sintomas: '', movimento: '', observacao: '', linguagemSimples: '',
      conduta: {}, prioridades: [], comparar: '',
      checklist: {}, mascara: true, tipoLaudo: 'tecnico', validado: null,
    };
  }

  // Avaliações antigas não têm os campos novos: completa com padrões.
  function normalize(a) {
    a.checklist = a.checklist || {};
    a.livres = a.livres || [];
    if (a.mascara === undefined) a.mascara = true;
    a.tipoLaudo = a.tipoLaudo || 'tecnico';
    if (a.validado === undefined) a.validado = null;
    VIEW_KEYS.forEach((k) => {
      const v = a.views[k];
      if (!v.pts2) v.pts2 = {};
      if (v.calib === undefined) v.calib = null;
      if (v.captureTilt === undefined) v.captureTilt = null;
    });
    return a;
  }
  // Conjunto de pontos em edição: marcação 1 (principal) ou marcação 2 (repetição para medir o erro).
  const pset = (v) => (ED.mark === 2 ? (v.pts2 = v.pts2 || {}) : v.pts);
  // Qualquer mudança nos pontos ou na calibração derruba a validação do avaliador.
  function invalidate() { if (ED.a && ED.a.validado) ED.a.validado = null; }

  // ---------- Editor ----------
  const ED = { active: false, undo: [], pend: null, mark: 1, calibTmp: null, a: null, s: null, tab: 'ant', img: null, sel: null, tool: 'mark', tf: { s: 1, x: 0, y: 0 }, grid: true, plumb: true, guide: true, ptrs: new Map(), drag: null, pinch: null, freeTmp: null, loupe: null };
  let saveTimer;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => DB.put('assessments', ED.a), 400); };

  async function openEditor(id, tab) {
    ED.a = normalize(await DB.get('assessments', id));
    ED.mark = 1;
    ED.undo = [];
    ED.pend = null;
    ED.s = await DB.get('students', ED.a.studentId);
    ED.active = true;
    setHeader(ED.s.nome + ' · ' + fmtDate(ED.a.data), () => showStudent(ED.s.id));
    renderTab(tab || 'home');
  }

  function tabsHtml() {
    const t = [['home', 'Início'], ['ant', 'Anterior'], ['post', 'Posterior'], ['latD', 'Lateral D'], ['latE', 'Lateral E'], ['res', 'Resultados'], ['evol', 'Evolução'], ['mov', 'Movimento'], ['livres', 'Ângulos livres'], ['ficha', 'Ficha e conduta'], ['laudo', 'Laudo']];
    return `<div class="tabs">${t.map(([k, l]) => `<button data-tab="${k}" class="${ED.tab === k ? 'primary' : ''}">${l}</button>`).join('')}</div>`;
  }

  function renderTab(tab) {
    ED.tab = tab;
    ED.sel = null;
    ED.freeTmp = null;
    ED.tool = 'mark';
    if (tab !== 'res') ED.onlyView = null;
    if (ED.stopAnim) { ED.stopAnim(); ED.stopAnim = null; }
    if (VIEW_KEYS.includes(tab)) renderView(tab);
    else if (tab === 'home') renderInicio();
    else if (tab === 'res') renderResults();
    else if (tab === 'evol') renderEvol();
    else if (tab === 'mov') renderMov();
    else if (tab === 'livres') renderLivres();
    else if (tab === 'ficha') renderFicha();
    else renderLaudo();
    bindTabs();
  }
  const bindTabs = () => main.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => renderTab(b.dataset.tab)));

  // ---------- Início da avaliação: cartões por modo ----------
  const LICON = {
    postura: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="9" r="5"/><path d="M32 14v22M20 20h24M32 36l-8 22M32 36l8 22"/><circle cx="20" cy="20" r="1.6" fill="currentColor"/><circle cx="44" cy="20" r="1.6" fill="currentColor"/><circle cx="25" cy="36" r="1.6" fill="currentColor"/><circle cx="39" cy="36" r="1.6" fill="currentColor"/></svg>',
    rapida: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="6" width="36" height="52" rx="5"/><circle cx="32" cy="18" r="4"/><path d="M32 22v14M24 27h16M32 36l-6 14M32 36l6 14"/><circle cx="32" cy="29" r="9" stroke-dasharray="3 4"/></svg>',
    angulos: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 50L40 20M12 50h42"/><path d="M26 50a14 14 0 0 0-6-12" /><circle cx="12" cy="50" r="3" fill="currentColor"/><circle cx="40" cy="20" r="3" fill="currentColor"/><circle cx="54" cy="50" r="3" fill="currentColor"/></svg>',
    movimento: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="26" cy="12" r="5"/><path d="M26 17l6 14 14 4M32 31l-8 8 10 6M20 22l-8-10M36 22l8-10M8 56h48"/></svg>',
    importar: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="48" height="32" rx="4"/><circle cx="22" cy="24" r="4"/><path d="M8 38l14-10 10 8 8-6 16 12M32 50v8M26 54l6 6 6-6"/></svg>',
    resultados: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 54V10M10 54h46M18 44l12-14 8 8 14-18"/></svg>',
    evolucao: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="20" height="40" rx="3"/><rect x="36" y="12" width="20" height="40" rx="3"/><path d="M30 32h4M32 30l2 2-2 2"/></svg>',
    ficha: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="8" width="40" height="48" rx="4"/><path d="M20 22h24M20 32h24M20 42h14"/></svg>',
    laudo: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 6h22l12 12v40H16z"/><path d="M38 6v12h12M24 32h18M24 42h18"/></svg>',
  };

  function renderInicio() {
    const a = ED.a;
    const fotos = VIEW_KEYS.filter((k) => a.views[k].photo).length;
    const marcadas = VIEW_KEYS.filter((k) => Object.keys(a.views[k].pts).length).length;
    const nMov = (typeof Mov !== 'undefined' ? Mov.summarize(a.mov).tests.length : 0) + Object.values((a.mov && a.mov.fotos) || {}).reduce((n, l) => n + (l || []).length, 0);
    const nLiv = (a.livres || []).length;
    const big = [
      ['postura', 'Postura completa', `${fotos} de 4 vistas com foto · ${marcadas} marcadas`, () => renderTab('ant')],
      ['rapida', 'Análise rápida', 'Uma vista, em poucos toques', startQuick],
      ['angulos', 'Amplitude e ângulos', nLiv ? `${nLiv} foto(s) com ângulos livres` : 'Meça qualquer ângulo em qualquer foto', () => renderTab('livres')],
      ['importar', 'Importar fotos do aluno', 'Até 4 fotos de uma vez, uma por vista', importFotos],
      ['movimento', 'Testes de movimento', nMov ? `${nMov} registro(s)` : 'Agachamento overhead, step-down e outros', () => renderTab('mov')],
    ];
    const small = [
      ['resultados', 'Resultados', 'res'], ['evolucao', 'Evolução', 'evol'], ['ficha', 'Ficha e conduta', 'ficha'], ['laudo', 'Laudo', 'laudo'],
    ];
    main.innerHTML = `${tabsHtml()}
      <div class="launch">${big.map(([k, t, s], i) => `<button class="lcard" data-lbig="${i}"><span class="lic">${LICON[k]}</span><b>${esc(t)}</b><small>${esc(s)}</small></button>`).join('')}</div>
      <div class="launch small">${small.map(([k, t], i) => `<button class="lcard" data-lsm="${i}"><span class="lic">${LICON[k]}</span><b>${esc(t)}</b></button>`).join('')}</div>`;
    main.querySelectorAll('[data-lbig]').forEach((b) => (b.onclick = () => big[+b.dataset.lbig][3]()));
    main.querySelectorAll('[data-lsm]').forEach((b) => (b.onclick = () => renderTab(small[+b.dataset.lsm][2])));
  }

  // Janela simples por cima de tudo.
  function showSheet(html) {
    const el = document.createElement('div');
    el.className = 'sheet';
    el.innerHTML = `<div class="box">${html}</div>`;
    document.body.appendChild(el);
    el.close = () => el.remove();
    return el;
  }

  // Análise rápida: uma vista, da foto ao resultado.
  function startQuick() {
    const sh = showSheet(`<h2>Análise rápida</h2><p class="muted">Escolha a vista. O app pede a foto, abre o corte e a marcação, e mostra só o resultado dela.</p>
      <div class="col">${VIEW_KEYS.map((k) => `<button data-q="${k}"><b>${esc(Angles.VIEWS[k].label)}</b>${ED.a.views[k].photo ? '<small>já tem foto: pode marcar nela ou trocar</small>' : ''}</button>`).join('')}<button data-q="x">Cancelar</button></div>`);
    sh.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
      const key = b.dataset.q;
      if (key === 'x') return sh.close();
      const v = ED.a.views[key];
      const pickPhoto = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => { if (inp.files[0]) { ED.quickView = key; loadPhoto(key, inp.files[0], { thenMark: true }); } };
        inp.click();
      };
      if (v.photo) {
        sh.querySelector('.box').innerHTML = `<h2>${esc(Angles.VIEWS[key].label)}</h2><div class="col"><button class="primary" data-w="mark">Marcar na foto atual</button><button data-w="new">Escolher ou tirar outra foto</button><button data-w="x">Cancelar</button></div>`;
        sh.querySelector('[data-w="mark"]').onclick = () => { sh.close(); ED.quickView = key; renderTab(key); openMarker(key, 1); };
        sh.querySelector('[data-w="new"]').onclick = () => { pickPhoto(); sh.close(); };
        sh.querySelector('[data-w="x"]').onclick = () => sh.close();
      } else { pickPhoto(); sh.close(); }
    }));
  }

  // ---------- Vista: página de resumo (a marcação acontece em tela cheia) ----------
  const isOptional = (p) => /^opcional/.test(p[2] || '');

  function renderView(key) {
    const def = Angles.VIEWS[key];
    const v = ED.a.views[key];
    const total = def.points.length;
    const reqTotal = def.points.filter((p) => !isOptional(p)).length;
    const done1 = def.points.filter(([id]) => v.pts[id]).length;
    const req1 = def.points.filter((p) => !isOptional(p) && v.pts[p[0]]).length;
    const done2 = def.points.filter(([id]) => v.pts2 && v.pts2[id]).length;
    const fl = (v.free || []).map((f) => ({ f, fv: Angles.freeValue(f) }));
    const c = v.calib;
    main.innerHTML = `${tabsHtml()}
      <div class="viewpage">
        <div class="card vp-photo">
          ${v.photo ? '<canvas id="vp-cv"></canvas>' : `<div class="vp-empty">Sem foto da vista ${esc(def.label.toLowerCase())}.<br>Câmera fixa, perpendicular ao aluno, corpo inteiro na foto, pés na base marcada.</div>`}
          <div class="row" style="margin-top:10px">
            <label class="btn" style="margin:0;color:var(--ink)">${v.photo ? 'Trocar foto' : 'Escolher ou tirar foto'}<input type="file" accept="image/*" id="file" hidden></label>
            <button id="cam">Câmera guiada</button>
            ${v.photo ? '<button id="recrop">Cortar ou girar</button>' : ''}
          </div>
        </div>
        <div class="vp-side">
          <div class="card"><h2>Avaliação postural</h2>
            ${def.defaultFacing ? `<label>O aluno está olhando para a</label><select id="facing"><option value="esq" ${v.facing === 'esq' ? 'selected' : ''}>esquerda da foto</option><option value="dir" ${v.facing === 'dir' ? 'selected' : ''}>direita da foto</option></select>` : ''}
            <p class="muted">${req1} de ${reqTotal} pontos obrigatórios · ${done1} de ${total} no total${done2 ? ` · marcação 2: ${done2} pontos` : ''}</p>
            <div class="vp-actions">
              <button class="primary vp-big" id="mk1" ${v.photo ? '' : 'disabled'}>${done1 ? 'Continuar marcação' : 'Marcar pontos'}</button>
              <button id="mk2" ${v.photo && done1 ? '' : 'disabled'}>Repetir marcação (marcação 2)</button>
              <button class="danger" id="mkclr" ${done1 || done2 ? '' : 'disabled'}>Limpar marcação</button>
            </div>
            <p class="muted">A marcação abre em tela cheia, só com a foto e o ponto da vez.</p>
          </div>
          <div class="card"><h2>Calibração</h2>
            ${c ? `<p class="muted">1 cm = ${String(Math.round(c.pxPerCm * 100) / 100).replace('.', ',')} px · referência ${c.orient === 'h' ? 'horizontal' : 'vertical'} de ${esc(c.cm)} cm.${Math.abs(c.rot) >= 0.05 ? ' Foto inclinada ' + Angles.fmt(Math.abs(c.rot)) + '°.' : ''}</p>
              <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="calapply" style="width:auto" ${c.apply !== false ? 'checked' : ''}> Corrigir a inclinação da foto nos ângulos</label>` : '<p class="muted">Sem calibração: sem medidas em cm e sem correção de foto inclinada.</p>'}
            <div class="vp-actions"><button id="cal" ${v.photo ? '' : 'disabled'}>${c ? 'Refazer calibração' : 'Calibrar com fio de prumo'}</button>${c ? '<button class="danger" id="calrm">Remover</button>' : ''}</div>
          </div>
          <div class="card"><h2>Ângulos livres</h2>
            ${fl.length ? fl.map(({ f, fv }) => `<div class="row" style="justify-content:space-between"><span>${esc(f.label)}</span><b>${fv ? Angles.fmt(fv.value) + '°' : 'incompleto'}</b></div>`).join('') : '<p class="muted">Ângulos fora do protocolo, medidos em uma tela separada.</p>'}
            <div class="vp-actions"><button id="openfree" ${v.photo ? '' : 'disabled'}>Abrir ângulos livres</button></div>
          </div>
          <details id="chk" class="card"></details>
        </div>
      </div>`;
    $('#file').onchange = (e) => e.target.files[0] && loadPhoto(key, e.target.files[0]);
    $('#cam').onclick = () => openCamera(key);
    if ($('#recrop')) $('#recrop').onclick = () => {
      if ((Object.keys(v.pts).length || v.calib) && !confirm('Cortar ou girar a foto apaga os pontos e a calibração desta vista. Continuar?')) return;
      openCrop(v.photo, async (out) => {
        v.photo = out; v.pts = {}; v.pts2 = {}; v.auto = false; v.free = []; v.plumbX = null; v.calib = null;
        invalidate(); await DB.put('assessments', ED.a); renderTab(key);
      });
    };
    if (def.defaultFacing) $('#facing').onchange = (e) => { v.facing = e.target.value; invalidate(); saveSoon(); drawPreview(key); };
    $('#mk1').onclick = () => openMarker(key, 1);
    $('#mk2').onclick = () => openMarker(key, 2);
    $('#mkclr').onclick = () => { if (!confirm('Apagar os pontos da marcação 1 e da marcação 2 desta vista?')) return; v.pts = {}; v.pts2 = {}; v.auto = false; invalidate(); saveSoon(); renderTab(key); };
    $('#cal').onclick = () => openCalib(key);
    if ($('#calrm')) $('#calrm').onclick = () => { v.calib = null; invalidate(); saveSoon(); renderTab(key); };
    if ($('#calapply')) $('#calapply').onchange = (e) => { v.calib.apply = e.target.checked; invalidate(); saveSoon(); drawPreview(key); };
    $('#openfree').onclick = () => openFreeFor(key);
    renderChecklist();
    if (v.photo) drawPreview(key);
  }

  // Foto marcada, só para ver (sem toque).
  function drawPreview(key) {
    const v = ED.a.views[key], cvp = $('#vp-cv');
    if (!cvp || !v.photo) return;
    loadImg(v.photo).then((img) => {
      if (!document.body.contains(cvp)) return;
      const card = cvp.parentElement, availW = card.clientWidth - 32, maxH = Math.min(window.innerHeight * 0.62, 760);
      const s = Math.min(availW / img.naturalWidth, maxH / img.naturalHeight);
      const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s)), dpr = window.devicePixelRatio || 1;
      cvp.width = w * dpr; cvp.height = h * dpr; cvp.style.width = w + 'px'; cvp.style.height = h + 'px';
      const c = cvp.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawView(c, img, key, v, { s, x: 0, y: 0 }, 1, { grid: false });
    });
  }
  let previewTimer;
  window.addEventListener('resize', () => { clearTimeout(previewTimer); previewTimer = setTimeout(() => { if (ED.active && VIEW_KEYS.includes(ED.tab) && $('#vp-cv')) drawPreview(ED.tab); }, 150); });

  function firstMissing(key) {
    const v = ED.a.views[key];
    const P = pset(v);
    const p = Angles.VIEWS[key].points.find(([id]) => !P[id]);
    return p ? p[0] : null;
  }

  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  // Foto nova: reduz, abre o corte/giro e só então grava (pontos e calibração recomeçam).
  async function loadPhoto(key, file, meta) {
    const v = ED.a.views[key];
    if (v.photo && Object.keys(v.pts).length && !confirm('Trocar a foto apaga os pontos marcados nesta vista. Continuar?')) return;
    const src = await shrinkToDataUrl(file, 1800);
    openCrop(src, async (out) => {
      v.photo = out; v.pts = {}; v.pts2 = {}; v.free = []; v.plumbX = null; v.calib = null;
      v.captureTilt = meta && meta.tilt != null ? meta.tilt : null;
      invalidate();
      await DB.put('assessments', ED.a);
      renderTab(key);
      if (meta && meta.thenMark) openMarker(key, 1);
    });
  }

  // ---------- Tela cheia: base comum (foto, zoom com dois dedos, mover, lupa, botões flutuantes) ----------
  const svgI = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    close: svgI('<path d="M6 6l12 12M18 6L6 18"/>'),
    back: svgI('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    pin: svgI('<path d="M9 3h6l-1 6 4 4H6l4-4-1-6zM12 13v8"/>'),
    redo: svgI('<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>'),
    rotL: svgI('<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v5h5"/>'),
    grid: svgI('<path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/>'),
    contrast: svgI('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
    move: svgI('<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>'),
    list: svgI('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'),
    fit: svgI('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    plus: svgI('<path d="M12 5v14M5 12h14"/>'),
    check: svgI('<path d="M5 13l4 4L19 7"/>'),
    nudge: svgI('<path d="M12 3l3 3H9zM12 21l-3-3h6zM3 12l3-3v6zM21 12l-3 3V9z" fill="currentColor"/>'),
  };
  const fsBtn = (act, icon, label, cls) => `<button type="button" class="fs-btn ${cls || ''}" data-act="${act}">${icon}<span>${label}</span></button>`;

  // o: { img, title, overlayHtml, leftHtml, rightHtml, bottomHtml, drawOverlay(ctx, tf, isLoupe),
  //      hit(q, raio) → alvo, start(alvo), place(q) → alvo, move(alvo, q), end(alvo, moveu, colocado), cancel(drag), action(nome, botão), onClose() }
  function makeStage(o) {
    document.body.style.overflow = 'hidden';
    const root = document.createElement('div');
    root.className = 'fs';
    root.innerHTML = `<div class="fs-head"><button type="button" class="fs-x" data-act="close" aria-label="Fechar">${ICON.close}</button><div class="fs-title"><b>${esc(o.title)}</b><span class="fs-sub"></span></div></div>
      <div class="fs-area"><canvas class="fs-cv"></canvas>${o.overlayHtml || ''}<div class="fs-left">${o.leftHtml || ''}</div><div class="fs-right ${o.rightLow ? 'low' : ''}">${o.rightHtml || ''}</div><div class="fs-drawer" hidden></div><div class="fs-toast" hidden></div></div>
      <div class="fs-bottom">${o.bottomHtml || ''}</div>`;
    document.body.appendChild(root);
    const area = root.querySelector('.fs-area'), cv = root.querySelector('.fs-cv');
    const S = { root, img: o.img, tf: { s: 1, x: 0, y: 0 }, grid: !!o.grid, contrast: false, panMode: false, ptrs: new Map(), drag: null, pinch: null, loupe: null, alive: true, imgC: null, w: 1, h: 1 };
    let g;
    const iw = () => S.img.naturalWidth || S.img.width, ih = () => S.img.naturalHeight || S.img.height;
    const size = () => {
      const r = area.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      S.w = Math.max(1, r.width); S.h = Math.max(1, r.height);
      cv.width = Math.round(S.w * dpr); cv.height = Math.round(S.h * dpr);
      g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    S.fit = () => { const s = Math.min((S.w - 16) / iw(), (S.h - 16) / ih()); S.tf = { s, x: (S.w - iw() * s) / 2, y: (S.h - ih() * s) / 2 }; S.draw(); };
    S.setImage = (img) => { S.img = img; S.imgC = null; S.fit(); };
    const contrastImg = () => {
      if (S.imgC) return S.imgC;
      const c = document.createElement('canvas'); c.width = iw(); c.height = ih();
      const x = c.getContext('2d'); x.drawImage(S.img, 0, 0);
      try {
        const d = x.getImageData(0, 0, c.width, c.height), a = d.data, k = 1.5, b = 14;
        for (let i = 0; i < a.length; i += 4) { a[i] = Math.max(0, Math.min(255, (a[i] - 128) * k + 128 + b)); a[i + 1] = Math.max(0, Math.min(255, (a[i + 1] - 128) * k + 128 + b)); a[i + 2] = Math.max(0, Math.min(255, (a[i + 2] - 128) * k + 128 + b)); }
        x.putImageData(d, 0, 0);
      } catch (_) { /* sem acesso aos pixels: usa a foto original */ }
      S.imgC = c;
      return c;
    };
    const paint = (ctx, tf, loupe) => {
      ctx.save(); ctx.translate(tf.x, tf.y); ctx.scale(tf.s, tf.s);
      ctx.drawImage(S.contrast ? contrastImg() : S.img, 0, 0);
      if (S.grid && !loupe) {
        ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 1 / tf.s;
        const W = iw(), H = ih(), step = W / 8;
        ctx.beginPath();
        for (let x = step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
        for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
      }
      ctx.restore();
      if (o.drawOverlay) o.drawOverlay(ctx, tf, loupe);
    };
    S.draw = () => {
      if (!g) return;
      g.fillStyle = '#000'; g.fillRect(0, 0, S.w, S.h);
      paint(g, S.tf, false);
      if (S.loupe) {
        const R = Math.min(80, S.w / 5), Z = 3, { p, q } = S.loupe;
        const cx = R + 12, cy = R + 12; // sempre no canto superior esquerdo, onde não há botão nem figura
        g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
        g.fillStyle = '#000'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
        const s = S.tf.s * Z;
        paint(g, { s, x: cx - q.x * s, y: cy - q.y * s }, true);
        g.restore();
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2);
        g.moveTo(cx - 12, cy); g.lineTo(cx + 12, cy); g.moveTo(cx, cy - 12); g.lineTo(cx, cy + 12); g.stroke();
      }
    };
    const toImg = (p) => ({ x: (p.x - S.tf.x) / S.tf.s, y: (p.y - S.tf.y) / S.tf.s });
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.onpointerdown = (e) => {
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
      const p = pos(e);
      S.ptrs.set(e.pointerId, p);
      if (S.ptrs.size === 2) {
        if (S.drag && S.drag.t && o.cancel) o.cancel(S.drag);
        const [a, b] = [...S.ptrs.values()];
        S.drag = null; S.loupe = null;
        S.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, tf: { ...S.tf } };
        S.draw();
        return;
      }
      const q = toImg(p);
      if (!S.panMode) {
        const t = o.hit && o.hit(q, 26 / S.tf.s);
        if (t) { if (o.start) o.start(t); S.drag = { t, moved: false }; S.loupe = { p, q }; S.draw(); return; }
        const n = o.place && o.place(q);
        if (n) { S.drag = { t: n, moved: true, placed: true }; S.loupe = { p, q }; S.draw(); return; }
      }
      S.drag = { pan: p, tf: { ...S.tf } };
    };
    cv.onpointermove = (e) => {
      if (!S.ptrs.has(e.pointerId)) return;
      const p = pos(e);
      S.ptrs.set(e.pointerId, p);
      if (S.pinch && S.ptrs.size === 2) {
        const [a, b] = [...S.ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, t0 = S.pinch.tf, f = d / S.pinch.d;
        S.tf = { s: t0.s * f, x: c.x - (S.pinch.c.x - t0.x) * f, y: c.y - (S.pinch.c.y - t0.y) * f };
        S.draw();
        return;
      }
      if (!S.drag) return;
      if (S.drag.pan) { S.tf.x = S.drag.tf.x + p.x - S.drag.pan.x; S.tf.y = S.drag.tf.y + p.y - S.drag.pan.y; }
      else { const q = toImg(p); S.drag.moved = true; if (o.move) o.move(S.drag.t, q); S.loupe = { p, q }; }
      S.draw();
    };
    const up = (e) => {
      S.ptrs.delete(e.pointerId);
      if (S.ptrs.size < 2) S.pinch = null;
      if (S.drag && S.drag.t && o.end) o.end(S.drag.t, S.drag.moved, !!S.drag.placed);
      S.drag = null; S.loupe = null;
      S.draw();
    };
    cv.onpointerup = up; cv.onpointercancel = up;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !root.contains(b)) return;
      const act = b.dataset.act;
      if (act === 'close') return S.close();
      if (act === 'grid') { S.grid = !S.grid; b.classList.toggle('on', S.grid); S.draw(); return; }
      if (act === 'contrast') { S.contrast = !S.contrast; b.classList.toggle('on', S.contrast); S.draw(); return; }
      if (act === 'move') { S.panMode = !S.panMode; b.classList.toggle('on', S.panMode); S.toast(S.panMode ? 'Mover: arraste a foto. Toque de novo em Mover para voltar a marcar.' : 'Voltou a marcar.'); return; }
      if (act === 'fit') { S.fit(); return; }
      if (o.action) o.action(act, b);
    });
    let toastT;
    S.toast = (msg, ms) => { const t = root.querySelector('.fs-toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2800); };
    S.setSub = (txt) => { root.querySelector('.fs-sub').textContent = txt; };
    S.drawer = (html) => { const d = root.querySelector('.fs-drawer'); if (html == null) { d.hidden = true; d.innerHTML = ''; return d; } d.innerHTML = html; d.hidden = false; return d; };
    S.modal = (html) => { S.closeModal(); const m = document.createElement('div'); m.className = 'fs-modal'; m.innerHTML = `<div class="box">${html}</div>`; area.appendChild(m); return m; };
    S.closeModal = () => { const m = area.querySelector('.fs-modal'); if (m) m.remove(); };
    S.close = () => {
      if (!S.alive) return;
      S.alive = false;
      ro.disconnect();
      window.removeEventListener('orientationchange', onOrient);
      root.remove();
      document.body.style.overflow = '';
      if (o.onClose) o.onClose();
    };
    // Girar o iPad: o palco ocupa a tela inteira nos dois sentidos; refaz o tamanho e o enquadramento.
    const ro = new ResizeObserver(() => { if (!S.alive) return; size(); S.fit(); });
    ro.observe(area);
    const onOrient = () => setTimeout(() => { if (S.alive) { size(); S.fit(); } }, 300);
    window.addEventListener('orientationchange', onOrient);
    size();
    S.fit();
    return S;
  }

  // ---------- Marcação postural em tela cheia ----------
  function openMarker(key, set) {
    const def = Angles.VIEWS[key], v = ED.a.views[key];
    if (!v.photo) return;
    ED.mark = set;
    const P = () => pset(v);
    const pts = def.points;
    const idx = (id) => pts.findIndex((p) => p[0] === id);
    let cur = firstMissing(key) || pts[0][0];
    const hist = [], skipped = new Set();
    let guideBig = false;
    loadImg(v.photo).then((img) => {
      const S = makeStage({
        img,
        title: def.label + (set === 2 ? ' — marcação 2' : ''),
        overlayHtml: '<div class="mk-guide" role="button" aria-label="Ampliar a figura"></div><div class="mk-name"></div>',
        leftHtml: fsBtn('grid', ICON.grid, 'Grade') + fsBtn('contrast', ICON.contrast, 'Contraste'),
        rightHtml: fsBtn('move', ICON.move, 'Mover') + fsBtn('list', ICON.list, 'Pontos') + fsBtn('auto', svgI('<circle cx="12" cy="5" r="2"/><path d="M12 7v7M7 10h10M9 21l3-7 3 7"/>'), 'Sugerir pontos') + fsBtn('fit', ICON.fit, 'Ajustar'),
        bottomHtml: fsBtn('undo', ICON.back, 'Desfazer') + fsBtn('next', ICON.pin, 'Próximo', 'primary') + fsBtn('redo', ICON.redo, 'Refazer ponto'),
        drawOverlay: (c, tf) => drawView(c, img, key, v, tf, 1, { noImage: true, grid: false, style: 'plain', noLabels: true, noFree: true, sel: cur, set }),
        hit: (q, r) => {
          const c0 = P()[cur];
          if (c0 && Math.hypot(c0.x - q.x, c0.y - q.y) < r) return cur;
          let best = null, bd = r;
          pts.forEach(([id]) => { const pp = P()[id]; if (!pp) return; const d = Math.hypot(pp.x - q.x, pp.y - q.y); if (d < bd) { bd = d; best = id; } });
          return best;
        },
        start: (id) => { hist.push({ id, prev: { ...P()[id] } }); if (id !== cur) { cur = id; ui(); } },
        place: (q) => { if (P()[cur]) return null; hist.push({ id: cur, prev: null }); P()[cur] = q; return cur; },
        move: (id, q) => { P()[id] = q; },
        end: (id, moved, placed) => { if (!moved && !placed) hist.pop(); invalidate(); saveSoon(); ui(); },
        cancel: (d) => { if (d.placed) { const h = hist.pop(); if (h) { if (h.prev) P()[h.id] = h.prev; else delete P()[h.id]; } } },
        action: (act) => {
          if (act === 'auto') return runAuto(true);
          if (act === 'undo') {
            const h = hist.pop();
            if (!h) return S.toast('Nada para desfazer.');
            if (h.all) { Object.keys(P()).forEach((k) => delete P()[k]); Object.assign(P(), h.all); cur = firstMissing(key) || pts[0][0]; invalidate(); saveSoon(); ui(); return; }
            if (h.prev) P()[h.id] = h.prev; else delete P()[h.id];
            cur = h.id; invalidate(); saveSoon(); ui();
          } else if (act === 'redo') {
            if (!P()[cur]) return S.toast('Este ponto ainda não foi marcado: toque na foto.');
            hist.push({ id: cur, prev: { ...P()[cur] } });
            delete P()[cur]; invalidate(); saveSoon(); ui();
            S.toast('Toque na foto para marcar de novo.');
          } else if (act === 'next') {
            const p = pts[idx(cur)];
            if (!P()[cur]) {
              if (!isOptional(p)) return S.toast(`Toque na foto para marcar "${p[1]}". Para pular, escolha outro ponto em Pontos.`);
              skipped.add(cur);
            }
            const i = idx(cur), n = pts.length;
            let nx = null;
            for (let k = 1; k <= n; k++) { const pp = pts[(i + k) % n]; if (!P()[pp[0]] && !skipped.has(pp[0])) { nx = pp[0]; break; } }
            if (!nx && i + 1 < n) nx = pts[i + 1][0];
            if (nx) { cur = nx; ui(); return; }
            ui();
            const m = S.modal(`<h2>Pontos marcados</h2><p>${pts.filter(([id]) => P()[id]).length} de ${n} pontos marcados${pts.some((pp) => !P()[pp[0]]) ? ' (os que faltam são opcionais)' : ''}.</p><div class="row"><button class="primary" data-m="ok">Concluir</button><button data-m="rev">Revisar</button></div>`);
            m.querySelector('[data-m="ok"]').onclick = () => S.close();
            m.querySelector('[data-m="rev"]').onclick = () => S.closeModal();
          } else if (act === 'list') {
            const d = S.drawer(`<div class="row" style="justify-content:space-between"><h3 style="margin:0">Pontos</h3><button data-dr="x">Fechar</button></div>
              <p class="muted">Toque num ponto para ir até ele.</p>
              ${pts.map(([id, label, hint]) => `<button class="dr-row ${id === cur ? 'cur' : ''} ${P()[id] ? 'done' : ''}" data-pt="${id}"><span class="dot"></span><span><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span></button>`).join('')}`);
            d.querySelector('[data-dr="x"]').onclick = () => S.drawer(null);
            d.querySelectorAll('[data-pt]').forEach((b) => (b.onclick = () => { cur = b.dataset.pt; skipped.delete(cur); S.drawer(null); ui(); }));
          }
        },
        onClose: () => {
          saveSoon();
          if (ED.quickView === key && Object.keys(P()).length) { ED.quickView = null; ED.onlyView = key; renderTab('res'); }
          else { ED.quickView = null; renderTab(key); }
        },
      });
      const ui = () => {
        const p = pts[idx(cur)];
        const gEl = S.root.querySelector('.mk-guide'), nEl = S.root.querySelector('.mk-name');
        gEl.className = 'mk-guide' + (guideBig ? ' big' : '');
        gEl.innerHTML = (window.Guide ? Guide.thumb(key, cur, v.facing || def.defaultFacing, guideBig) : '') + `<span class="mk-help">${guideBig ? '−' : '?'}</span>`;
        const side = window.Guide && Guide.sideText ? Guide.sideText(key, cur) : '';
        nEl.className = 'mk-name' + (guideBig ? ' low' : '');
        nEl.innerHTML = `${esc(p[1])}${p[2] ? `<small>${esc(p[2])}</small>` : ''}${side ? `<small class="side">${esc(side)}</small>` : ''}`;
        const done = pts.filter(([id]) => P()[id]).length;
        S.setSub(`${set === 2 ? 'Marcação 2 · ' : ''}ponto ${idx(cur) + 1} de ${pts.length} · ${done} marcados`);
        S.root.querySelector('[data-act="next"] span').textContent = !P()[cur] && isOptional(p) ? 'Pular' : 'Próximo';
        S.draw();
      };
      S.root.querySelector('.mk-guide').onclick = () => { guideBig = !guideBig; ui(); };
      // Sugestão automática dos pontos (no aparelho). Na marcação 2 não roda, para a repetição continuar independente.
      const runAuto = async (manual) => {
        if (!window.Autopose) return;
        if (set === 2) return S.toast('Na marcação 2 os pontos são marcados à mão, para medir a repetição.', 4000);
        if (manual && Object.keys(P()).length && !confirm('Isto substitui os pontos já marcados pela sugestão automática. Continuar?')) return;
        S.toast('Procurando os pontos na foto… Na primeira vez o app prepara o modelo (cerca de 20 MB, precisa de internet).', 60000);
        try {
          const r = await Autopose.suggest(key, img);
          if (!S.alive) return;
          const n = r ? Object.keys(r.pts).filter((id) => idx(id) >= 0).length : 0;
          if (!n) return S.toast('Não achei o corpo inteiro na foto. Marque os pontos tocando na foto.', 5000);
          hist.push({ all: JSON.parse(JSON.stringify(P())) });
          Object.keys(P()).forEach((k) => delete P()[k]);
          Object.keys(r.pts).forEach((id) => { if (idx(id) >= 0) P()[id] = r.pts[id]; });
          v.auto = true;
          let extra = '';
          if (def.defaultFacing && r.facing && r.facing !== v.facing) { v.facing = r.facing; extra = ' Direção do aluno ajustada para ' + (r.facing === 'esq' ? 'a esquerda' : 'a direita') + ' da foto: confira.'; }
          cur = pts[0][0]; invalidate(); saveSoon(); ui();
          S.toast(n + ' de ' + pts.length + ' pontos sugeridos. Toque no ponto e arraste para ajustar; Próximo percorre todos. Acrômio, EIAS, EIPS, C7 e axila são aproximados: confira.' + extra, 9000);
        } catch (e) {
          if (S.alive) S.toast('Sugestão automática indisponível agora (a primeira vez precisa de internet). Marque tocando na foto.', 6000);
        }
      };
      ui();
      if (set !== 2 && !Object.keys(P()).length) runAuto(false);
      else S.toast('Toque num ponto e arraste para ajustar. Dois dedos aproximam a foto.', 4200);
    });
  }

  // ---------- Calibração em tela cheia ----------
  function openCalib(key) {
    const def = Angles.VIEWS[key], v = ED.a.views[key];
    if (!v.photo) return;
    const marks = v.calib ? [{ ...v.calib.a }, { ...v.calib.b }] : [];
    const cm0 = v.calib ? v.calib.cm : (ED.lastCalCm || 100), ori0 = v.calib ? v.calib.orient : (ED.lastCalOri || 'v');
    const hist = [];
    loadImg(v.photo).then((img) => {
      const S = makeStage({
        img,
        title: 'Calibração — ' + def.label,
        overlayHtml: '<div class="fs-pill"></div>',
        leftHtml: fsBtn('grid', ICON.grid, 'Grade') + fsBtn('contrast', ICON.contrast, 'Contraste'),
        rightHtml: fsBtn('move', ICON.move, 'Mover') + fsBtn('fit', ICON.fit, 'Ajustar'),
        bottomHtml: fsBtn('undo', ICON.back, 'Desfazer') +
          `<div class="cal-form"><label>Distância real (cm)<input class="cal-cm" inputmode="decimal" value="${esc(cm0)}"></label><select class="cal-ori"><option value="v">Fio de prumo (vertical)</option><option value="h">Régua (horizontal)</option></select></div>` +
          fsBtn('ok', ICON.check, 'Concluir', 'primary'),
        drawOverlay: (c, tf) => {
          c.save(); c.translate(tf.x, tf.y); c.scale(tf.s, tf.s);
          const u = 1 / tf.s;
          if (marks.length === 2) { c.strokeStyle = '#00e5ff'; c.lineWidth = 3 * u; c.beginPath(); c.moveTo(marks[0].x, marks[0].y); c.lineTo(marks[1].x, marks[1].y); c.stroke(); }
          marks.forEach((q) => dot(c, q, u, '#00bcd4', false));
          c.restore();
        },
        hit: (q, r) => { let best = null, bd = r; marks.forEach((p, i) => { const d = Math.hypot(p.x - q.x, p.y - q.y); if (d < bd) { bd = d; best = i + 1; } }); return best; },
        start: (t) => { hist.push({ i: t - 1, prev: { ...marks[t - 1] } }); },
        place: (q) => { if (marks.length >= 2) return null; hist.push({ i: marks.length, prev: null }); marks.push(q); return marks.length; },
        move: (t, q) => { marks[t - 1] = q; },
        end: (t, moved, placed) => { if (!moved && !placed) hist.pop(); ui(); },
        cancel: (d) => { if (d.placed) { hist.pop(); marks.pop(); } },
        action: (act) => {
          if (act === 'undo') {
            const h = hist.pop();
            if (!h) return S.toast('Nada para desfazer.');
            if (h.prev) marks[h.i] = h.prev; else marks.splice(h.i, 1);
            ui();
          } else if (act === 'ok') {
            if (marks.length < 2) return S.toast('Marque as duas marcas de distância conhecida.');
            const cm = parseFloat(String(S.root.querySelector('.cal-cm').value).replace(',', '.'));
            const orient = S.root.querySelector('.cal-ori').value;
            const c = Angles.calibFromPoints(marks[0], marks[1], cm, orient);
            if (!c) return S.toast('Informe a distância real em cm.');
            if (v.calib && v.calib.apply === false) c.apply = false;
            v.calib = c; ED.lastCalCm = cm; ED.lastCalOri = orient;
            invalidate(); saveSoon(); S.close();
          }
        },
        onClose: () => renderTab(key),
      });
      S.root.querySelector('.cal-ori').value = ori0;
      const ui = () => {
        S.root.querySelector('.fs-pill').textContent = marks.length === 0 ? 'Toque na marca de cima do fio de prumo (ou numa ponta da régua).' : marks.length === 1 ? 'Agora toque na outra marca.' : 'Arraste as marcas para ajustar, confira a distância e toque em Concluir.';
        S.setSub(`${marks.length} de 2 marcas`);
        S.draw();
      };
      ui();
    });
  }

  // ---------- Cortar e girar a foto ----------
  function openCrop(src, onDone) {
    loadImg(src).then((img) => {
      let rot90 = 0, fine = 0, base, rect, finished = false;
      const build = () => {
        const deg = rot90 * 90 + fine, r = (deg * Math.PI) / 180, w = img.naturalWidth, h = img.naturalHeight;
        const W = Math.round(Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r))), H = Math.round(Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r)));
        base = document.createElement('canvas'); base.width = W; base.height = H;
        const x = base.getContext('2d');
        x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
        x.translate(W / 2, H / 2); x.rotate(r); x.drawImage(img, -w / 2, -h / 2);
        rect = { x: 0, y: 0, w: W, h: H };
        if (Math.abs(fine) > 0.05) {
          const ow = rot90 % 2 ? h : w, oh = rot90 % 2 ? w : h, a = Math.abs((fine * Math.PI) / 180);
          const k = 1 / (Math.cos(a) + Math.sin(a) * (Math.max(ow, oh) / Math.min(ow, oh)));
          rect = { x: (W - ow * k) / 2, y: (H - oh * k) / 2, w: ow * k, h: oh * k };
        }
      };
      build();
      const MIN = 40;
      const clamp = () => {
        rect.w = Math.max(MIN, Math.min(rect.w, base.width)); rect.h = Math.max(MIN, Math.min(rect.h, base.height));
        rect.x = Math.max(0, Math.min(rect.x, base.width - rect.w)); rect.y = Math.max(0, Math.min(rect.y, base.height - rect.h));
      };
      const S = makeStage({
        img: base,
        grid: true,
        title: 'Cortar e girar',
        overlayHtml: '<div class="fs-pill">Arraste os cantos para cortar. Use os botões para girar e a barra para nivelar a foto.</div>',
        rightHtml: fsBtn('fit', ICON.fit, 'Ajustar'),
        leftHtml: fsBtn('grid', ICON.grid, 'Grade', 'on'),
        bottomHtml: fsBtn('rotl', ICON.rotL, 'Girar') +
          '<div class="crop-fine"><label>Nivelar <b class="crop-val">0°</b></label><input type="range" min="-10" max="10" step="0.1" value="0" class="crop-range"></div>' +
          fsBtn('ok', ICON.check, 'Usar foto', 'primary') + fsBtn('rotr', ICON.redo, 'Girar'),
        drawOverlay: (c, tf) => {
          c.save(); c.translate(tf.x, tf.y); c.scale(tf.s, tf.s);
          const u = 1 / tf.s, W = base.width, H = base.height;
          c.fillStyle = 'rgba(0,0,0,0.55)';
          c.fillRect(0, 0, W, rect.y); c.fillRect(0, rect.y + rect.h, W, H - rect.y - rect.h);
          c.fillRect(0, rect.y, rect.x, rect.h); c.fillRect(rect.x + rect.w, rect.y, W - rect.x - rect.w, rect.h);
          c.strokeStyle = '#fff'; c.lineWidth = 2 * u; c.strokeRect(rect.x, rect.y, rect.w, rect.h);
          c.strokeStyle = 'rgba(255,214,10,0.9)'; c.setLineDash([8 * u, 6 * u]); c.beginPath(); c.moveTo(rect.x + rect.w / 2, rect.y); c.lineTo(rect.x + rect.w / 2, rect.y + rect.h); c.stroke(); c.setLineDash([]);
          [[rect.x, rect.y], [rect.x + rect.w, rect.y], [rect.x, rect.y + rect.h], [rect.x + rect.w, rect.y + rect.h]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 9 * u, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); });
          c.restore();
        },
        hit: (q, r) => {
          const R = r * 1.4, cs = { tl: [rect.x, rect.y], tr: [rect.x + rect.w, rect.y], bl: [rect.x, rect.y + rect.h], br: [rect.x + rect.w, rect.y + rect.h] };
          for (const [k, [x, y]] of Object.entries(cs)) if (Math.hypot(q.x - x, q.y - y) < R) return { k };
          if (q.x > rect.x && q.x < rect.x + rect.w && q.y > rect.y && q.y < rect.y + rect.h) return { k: 'in', dx: q.x - rect.x, dy: q.y - rect.y };
          return null;
        },
        move: (t, q) => {
          const x2 = rect.x + rect.w, y2 = rect.y + rect.h;
          if (t.k === 'in') { rect.x = q.x - t.dx; rect.y = q.y - t.dy; }
          if (t.k === 'tl') { rect.x = Math.min(q.x, x2 - MIN); rect.y = Math.min(q.y, y2 - MIN); rect.w = x2 - rect.x; rect.h = y2 - rect.y; }
          if (t.k === 'tr') { rect.y = Math.min(q.y, y2 - MIN); rect.w = Math.max(MIN, q.x - rect.x); rect.h = y2 - rect.y; }
          if (t.k === 'bl') { rect.x = Math.min(q.x, x2 - MIN); rect.w = x2 - rect.x; rect.h = Math.max(MIN, q.y - rect.y); }
          if (t.k === 'br') { rect.w = Math.max(MIN, q.x - rect.x); rect.h = Math.max(MIN, q.y - rect.y); }
          if (rect.x < 0) { rect.w += rect.x; rect.x = 0; }
          if (rect.y < 0) { rect.h += rect.y; rect.y = 0; }
          clamp();
        },
        action: (act) => {
          if (act === 'rotl' || act === 'rotr') { rot90 = (rot90 + (act === 'rotl' ? 3 : 1)) % 4; build(); S.setImage(base); }
          else if (act === 'ok') {
            const out = document.createElement('canvas');
            out.width = Math.round(rect.w); out.height = Math.round(rect.h);
            out.getContext('2d').drawImage(base, Math.round(rect.x), Math.round(rect.y), out.width, out.height, 0, 0, out.width, out.height);
            const url = out.toDataURL('image/jpeg', 0.88);
            finished = true;
            S.close();
            onDone(url);
          }
        },
        onClose: () => { if (!finished && ED.active && VIEW_KEYS.includes(ED.tab)) renderTab(ED.tab); },
      });
      const range = S.root.querySelector('.crop-range');
      range.oninput = () => { fine = parseFloat(range.value) || 0; S.root.querySelector('.crop-val').textContent = Angles.fmt(fine) + '°'; build(); S.setImage(base); };
    });
  }

  // Desenha foto, grade, fio de prumo, linhas das medidas, rótulos e pontos.
  // k: escala dos traços (1 na tela; maior para exportar em alta resolução).
  function drawView(c, img, key, v, tf, k, opt) {
    const def = Angles.VIEWS[key];
    const P = opt.set === 2 ? (v.pts2 || {}) : v.pts;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const u = k / tf.s; // 1 pixel de tela em unidades da imagem
    c.save();
    c.translate(tf.x, tf.y);
    c.scale(tf.s, tf.s);
    if (!opt.noImage) c.drawImage(img, 0, 0);
    if (opt.mask) drawMask(c, key, v, P, u);
    if (opt.grid) {
      c.strokeStyle = 'rgba(0,0,0,0.35)';
      c.lineWidth = u;
      const step = iw / 12;
      c.beginPath();
      for (let x = step; x < iw; x += step) { c.moveTo(x, 0); c.lineTo(x, ih); }
      for (let y = step; y < ih; y += step) { c.moveTo(0, y); c.lineTo(iw, y); }
      c.stroke();
    }
    if (v.plumbX != null) {
      c.strokeStyle = '#2bb24c';
      c.lineWidth = 2.5 * u;
      c.setLineDash([10 * u, 7 * u]);
      c.beginPath(); c.moveTo(v.plumbX, 0); c.lineTo(v.plumbX, ih); c.stroke();
      c.setLineDash([]);
    }
    if (!opt.only && !opt.noLabels && (v.calib || opt.calibTmp)) {
      const pts2 = v.calib ? [v.calib.a, v.calib.b] : opt.calibTmp;
      c.strokeStyle = '#00bcd4'; c.lineWidth = 3 * u;
      if (pts2.length === 2) { c.beginPath(); c.moveTo(pts2[0].x, pts2[0].y); c.lineTo(pts2[1].x, pts2[1].y); c.stroke(); }
      pts2.forEach((q) => dot(c, q, u, '#00bcd4', false));
      if (v.calib && pts2.length === 2) tagLabel(c, v.calib.cm + ' cm', (pts2[0].x + pts2[1].x) / 2 + 10 * u, (pts2[0].y + pts2[1].y) / 2, u);
    }
    if (!opt.only) {
      const seg = (ids, color, w) => {
        c.strokeStyle = color; c.lineWidth = w * u; c.lineCap = 'round';
        for (let i = 0; i + 1 < ids.length; i++) {
          const a = P[ids[i]], b = P[ids[i + 1]];
          if (a && b) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        }
        c.lineCap = 'butt';
      };
      (def.skeleton || []).forEach((ids) => seg(ids, 'rgba(255,255,255,0.7)', 1.8));
      (def.legs || []).forEach((ids) => seg(ids, 'rgba(31,120,209,0.85)', 1.8));
    }
    const results = Angles.computeView(key, P, v.facing, v.calib);
    def.measures.forEach((m) => {
      if (opt.style === 'plain') return;
      if (opt.only && m.code !== opt.only) return;
      if (opt.style === 'apecs' && (m.type === 'knee' || /complementar/.test(m.label) && m.type === 'align')) return;
      const redLine = opt.style === 'apecs' && (m.type === 'align' || m.type === 'vertical');
      Angles.geometry(m, P).forEach((line) => {
        c.strokeStyle = redLine ? '#e53935' : '#f39c12';
        c.lineWidth = (redLine ? 2.5 : 3.5) * u;
        c.beginPath();
        line.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
        c.stroke();
        if (m.type === 'align' || m.type === 'vertical' || m.type === 'head') {
          const bottom = line[0].y > line[1].y ? line[0] : line[1];
          const top = bottom === line[0] ? line[1] : line[0];
          c.strokeStyle = 'rgba(43,178,76,0.9)';
          c.lineWidth = 1.5 * u;
          c.setLineDash([6 * u, 5 * u]);
          c.beginPath(); c.moveTo(bottom.x, bottom.y); c.lineTo(bottom.x, top.y); c.stroke();
          c.setLineDash([]);
        }
      });
      const r = results.find((x) => x.code === m.code);
      if (r && !opt.noLabels && opt.style !== 'apecs') {
        const line = Angles.geometry(m, P)[0];
        const at = line[line.length > 2 ? 1 : 0];
        tagLabel(c, `${m.code} ${Angles.fmtVal(r)}`, at.x + 10 * u, at.y - 10 * u, u);
      }
    });
    if (!opt.only && !opt.noFree && (v.free || []).length) drawFreeAngles(c, v.free.map(normFree), u, { labels: !opt.noLabels });
    if (opt.style === 'apecs' && !opt.noLabels && !opt.only) drawCallouts(c, u, iw, ih, key, v, results);
    const onlyIds = opt.only ? new Set(def.measures.find((m) => m.code === opt.only).pts.flat()) : null;
    Object.entries(P).forEach(([id, p]) => { if (!onlyIds || onlyIds.has(id)) dot(c, p, u, opt.set === 2 ? '#8e44ad' : '#1f78d1', id === opt.sel); });
    c.restore();
  }


  // Máscara no rosto (LGPD): cobre a cabeça com uma elipse cinza a partir dos pontos marcados. Vista posterior não mostra o rosto.
  function drawMask(c, key, v, P, u) {
    let e = null;
    if (key === 'ant' && P.cabD && P.cabE) {
      const w = Math.hypot(P.cabE.x - P.cabD.x, P.cabE.y - P.cabD.y);
      const ay = (P.cabD.y + P.cabE.y) / 2;
      e = { x: (P.cabD.x + P.cabE.x) / 2, y: ay - 0.4 * w, rx: 0.95 * w, ry: 1.5 * w };
    } else if ((key === 'latD' || key === 'latE') && P.tra && P.c7) {
      const L = Math.hypot(P.tra.x - P.c7.x, P.tra.y - P.c7.y);
      const dir = v.facing === 'esq' ? -1 : 1;
      e = { x: P.tra.x + dir * 0.25 * L, y: P.tra.y - 0.2 * L, rx: 1.15 * L, ry: 1.45 * L };
    }
    if (!e) return;
    c.save();
    c.beginPath(); c.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, Math.PI * 2);
    c.fillStyle = '#4a4f55'; c.fill();
    c.restore();
  }

  // Rótulos no estilo do APECS: nome à esquerda, valor à direita, linhas guia horizontais até os pontos.
  const CALLOUTS = {
    ant: [['A2', 'Cabeça'], ['A3', 'Acrôm.'], ['A4', 'Axil.'], ['A5', 'Caixa T.'], ['A6', 'Tronco'], ['A7', 'ASIS'], ['A8', 'Joelhos', 'A9', 'joeD', 'joeE'], ['A10', 'Pés', 'A11', 'torD', 'torE']],
    post: [['B2', 'Orelhas'], ['B3', 'Ombros'], ['B4', 'Axilas'], ['B5', 'Topo da curva'], ['B6', 'PSIS'], ['B7', 'Joelhos'], ['B8', 'Pés']],
    lat: [['2', 'Cabeça', null, 'c7'], ['3', 'Ombros', null, 'acr'], ['4', 'Pélvis', null, 'psi'], ['5', 'Fêmur', null, 'joe'], ['6', 'Tíbia', null, 'mal'], ['7', 'Pé', null, 'ded']],
  };
  function drawCallouts(c, u, iw, ih, key, v, results) {
    const def = Angles.VIEWS[key];
    const lat = key === 'latD' || key === 'latE';
    const list = CALLOUTS[lat ? 'lat' : key] || [];
    const BLUE = '#1f78d1', RED = '#e53935', pad = 6 * u, bh = 22 * u, mx = 8 * u;
    c.font = `600 ${14 * u}px -apple-system, sans-serif`;
    c.textBaseline = 'alphabetic';
    const box = (text, x, y, color, rightAlign) => {
      const w = c.measureText(text).width + 2 * pad;
      const bx = rightAlign ? x - w : x;
      c.fillStyle = '#fff'; c.fillRect(bx, y - bh / 2, w, bh);
      c.strokeStyle = color; c.lineWidth = 2 * u; c.strokeRect(bx, y - bh / 2, w, bh);
      c.fillStyle = '#111'; c.fillText(text, bx + pad, y + 5 * u);
      return { l: bx, r: bx + w };
    };
    const line = (x1, y1, x2, y2) => { c.strokeStyle = BLUE; c.lineWidth = 1.5 * u; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    const val = (code) => { const r = results.find((x) => x.code === code); return r ? Angles.fmtVal(r) : null; };
    let lastL = -1e9, lastR = -1e9;
    list.forEach(([code, name, code2, a1, a2]) => {
      const full = lat ? def.codePrefix + code : code;
      const m = def.measures.find((x) => x.code === full);
      if (!m || !val(full)) return;
      let ids, vals;
      if (code2) { ids = [a1, a2]; vals = [val(full), val(code2)]; }
      else if (a1) { ids = [a1, a1]; vals = [val(full), val(full)]; }
      else { ids = m.pts; vals = [val(full), val(full)]; }
      let pts = ids.map((id) => v.pts[id]);
      if (pts.some((q) => !q) || (code2 && !vals[1])) return;
      if (pts[0].x > pts[1].x) { pts = pts.reverse(); vals = vals.reverse(); }
      const paired = !!code2;
      const yl = Math.max(pts[0].y, lastL + bh + 3 * u), yr = Math.max(pts[1].y, lastR + bh + 3 * u);
      lastL = yl; lastR = yr;
      const left = box(paired ? name + ' ' + vals[0] : name, mx, yl, BLUE, false);
      line(left.r, yl, pts[0].x, pts[0].y);
      const right = box(paired ? vals[1] : vals[0], iw - mx, yr, BLUE, true);
      line(pts[1].x, pts[1].y, right.l, yr);
    });
    const al = val(def.codePrefix + '1');
    if (al) box('Alinhamento ' + al, mx, ih - 18 * u, RED, false);
  }

  function dot(c, p, u, color, sel) {
    c.beginPath();
    c.arc(p.x, p.y, 3 * u, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
    c.lineWidth = 1.5 * u;
    c.strokeStyle = color;
    c.stroke();
    if (sel) {
      c.beginPath();
      c.arc(p.x, p.y, 7 * u, 0, Math.PI * 2);
      c.strokeStyle = '#e53935';
      c.lineWidth = 1.5 * u;
      c.stroke();
    }
  }

  function tagLabel(c, text, x, y, u) {
    c.font = `600 ${14 * u}px -apple-system, sans-serif`;
    const w = c.measureText(text).width + 10 * u, h = 20 * u;
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.strokeStyle = '#1f78d1';
    c.lineWidth = 1.5 * u;
    c.fillRect(x, y - h + 4 * u, w, h);
    c.strokeRect(x, y - h + 4 * u, w, h);
    c.fillStyle = '#111';
    c.fillText(text, x + 5 * u, y);
  }

  // ---------- Resultados ----------
  function refFor(code) { return state.refs.find((r) => r.code === code); }
  function flagFor(r) {
    const ref = refFor(r.code);
    if (!ref || ref.classe === 'D' || (ref.min === '' && ref.max === '')) return { cls: '', txt: 'Sem ponto de corte definido: valor contínuo' };
    const v = r.signed != null ? r.signed : r.value;
    const lo = ref.min === '' ? -Infinity : +ref.min, hi = ref.max === '' ? Infinity : +ref.max;
    const inRange = v >= lo && v <= hi;
    return { cls: inRange ? 'in' : 'out', txt: `${inRange ? 'Dentro' : 'Fora'} da faixa (${CLASSES[ref.classe] || ref.classe})` };
  }

  function allResults(a) {
    return VIEW_KEYS.map((k) => ({ key: k, def: Angles.VIEWS[k], res: Angles.computeView(k, a.views[k].pts, a.views[k].facing, a.views[k].calib) }));
  }

  function renderResults() {
    const groups = allResults(ED.a).filter((g) => !ED.onlyView || g.key === ED.onlyView);
    main.innerHTML = `${tabsHtml()}
      <div class="card"><h2>Resultados</h2>${ED.onlyView ? `<p class="warn">Análise rápida: só a vista ${esc(Angles.VIEWS[ED.onlyView].label.toLowerCase())}. <button id="allres">Mostrar todas</button></p>` : ''}
      <p class="muted">Valores em graus na convenção descrita em cada medida. Ângulo de foto descreve a configuração observada em apoio estático; não é diagnóstico.</p>
      ${groups.map((g) => `<h3>${esc(g.def.label)}</h3>${g.res.length ? `<div class="table-wrap"><table><tr><th>Código</th><th>Medida</th><th>Valor</th><th>Descrição</th><th>Referência</th><th>Conduta</th></tr>
        ${g.res.map((r) => { const f = flagFor(r); return `<tr><td>${r.code}</td><td>${esc(r.label)}</td><td><b>${Angles.fmtVal(r)}</b></td><td>${esc(r.text)}</td><td><span class="tag ${f.cls}">${esc(f.txt)}</span></td>
          <td><select data-cond="${r.code}">${CONDUTA.map((o) => `<option ${ED.a.conduta[r.code] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></td></tr>`; }).join('')}
      </table></div>` : '<p class="muted">Nenhuma medida completa nesta vista.</p>'}
      ${ED.a.views[g.key].free.some((f) => Angles.freeValue(f)) ? `<p>Ângulos livres: ${ED.a.views[g.key].free.filter((f) => Angles.freeValue(f)).map((f) => `${esc(f.label)} <b>${Angles.fmt(Angles.freeValue(f).value)}°</b>`).join(' · ')}</p>` : ''}`).join('')}
      </div>`;
    const ar = $('#allres');
    if (ar) ar.onclick = () => { ED.onlyView = null; renderTab('res'); };
    main.insertAdjacentHTML('beforeend', extraResultsHtml());
    main.querySelectorAll('[data-cond]').forEach((s) => (s.onchange = () => { ED.a.conduta[s.dataset.cond] = s.value; saveSoon(); }));
  }

  // Repetição de marcação: mesma medida calculada com a marcação 1 e a marcação 2.
  function reproRows(a) {
    const rows = [];
    VIEW_KEYS.forEach((k) => {
      const v = a.views[k];
      if (!v.pts2 || !Object.keys(v.pts2).length) return;
      const r1 = Angles.computeView(k, v.pts, v.facing, v.calib), r2 = Angles.computeView(k, v.pts2, v.facing, v.calib);
      r1.forEach((r) => {
        const q = r2.find((x) => x.code === r.code);
        if (!q) return;
        const x1 = r.signed != null ? r.signed : r.value, x2 = q.signed != null ? q.signed : q.value;
        rows.push({ view: k, code: r.code, label: r.label, unit: r.unit, v1: x1, v2: x2, d: x1 - x2 });
      });
    });
    return rows;
  }
  function calibNotes(a) {
    return VIEW_KEYS.filter((k) => a.views[k].photo).map((k) => {
      const v = a.views[k], label = Angles.VIEWS[k].label;
      if (!v.calib) return `${label}: sem calibração (medidas em cm indisponíveis; inclinação da foto não corrigida).`;
      const bits = [];
      if (Math.abs(v.calib.rot) >= 0.05) bits.push(`foto inclinada ${Angles.fmt(Math.abs(v.calib.rot))}° ${v.calib.apply !== false ? '(corrigida nos ângulos)' : '(NÃO corrigida)'}`);
      if (v.captureTilt != null && Math.abs(v.captureTilt) >= 1) bits.push(`aparelho inclinado ${Angles.fmt(Math.abs(v.captureTilt))}° na captura`);
      return `${label}: calibrada, 1 cm = ${String(Math.round(v.calib.pxPerCm * 100) / 100).replace('.', ',')} px${bits.length ? ' · ' + bits.join(' · ') : ''}.`;
    });
  }
  function extraResultsHtml() {
    const a = ED.a, rr = reproRows(a), notes = calibNotes(a);
    return `<div class="card"><h2>Calibração e captura</h2>${notes.length ? '<ul class="muted">' + notes.map((n) => '<li>' + esc(n) + '</li>').join('') + '</ul>' : '<p class="muted">Nenhuma vista com foto.</p>'}</div>
      <div class="card"><h2>Repetição da marcação</h2>${rr.length ? `<p class="muted">Diferença entre a marcação 1 e a marcação 2 do mesmo avaliador na mesma foto. Diferença grande indica um ponto difícil de marcar. O erro técnico acumulado de várias avaliações aparece em Referências.</p>
        <div class="table-wrap"><table><tr><th>Código</th><th>Medida</th><th>Marcação 1</th><th>Marcação 2</th><th>Diferença</th></tr>
        ${rr.map((r) => `<tr><td>${r.code}</td><td>${esc(r.label)}</td><td>${Angles.fmtVal({ value: r.v1, unit: r.unit })}</td><td>${Angles.fmtVal({ value: r.v2, unit: r.unit })}</td><td><b>${Angles.fmtVal({ value: Math.abs(r.d), unit: r.unit })}</b></td></tr>`).join('')}</table></div>` : '<p class="muted">Sem repetição. Em cada vista, escolha "Marcação 2" e refaça os pontos para estimar o erro de marcação.</p>'}</div>`;
  }
  // Erro técnico de medida (TEM) a partir de marcações repetidas de todas as avaliações: sqrt(soma(d²) / 2n).
  async function temRows() {
    const all = (await DB.all('assessments')).map(normalize);
    const acc = {};
    all.forEach((a) => reproRows(a).forEach((r) => { const o = (acc[r.code] = acc[r.code] || { n: 0, ss: 0, label: r.label, unit: r.unit }); o.n++; o.ss += r.d * r.d; }));
    return Object.entries(acc).map(([code, o]) => ({ code, label: o.label, unit: o.unit, n: o.n, tem: Math.sqrt(o.ss / (2 * o.n)) })).sort((x, y) => x.code.localeCompare(y.code, undefined, { numeric: true }));
  }

  // ---------- Ficha e conduta ----------
  async function renderFicha() {
    const a = ED.a;
    const others = (await DB.all('assessments')).filter((x) => x.studentId === a.studentId && x.id !== a.id).sort((x, y) => y.data.localeCompare(x.data));
    while (a.prioridades.length < 3) a.prioridades.push({});
    main.innerHTML = `${tabsHtml()}
      <div class="card"><h2>Dados da avaliação</h2>
        <div class="grid2">
          <div><label>Data</label><input id="f-data" type="date" value="${esc(a.data)}"></div>
          <div><label>Avaliador</label><input id="f-aval" value="${esc(a.avaliador)}"></div>
          <div><label>Comparar com a avaliação de</label><select id="f-comp"><option value="">— nenhuma —</option>${others.map((o) => `<option value="${o.id}" ${a.comparar === o.id ? 'selected' : ''}>${fmtDate(o.data)}</option>`).join('')}</select></div>
        </div>
        <h3>Condições de aquisição</h3>
        <p class="muted">Repita as mesmas condições na reavaliação; a comparação só vale em condições equivalentes.</p>
        <div class="grid2">${CONDICOES.map(([k, l]) => `<div><label>${l}</label><input data-cnd="${k}" value="${esc(a.condicoes[k] || '')}"></div>`).join('')}</div>
      </div>
      <div class="card"><h2>Contexto</h2>
        <label>Sintomas e dor relatados</label><textarea data-f="sintomas">${esc(a.sintomas)}</textarea>
        <label>Movimento e testes complementares (agachamento, step-down, corrida, força, mobilidade)</label><textarea data-f="movimento">${esc(a.movimento)}</textarea>
        <div class="row" style="margin-top:8px"><button id="draft">Gerar rascunho dos textos</button><span class="muted">Montado por regras com os seus números, sem IA. Leia e edite antes de usar.</span></div>
        <label>Observação do avaliador (aparece no laudo)</label><textarea data-f="observacao">${esc(a.observacao)}</textarea>
        <p class="warn" id="avoid" hidden>Este texto usa um termo que o manual pede para evitar a partir de foto (ex.: valgo, varo, pé plano, encurtamento, fraqueza, risco de lesão). Prefira descrever o que foi observado, por exemplo "projeção medial do joelho em apoio estático".</p>
        <label>Versão em linguagem simples para o aluno (opcional)</label><textarea data-f="linguagemSimples">${esc(a.linguagemSimples)}</textarea>
      </div>
      <div class="card"><h2>Prioridades (até 3)</h2>
        <p class="muted">Registre só o que muda o treino. Nenhuma nota global, nenhum risco de lesão calculado.</p>
        ${a.prioridades.slice(0, 3).map((p, i) => `<h3>Prioridade ${i + 1}</h3><div class="grid2">
          ${[['achado', 'Achado'], ['tarefa', 'Tarefa afetada'], ['hipotese', 'Hipótese (não confirmada)'], ['ajuste', 'Ajuste proposto'], ['dose', 'Dose'], ['progressao', 'Progressão'], ['reavaliacao', 'Indicador de reavaliação']]
            .map(([k, l]) => `<div><label>${l}</label><input data-pr="${i}" data-k="${k}" value="${esc(p[k] || '')}"></div>`).join('')}
          <div><label>Situação</label><select data-pr="${i}" data-k="situacao">${SITUACOES.map((o) => `<option ${p.situacao === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div></div>`).join('')}
      </div>`;
    $('#f-data').onchange = (e) => { a.data = e.target.value; saveSoon(); };
    $('#f-aval').oninput = (e) => { a.avaliador = e.target.value; saveSoon(); };
    $('#f-comp').onchange = (e) => { a.comparar = e.target.value; saveSoon(); };
    main.querySelectorAll('[data-cnd]').forEach((el) => (el.oninput = () => { a.condicoes[el.dataset.cnd] = el.value; saveSoon(); }));
    const checkAvoid = () => ($('#avoid').hidden = !AVOID_TERMS.test(a.observacao + ' ' + a.linguagemSimples));
    main.querySelectorAll('[data-f]').forEach((el) => (el.oninput = () => { a[el.dataset.f] = el.value; saveSoon(); checkAvoid(); }));
    main.querySelectorAll('[data-pr]').forEach((el) => (el[el.tagName === 'SELECT' ? 'onchange' : 'oninput'] = () => { a.prioridades[+el.dataset.pr][el.dataset.k] = el.value; saveSoon(); }));
    checkAvoid();
    $('#draft').onclick = () => {
      const d = draftTexts(a);
      if (!d) return alert('Marque os pontos de pelo menos uma vista antes de gerar o rascunho.');
      const put = (k, txt, nome) => {
        if (a[k] && a[k].trim() && !confirm('Já existe texto em "' + nome + '". Substituir pelo rascunho?')) return;
        a[k] = txt;
        main.querySelector('[data-f="' + k + '"]').value = txt;
      };
      put('observacao', d.obs, 'Observação do avaliador');
      put('linguagemSimples', d.simples, 'Versão em linguagem simples');
      saveSoon(); checkAvoid();
    };
    bindTabs();
  }

  // ---------- Laudo ----------
  async function renderLaudo() {
    const a = ED.a;
    const controls = `${tabsHtml()}<div class="card"><h2>Laudo</h2>
      <div class="grid2"><div><label>Tipo de relatório</label><select id="l-tipo">
        <option value="tecnico" ${a.tipoLaudo === 'tecnico' ? 'selected' : ''}>Registro técnico (completo, para o avaliador)</option>
        <option value="aluno" ${a.tipoLaudo === 'aluno' ? 'selected' : ''}>Relatório do aluno (resumo em linguagem simples)</option></select></div></div>
      <label style="display:flex;gap:8px;align-items:center;color:var(--ink);margin-top:8px"><input type="checkbox" id="l-mask" style="width:auto" ${a.mascara ? 'checked' : ''}> Ocultar o rosto nas fotos do laudo</label>
      <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="l-fmov" style="width:auto" ${a.fotosMov ? 'checked' : ''}> Incluir no laudo as fotos dos testes de movimento e dos ângulos livres (o rosto não é ocultado nelas)</label>
      <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="l-val" style="width:auto" ${a.validado ? 'checked' : ''}> Conferi e validei as marcações de todas as vistas</label>
      <p class="muted">${a.validado ? 'Validado em ' + new Date(a.validado.em).toLocaleString('pt-BR') + '. Se você mudar um ponto ou a calibração, a validação é desfeita.' : 'Marque a confirmação para gerar o laudo: as marcações são validadas por quem avalia.'}</p></div>`;
    const bindControls = () => {
      $('#l-tipo').onchange = (e) => { a.tipoLaudo = e.target.value; saveSoon(); renderLaudo(); };
      $('#l-mask').onchange = (e) => { a.mascara = e.target.checked; saveSoon(); renderLaudo(); };
      $('#l-fmov').onchange = (e) => { a.fotosMov = e.target.checked; saveSoon(); renderLaudo(); };
      $('#l-val').onchange = (e) => { a.validado = e.target.checked ? { ok: true, em: new Date().toISOString() } : null; saveSoon(); renderLaudo(); };
      bindTabs();
    };
    if (!a.validado) { main.innerHTML = controls; bindControls(); return; }
    main.innerHTML = controls + '<div class="card"><p class="muted">Gerando o laudo…</p></div>';
    bindControls();
    const prev = a.comparar ? await DB.get('assessments', a.comparar).then((x) => x && normalize(x)) : null;
    const history = (await studentHistory(a.studentId)).map((x) => (x.id === a.id ? a : x));
    const html = await Report.build({ a, s: ED.s, prev, history, perfil: state.perfil, refs: state.refs, opts: { tipo: a.tipoLaudo, mascara: a.mascara, fotosMov: !!a.fotosMov },
      helpers: { loadImg, drawView, allResults, flagFor, refFor, CLASSES, CONDICOES, SITUACOES, fmtDate, esc, CHECKLIST, reproRows, calibNotes, beforeAfterCanvas, chartImage, seriesFor, freeImage } });
    main.innerHTML = controls + `<div class="card"><div class="row"><button class="primary" id="print">Imprimir / salvar em PDF</button>
      <span class="muted">No iPad: toque em Imprimir, depois em Compartilhar (ou afaste dois dedos na prévia) e escolha "Salvar em Arquivos".</span></div></div>
      <div class="card rp">${html}</div>`;
    $('#report').innerHTML = `<div class="rp">${html}</div>`;
    bindControls();
    $('#print').onclick = () => window.print();
  }

  // ---------- Testes de movimento ----------
  function renderMov() {
    const a = ED.a;
    a.mov = a.mov || { t: {}, livres: [] };
    a.mov.t = a.mov.t || {};
    a.mov.livres = a.mov.livres || [];
    a.mov.fotos = a.mov.fotos || {};
    const M = a.mov;
    const sum = Mov.summarize(M);
    const cnt = (id) => { const t = sum.tests.find((x) => x.id === id); return t ? t.lines.length : 0; };
    const val = (tid, k) => (M.t[tid] || {})[k];
    const opt = (o, v) => o.map((x) => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
    const field = (t, c) => {
      if (c.g) return `<h3>${esc(c.g)}</h3>`;
      const id = `${t.id}|${c.k}`, v = val(t.id, c.k);
      if (c.t === 'chk') return `<label class="mv-chk"><input type="checkbox" data-mv="${id}" data-t="chk" ${v ? 'checked' : ''}> <span>${esc(c.label)}</span></label>`;
      if (c.t === 'bi') return `<div class="mv-bi"><span>${esc(c.label)}</span><label><input type="checkbox" data-mv="${id}" data-t="bi" data-s="D" ${v && v.D ? 'checked' : ''}> D</label><label><input type="checkbox" data-mv="${id}" data-t="bi" data-s="E" ${v && v.E ? 'checked' : ''}> E</label></div>`;
      if (c.t === 'num') return `<div><label>${esc(c.label)}</label><input inputmode="decimal" data-mv="${id}" data-t="num" value="${esc(v || '')}"></div>`;
      if (c.t === 'txt') return `<div><label>${esc(c.label)}</label><input data-mv="${id}" data-t="txt" value="${esc(v || '')}"></div>`;
      if (c.t === 'sel') return `<div><label>${esc(c.label)}</label><select data-mv="${id}" data-t="sel">${opt(c.opts, v || '')}</select></div>`;
      if (c.t === 'sel2') return `<div><label>${esc(c.label)}</label><div class="row"><select data-mv="${id}" data-t="sel2" data-s="D" style="flex:1">${opt(c.opts, v && v.D || '')}</select><select data-mv="${id}" data-t="sel2" data-s="E" style="flex:1">${opt(c.opts, v && v.E || '')}</select></div><span class="muted">Direito · Esquerdo</span></div>`;
      if (c.t === 'n2') return `<div><label>${esc(c.label)} (${esc(c.unit)})</label><div class="row"><input inputmode="decimal" placeholder="Direito" data-mv="${id}" data-t="n2" data-s="D" value="${esc(v && v.D || '')}" style="flex:1"><input inputmode="decimal" placeholder="Esquerdo" data-mv="${id}" data-t="n2" data-s="E" value="${esc(v && v.E || '')}" style="flex:1"></div></div>`;
      if (c.t === 'tri') return `<div><label>${esc(c.label)}: três tentativas por lado</label>${['D', 'E'].map((s) => `<div class="row" style="margin-bottom:4px"><b style="width:70px">${s === 'D' ? 'Direito' : 'Esquerdo'}</b>${[0, 1, 2].map((i) => `<input inputmode="decimal" data-mv="${id}" data-t="tri" data-s="${s}" data-i="${i}" value="${esc(v && v[s] && v[s][i] || '')}" style="flex:1;min-width:60px">`).join('')}</div>`).join('')}</div>`;
      return '';
    };
    const fotosHtml = (t) => {
      const L = M.fotos[t.id] || [];
      return `<h3>Fotos e ângulos</h3><p class="muted">Foto do teste (um quadro do agachamento, a posição final do joelho na parede…). Em "Medir" você traça ângulos livres, ajusta os pontos e mantém vários ângulos na mesma foto.</p>
        <div class="row"><label class="btn" style="margin:0;color:var(--ink)">Adicionar foto<input type="file" accept="image/*" data-mvfoto="${t.id}" hidden></label></div>
        ${L.map((f) => `<div class="row" style="align-items:center;border-bottom:1px solid var(--line);padding:6px 0"><img src="${f.photo}" alt="" style="height:64px;border-radius:6px"><input data-mvfn="${t.id}|${f.id}" value="${esc(f.nome)}" style="flex:1;min-width:120px"><span class="muted">${(f.free || []).filter((x) => Angles.freeValue(x)).length} ângulo(s)</span><button data-mvmed="${t.id}|${f.id}">Medir</button><button class="danger" data-mvdel="${t.id}|${f.id}">Apagar</button></div>`).join('')}`;
    };
    main.innerHTML = `${tabsHtml()}
      <div class="card"><h2>Testes de movimento</h2>
        <p class="muted">Registro do que foi observado, sem diagnóstico e sem pontos de corte próprios. Marque só o que viu. Os protocolos abaixo são um guia: confira com o seu manual de movimento.</p></div>
      ${Mov.TESTS.map((t) => `<details class="card mv" data-tid="${t.id}" ${ED.movOpen === t.id ? 'open' : ''}><summary><b>${esc(t.nome)}</b> <span class="muted">${cnt(t.id) ? '· ' + cnt(t.id) + ' registro(s)' : ''}</span></summary>
        <p class="muted">${esc(t.protocolo)}</p>
        <div class="grid2">${t.campos.map((c) => field(t, c)).join('')}</div>
        <label>Observação</label><textarea data-mv="${t.id}|obs" data-t="txt">${esc(val(t.id, 'obs') || '')}</textarea>${fotosHtml(t)}</details>`).join('')}
      <div class="card"><h2>Testes livres</h2><p class="muted">Outro teste com medida nos dois lados (ex.: elevação da perna estendida, ponte unilateral em repetições).</p>
        <div id="livres">${M.livres.map((l, i) => `<div class="grid2" style="border-bottom:1px solid var(--line);padding-bottom:8px">
          <div><label>Nome do teste</label><input data-lv="${i}" data-k="nome" value="${esc(l.nome)}"></div>
          <div><label>Unidade</label><input data-lv="${i}" data-k="unidade" value="${esc(l.unidade)}" placeholder="cm, °, repetições, s"></div>
          <div><label>Direito</label><input inputmode="decimal" data-lv="${i}" data-k="d" value="${esc(l.d)}"></div>
          <div><label>Esquerdo</label><input inputmode="decimal" data-lv="${i}" data-k="e" value="${esc(l.e)}"></div>
          <div><label>Observação</label><input data-lv="${i}" data-k="obs" value="${esc(l.obs)}"></div>
          <div><label>&nbsp;</label><button class="danger" data-lvdel="${i}">Apagar teste</button></div></div>`).join('')}</div>
        <div class="row" style="margin-top:8px"><button id="lv-add">+ Teste livre</button></div></div>`;
    bindTabs();
    const upd = (el) => {
      const [tid, k] = el.dataset.mv.split('|'), ty = el.dataset.t, t = (M.t[tid] = M.t[tid] || {}), cur = t[k];
      if (k === 'obs' || ty === 'txt' || ty === 'num' || ty === 'sel') t[k] = el.value;
      else if (ty === 'chk') t[k] = el.checked;
      else if (ty === 'bi') t[k] = { ...(cur || {}), [el.dataset.s]: el.checked };
      else if (ty === 'n2' || ty === 'sel2') t[k] = { ...(cur || {}), [el.dataset.s]: el.value };
      else if (ty === 'tri') { const o = { D: [...((cur && cur.D) || ['', '', ''])], E: [...((cur && cur.E) || ['', '', ''])] }; o[el.dataset.s][+el.dataset.i] = el.value; t[k] = o; }
      saveSoon();
    };
    main.querySelectorAll('[data-mv]').forEach((el) => (el[el.type === 'checkbox' || el.tagName === 'SELECT' ? 'onchange' : 'oninput'] = () => upd(el)));
    main.querySelectorAll('[data-lv]').forEach((el) => (el.oninput = () => { M.livres[+el.dataset.lv][el.dataset.k] = el.value; saveSoon(); }));
    main.querySelectorAll('[data-lvdel]').forEach((b) => (b.onclick = () => { M.livres.splice(+b.dataset.lvdel, 1); saveSoon(); renderMov(); }));
    $('#lv-add').onclick = () => { M.livres.push({ nome: '', unidade: '', d: '', e: '', obs: '' }); saveSoon(); renderMov(); };
    main.querySelectorAll('details.mv').forEach((d) => d.addEventListener('toggle', () => { if (d.open) ED.movOpen = d.dataset.tid; }));
    main.querySelectorAll('[data-mvfoto]').forEach((inp) => (inp.onchange = async () => {
      const file = inp.files[0];
      if (!file) return;
      const tid = inp.dataset.mvfoto;
      const src = await shrinkToDataUrl(file, 1800);
      openCrop(src, async (photo) => {
        (M.fotos[tid] = M.fotos[tid] || []).push({ id: uid(), nome: 'Foto ' + ((M.fotos[tid] || []).length + 1), photo, free: [] });
        ED.movOpen = tid;
        await DB.put('assessments', ED.a);
        renderMov();
      });
    }));
    const findFoto = (key) => { const [tid, fid] = key.split('|'); return { tid, f: (M.fotos[tid] || []).find((x) => x.id === fid) }; };
    main.querySelectorAll('[data-mvfn]').forEach((el) => (el.oninput = () => { const { f } = findFoto(el.dataset.mvfn); if (f) { f.nome = el.value; saveSoon(); } }));
    main.querySelectorAll('[data-mvmed]').forEach((b) => (b.onclick = () => {
      const { tid, f } = findFoto(b.dataset.mvmed);
      if (!f) return;
      openFreeWorkspace({ title: Mov.TESTS.find((t) => t.id === tid).nome + ' — ' + f.nome, photo: f.photo, free: f.free, templates: Mov.TESTS.find((t) => t.id === tid).modelos, onChange: saveSoon, back: () => { ED.movOpen = tid; renderTab('mov'); } });
    }));
    main.querySelectorAll('[data-mvdel]').forEach((b) => (b.onclick = () => {
      const { tid, f } = findFoto(b.dataset.mvdel);
      if (!f || !confirm('Apagar esta foto e os ângulos medidos nela?')) return;
      M.fotos[tid] = M.fotos[tid].filter((x) => x.id !== f.id);
      ED.movOpen = tid; saveSoon(); renderMov();
    }));
  }

  // ---------- Checklist de captura ----------
  const CHECKLIST = [
    ['dist', 'Câmera a cerca de 3 m do aluno, sempre à mesma distância'],
    ['alt', 'Câmera na altura de cerca da metade da estatura do aluno (tripé)'],
    ['perp', 'Câmera perpendicular ao aluno e aparelho nivelado'],
    ['prumo', 'Fio de prumo (ou régua) com duas marcas de distância conhecida visível na foto, para calibrar'],
    ['fundo', 'Fundo liso, piso nivelado e iluminação uniforme'],
    ['roupa', 'Roupa mínima e justa, cabelo preso, sem acessórios'],
    ['adesivos', 'Adesivos nos pontos anatômicos, quando usados (EIAS, EIPS, acrômio, C7…)'],
    ['pes', 'Aluno descalço, pés na marca, postura habitual e relaxada, olhando para o horizonte'],
    ['mesmas', 'Mesmas condições da avaliação anterior (distância, roupa, horário, calçado)'],
    ['consent', 'Consentimento de imagem registrado'],
  ];

  function renderChecklist() {
    const box = $('#chk');
    if (!box) return;
    const a = ED.a;
    const n = () => CHECKLIST.filter(([k]) => a.checklist[k]).length;
    box.innerHTML = `<summary>Checklist de captura <span class="muted" id="chkn">(${n()} de ${CHECKLIST.length})</span></summary>
      ${CHECKLIST.map(([k, l]) => `<label style="display:flex;gap:8px;align-items:flex-start;color:var(--ink);font-size:14px"><input type="checkbox" data-chk="${k}" style="width:auto;margin-top:3px" ${a.checklist[k] ? 'checked' : ''}> <span>${esc(l)}</span></label>`).join('')}`;
    box.querySelectorAll('[data-chk]').forEach((el) => (el.onchange = () => { a.checklist[el.dataset.chk] = el.checked; saveSoon(); $('#chkn').textContent = `(${n()} de ${CHECKLIST.length})`; }));
  }

  // ---------- Evolução: antes e depois, gráfico e animação ----------
  async function studentHistory(studentId) {
    return (await DB.all('assessments')).filter((x) => x.studentId === studentId).map(normalize).sort((a, b) => a.data.localeCompare(b.data));
  }
  function seriesFor(history, code) {
    const out = [];
    history.forEach((a) => {
      const r = allResults(a).flatMap((g) => g.res).find((x) => x.code === code);
      if (r) out.push({ data: a.data, value: r.signed != null ? r.signed : r.value, unit: r.unit, label: r.label });
    });
    return out;
  }
  function drawChart(c, series, title) {
    const W = c.width, H = c.height, g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const m = { l: 56, r: 40, t: 34, b: 40 };
    const vals = series.map((s) => s.value);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 1) { const mid = (hi + lo) / 2; lo = mid - 0.5; hi = mid + 0.5; }
    const pad = (hi - lo) * 0.2; lo -= pad; hi += pad;
    const X = (i) => m.l + (series.length === 1 ? 0.5 : i / (series.length - 1)) * (W - m.l - m.r);
    const Y = (v) => H - m.b - ((v - lo) / (hi - lo)) * (H - m.t - m.b);
    g.font = '13px -apple-system, sans-serif'; g.fillStyle = '#111';
    g.fillText(title, 10, 20);
    g.strokeStyle = '#ccd3da'; g.lineWidth = 1; g.fillStyle = '#556';
    for (let i = 0; i <= 4; i++) {
      const v = lo + ((hi - lo) * i) / 4, y = Y(v);
      g.beginPath(); g.moveTo(m.l, y); g.lineTo(W - m.r, y); g.stroke();
      g.fillText(Angles.fmt(v), 8, y + 4);
    }
    g.strokeStyle = '#1f78d1'; g.lineWidth = 2.5; g.beginPath();
    series.forEach((s, i) => (i ? g.lineTo(X(i), Y(s.value)) : g.moveTo(X(i), Y(s.value))));
    g.stroke();
    series.forEach((s, i) => {
      g.beginPath(); g.arc(X(i), Y(s.value), 5, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#1f78d1'; g.stroke();
      g.fillStyle = '#111'; const vl = Angles.fmt(s.value) + (s.unit === 'cm' ? ' cm' : '°'); g.fillText(vl, X(i) - g.measureText(vl).width / 2, Y(s.value) - 10);
      g.fillStyle = '#556'; const dl = fmtDate(s.data).slice(0, 5) + '/' + s.data.slice(2, 4); g.fillText(dl, X(i) - g.measureText(dl).width / 2, H - 14);
    });
  }
  function chartImage(series, title) {
    const c = document.createElement('canvas');
    c.width = 560; c.height = 230;
    drawChart(c, series, title);
    return c.toDataURL('image/png');
  }
  // Duas fotos da mesma vista lado a lado. Com calibração nas duas, ficam na mesma escala real (cm).
  function beforeAfterCanvas(A, B, key, opts) {
    const PW = 440, PH = 660, GAP = 10;
    const c = document.createElement('canvas');
    c.width = PW * 2 + GAP; c.height = PH + 30;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    const both = A.v.calib && B.v.calib;
    const base = (X) => (both ? 1 / X.v.calib.pxPerCm : Math.min(PW / X.img.naturalWidth, PH / X.img.naturalHeight));
    let sA = base(A), sB = base(B);
    const kfit = Math.min(PW / (A.img.naturalWidth * sA), PH / (A.img.naturalHeight * sA), PW / (B.img.naturalWidth * sB), PH / (B.img.naturalHeight * sB));
    if (both) { sA *= kfit; sB *= kfit; }
    [[A, sA, 0, 'Antes'], [B, sB, PW + GAP, 'Depois']].forEach(([X, s, ox, label]) => {
      g.save();
      g.beginPath(); g.rect(ox, 30, PW, PH); g.clip();
      g.fillStyle = '#000'; g.fillRect(ox, 30, PW, PH);
      const x = ox + (PW - X.img.naturalWidth * s) / 2, y = 30 + (PH - X.img.naturalHeight * s) / 2;
      drawView(g, X.img, key, X.v, { s, x, y }, 1, { grid: false, mask: opts && opts.mask, style: 'plain', noLabels: true });
      g.restore();
      g.fillStyle = '#111'; g.font = '600 15px -apple-system, sans-serif';
      g.fillText(`${label} — ${fmtDate(X.data)}`, ox + 4, 20);
    });
    return { canvas: c, mesmaEscala: !!both };
  }

  async function renderEvol() {
    const a = ED.a;
    main.innerHTML = `${tabsHtml()}<div class="card"><p class="muted">Carregando…</p></div>`;
    const hist = await studentHistory(a.studentId);
    const others = hist.filter((x) => x.id !== a.id);
    const prevDefault = a.comparar && others.find((x) => x.id === a.comparar) ? a.comparar : (others.filter((x) => x.data <= a.data).slice(-1)[0] || others[0] || {}).id;
    const codes = [];
    VIEW_KEYS.forEach((k) => Angles.VIEWS[k].measures.forEach((m) => { if (seriesFor(hist, m.code).length >= 2) codes.push([m.code, `${m.code} — ${m.label}`]); }));
    main.innerHTML = `${tabsHtml()}
      <div class="card"><h2>Antes e depois</h2>
        ${others.length ? `<div class="grid2"><div><label>Comparar a avaliação atual (${fmtDate(a.data)}) com</label><select id="ev-cmp">${others.map((o) => `<option value="${o.id}" ${o.id === prevDefault ? 'selected' : ''}>${fmtDate(o.data)}</option>`).join('')}</select></div></div>
        <p class="muted" id="ev-note"></p><div id="ev-ba"></div>` : '<p class="muted">Este aluno só tem uma avaliação. A comparação aparece quando houver outra.</p>'}
      </div>
      <div class="card"><h2>Evolução das medidas</h2>
        ${codes.length ? `<label>Medida</label><select id="ev-code">${codes.map(([c, l]) => `<option value="${c}">${esc(l)}</option>`).join('')}</select>
          <canvas id="ev-chart" width="640" height="260" style="width:100%;max-width:640px;border:1px solid var(--line);border-radius:8px;margin-top:8px"></canvas>
          <p class="muted" id="ev-chart-note"></p>` : '<p class="muted">A evolução aparece quando houver pelo menos duas avaliações com a mesma medida completa.</p>'}
      </div>
      <div class="card"><h2>Animação da evolução</h2>
        ${hist.length >= 2 ? `<div class="row"><select id="ev-view" style="width:auto">${VIEW_KEYS.map((k) => `<option value="${k}">${esc(Angles.VIEWS[k].label)}</option>`).join('')}</select><button id="ev-play">Reproduzir</button><button id="ev-stop">Parar</button></div>
          <canvas id="ev-anim" width="440" height="660" style="width:100%;max-width:330px;border:1px solid var(--line);border-radius:8px;margin-top:8px"></canvas>` : '<p class="muted">Precisa de pelo menos duas avaliações.</p>'}
      </div>`;
    bindTabs();
    let animTimer;
    const stopAnim = () => { clearInterval(animTimer); animTimer = null; };
    if (others.length) {
      const showBA = async () => {
        const prev = others.find((x) => x.id === $('#ev-cmp').value);
        const box = $('#ev-ba');
        box.innerHTML = '';
        let any = false, allCal = true;
        for (const k of VIEW_KEYS) {
          if (!a.views[k].photo || !prev.views[k].photo) continue;
          any = true;
          const [ia, ib] = [await loadImg(prev.views[k].photo), await loadImg(a.views[k].photo)];
          const r = beforeAfterCanvas({ img: ia, v: prev.views[k], data: prev.data }, { img: ib, v: a.views[k], data: a.data }, k, { mask: false });
          if (!r.mesmaEscala) allCal = false;
          const cvs = r.canvas; cvs.style.cssText = 'width:100%;max-width:640px;border:1px solid var(--line);border-radius:8px;margin:6px 0';
          box.insertAdjacentHTML('beforeend', `<h3>${esc(Angles.VIEWS[k].label)}</h3>`);
          box.appendChild(cvs);
        }
        $('#ev-note').textContent = any ? (allCal ? 'Fotos na mesma escala real (calibradas nas duas avaliações).' : 'Sem calibração nas duas fotos: o tamanho foi ajustado pela altura da foto, não pela escala real. Compare com cautela.') : 'Nenhuma vista tem foto nas duas avaliações.';
      };
      $('#ev-cmp').onchange = showBA;
      showBA();
    }
    if (codes.length) {
      const showChart = () => {
        const s = seriesFor(hist, $('#ev-code').value);
        drawChart($('#ev-chart'), s, $('#ev-code').selectedOptions[0].textContent);
        const ref = refFor($('#ev-code').value);
        $('#ev-chart-note').textContent = ref && ref.erro ? `Erro de medida informado: ${ref.erro}. Mudanças menores que isso não indicam mudança real.` : 'Sem erro de medida informado: não é possível afirmar que uma mudança supera o erro.';
      };
      $('#ev-code').onchange = showChart;
      showChart();
    }
    if (hist.length >= 2) {
      $('#ev-play').onclick = async () => {
        stopAnim();
        const k = $('#ev-view').value;
        const frames = [];
        for (const x of hist) if (x.views[k].photo) frames.push({ img: await loadImg(x.views[k].photo), v: x.views[k], data: x.data });
        if (frames.length < 2) return alert('Menos de duas avaliações têm foto nesta vista.');
        const c = $('#ev-anim'), g = c.getContext('2d');
        let i = 0;
        const step = () => {
          const f = frames[i % frames.length];
          g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
          const s = Math.min(c.width / f.img.naturalWidth, (c.height - 30) / f.img.naturalHeight);
          drawView(g, f.img, k, f.v, { s, x: (c.width - f.img.naturalWidth * s) / 2, y: 30 + (c.height - 30 - f.img.naturalHeight * s) / 2 }, 1, { grid: false, mask: ED.a.mascara, style: 'plain', noLabels: true });
          g.fillStyle = '#fff'; g.font = '600 18px -apple-system, sans-serif'; g.fillText(fmtDate(f.data), 10, 22);
          i++;
        };
        step();
        animTimer = setInterval(step, 1100);
      };
      $('#ev-stop').onclick = stopAnim;
    }
    ED.stopAnim = stopAnim;
  }

  // ---------- Câmera guiada (grade, moldura e nível do aparelho) ----------
  async function openCamera(key) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert('Este navegador não permite abrir a câmera aqui. Use "Escolher ou tirar foto".');
    // No iOS, o sensor de movimento pede permissão e só pode ser pedido a partir de um toque.
    try { if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) await DeviceMotionEvent.requestPermission(); } catch (_) { /* segue sem nível */ }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false }); }
    catch (e) { return alert('Não foi possível abrir a câmera (permissão negada?). Use "Escolher ou tirar foto".'); }
    const box = $('#cam-overlay');
    box.hidden = false;
    box.innerHTML = `<video id="cam-video" playsinline muted autoplay></video>
      <svg id="cam-grid" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect x="14" y="4" width="72" height="92" fill="none" stroke="#3ddc84" stroke-width=".5"/>
        <line x1="50" y1="0" x2="50" y2="100" stroke="#3ddc84" stroke-width=".35"/>
        <line x1="0" y1="50" x2="100" y2="50" stroke="#fff" stroke-opacity=".6" stroke-width=".25"/>
        <line x1="0" y1="33.3" x2="100" y2="33.3" stroke="#fff" stroke-opacity=".35" stroke-width=".2"/>
        <line x1="0" y1="66.6" x2="100" y2="66.6" stroke="#fff" stroke-opacity=".35" stroke-width=".2"/>
      </svg>
      <div id="cam-level"><span id="cam-lv-text">Nível: sem sensor</span></div>
      <div id="cam-msg">Corpo inteiro dentro da moldura · câmera na altura do meio do tronco · aparelho nivelado e perpendicular ao aluno</div>
      <div id="cam-btns"><button id="cam-cancel">Cancelar</button><button id="cam-shot" class="primary">Fotografar</button></div>`;
    const video = $('#cam-video');
    video.srcObject = stream;
    let roll = null, pitch = null;
    const onMotion = (e) => {
      const g = e.accelerationIncludingGravity;
      if (!g || g.x == null || g.y == null || g.z == null) return;
      // Aparelho em pé: a gravidade fica no plano da tela; roll = inclinação da imagem, pitch = para frente ou para trás.
      let r = (Math.atan2(g.x, g.y) * 180) / Math.PI;
      r = ((r + 540) % 360) - 180;
      if (Math.abs(r) > 90) r = r > 0 ? r - 180 : r + 180;
      roll = r;
      pitch = (Math.atan2(g.z, Math.hypot(g.x, g.y)) * 180) / Math.PI;
      const ok = Math.abs(roll) < 1 && Math.abs(pitch) < 2;
      const t = $('#cam-lv-text');
      if (t) { t.textContent = `Inclinação ${Angles.fmt(Math.abs(roll))}° · frente/trás ${Angles.fmt(Math.abs(pitch))}° ${ok ? '✔ nivelado' : '— ajuste'}`; $('#cam-level').className = ok ? 'ok' : 'bad'; }
    };
    window.addEventListener('devicemotion', onMotion);
    const close = () => { window.removeEventListener('devicemotion', onMotion); stream.getTracks().forEach((t) => t.stop()); box.hidden = true; box.innerHTML = ''; };
    $('#cam-cancel').onclick = close;
    $('#cam-shot').onclick = () => {
      const c = document.createElement('canvas');
      c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);
      const tilt = roll == null ? null : Math.round(roll * 10) / 10;
      close();
      c.toBlob((b) => loadPhoto(key, b, { tilt }), 'image/jpeg', 0.92);
    };
  }

  // ---------- Guia de fotos para o aluno ----------
  const GUIA_ALUNO = [
    'Guia para as fotos da sua avaliação postural',
    '',
    'Para as fotos ficarem boas e as medidas valerem, siga estes passos:',
    '',
    '• Roupa: short ou bermuda justa e top ou sunga/biquíni, ou sem camisa. Cabelo preso, sem boné, relógio ou colares.',
    '• Local: parede lisa e clara atrás de você, piso plano e boa luz (sem sombra forte no corpo).',
    '• Celular: em pé (vertical), numa superfície firme ou tripé, na altura do meio do seu tronco (cerca de 1 m), a uns 3 metros de você, bem de frente para o lugar onde você vai ficar. Não incline o celular.',
    '• Sua posição: descalço, pés na largura do quadril (marque o chão com fita), braços soltos ao lado do corpo, olhando para um ponto na altura dos olhos, na sua postura normal, sem se "arrumar".',
    '• Apareça de corpo inteiro, da cabeça aos pés, dentro do enquadramento.',
    '',
    'Tire 4 fotos, sem mexer o celular entre elas:',
    '1) De frente.',
    '2) De costas.',
    '3) De lado, com o lado direito virado para o celular.',
    '4) De lado, com o lado esquerdo virado para o celular.',
    '',
    'Se possível, deixe visível na foto um fio de prumo (barbante com um peso) ou uma fita métrica de 1 metro presa na parede ao seu lado: ela ajuda a medir com precisão.',
    '',
    'Envie as fotos somente para o seu avaliador (não para grupos). As imagens são usadas só para a sua avaliação.',
  ].join('\n');

  // Figuras do guia do aluno: corpo em posição anatômica nas quatro posições da foto e o arranjo do celular.
  // Desenhadas no app (figuras.js, SVG), sem imagem de terceiros. Servem só para mostrar as posições.
  const GUIDE_W = 800, GUIDE_H = 600;
  function guideFigures(px) {
    const W = GUIDE_W, H = GUIDE_H;
    const BODY = '#9db4cc', INK = '#1d2b3a', TAPE = '#e0a100';
    const S = 0.7, xs = [100, 300, 500, 700], Y0 = 26;
    const fig = (view, i) => Figuras.use(view, xs[i] - 100 * S, Y0, S);
    const footY = Y0 + 531 * S;
    const tape = (cx, w, gap) => (gap ? [-1, 1].map((k) => `<rect x="${cx + k * gap - w / 2}" y="${footY}" width="${w}" height="3" fill="${TAPE}"/>`).join('') : `<rect x="${cx - w / 2}" y="${footY}" width="${w}" height="3" fill="${TAPE}"/>`);
    const lab = (x, y, t) => `<text x="${x}" y="${y}" font-size="17" font-weight="700" fill="${INK}" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="4">${t}</text>`;
    const cap = (cx, l1, l2) => `<text x="${cx}" y="${Y0 + 560 * S}" font-size="16" font-weight="700" fill="${INK}" text-anchor="middle">${l1}</text><text x="${cx}" y="${Y0 + 560 * S + 19}" font-size="13" fill="${INK}" text-anchor="middle">${l2}</text>`;
    const ly = Y0 + 200 * S;
    const setup = `<g transform="translate(0,452)"><line x1="40" y1="100" x2="760" y2="100" stroke="${INK}" stroke-width="1.5"/>
      <text x="40" y="24" font-size="13" fill="${INK}">celular em pé, a cerca de 1 m do chão, sem inclinar</text>
      <rect x="84" y="40" width="12" height="22" rx="2.5" fill="${INK}"/><line x1="90" y1="62" x2="90" y2="100" stroke="${INK}" stroke-width="3"/><line x1="90" y1="82" x2="78" y2="100" stroke="${INK}" stroke-width="2"/><line x1="90" y1="82" x2="102" y2="100" stroke="${INK}" stroke-width="2"/>
      <path d="M98 48 L678 18 M98 54 L678 94" stroke="${INK}" stroke-width="1" stroke-dasharray="4 4" fill="none"/>
      <ellipse cx="700" cy="24" rx="8" ry="9" fill="${BODY}"/><line x1="700" y1="33" x2="700" y2="72" stroke="${BODY}" stroke-width="12" stroke-linecap="round"/><line x1="700" y1="72" x2="700" y2="96" stroke="${BODY}" stroke-width="14" stroke-linecap="round"/>
      <line x1="90" y1="120" x2="700" y2="120" stroke="${INK}" stroke-width="1.5"/><path d="M98 115 L90 120 L98 125M692 115 L700 120 L692 125" fill="none" stroke="${INK}" stroke-width="1.5"/>
      <text x="395" y="141" font-size="14" font-weight="700" fill="${INK}" text-anchor="middle">cerca de 3 m até você</text></g>`;
    const body = `<rect width="${W}" height="${H}" fill="#fff"/>${Figuras.defs()}
      <text x="${W / 2}" y="16" font-size="14" fill="${INK}" text-anchor="middle">Corpo inteiro no quadro, pés na largura do quadril sobre a fita, braços soltos, olhar no horizonte</text>
      ${fig('front', 0)}${fig('back', 1)}${fig('sider', 2)}${fig('sidel', 3)}
      ${tape(xs[0], 20, 15)}${tape(xs[1], 20, 15)}${tape(xs[2], 44)}${tape(xs[3], 44)}
      ${lab(xs[0] - 84, ly, 'D')}${lab(xs[0] + 84, ly, 'E')}${lab(xs[1] - 84, ly, 'E')}${lab(xs[1] + 84, ly, 'D')}${lab(xs[2], Y0 + 150 * S, 'D')}${lab(xs[3], Y0 + 150 * S, 'E')}
      ${cap(xs[0], '1) De frente', 'palmas à frente')}${cap(xs[1], '2) De costas', '')}${cap(xs[2], '3) De lado', 'lado direito para o celular')}${cap(xs[3], '4) De lado', 'lado esquerdo para o celular')}
      ${setup}`;
    const size = px ? `width="${px}" height="${Math.round((px * H) / W)}"` : 'width="100%"';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${size} font-family="Helvetica, Arial, sans-serif" role="img" aria-label="Posições das quatro fotos: de frente, de costas e de lado, direito e esquerdo">${body}</svg>`;
  }

  async function guidePng() {
    const url = URL.createObjectURL(new Blob([guideFigures(1920)], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 1920; c.height = Math.round((1920 * GUIDE_H) / GUIDE_W);
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((r) => c.toBlob(r, 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  }

  function showStudentGuide(backFn) {
    ED.active = false;
    setHeader('Guia de fotos para o aluno', backFn || showHome);
    main.innerHTML = `<div class="card"><h2>Guia de fotos para o aluno</h2>
      <p class="muted">Texto pronto para enviar pelo WhatsApp ou imprimir. O aluno só envia as fotos para você (individualmente), depois do consentimento.</p>
      <div style="background:#fff;border-radius:8px;padding:6px;margin:8px 0;max-width:760px">${guideFigures()}</div>
      <pre id="guia" style="white-space:pre-wrap;font:inherit;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px">${esc(GUIA_ALUNO)}</pre>
      <div class="row"><button class="primary" id="g-share">Compartilhar</button><button id="g-img">Compartilhar figuras (imagem)</button><button id="g-copy">Copiar texto</button><button id="g-print">Imprimir / salvar em PDF</button></div></div>`;
    $('#g-share').onclick = async () => {
      if (navigator.share) { try { await navigator.share({ title: 'Guia de fotos — avaliação postural', text: GUIA_ALUNO }); } catch (_) { /* cancelado */ } }
      else { try { await navigator.clipboard.writeText(GUIA_ALUNO); alert('Compartilhar não está disponível aqui; o texto foi copiado.'); } catch (_) { alert('Selecione e copie o texto acima.'); } }
    };
    $('#g-img').onclick = async () => {
      try {
        const blob = await guidePng();
        const file = new File([blob], 'guia-posicoes-das-fotos.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Posições das fotos — avaliação postural' }); } catch (_) { /* cancelado */ } return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      } catch (_) { alert('Não consegui gerar a imagem neste aparelho.'); }
    };
    $('#g-copy').onclick = async () => { try { await navigator.clipboard.writeText(GUIA_ALUNO); alert('Texto copiado.'); } catch (_) { alert('Selecione e copie o texto acima.'); } };
    $('#g-print').onclick = () => {
      $('#report').innerHTML = `<div class="rp"><div class="page"><div class="brandbar"><img src="logo-ct.png" alt="CT Pedro Bispo"><img src="logo-correplus.webp" alt="Corre+"></div>
        <h1>${esc(GUIA_ALUNO.split('\n')[0])}</h1><div style="margin:6px 0">${guideFigures()}</div><div style="white-space:pre-wrap;font-size:11pt;line-height:1.4">${esc(GUIA_ALUNO.split('\n').slice(2).join('\n'))}</div></div></div>`;
      window.print();
    };
  }

  // ---------- Segurança: trava por PIN ----------
  const enc = new TextEncoder();
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  async function pinHash(pin, salt) {
    const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 150000, hash: 'SHA-256' }, key, 256));
  }
  let lockedNow = false, hiddenAt = 0, wrong = 0, lockUntil = 0;
  function showLock() {
    const el = $('#lock');
    lockedNow = true;
    el.hidden = false;
    el.innerHTML = `<div class="lockbox"><img src="logo-ct.png" alt="" style="height:90px"><h2>Avaliação Postural</h2>
      <p class="muted">Digite o PIN para abrir.</p>
      <input id="lk-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" style="text-align:center;font-size:24px;letter-spacing:6px">
      <p class="warn" id="lk-msg"></p><button class="primary" id="lk-go">Abrir</button></div>`;
    const tryPin = async () => {
      if (Date.now() < lockUntil) { $('#lk-msg').textContent = `Aguarde ${Math.ceil((lockUntil - Date.now()) / 1000)} s para tentar de novo.`; return; }
      const ok = (await pinHash($('#lk-pin').value, state.pin.salt)) === state.pin.hash;
      if (ok) { wrong = 0; lockedNow = false; el.hidden = true; el.innerHTML = ''; if (!ED.active && !main.innerHTML) showHome(); return; }
      wrong++;
      $('#lk-pin').value = '';
      $('#lk-msg').textContent = 'PIN incorreto.';
      if (wrong >= 5) { lockUntil = Date.now() + 30000; wrong = 0; $('#lk-msg').textContent = 'Muitas tentativas. Aguarde 30 s.'; }
    };
    $('#lk-go').onclick = tryPin;
    $('#lk-pin').onkeydown = (e) => { if (e.key === 'Enter') tryPin(); };
    setTimeout(() => $('#lk-pin') && $('#lk-pin').focus(), 50);
  }
  document.addEventListener('visibilitychange', () => {
    if (!state.pin) return;
    if (document.hidden) hiddenAt = Date.now();
    else if (!lockedNow && hiddenAt && Date.now() - hiddenAt > (state.pin.segundos || 60) * 1000) showLock();
  });

  function showSecurity() {
    ED.active = false;
    setHeader('Segurança', showHome);
    const has = !!state.pin;
    main.innerHTML = `<div class="card"><h2>Trava por PIN</h2>
      <p class="muted">O PIN bloqueia a tela do app ao abrir e quando você volta de outro aplicativo depois de um tempo. <b>Não criptografa os dados</b>: protege contra quem pegar o iPad desbloqueado. Mantenha também a senha do iPad ativa.</p>
      <p class="warn"><b>Se esquecer o PIN</b>, a única saída é apagar os dados do site no Safari, o que apaga os alunos e as fotos. Faça a <b>cópia de segurança</b> antes.</p>
      ${has ? `<p>PIN ativo. Bloqueia depois de <b>${state.pin.segundos || 60} s</b> fora do app.</p>
        <div class="grid2"><div><label>PIN atual</label><input id="s-old" type="password" inputmode="numeric" maxlength="8"></div>
        <div><label>Novo PIN (4 a 8 dígitos) — deixe vazio para remover</label><input id="s-new" type="password" inputmode="numeric" maxlength="8"></div>
        <div><label>Bloquear após (segundos)</label><input id="s-sec" inputmode="numeric" value="${esc(state.pin.segundos || 60)}"></div></div>`
      : `<div class="grid2"><div><label>Novo PIN (4 a 8 dígitos)</label><input id="s-new" type="password" inputmode="numeric" maxlength="8"></div>
        <div><label>Repita o PIN</label><input id="s-new2" type="password" inputmode="numeric" maxlength="8"></div>
        <div><label>Bloquear após (segundos)</label><input id="s-sec" inputmode="numeric" value="60"></div></div>`}
      <div class="row" style="margin-top:10px"><button class="primary" id="s-save">Salvar</button></div></div>`;
    $('#s-save').onclick = async () => {
      const np = $('#s-new').value.trim(), seg = Math.max(10, parseInt($('#s-sec').value, 10) || 60);
      if (has) {
        if ((await pinHash($('#s-old').value, state.pin.salt)) !== state.pin.hash) return alert('PIN atual incorreto.');
        if (!np) { if (!confirm('Remover a trava por PIN?')) return; await DB.del('settings', 'pin'); state.pin = null; alert('PIN removido.'); return showHome(); }
      } else {
        if (!np) return alert('Digite o novo PIN.');
        if (np !== $('#s-new2').value.trim()) return alert('Os dois PINs não são iguais.');
      }
      if (!/^\d{4,8}$/.test(np)) return alert('Use de 4 a 8 dígitos.');
      const salt = uid();
      state.pin = { id: 'pin', salt, hash: await pinHash(np, salt), segundos: seg };
      await DB.put('settings', state.pin);
      alert('PIN salvo.');
      showHome();
    };
  }

  function start() {
    if (state.pin) { showLock(); }
    showHome();
  }


  // ---------- Ângulos livres: espaço próprio, separado da marcação postural ----------
  // Serve para qualquer foto: vista postural, agachamento overhead, joelho na parede, step-down…
  const FREE_TIPOS = {
    '3pt': { n: 3, nome: 'Ângulo de 3 pontos', rot: 'Ângulo', dicas: ['1º ponto', 'vértice (2º ponto)', '3º ponto'] },
    h: { n: 2, nome: 'Linha × horizontal', rot: 'Inclinação', dicas: ['1º ponto', '2º ponto'] },
    v: { n: 2, nome: 'Linha × vertical', rot: 'Desvio', dicas: ['1º ponto', '2º ponto'] },
  };
  function normFree(f) {
    f.tipo = f.tipo || '3pt';
    f.label = f.label || 'Ângulo';
    const n = FREE_TIPOS[f.tipo].n;
    f.pts = f.pts || [];
    while (f.pts.length < n) f.pts.push(null);
    return f;
  }
  const freeHole = (f) => { const n = FREE_TIPOS[f.tipo || '3pt'].n; for (let i = 0; i < n; i++) if (!f.pts[i]) return i; return -1; };

  // Desenha os ângulos livres de uma lista. o: { sel:{ai,pi}, labels, numbers }
  function drawFreeAngles(c, list, u, o) {
    o = o || {};
    list.forEach((f, ai) => {
      const ps = f.pts || [];
      const isSel = o.sel && o.sel.ai === ai;
      c.strokeStyle = '#9b59ff';
      c.lineWidth = (isSel ? 4.5 : 3.5) * u;
      c.lineCap = 'round';
      c.beginPath();
      let on = false;
      ps.forEach((p) => { if (!p) { on = false; return; } if (!on) { c.moveTo(p.x, p.y); on = true; } else c.lineTo(p.x, p.y); });
      c.stroke();
      c.lineCap = 'butt';
      if ((f.tipo === 'h' || f.tipo === 'v') && ps[0] && ps[1]) {
        const len = Math.hypot(ps[1].x - ps[0].x, ps[1].y - ps[0].y);
        c.strokeStyle = 'rgba(155,89,255,0.7)'; c.lineWidth = 1.8 * u; c.setLineDash([6 * u, 5 * u]);
        c.beginPath(); c.moveTo(ps[0].x, ps[0].y);
        if (f.tipo === 'h') c.lineTo(ps[0].x + (ps[1].x >= ps[0].x ? 1 : -1) * len, ps[0].y);
        else c.lineTo(ps[0].x, ps[0].y + (ps[1].y >= ps[0].y ? 1 : -1) * len);
        c.stroke(); c.setLineDash([]);
      }
      ps.forEach((p, pi) => {
        if (!p) return;
        dot(c, p, u, '#9b59ff', !!(o.sel && o.sel.ai === ai && o.sel.pi === pi));
        if (o.numbers) { c.font = `700 ${12 * u}px -apple-system, sans-serif`; c.fillStyle = '#9b59ff'; c.fillText(String(pi + 1), p.x + 9 * u, p.y - 9 * u); }
      });
      if (o.labels !== false) {
        const fv = Angles.freeValue(f);
        if (fv) { const vtx = (f.tipo || '3pt') === '3pt' ? ps[1] : ps[0]; tagLabel(c, `${f.label}: ${Angles.fmt(fv.value)}°`, vtx.x + 10 * u, vtx.y + 22 * u, u); }
      }
    });
  }

  function openFreeFor(key) {
    const v = ED.a.views[key];
    if (!v.photo) return;
    openFreeWorkspace({ title: 'Ângulos livres — ' + Angles.VIEWS[key].label, photo: v.photo, free: v.free, onChange: saveSoon, back: () => renderTab(key) });
  }

  // cfg: { title, photo (dataURL), free (lista alterada no lugar), onChange(), back() }
  // Tela cheia só com a foto e os ângulos livres: nada de pontos da avaliação postural.
  function openFreeWorkspace(cfg) {
    cfg.free.forEach(normFree);
    const W = { sel: null, adding: null, undo: [], step: 1, nudgeOn: false, drag0: null, tn: null, hold: null, holdT: null };
    const changed = () => { cfg.onChange && cfg.onChange(); };
    const pushUndo = (f, pi, prev) => { W.undo.push({ f, pi, prev: prev ? { ...prev } : null }); if (W.undo.length > 200) W.undo.shift(); };
    loadImg(cfg.photo).then((img) => {
      const S = makeStage({
        img,
        title: cfg.title,
        overlayHtml: '<div class="fs-pill"></div><div class="fs-nudge" hidden></div><div class="fs-types"><button type="button" class="fs-type" data-act="type3pt" data-tipo="3pt" aria-label="Ângulo de 3 pontos"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 31L21 11l13 18"/><circle cx="7" cy="31" r="2.6" fill="currentColor"/><circle cx="21" cy="11" r="2.6" fill="currentColor"/><circle cx="34" cy="29" r="2.6" fill="currentColor"/></svg></button><button type="button" class="fs-type" data-act="typeh" data-tipo="h" aria-label="Linha e horizontal"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 30L30 12"/><path d="M6 30h30" stroke-dasharray="4 4"/><circle cx="6" cy="30" r="2.6" fill="currentColor"/><circle cx="30" cy="12" r="2.6" fill="currentColor"/></svg></button><button type="button" class="fs-type" data-act="typev" data-tipo="v" aria-label="Linha e vertical"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6l18 28"/><path d="M12 6v30" stroke-dasharray="4 4"/><circle cx="12" cy="6" r="2.6" fill="currentColor"/><circle cx="30" cy="34" r="2.6" fill="currentColor"/></svg></button><button type="button" class="fs-done" data-act="done">Terminar</button></div>',
        rightLow: true,
        leftHtml: fsBtn('grid', ICON.grid, 'Grade') + fsBtn('contrast', ICON.contrast, 'Contraste'),
        rightHtml: fsBtn('move', ICON.move, 'Mover') + fsBtn('list', ICON.list, 'Ângulos') + fsBtn('fit', ICON.fit, 'Ajustar'),
        bottomHtml: fsBtn('undo', ICON.back, 'Desfazer') + fsBtn('redo', ICON.redo, 'Refazer ponto') + fsBtn('nudge', ICON.nudge, 'Ajuste fino') + (cfg.templates && cfg.templates.length ? fsBtn('model', ICON.list, 'Modelo') : ''),
        drawOverlay: (c, tf, loupe) => { c.save(); c.translate(tf.x, tf.y); c.scale(tf.s, tf.s); drawFreeAngles(c, cfg.free, 1 / tf.s, { sel: W.sel, labels: !loupe, numbers: !loupe }); c.restore(); },
        hit: (q, r) => {
          let best = null, bd = r;
          cfg.free.forEach((f, ai) => f.pts.forEach((p, pi) => { if (!p) return; const d = Math.hypot(p.x - q.x, p.y - q.y); if (d < bd) { bd = d; best = { ai, pi }; } }));
          return best;
        },
        start: (t) => { W.sel = t; W.tn = null; W.drag0 = { ...cfg.free[t.ai].pts[t.pi] }; ui(); },
        place: (q) => {
          if (W.adding == null) return null;
          const f = cfg.free[W.adding];
          if (!f) return null;
          const pi = freeHole(f);
          if (pi < 0) { W.adding = null; return null; }
          f.pts[pi] = q; W.sel = { ai: W.adding, pi }; W.tn = null;
          return { ai: W.adding, pi };
        },
        move: (t, q) => { const f = cfg.free[t.ai]; if (f) f.pts[t.pi] = q; },
        end: (t, moved, placed) => {
          const f = cfg.free[t.ai];
          if (f && placed) { pushUndo(f, t.pi, null); if (freeHole(f) < 0) { const nx = cfg.free.findIndex((g) => freeHole(g) >= 0); W.adding = nx >= 0 ? nx : null; } changed(); }
          else if (f && moved && W.drag0) { const cur = f.pts[t.pi]; if (cur && Math.hypot(cur.x - W.drag0.x, cur.y - W.drag0.y) > 0.5) { pushUndo(f, t.pi, W.drag0); changed(); } }
          W.drag0 = null;
          ui();
        },
        cancel: (d) => { if (d.placed) { const f = cfg.free[d.t.ai]; if (f) f.pts[d.t.pi] = null; } },
        action: (act) => {
          if (act === 'undo') {
            const e = W.undo.pop();
            if (!e) return S.toast('Nada para desfazer.');
            const ai = cfg.free.indexOf(e.f);
            if (ai < 0) return;
            e.f.pts[e.pi] = e.prev; W.sel = { ai, pi: e.pi }; W.tn = null;
            if (!e.prev) W.adding = ai;
            changed(); ui();
          } else if (act === 'type3pt' || act === 'typeh' || act === 'typev') {
            startAngle(act === 'type3pt' ? '3pt' : act === 'typeh' ? 'h' : 'v');
          } else if (act === 'done') {
            if (W.adding != null) {
              const f = cfg.free[W.adding];
              if (f && freeHole(f) >= 0) {
                if (f.pts.some(Boolean) && !confirm(`Descartar o ângulo incompleto "${f.label}"?`)) { W.adding = null; ui(); return; }
                cfg.free.splice(W.adding, 1);
                changed();
              }
              W.adding = null; W.sel = null; ui();
              return;
            }
            S.close();
          } else if (act === 'model') {
            const m = S.modal(`<h2>Modelo de medidas</h2><p class="muted">Sugestão para conferir com o seu manual. Os ângulos entram na lista para você marcar na ordem indicada no topo da tela; pode renomear ou apagar.</p>
              <div class="col">${cfg.templates.map((t, i) => `<button data-m="${i}"><b>${esc(t.nome)}</b><small>${esc(t.angulos.map((x) => x.label).join(' · '))}</small></button>`).join('')}<button data-m="x">Cancelar</button></div>`);
            m.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => {
              S.closeModal();
              if (b.dataset.m === 'x') return;
              const t = cfg.templates[+b.dataset.m];
              let first = -1;
              t.angulos.forEach((sp) => {
                if (cfg.free.some((f) => f.label === sp.label)) return;
                cfg.free.push(normFree({ label: sp.label, tipo: sp.tipo, dicas: sp.dicas.slice(), pts: [] }));
                if (first < 0) first = cfg.free.length - 1;
              });
              if (first >= 0) { W.adding = first; W.sel = null; W.tn = null; changed(); ui(); S.toast('Marque na ordem indicada no topo da tela. Pode errar: use Desfazer.', 3800); }
              else S.toast('Esses ângulos já estão na lista.');
            }));
          } else if (act === 'redo') {
            if (!W.sel) return S.toast('Toque num ponto para selecioná-lo e depois use "Refazer ponto".');
            const f = cfg.free[W.sel.ai];
            if (!f || !f.pts[W.sel.pi]) return;
            pushUndo(f, W.sel.pi, f.pts[W.sel.pi]);
            f.pts[W.sel.pi] = null; W.adding = W.sel.ai; W.tn = null;
            changed(); ui();
            S.toast('Toque na foto para marcar o ponto de novo.');
          } else if (act === 'nudge') {
            if (!W.sel) return S.toast('Toque num ponto para selecioná-lo e depois use o ajuste fino.');
            W.nudgeOn = !W.nudgeOn; ui();
          } else if (act === 'list') {
            listOpen = !listOpen;
            renderList();
          }
        },
        onClose: () => { clearInterval(W.hold); clearTimeout(W.holdT); cfg.back(); },
      });
      const startAngle = (tipo) => {
        if (W.adding != null) { const f0 = cfg.free[W.adding]; if (f0 && !f0.pts.some(Boolean)) cfg.free.splice(W.adding, 1); }
        const t = FREE_TIPOS[tipo], f = normFree({ tipo, label: `${t.rot} ${cfg.free.length + 1}`, pts: [] });
        cfg.free.push(f); W.adding = cfg.free.length - 1; W.sel = null; W.tn = null;
        changed(); ui();
        S.toast('Toque na foto para marcar o 1º ponto. Pode errar: use Desfazer.', 3200);
      };
      let listOpen = false;
      const hintText = () => {
        if (W.adding != null && cfg.free[W.adding] && freeHole(cfg.free[W.adding]) >= 0) {
          const f = cfg.free[W.adding], i = freeHole(f), t = FREE_TIPOS[f.tipo];
          return `Toque na foto: ${(f.dicas && f.dicas[i]) || t.dicas[i]} de "${f.label}" (${i + 1} de ${t.n})`;
        }
        if (W.sel) return 'Ponto selecionado: arraste para ajustar, use o ajuste fino ou "Refazer ponto"';
        return cfg.free.length ? 'Toque num ponto para ajustá-lo, ou escolha um tipo de ângulo ao lado' : 'Escolha um tipo de ângulo ao lado para começar';
      };
      const renderNudge = () => {
        const box = S.root.querySelector('.fs-nudge');
        box.hidden = !(W.nudgeOn && W.sel);
        if (box.hidden) return;
        if (!box.firstChild) {
          box.innerHTML = `<div class="nudge"><span></span><button data-nd="0,-1">▲</button><span></span><button data-nd="-1,0">◀</button><select class="nd-step"><option value="0.5">0,5 px</option><option value="1" selected>1 px</option><option value="3">3 px</option></select><button data-nd="1,0">▶</button><span></span><button data-nd="0,1">▼</button><span></span></div>`;
          const once = (dx, dy) => {
            if (!W.sel) return false;
            const f = cfg.free[W.sel.ai], p = f && f.pts[W.sel.pi];
            if (!p) return false;
            if (!W.tn || W.tn.f !== f || W.tn.pi !== W.sel.pi) { pushUndo(f, W.sel.pi, p); W.tn = { f, pi: W.sel.pi }; }
            p.x += dx * W.step; p.y += dy * W.step;
            changed(); S.draw();
            return true;
          };
          box.querySelector('.nd-step').onchange = (e) => { W.step = +e.target.value; };
          box.querySelectorAll('[data-nd]').forEach((b) => {
            const [dx, dy] = b.dataset.nd.split(',').map(Number);
            const stop = () => { clearInterval(W.hold); clearTimeout(W.holdT); };
            b.onpointerdown = (e) => { e.preventDefault(); if (!once(dx, dy)) return; W.holdT = setTimeout(() => { W.hold = setInterval(() => once(dx, dy), 70); }, 350); };
            b.onpointerup = b.onpointerleave = b.onpointercancel = () => { stop(); ui(); };
          });
        }
      };
      const renderList = () => {
        if (!listOpen) { S.drawer(null); return; }
        const d = S.drawer(`<div class="row" style="justify-content:space-between"><h3 style="margin:0">Ângulos</h3><button data-dr="x">Fechar</button></div>
          ${cfg.free.length ? cfg.free.map((f, ai) => {
            const fv = Angles.freeValue(f), t = FREE_TIPOS[f.tipo], filled = f.pts.filter(Boolean).length;
            return `<div class="dr-card ${W.sel && W.sel.ai === ai ? 'cur' : ''}"><input data-fl="${ai}" value="${esc(f.label)}">
              <div class="row" style="justify-content:space-between;margin-top:4px"><span class="muted">${esc(t.nome)}</span><b style="font-size:18px">${fv ? Angles.fmt(fv.value) + '°' : filled + ' de ' + t.n + ' pontos'}</b></div>
              ${fv ? `<div class="muted">${esc(fv.text)}</div>` : ''}
              <div class="row" style="margin-top:6px">${f.pts.slice(0, t.n).map((p, pi) => `<button data-fp="${ai},${pi}" ${p ? '' : 'disabled'} class="${W.sel && W.sel.ai === ai && W.sel.pi === pi ? 'on' : ''}">${pi + 1}</button>`).join('')}<button data-fredo="${ai}">Refazer</button><button class="danger" data-fdel="${ai}">Apagar</button></div></div>`;
          }).join('') : '<p class="muted">Nenhum ângulo ainda.</p>'}`);
        d.querySelector('[data-dr="x"]').onclick = () => { listOpen = false; renderList(); };
        d.querySelectorAll('[data-fl]').forEach((el) => (el.oninput = () => { cfg.free[+el.dataset.fl].label = el.value; changed(); S.draw(); }));
        d.querySelectorAll('[data-fp]').forEach((b) => (b.onclick = () => { const [ai, pi] = b.dataset.fp.split(',').map(Number); W.sel = { ai, pi }; W.tn = null; ui(); }));
        d.querySelectorAll('[data-fredo]').forEach((b) => (b.onclick = () => { const ai = +b.dataset.fredo, f = cfg.free[ai]; f.pts = f.pts.map(() => null); W.adding = ai; W.sel = null; changed(); ui(); S.toast('Toque na foto para marcar o 1º ponto.'); }));
        d.querySelectorAll('[data-fdel]').forEach((b) => (b.onclick = () => {
          const ai = +b.dataset.fdel;
          if (!confirm(`Apagar o ângulo "${cfg.free[ai].label}"?`)) return;
          cfg.free.splice(ai, 1); W.sel = null; W.adding = null; changed(); ui();
        }));
      };
      const ui = () => {
        S.root.querySelector('.fs-pill').textContent = hintText();
        S.setSub(`${cfg.free.filter((f) => Angles.freeValue(f)).length} de ${cfg.free.length} ângulos completos`);
        const building = W.adding != null && cfg.free[W.adding] && freeHole(cfg.free[W.adding]) >= 0 ? cfg.free[W.adding].tipo : null;
        S.root.querySelectorAll('.fs-type').forEach((b) => b.classList.toggle('on', b.dataset.tipo === building));
        renderNudge();
        if (listOpen) renderList();
        S.draw();
      };
      ui();
    });
  }

  // ---------- Ângulos livres avulsos: qualquer foto, sem relação com a avaliação postural ----------
  function renderLivres() {
    const a = ED.a;
    a.livres = a.livres || [];
    main.innerHTML = `${tabsHtml()}
      <div class="card"><h2>Ângulos livres</h2>
        <p class="muted">Para medir qualquer ângulo em qualquer foto, fora do protocolo postural e dos testes de movimento. Cada foto abre numa tela só dela.</p>
        <div class="row"><label class="btn" style="margin:0;color:var(--ink)">Adicionar foto<input type="file" accept="image/*" id="lv-file" hidden></label></div></div>
      ${a.livres.map((f) => {
        const vals = (f.free || []).map((x) => ({ x, fv: Angles.freeValue(x) })).filter((o) => o.fv);
        return `<div class="card"><div class="row" style="align-items:flex-start"><img src="${f.photo}" alt="" style="height:96px;border-radius:8px">
          <div style="flex:1;min-width:180px"><input data-lfn="${f.id}" value="${esc(f.nome)}">
            <div class="muted" style="margin-top:6px">${vals.length ? vals.map((o) => `${esc(o.x.label)} <b>${Angles.fmt(o.fv.value)}°</b>`).join(' · ') : 'Nenhum ângulo medido ainda.'}</div></div></div>
          <div class="row" style="margin-top:8px"><button class="primary" data-lmed="${f.id}">Medir ângulos</button><button data-lcrop="${f.id}">Cortar ou girar</button><button class="danger" data-ldel="${f.id}">Apagar foto</button></div></div>`;
      }).join('')}`;
    bindTabs();
    const find = (id) => a.livres.find((x) => x.id === id);
    $('#lv-file').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const src = await shrinkToDataUrl(file, 1800);
      openCrop(src, async (out) => {
        a.livres.push({ id: uid(), nome: 'Foto ' + (a.livres.length + 1), photo: out, free: [] });
        await DB.put('assessments', ED.a);
        renderLivres();
      });
    };
    main.querySelectorAll('[data-lfn]').forEach((el) => (el.oninput = () => { const f = find(el.dataset.lfn); if (f) { f.nome = el.value; saveSoon(); } }));
    main.querySelectorAll('[data-lmed]').forEach((b) => (b.onclick = () => { const f = find(b.dataset.lmed); if (f) openFreeWorkspace({ title: 'Ângulos livres — ' + f.nome, photo: f.photo, free: f.free, onChange: saveSoon, back: () => renderTab('livres') }); }));
    main.querySelectorAll('[data-lcrop]').forEach((b) => (b.onclick = () => {
      const f = find(b.dataset.lcrop);
      if (!f) return;
      if ((f.free || []).length && !confirm('Cortar ou girar a foto apaga os ângulos já medidos nela. Continuar?')) return;
      openCrop(f.photo, async (out) => { f.photo = out; f.free = []; await DB.put('assessments', ED.a); renderLivres(); });
    }));
    main.querySelectorAll('[data-ldel]').forEach((b) => (b.onclick = () => { if (!confirm('Apagar esta foto e os ângulos medidos nela?')) return; a.livres = a.livres.filter((x) => x.id !== b.dataset.ldel); saveSoon(); renderLivres(); }));
  }

  // Imagem com os ângulos desenhados (para o laudo).
  async function freeImage(photo, free) {
    const img = await loadImg(photo);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    drawFreeAngles(g, free.map(normFree), img.naturalWidth / 650, { labels: true });
    return c.toDataURL('image/jpeg', 0.85);
  }
  // Foto reduzida (lado maior 1800 px) como dataURL.
  async function shrinkToDataUrl(file, max) {
    const url = URL.createObjectURL(file);
    const img = await loadImg(url);
    const k = Math.min(1, (max || 1800) / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return c.toDataURL('image/jpeg', 0.88);
  }


  // ---------- Importar as fotos do aluno de uma vez ----------
  function importFotos() {
    const sh = showSheet(`<h2>Importar fotos do aluno</h2>
      <p class="muted">Salve no iPad as fotos recebidas pelo WhatsApp (em Fotos ou Arquivos) e escolha aqui até 4 de uma vez. Confira a vista de cada uma antes de importar.</p>
      <div class="row"><label class="btn" style="margin:0;color:var(--ink)">Escolher fotos<input type="file" accept="image/*" multiple hidden id="imp-files"></label><button id="imp-x">Cancelar</button></div>
      <div id="imp-list"></div>
      <div class="row" id="imp-act" hidden style="margin-top:10px"><button class="primary" id="imp-go">Importar</button></div>`);
    let files = [];
    const opts = (sel) => VIEW_KEYS.map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(Angles.VIEWS[k].label)}</option>`).join('') + '<option value="">Não importar</option>';
    sh.querySelector('#imp-x').onclick = () => sh.close();
    sh.querySelector('#imp-files').onchange = (e) => {
      files = [...e.target.files].slice(0, 4);
      sh.querySelector('#imp-list').innerHTML = files.map((f, i) => `<div class="row" style="align-items:center;border-bottom:1px solid var(--line);padding:6px 0"><img src="${URL.createObjectURL(f)}" alt="" style="height:64px;border-radius:6px"><div style="flex:1;min-width:150px"><div class="muted" style="font-size:12px;overflow:hidden;text-overflow:ellipsis">${esc(f.name)}</div><select data-imp="${i}">${opts(VIEW_KEYS[i])}</select></div></div>`).join('');
      sh.querySelector('#imp-act').hidden = !files.length;
    };
    sh.querySelector('#imp-go').onclick = async () => {
      const sel = [...sh.querySelectorAll('[data-imp]')].map((s) => s.value);
      const used = sel.filter(Boolean);
      if (!used.length) return alert('Nenhuma foto escolhida para importar.');
      if (new Set(used).size !== used.length) return alert('Duas fotos estão na mesma vista. Escolha vistas diferentes.');
      const subs = used.filter((k) => ED.a.views[k].photo).map((k) => Angles.VIEWS[k].label);
      if (subs.length && !confirm(`Isto substitui a foto (e apaga os pontos e a calibração) de: ${subs.join(', ')}. Continuar?`)) return;
      for (let i = 0; i < files.length; i++) {
        if (!sel[i]) continue;
        const v = ED.a.views[sel[i]];
        v.photo = await shrinkToDataUrl(files[i], 1800);
        v.pts = {}; v.pts2 = {}; v.free = []; v.plumbX = null; v.calib = null; v.captureTilt = null;
      }
      invalidate();
      await DB.put('assessments', ED.a);
      sh.close();
      renderTab('home');
    };
  }

  // ---------- Rascunho do texto do laudo (montado por regras com os seus números, sem IA) ----------
  function draftTexts(a) {
    const groups = allResults(a);
    const vistaSimples = { ant: 'de frente', post: 'de costas', latD: 'de lado (direita)', latE: 'de lado (esquerda)' };
    const val = (r) => Math.abs(r.signed != null ? r.signed : r.value);
    const partes = [], simples = [], vistas = [];
    groups.forEach((g) => {
      if (!a.views[g.key].photo) return;
      vistas.push(g.key);
      const base = g.res.filter((r) => r.unit !== 'cm' && !/complementar/.test(r.label));
      if (!base.length) return;
      const fora = base.filter((r) => flagFor(r).cls === 'out');
      const esc2 = fora.length ? fora : [...base].sort((x, y) => val(y) - val(x)).slice(0, 2);
      partes.push(`${Angles.VIEWS[g.key].label}: ${esc2.map((r) => `${r.label.toLowerCase()} (${r.code}) ${Angles.fmtVal(r)}, ${r.text}`).join('; ')} [${fora.length ? 'fora da faixa adotada' : 'maiores valores da vista'}].`);
      simples.push(`${Angles.VIEWS[g.key].label.replace(/\s*\(.*\)/, '')}: ${esc2.map((r) => `${r.label.toLowerCase()} (${r.text})`).join('; ')}`);
    });
    if (!partes.length) return null;
    const semRef = groups.every((g) => g.res.every((r) => flagFor(r).cls === ''));
    const obs = `Registro fotográfico em apoio estático (${vistas.map((k) => Angles.VIEWS[k].label.toLowerCase()).join(', ')}), em ${fmtDate(a.data)}. ${partes.join(' ')} Os valores descrevem a imagem do dia; não estabelecem diagnóstico, causa de dor nem risco individual de lesão, e a relevância para o treino depende de sintomas, tarefa e objetivo.${semRef ? ' Não há faixa de referência adotada para estas medidas: os valores foram descritos como contínuos.' : ''}`;
    const sim = `Fizemos fotos suas em pé (${vistas.map((k) => vistaSimples[k]).join(', ')}) para ver como o seu corpo está alinhado. O que mais apareceu nas fotos: ${simples.join('. ')}. Esses números vêm de fotos e têm uma margem de erro: descrevem como você estava na foto, não são diagnóstico e não dizem sozinhos como você se move. Vamos acompanhar nas próximas avaliações e ajustar o treino também pelo que você sente e pelos seus objetivos.`;
    return { obs, simples: sim };
  }

  // ---------- Referências ----------
  // Fontes citadas na base de regras v4.0 (proposta em revisão profissional). Dão contexto; não são pontos de corte.
  const FONTES = [
    ["E01", "Postural Evaluation in Young Healthy Adults through a Digital and Reproducible Method", "2022", "https://pmc.ncbi.nlm.nih.gov/articles/PMC9680464/", "Propriedades de medidas APECS; não transferir para app novo."],
    ["E02", "Photogrammetry-based smartphone applications for spinal posture assessment", "2026", "https://www.nature.com/articles/s41598-025-32708-1.pdf", "Síntese de propriedades de medidas; não estabelece corte universal."],
    ["E03", "International normative values for the weight-bearing lunge test across age and sex in 899 healthy adults", "2026", "https://pubmed.ncbi.nlm.nih.gov/41723909/", "Normas em cm estratificadas por idade/sexo; validar protocolo antes de importar tabelas."],
    ["E04", "Reliability and validity of a weight-bearing measure of ankle dorsiflexion range of motion", "2012", "https://pubmed.ncbi.nlm.nih.gov/23997389/", "MDC em protocolo/população com disfunção do tornozelo."],
    ["E05", "Reliability and minimal detectable change of the weight-bearing lunge test", "2015", "https://pubmed.ncbi.nlm.nih.gov/25704110/", "MDCs médias de estudos diferentes; não atribuir ao novo app."],
    ["E06", "The modified Thomas test is not a valid measure of hip extension unless pelvic tilt is controlled", "2016", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4991856/", "Validade e controle da pelve; não identifica tecido isolado."],
    ["E07", "Can a Standardized Visual Assessment of Squatting Technique and Core Stability Predict Injury?", "2020", "https://pubmed.ncbi.nlm.nih.gov/31490423/", "Limitações da previsão de lesão em atletas gaélicos masculinos."],
    ["E08", "Patellofemoral Pain Clinical Practice Guidelines - Decision Tree", "2019", "https://www.orthopt.org/uploads/content_files/files/Patellofemoral%20Knee%20Pain%20Decision%20Tree.pdf", "Critérios contextuais; não aplicar ao overhead squat nem à população geral."],
    ["E09", "Foot Posture Index Datasheet - Anthony Redmond", "", "https://researchers-admin.westernsydney.edu.au/ws/portalfiles/portal/94780445/uws_2511.pdf", "Categorias do FPI-6 completo; exige exame incluindo palpação."],
    ["E10", "No consensus on causality of spine postures or physical exposure and low back pain", "2020", "https://pubmed.ncbi.nlm.nih.gov/31451200/", "Associação não explica causalidade individual de lombalgia."],
    ["E11", "Postural asymmetry in low back pain", "2025", "https://pubmed.ncbi.nlm.nih.gov/39166267/", "Diferenças médias e heterogeneidade; não corte individual."]
  ];

  function showRefs() {
    ED.active = false;
    setHeader('Referências e alvos', showHome);
    const codes = [];
    VIEW_KEYS.forEach((k) => Angles.VIEWS[k].measures.forEach((m) => codes.push([m.code, `${m.code} — ${m.label} (${Angles.VIEWS[k].label})`])));
    const rows = state.refs.length ? state.refs : [];
    const rowHtml = (r, i) => `<tr data-i="${i}">
      <td><select data-k="code">${codes.map(([c, l]) => `<option value="${c}" ${r.code === c ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></td>
      <td><input data-k="min" inputmode="decimal" value="${esc(r.min)}"></td><td><input data-k="max" inputmode="decimal" value="${esc(r.max)}"></td>
      <td><select data-k="classe">${Object.keys(CLASSES).map((c) => `<option value="${c}" ${r.classe === c ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
      <td><input data-k="fonte" value="${esc(r.fonte)}" placeholder="fonte ou justificativa"></td><td><input data-k="populacao" value="${esc(r.populacao)}"></td>
      <td><input data-k="erro" inputmode="decimal" value="${esc(r.erro)}" placeholder="° ou cm"></td><td><button data-del="${i}">×</button></td></tr>`;
    main.innerHTML = `<div class="card"><h2>Referências e alvos por medida</h2>
      <p class="muted">Não existe uma escala angular única para o corpo todo. Cadastre aqui, medida por medida, a faixa que você usa, a classe e a fonte.
      Uma faixa criada por você é <b>Classe C — alvo operacional interno</b>: registre a justificativa. Sem faixa, o laudo mostra o valor como contínuo.
      O campo "erro" é o erro de medida local (°); só com ele o laudo afirma que uma mudança entre avaliações supera o erro.</p>
      <p class="muted">Para medidas com sinal (joelho, pé, retropé), use valores positivos para projeção medial, ponta do pé para fora e calcâneo lateral.</p>
      <div class="table-wrap"><table><tr><th>Medida</th><th>Mín (°)</th><th>Máx (°)</th><th>Classe</th><th>Fonte / justificativa</th><th>População</th><th>Erro (° ou cm)</th><th></th></tr>
      <tbody id="rows">${rows.map(rowHtml).join('')}</tbody></table></div>
      <div class="row" style="margin-top:10px"><button id="add">+ Adicionar faixa</button><button class="primary" id="save">Salvar</button></div>
      <h3>Avaliador</h3><div class="grid2"><div><label>Nome</label><input id="pnome" value="${esc(state.perfil.nome)}"></div><div><label>Registro</label><input id="pcref" value="${esc(state.perfil.cref)}"></div></div>
      <ul class="muted">${Object.values(CLASSES).map((c) => `<li>${c}</li>`).join('')}</ul>
      <details style="margin-top:12px"><summary><b>Fontes da base de regras v4.0 (${FONTES.length})</b></summary>
        <p class="muted">Proposta em revisão profissional. As fontes dão contexto e limites; não são pontos de corte e não entram no laudo.</p>
        <ul class="muted">${FONTES.map(([id, t, ano, url, esc2]) => `<li><b>${id}</b> · ${esc(t)}${ano ? ' (' + esc(ano) + ')' : ''}<br>${esc(esc2)}<br><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></li>`).join('')}</ul></details></div>`;
    const collect = () => [...main.querySelectorAll('#rows tr')].map((tr) => {
      const o = {};
      tr.querySelectorAll('[data-k]').forEach((el) => (o[el.dataset.k] = el.value.replace(',', '.').trim()));
      return o;
    });
    const bindDel = () => main.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => b.closest('tr').remove()));
    $('#add').onclick = () => { $('#rows').insertAdjacentHTML('beforeend', rowHtml({ classe: 'C', min: '', max: '' }, $('#rows').children.length)); bindDel(); };
    bindDel();
    temRows().then((tr) => {
      if (!tr.length) return;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h2>Erro técnico de medida (das marcações repetidas)</h2>
        <p class="muted">Calculado com a fórmula do erro técnico de medida, raiz de (soma das diferenças ao quadrado ÷ 2n), usando todas as vistas em que você fez a marcação 2. Com poucos pares (n), o valor é só uma estimativa; o seu erro "oficial" fica no campo Erro da tabela acima.</p>
        <div class="table-wrap"><table><tr><th>Medida</th><th>Pares (n)</th><th>Erro técnico</th><th></th></tr>
        ${tr.map((r) => `<tr><td>${r.code} — ${esc(r.label)}</td><td>${r.n}${r.n < 10 ? ' <span class="warn">(poucos)</span>' : ''}</td><td><b>${Angles.fmtVal({ value: r.tem, unit: r.unit })}</b></td><td><button data-tem="${r.code}" data-v="${(Math.round(r.tem * 100) / 100).toString().replace(',', '.')}">Usar como erro</button></td></tr>`).join('')}</table></div>`;
      main.appendChild(card);
      card.querySelectorAll('[data-tem]').forEach((b) => (b.onclick = () => {
        const code = b.dataset.tem;
        let row = [...main.querySelectorAll('#rows tr')].find((t) => t.querySelector('[data-k="code"]').value === code);
        if (!row) { $('#rows').insertAdjacentHTML('beforeend', rowHtml({ code, classe: 'D', min: '', max: '', fonte: 'Erro técnico de medida das marcações repetidas', populacao: '', erro: b.dataset.v }, $('#rows').children.length)); bindDel(); }
        else row.querySelector('[data-k="erro"]').value = b.dataset.v;
        alert('Erro aplicado na tabela acima. Toque em Salvar para guardar.');
      }));
    });
    $('#save').onclick = async () => {
      state.refs = collect();
      state.perfil = { id: 'perfil', nome: $('#pnome').value, cref: $('#pcref').value };
      await DB.put('settings', { id: 'refs', rows: state.refs });
      await DB.put('settings', state.perfil);
      alert('Referências salvas.');
    };
  }

  // ---------- Cópia de segurança ----------
  function showBackup() {
    ED.active = false;
    setHeader('Cópia de segurança', showHome);
    main.innerHTML = `<div class="card"><h2>Cópia de segurança</h2>
      <p class="muted">Tudo fica guardado só neste aparelho. Se os dados do Safari forem apagados, os alunos somem. Salve uma cópia em Arquivos com frequência. A cópia contém fotos e dados de saúde: guarde em local protegido.</p>
      <div class="row"><button class="primary" id="exp">Salvar cópia</button><label class="btn" style="margin:0;color:var(--ink)">Restaurar cópia<input type="file" id="imp" accept="application/json,.json" hidden></label></div></div>`;
    $('#exp').onclick = async () => {
      const data = { app: 'avaliacao-postural', versao: 1, criado: new Date().toISOString(), students: await DB.all('students'), assessments: await DB.all('assessments'), settings: await DB.all('settings') };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `avaliacao-postural-${today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };
    $('#imp').onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      let data;
      try { data = JSON.parse(await f.text()); } catch (_) { return alert('Arquivo inválido.'); }
      if (data.app !== 'avaliacao-postural') return alert('Este arquivo não é uma cópia deste app.');
      if (!confirm(`Restaurar ${data.students.length} alunos e ${data.assessments.length} avaliações? Registros com o mesmo identificador serão substituídos.`)) return;
      for (const s of data.students) await DB.put('students', s);
      for (const a of data.assessments) await DB.put('assessments', a);
      for (const s of data.settings) await DB.put('settings', s);
      await loadSettings();
      alert('Cópia restaurada.');
      showHome();
    };
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.__SINGLE_FILE__) navigator.serviceWorker.register('sw.js').catch(() => {});
  loadSettings().then(start);
})();
