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
  const AVOID_TERMS = /valgo|varo|genu|escoliose|hiperlordose|hipercifose|retificaç|pé plano|pe plano|pé cavo|hiperprona|encurtad|fraqueza|risco de lesão|palmilha/i;

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
      openEditor(a.id, 'ant');
    };
    main.querySelectorAll('.list a').forEach((el) => (el.onclick = (e) => { e.preventDefault(); openEditor(el.dataset.id, 'ant'); }));
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
  const ED = { active: false, mark: 1, calibTmp: null, a: null, s: null, tab: 'ant', img: null, sel: null, tool: 'mark', tf: { s: 1, x: 0, y: 0 }, grid: true, plumb: true, guide: true, ptrs: new Map(), drag: null, pinch: null, freeTmp: null, loupe: null };
  let saveTimer;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => DB.put('assessments', ED.a), 400); };

  async function openEditor(id, tab) {
    ED.a = normalize(await DB.get('assessments', id));
    ED.mark = 1;
    ED.s = await DB.get('students', ED.a.studentId);
    ED.active = true;
    setHeader(ED.s.nome + ' · ' + fmtDate(ED.a.data), () => showStudent(ED.s.id));
    renderTab(tab || 'ant');
  }

  function tabsHtml() {
    const t = [['ant', 'Anterior'], ['post', 'Posterior'], ['latD', 'Lateral D'], ['latE', 'Lateral E'], ['res', 'Resultados'], ['evol', 'Evolução'], ['mov', 'Movimento'], ['ficha', 'Ficha e conduta'], ['laudo', 'Laudo']];
    return `<div class="tabs">${t.map(([k, l]) => `<button data-tab="${k}" class="${ED.tab === k ? 'primary' : ''}">${l}</button>`).join('')}</div>`;
  }

  function renderTab(tab) {
    ED.tab = tab;
    ED.sel = null;
    ED.freeTmp = null;
    ED.tool = 'mark';
    if (ED.stopAnim) { ED.stopAnim(); ED.stopAnim = null; }
    if (VIEW_KEYS.includes(tab)) renderView(tab);
    else if (tab === 'res') renderResults();
    else if (tab === 'evol') renderEvol();
    else if (tab === 'mov') renderMov();
    else if (tab === 'ficha') renderFicha();
    else renderLaudo();
    bindTabs();
  }
  const bindTabs = () => main.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => renderTab(b.dataset.tab)));

  function renderView(key) {
    const def = Angles.VIEWS[key];
    const v = ED.a.views[key];
    main.innerHTML = `${tabsHtml()}
      <div class="editor">
        <div>
          <div class="tools">
            <label class="btn" style="margin:0;color:var(--ink)">${v.photo ? 'Trocar foto' : 'Escolher ou tirar foto'}<input type="file" accept="image/*" id="file" hidden></label><button id="cam">Câmera guiada</button>
            <button data-tool="mark">Marcar</button><button data-tool="pan">Mover</button><button data-tool="plumb">Fio de prumo</button><button data-tool="free">Ângulo livre</button><button data-tool="calib">Calibrar</button>
            <button id="zin">+</button><button id="zout">−</button><button id="zfit">Ajustar</button>
            <button id="tgrid" class="${ED.grid ? 'on' : ''}">Grade</button><button id="tguide" class="${ED.guide ? 'on' : ''}">Guia</button>
          </div>
          <div class="stagewrap"><div class="guide" id="guide" hidden></div><div class="stage" id="stage">${v.photo ? '<canvas id="cv"></canvas>' : `<div class="empty">Escolha a foto da vista ${esc(def.label.toLowerCase())}.<br><br>Câmera fixa, perpendicular ao aluno, corpo inteiro na foto, pés na base marcada.</div>`}</div></div>
          <p class="muted" id="hint">${esc(def.sideNote)}</p>
        </div>
        <div>
          ${def.defaultFacing ? `<label>O aluno está olhando para a</label><select id="facing"><option value="esq" ${v.facing === 'esq' ? 'selected' : ''}>esquerda da foto</option><option value="dir" ${v.facing === 'dir' ? 'selected' : ''}>direita da foto</option></select>` : ''}
          <label>Marcação</label><select id="markset"><option value="1" ${ED.mark === 1 ? 'selected' : ''}>Marcação 1 (principal)</option><option value="2" ${ED.mark === 2 ? 'selected' : ''}>Marcação 2 (repetição, para medir o erro)</option></select>
          <p class="muted" id="markinfo"></p>
          <h3>Calibração</h3><div id="calpanel"></div>
          <details id="chk" style="margin-top:10px"></details>
          <h3>Pontos</h3>
          <div class="pts" id="pts"></div>
          <div class="row" style="margin-top:8px"><button id="clrpt">Apagar ponto</button><button class="danger" id="clrall">Limpar vista</button></div>
          <h3>Ângulos livres</h3><div id="frees"></div>
        </div>
      </div>`;
    $('#file').onchange = (e) => e.target.files[0] && loadPhoto(key, e.target.files[0]);
    $('#cam').onclick = () => openCamera(key);
    $('#markset').onchange = (e) => { ED.mark = +e.target.value; ED.sel = firstMissing(ED.tab); setTool('mark'); refreshSide(); draw(); };
    renderCalPanel();
    renderChecklist();
    if (def.defaultFacing) $('#facing').onchange = (e) => { v.facing = e.target.value; saveSoon(); draw(); };
    main.querySelectorAll('[data-tool]').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
    $('#tgrid').onclick = () => { ED.grid = !ED.grid; $('#tgrid').classList.toggle('on', ED.grid); draw(); };
    $('#tguide').onclick = () => { ED.guide = !ED.guide; $('#tguide').classList.toggle('on', ED.guide); refreshSide(); };
    $('#zin').onclick = () => zoomBy(1.4);
    $('#zout').onclick = () => zoomBy(1 / 1.4);
    $('#zfit').onclick = () => { fit(); draw(); };
    $('#clrpt').onclick = () => { const P = pset(v); if (ED.sel && P[ED.sel]) { delete P[ED.sel]; invalidate(); saveSoon(); refreshSide(); draw(); } };
    $('#clrall').onclick = () => { if (confirm(ED.mark === 2 ? 'Apagar todos os pontos da marcação 2 desta vista?' : 'Apagar todos os pontos desta vista?')) { if (ED.mark === 2) v.pts2 = {}; else { v.pts = {}; v.free = []; } invalidate(); saveSoon(); refreshSide(); draw(); } };
    ED.sel = firstMissing(key);
    refreshSide();
    setTool('mark');
    bindTabs();
    if (v.photo) loadImg(v.photo).then((img) => { ED.img = img; setupCanvas(); });
  }

  function firstMissing(key) {
    const v = ED.a.views[key];
    const P = pset(v);
    const p = Angles.VIEWS[key].points.find(([id]) => !P[id]);
    return p ? p[0] : null;
  }

  function refreshSide() {
    const key = ED.tab;
    const v = ED.a.views[key];
    const PS = pset(v);
    const mi = $('#markinfo');
    if (mi) mi.textContent = ED.mark === 2 ? 'Marcação 2: refaça os pontos sem olhar a marcação 1 (ela fica oculta). A diferença entre as duas mostra o erro de marcação.' : (v.pts2 && Object.keys(v.pts2).length ? 'Existe uma marcação 2 nesta vista.' : '');
    $('#pts').innerHTML = Angles.VIEWS[key].points.map(([id, label, hint]) =>
      `<div data-pt="${id}" class="${PS[id] ? 'done' : ''} ${ED.sel === id ? 'sel' : ''}"><span class="dot"></span><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span></div>`).join('');
    main.querySelectorAll('[data-pt]').forEach((el) => (el.onclick = () => { ED.sel = el.dataset.pt; setTool('mark'); refreshSide(); draw(); }));
    const g = $('#guide');
    const pdef = Angles.VIEWS[key].points.find(([id]) => id === ED.sel);
    const gh = ED.guide && pdef && window.Guide ? Guide.html(key, pdef[0], esc(pdef[1]), esc(pdef[2] || ''), v.facing || Angles.VIEWS[key].defaultFacing) : '';
    g.hidden = !gh;
    g.innerHTML = gh;
    $('#frees').innerHTML = v.free.length
      ? v.free.map((f, i) => `<div class="row" style="justify-content:space-between"><span>${esc(f.label)}: <b>${Angles.fmt(Angles.angleAt(f.pts[0], f.pts[1], f.pts[2]))}°</b></span><button data-fdel="${i}">Apagar</button></div>`).join('')
      : '<p class="muted">Use "Ângulo livre" e toque em 3 pontos; o do meio é o vértice.</p>';
    main.querySelectorAll('[data-fdel]').forEach((b) => (b.onclick = () => { v.free.splice(+b.dataset.fdel, 1); saveSoon(); refreshSide(); draw(); }));
  }

  function setTool(t) {
    ED.calibTmp = t === 'calib' ? [] : null;
    if (t === 'free') {
      const label = prompt('Nome do ângulo (ex.: tronco no agachamento):', 'Ângulo livre ' + (ED.a.views[ED.tab].free.length + 1));
      if (label === null) return;
      ED.freeTmp = { label: label || 'Ângulo livre', pts: [] };
    } else ED.freeTmp = null;
    ED.tool = t;
    main.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    const hint = $('#hint');
    if (hint) hint.textContent = t === 'calib' ? 'Toque nas duas marcas de distância conhecida (fio de prumo ou régua), uma de cada vez.' : t === 'plumb' ? 'Toque na foto onde passa o fio de prumo (ex.: entre os calcanhares).' : t === 'free' ? 'Toque em 3 pontos. O segundo é o vértice do ângulo.' : t === 'pan' ? 'Arraste para mover. Use dois dedos para aproximar.' : Angles.VIEWS[ED.tab].sideNote + ' Toque para marcar o ponto selecionado; arraste um ponto para ajustar.';
  }

  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  async function loadPhoto(key, file, meta) {
    const url = URL.createObjectURL(file);
    const img = await loadImg(url);
    const max = 1800;
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    const v = ED.a.views[key];
    if (v.photo && Object.keys(v.pts).length && !confirm('Trocar a foto apaga os pontos marcados nesta vista. Continuar?')) return;
    v.photo = c.toDataURL('image/jpeg', 0.88);
    v.pts = {};
    v.pts2 = {};
    v.free = [];
    v.plumbX = null;
    v.calib = null;
    v.captureTilt = meta && meta.tilt != null ? meta.tilt : null;
    invalidate();
    await DB.put('assessments', ED.a);
    renderView(key);
  }

  // ---------- Canvas ----------
  let cv, ctx;
  function setupCanvas() {
    cv = $('#cv');
    if (!cv) return;
    ctx = cv.getContext('2d');
    const w = $('#stage').clientWidth;
    const h = Math.max(380, Math.min(window.innerHeight - 200, 1100));
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fit();
    draw();
    cv.onpointerdown = onDown;
    cv.onpointermove = onMove;
    cv.onpointerup = cv.onpointercancel = onUp;
  }
  window.addEventListener('resize', () => { if (ED.active && VIEW_KEYS.includes(ED.tab) && ED.img) setupCanvas(); });

  function fit() {
    const w = cv.clientWidth, h = cv.clientHeight, iw = ED.img.naturalWidth, ih = ED.img.naturalHeight;
    const s = Math.min(w / iw, h / ih);
    ED.tf = { s, x: (w - iw * s) / 2, y: (h - ih * s) / 2 };
  }
  function zoomBy(f, cx, cy) {
    if (!cv) return;
    cx = cx == null ? cv.clientWidth / 2 : cx;
    cy = cy == null ? cv.clientHeight / 2 : cy;
    const t = ED.tf;
    t.x = cx - (cx - t.x) * f;
    t.y = cy - (cy - t.y) * f;
    t.s *= f;
    draw();
  }
  const toImg = (p) => ({ x: (p.x - ED.tf.x) / ED.tf.s, y: (p.y - ED.tf.y) / ED.tf.s });
  const evPos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  function nearestPoint(q, radiusPx) {
    const v = ED.a.views[ED.tab];
    let best = null, bd = radiusPx / ED.tf.s;
    for (const [id, p] of Object.entries(pset(v))) {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }

  function onDown(e) {
    cv.setPointerCapture(e.pointerId);
    const p = evPos(e);
    ED.ptrs.set(e.pointerId, p);
    if (ED.ptrs.size === 2) {
      const [a, b] = [...ED.ptrs.values()];
      ED.drag = null;
      ED.loupe = null;
      ED.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, tf: { ...ED.tf } };
      return;
    }
    const v = ED.a.views[ED.tab];
    const q = toImg(p);
    if (ED.tool === 'pan') { ED.drag = { pan: p, tf: { ...ED.tf } }; return; }
    if (ED.tool === 'plumb') { v.plumbX = q.x; saveSoon(); draw(); return; }
    if (ED.tool === 'calib') {
      ED.calibTmp.push(q);
      if (ED.calibTmp.length === 2) {
        const cm = parseFloat(String(($('#calcm') || {}).value || ED.lastCalCm || 100).replace(',', '.'));
        const orient = ($('#calori') || {}).value || ED.lastCalOri || 'v';
        const c = Angles.calibFromPoints(ED.calibTmp[0], ED.calibTmp[1], cm, orient);
        if (!c) { alert('Distância inválida: informe a distância real em cm.'); setTool('mark'); return; }
        ED.lastCalCm = cm; ED.lastCalOri = orient;
        v.calib = c;
        invalidate(); saveSoon(); setTool('mark'); renderCalPanel(); refreshSide();
      }
      draw();
      return;
    }
    if (ED.tool === 'free') {
      ED.freeTmp.pts.push(q);
      if (ED.freeTmp.pts.length === 3) { v.free.push(ED.freeTmp); saveSoon(); setTool('mark'); refreshSide(); }
      draw();
      return;
    }
    // Tocar e arrastar um ponto existente move esse ponto; um toque simples marca o ponto selecionado.
    const hit = nearestPoint(q, 26);
    ED.drag = { id: null, hit, start: p, q };
    ED.loupe = { p, q };
    draw();
  }

  function startPointDrag(id, q, placed) {
    ED.sel = id;
    pset(ED.a.views[ED.tab])[id] = q;
    invalidate();
    ED.drag = { id, placed };
    refreshSide();
  }

  function onMove(e) {
    if (!ED.ptrs.has(e.pointerId)) return;
    const p = evPos(e);
    ED.ptrs.set(e.pointerId, p);
    if (ED.pinch && ED.ptrs.size === 2) {
      const [a, b] = [...ED.ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const t0 = ED.pinch.tf, f = d / ED.pinch.d;
      ED.tf = { s: t0.s * f, x: c.x - (ED.pinch.c.x - t0.x) * f, y: c.y - (ED.pinch.c.y - t0.y) * f };
      draw();
      return;
    }
    if (!ED.drag) return;
    if (ED.drag.pan) {
      ED.tf.x = ED.drag.tf.x + p.x - ED.drag.pan.x;
      ED.tf.y = ED.drag.tf.y + p.y - ED.drag.pan.y;
    } else if (!ED.drag.id) {
      // Ainda não decidido: vira arraste quando o dedo se move mais de 6 px.
      if (Math.hypot(p.x - ED.drag.start.x, p.y - ED.drag.start.y) < 6) return;
      const id = ED.drag.hit || ED.sel;
      if (!id) { ED.drag = null; return; }
      startPointDrag(id, toImg(p), !ED.drag.hit && !pset(ED.a.views[ED.tab])[id]);
      ED.loupe = { p, q: toImg(p) };
    } else {
      const q = toImg(p);
      pset(ED.a.views[ED.tab])[ED.drag.id] = q;
      ED.loupe = { p, q };
    }
    draw();
  }

  function onUp(e) {
    ED.ptrs.delete(e.pointerId);
    if (ED.ptrs.size < 2) ED.pinch = null;
    if (ED.drag && !ED.drag.id && !ED.drag.pan && ED.sel) {
      // Toque simples: marca (ou reposiciona) o ponto selecionado onde o dedo tocou.
      startPointDrag(ED.sel, ED.drag.q, !pset(ED.a.views[ED.tab])[ED.sel]);
    }
    if (ED.drag && ED.drag.id) {
      saveSoon();
      if (ED.drag.placed) ED.sel = firstMissing(ED.tab) || ED.drag.id;
      refreshSide();
    }
    ED.drag = null;
    ED.loupe = null;
    draw();
  }

  function draw() {
    if (!cv || !ED.img || !VIEW_KEYS.includes(ED.tab)) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    drawView(ctx, ED.img, ED.tab, ED.a.views[ED.tab], ED.tf, 1, { grid: ED.grid, sel: ED.sel, tmp: ED.freeTmp, set: ED.mark, calibTmp: ED.calibTmp });
    if (ED.loupe) drawLoupe();
  }

  function drawLoupe() {
    const R = 70, Z = 3, { q } = ED.loupe;
    const cx = R + 12, cy = R + 12;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    const s = ED.tf.s * Z;
    drawView(ctx, ED.img, ED.tab, ED.a.views[ED.tab], { s, x: cx - q.x * s, y: cy - q.y * s }, 1, { grid: false, sel: ED.sel, noLabels: true, set: ED.mark });
    ctx.restore();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
    ctx.stroke();
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
    c.drawImage(img, 0, 0);
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
      (def.skeleton || []).forEach((ids) => seg(ids, 'rgba(255,255,255,0.7)', 2.5));
      (def.legs || []).forEach((ids) => seg(ids, 'rgba(31,120,209,0.85)', 2.5));
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
    (opt.only ? [] : (v.free || []).concat(opt.tmp ? [opt.tmp] : [])).forEach((f) => {
      c.strokeStyle = '#9b59ff';
      c.lineWidth = 3.5 * u;
      c.beginPath();
      f.pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.stroke();
      f.pts.forEach((p) => dot(c, p, u, '#9b59ff', false));
      if (f.pts.length === 3 && !opt.noLabels) tagLabel(c, `${f.label}: ${Angles.fmt(Angles.angleAt(f.pts[0], f.pts[1], f.pts[2]))}°`, f.pts[1].x + 10 * u, f.pts[1].y + 22 * u, u);
    });
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
    c.arc(p.x, p.y, 6 * u, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
    c.lineWidth = 2.5 * u;
    c.strokeStyle = color;
    c.stroke();
    if (sel) {
      c.beginPath();
      c.arc(p.x, p.y, 13 * u, 0, Math.PI * 2);
      c.strokeStyle = '#e53935';
      c.lineWidth = 2.5 * u;
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
    const groups = allResults(ED.a);
    main.innerHTML = `${tabsHtml()}
      <div class="card"><h2>Resultados</h2>
      <p class="muted">Valores em graus na convenção descrita em cada medida. Ângulo de foto descreve a configuração observada em apoio estático; não é diagnóstico.</p>
      ${groups.map((g) => `<h3>${esc(g.def.label)}</h3>${g.res.length ? `<div class="table-wrap"><table><tr><th>Código</th><th>Medida</th><th>Valor</th><th>Descrição</th><th>Referência</th><th>Conduta</th></tr>
        ${g.res.map((r) => { const f = flagFor(r); return `<tr><td>${r.code}</td><td>${esc(r.label)}</td><td><b>${Angles.fmtVal(r)}</b></td><td>${esc(r.text)}</td><td><span class="tag ${f.cls}">${esc(f.txt)}</span></td>
          <td><select data-cond="${r.code}">${CONDUTA.map((o) => `<option ${ED.a.conduta[r.code] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></td></tr>`; }).join('')}
      </table></div>` : '<p class="muted">Nenhuma medida completa nesta vista.</p>'}
      ${ED.a.views[g.key].free.length ? `<p>Ângulos livres: ${ED.a.views[g.key].free.map((f) => `${esc(f.label)} <b>${Angles.fmt(Angles.angleAt(f.pts[0], f.pts[1], f.pts[2]))}°</b>`).join(' · ')}</p>` : ''}`).join('')}
      </div>`;
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
      <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="l-val" style="width:auto" ${a.validado ? 'checked' : ''}> Conferi e validei as marcações de todas as vistas</label>
      <p class="muted">${a.validado ? 'Validado em ' + new Date(a.validado.em).toLocaleString('pt-BR') + '. Se você mudar um ponto ou a calibração, a validação é desfeita.' : 'Marque a confirmação para gerar o laudo: as marcações são validadas por quem avalia.'}</p></div>`;
    const bindControls = () => {
      $('#l-tipo').onchange = (e) => { a.tipoLaudo = e.target.value; saveSoon(); renderLaudo(); };
      $('#l-mask').onchange = (e) => { a.mascara = e.target.checked; saveSoon(); renderLaudo(); };
      $('#l-val').onchange = (e) => { a.validado = e.target.checked ? { ok: true, em: new Date().toISOString() } : null; saveSoon(); renderLaudo(); };
      bindTabs();
    };
    if (!a.validado) { main.innerHTML = controls; bindControls(); return; }
    main.innerHTML = controls + '<div class="card"><p class="muted">Gerando o laudo…</p></div>';
    bindControls();
    const prev = a.comparar ? await DB.get('assessments', a.comparar).then((x) => x && normalize(x)) : null;
    const history = (await studentHistory(a.studentId)).map((x) => (x.id === a.id ? a : x));
    const html = await Report.build({ a, s: ED.s, prev, history, perfil: state.perfil, refs: state.refs, opts: { tipo: a.tipoLaudo, mascara: a.mascara },
      helpers: { loadImg, drawView, allResults, flagFor, refFor, CLASSES, CONDICOES, SITUACOES, fmtDate, esc, CHECKLIST, reproRows, calibNotes, beforeAfterCanvas, chartImage, seriesFor } });
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
    main.innerHTML = `${tabsHtml()}
      <div class="card"><h2>Testes de movimento</h2>
        <p class="muted">Registro do que foi observado, sem diagnóstico e sem pontos de corte próprios. Marque só o que viu. Os protocolos abaixo são um guia: confira com o seu manual de movimento.</p></div>
      ${Mov.TESTS.map((t) => `<details class="card mv"><summary><b>${esc(t.nome)}</b> <span class="muted">${cnt(t.id) ? '· ' + cnt(t.id) + ' registro(s)' : ''}</span></summary>
        <p class="muted">${esc(t.protocolo)}</p>
        <div class="grid2">${t.campos.map((c) => field(t, c)).join('')}</div>
        <label>Observação</label><textarea data-mv="${t.id}|obs" data-t="txt">${esc(val(t.id, 'obs') || '')}</textarea></details>`).join('')}
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

  // ---------- Calibração ----------
  function renderCalPanel() {
    const cp = $('#calpanel');
    if (!cp) return;
    const key = ED.tab, v = ED.a.views[key];
    if (v.calib) {
      const c = v.calib, fmt = Angles.fmt;
      cp.innerHTML = `<p class="muted">1 cm = ${String(Math.round(c.pxPerCm * 100) / 100).replace('.', ',')} px · referência ${c.orient === 'h' ? 'horizontal' : 'vertical'} de ${esc(c.cm)} cm.<br>${Math.abs(c.rot) >= 0.05 ? 'Inclinação da foto: ' + fmt(Math.abs(c.rot)) + '°' + (c.apply !== false ? ' (corrigida nos ângulos)' : ' (não corrigida)') : 'Foto sem inclinação medida.'}</p>
        <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="calapply" style="width:auto" ${c.apply !== false ? 'checked' : ''}> Corrigir a inclinação da foto nos ângulos</label>
        <div class="row" style="margin-top:6px"><button id="calredo">Refazer</button><button class="danger" id="calrm">Remover</button></div>`;
      $('#calapply').onchange = (e) => { c.apply = e.target.checked; invalidate(); saveSoon(); renderCalPanel(); refreshSide(); draw(); };
      $('#calredo').onclick = () => { ED.lastCalCm = c.cm; ED.lastCalOri = c.orient; v.calib = null; invalidate(); saveSoon(); renderCalPanel(); refreshSide(); draw(); };
      $('#calrm').onclick = () => { v.calib = null; invalidate(); saveSoon(); renderCalPanel(); refreshSide(); draw(); };
    } else {
      cp.innerHTML = `<p class="muted">Toque nas duas marcas do fio de prumo (ou de uma régua) com distância real conhecida. Isso dá a escala em cm e corrige a foto inclinada.</p>
        <div class="grid2"><div><label>Distância real (cm)</label><input id="calcm" inputmode="decimal" value="${esc(ED.lastCalCm || 100)}"></div>
        <div><label>Referência</label><select id="calori"><option value="v" ${ED.lastCalOri !== 'h' ? 'selected' : ''}>Fio de prumo (vertical)</option><option value="h" ${ED.lastCalOri === 'h' ? 'selected' : ''}>Régua (horizontal)</option></select></div></div>
        <button id="calgo" ${v.photo ? '' : 'disabled'}>Marcar as 2 marcas na foto</button>`;
      $('#calgo').onclick = () => setTool('calib');
    }
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

  function showStudentGuide(backFn) {
    ED.active = false;
    setHeader('Guia de fotos para o aluno', backFn || showHome);
    main.innerHTML = `<div class="card"><h2>Guia de fotos para o aluno</h2>
      <p class="muted">Texto pronto para enviar pelo WhatsApp ou imprimir. O aluno só envia as fotos para você (individualmente), depois do consentimento.</p>
      <pre id="guia" style="white-space:pre-wrap;font:inherit;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px">${esc(GUIA_ALUNO)}</pre>
      <div class="row"><button class="primary" id="g-share">Compartilhar</button><button id="g-copy">Copiar texto</button><button id="g-print">Imprimir / salvar em PDF</button></div></div>`;
    $('#g-share').onclick = async () => {
      if (navigator.share) { try { await navigator.share({ title: 'Guia de fotos — avaliação postural', text: GUIA_ALUNO }); } catch (_) { /* cancelado */ } }
      else { try { await navigator.clipboard.writeText(GUIA_ALUNO); alert('Compartilhar não está disponível aqui; o texto foi copiado.'); } catch (_) { alert('Selecione e copie o texto acima.'); } }
    };
    $('#g-copy').onclick = async () => { try { await navigator.clipboard.writeText(GUIA_ALUNO); alert('Texto copiado.'); } catch (_) { alert('Selecione e copie o texto acima.'); } };
    $('#g-print').onclick = () => {
      $('#report').innerHTML = `<div class="rp"><div class="page"><div class="brandbar"><img src="logo-ct.png" alt="CT Pedro Bispo"><img src="logo-correplus.webp" alt="Corre+"></div>
        <h1>${esc(GUIA_ALUNO.split('\n')[0])}</h1><div style="white-space:pre-wrap;font-size:12pt;line-height:1.5">${esc(GUIA_ALUNO.split('\n').slice(2).join('\n'))}</div></div></div>`;
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


  // ---------- Referências ----------
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
      <ul class="muted">${Object.values(CLASSES).map((c) => `<li>${c}</li>`).join('')}</ul></div>`;
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
