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

  // ---------- Alunos ----------
  async function showHome() {
    ED.active = false;
    setHeader('Avaliação Postural');
    const students = (await DB.all('students')).sort((a, b) => a.nome.localeCompare(b.nome));
    main.innerHTML = `
      <div class="card">
        <div class="row" style="justify-content:space-between"><h2>Alunos</h2><button class="primary" id="new">+ Novo aluno</button></div>
        <input id="q" placeholder="Buscar aluno" style="margin-bottom:8px">
        <div class="list" id="list">${students.map((s) => `<a href="#" data-id="${s.id}" data-n="${esc(s.nome.toLowerCase())}"><b>${esc(s.nome)}</b><br><span class="muted">${s.consent && s.consent.ok ? 'Consentimento registrado' : 'Sem consentimento registrado'}</span></a>`).join('') || '<p class="muted">Nenhum aluno cadastrado.</p>'}</div>
      </div>
      <p class="muted">Os dados e as fotos ficam guardados só neste aparelho. Faça uma cópia de segurança com frequência.</p>`;
    $('#new').onclick = () => showStudentForm();
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
        <div class="row" style="justify-content:space-between"><h2>${esc(s.nome)}</h2><button id="edit">Editar dados</button></div>
        <p class="muted">${s.nascimento ? 'Nascimento: ' + fmtDate(s.nascimento) + ' · ' : ''}${s.altura ? 'Altura: ' + esc(s.altura) + ' cm · ' : ''}${s.peso ? 'Peso: ' + esc(s.peso) + ' kg' : ''}</p>
        <p class="${s.consent.ok ? 'muted' : 'warn'}">${s.consent.ok ? 'Consentimento de imagem registrado em ' + fmtDate(s.consent.data) : 'Sem consentimento de imagem: registre antes de fotografar.'}</p>
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><h2>Avaliações</h2><button class="primary" id="nova" ${s.consent.ok ? '' : 'disabled'}>+ Nova avaliação</button></div>
        <div class="list">${list.map((a) => `<a href="#" data-id="${a.id}"><b>${fmtDate(a.data)}</b> <span class="muted">· ${VIEW_KEYS.filter((k) => a.views[k].photo).length} de 4 vistas com foto</span></a>`).join('') || '<p class="muted">Nenhuma avaliação.</p>'}</div>
      </div>`;
    $('#edit').onclick = () => showStudentForm(id);
    $('#nova').onclick = async () => {
      const a = newAssessment(id);
      await DB.put('assessments', a);
      openEditor(a.id, 'ant');
    };
    main.querySelectorAll('.list a').forEach((el) => (el.onclick = (e) => { e.preventDefault(); openEditor(el.dataset.id, 'ant'); }));
  }

  function newAssessment(studentId) {
    const views = {};
    VIEW_KEYS.forEach((k) => (views[k] = { photo: null, pts: {}, free: [], facing: Angles.VIEWS[k].defaultFacing || null, plumbX: null }));
    return {
      id: uid(), studentId, data: today(), avaliador: state.perfil.nome, views,
      condicoes: {}, sintomas: '', movimento: '', observacao: '', linguagemSimples: '',
      conduta: {}, prioridades: [], comparar: '',
    };
  }

  // ---------- Editor ----------
  const ED = { active: false, a: null, s: null, tab: 'ant', img: null, sel: null, tool: 'mark', tf: { s: 1, x: 0, y: 0 }, grid: true, plumb: true, guide: true, ptrs: new Map(), drag: null, pinch: null, freeTmp: null, loupe: null };
  let saveTimer;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => DB.put('assessments', ED.a), 400); };

  async function openEditor(id, tab) {
    ED.a = await DB.get('assessments', id);
    ED.s = await DB.get('students', ED.a.studentId);
    ED.active = true;
    setHeader(ED.s.nome + ' · ' + fmtDate(ED.a.data), () => showStudent(ED.s.id));
    renderTab(tab || 'ant');
  }

  function tabsHtml() {
    const t = [['ant', 'Anterior'], ['post', 'Posterior'], ['latD', 'Lateral D'], ['latE', 'Lateral E'], ['res', 'Resultados'], ['ficha', 'Ficha e conduta'], ['laudo', 'Laudo']];
    return `<div class="tabs">${t.map(([k, l]) => `<button data-tab="${k}" class="${ED.tab === k ? 'primary' : ''}">${l}</button>`).join('')}</div>`;
  }

  function renderTab(tab) {
    ED.tab = tab;
    ED.sel = null;
    ED.freeTmp = null;
    ED.tool = 'mark';
    if (VIEW_KEYS.includes(tab)) renderView(tab);
    else if (tab === 'res') renderResults();
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
            <label class="btn" style="margin:0;color:var(--ink)">${v.photo ? 'Trocar foto' : 'Escolher ou tirar foto'}<input type="file" accept="image/*" id="file" hidden></label>
            <button data-tool="mark">Marcar</button><button data-tool="pan">Mover</button><button data-tool="plumb">Fio de prumo</button><button data-tool="free">Ângulo livre</button>
            <button id="zin">+</button><button id="zout">−</button><button id="zfit">Ajustar</button>
            <button id="tgrid" class="${ED.grid ? 'on' : ''}">Grade</button><button id="tguide" class="${ED.guide ? 'on' : ''}">Guia</button>
          </div>
          <div class="stagewrap"><div class="guide" id="guide" hidden></div><div class="stage" id="stage">${v.photo ? '<canvas id="cv"></canvas>' : `<div class="empty">Escolha a foto da vista ${esc(def.label.toLowerCase())}.<br><br>Câmera fixa, perpendicular ao aluno, corpo inteiro na foto, pés na base marcada.</div>`}</div></div>
          <p class="muted" id="hint">${esc(def.sideNote)}</p>
        </div>
        <div>
          ${def.defaultFacing ? `<label>O aluno está olhando para a</label><select id="facing"><option value="esq" ${v.facing === 'esq' ? 'selected' : ''}>esquerda da foto</option><option value="dir" ${v.facing === 'dir' ? 'selected' : ''}>direita da foto</option></select>` : ''}
          <h3>Pontos</h3>
          <div class="pts" id="pts"></div>
          <div class="row" style="margin-top:8px"><button id="clrpt">Apagar ponto</button><button class="danger" id="clrall">Limpar vista</button></div>
          <h3>Ângulos livres</h3><div id="frees"></div>
        </div>
      </div>`;
    $('#file').onchange = (e) => e.target.files[0] && loadPhoto(key, e.target.files[0]);
    if (def.defaultFacing) $('#facing').onchange = (e) => { v.facing = e.target.value; saveSoon(); draw(); };
    main.querySelectorAll('[data-tool]').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
    $('#tgrid').onclick = () => { ED.grid = !ED.grid; $('#tgrid').classList.toggle('on', ED.grid); draw(); };
    $('#tguide').onclick = () => { ED.guide = !ED.guide; $('#tguide').classList.toggle('on', ED.guide); refreshSide(); };
    $('#zin').onclick = () => zoomBy(1.4);
    $('#zout').onclick = () => zoomBy(1 / 1.4);
    $('#zfit').onclick = () => { fit(); draw(); };
    $('#clrpt').onclick = () => { if (ED.sel && v.pts[ED.sel]) { delete v.pts[ED.sel]; saveSoon(); refreshSide(); draw(); } };
    $('#clrall').onclick = () => { if (confirm('Apagar todos os pontos desta vista?')) { v.pts = {}; v.free = []; saveSoon(); refreshSide(); draw(); } };
    ED.sel = firstMissing(key);
    refreshSide();
    setTool('mark');
    bindTabs();
    if (v.photo) loadImg(v.photo).then((img) => { ED.img = img; setupCanvas(); });
  }

  function firstMissing(key) {
    const v = ED.a.views[key];
    const p = Angles.VIEWS[key].points.find(([id]) => !v.pts[id]);
    return p ? p[0] : null;
  }

  function refreshSide() {
    const key = ED.tab;
    const v = ED.a.views[key];
    $('#pts').innerHTML = Angles.VIEWS[key].points.map(([id, label, hint]) =>
      `<div data-pt="${id}" class="${v.pts[id] ? 'done' : ''} ${ED.sel === id ? 'sel' : ''}"><span class="dot"></span><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span></div>`).join('');
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
    if (t === 'free') {
      const label = prompt('Nome do ângulo (ex.: tronco no agachamento):', 'Ângulo livre ' + (ED.a.views[ED.tab].free.length + 1));
      if (label === null) return;
      ED.freeTmp = { label: label || 'Ângulo livre', pts: [] };
    } else ED.freeTmp = null;
    ED.tool = t;
    main.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    const hint = $('#hint');
    if (hint) hint.textContent = t === 'plumb' ? 'Toque na foto onde passa o fio de prumo (ex.: entre os calcanhares).' : t === 'free' ? 'Toque em 3 pontos. O segundo é o vértice do ângulo.' : t === 'pan' ? 'Arraste para mover. Use dois dedos para aproximar.' : Angles.VIEWS[ED.tab].sideNote + ' Toque para marcar o ponto selecionado; arraste um ponto para ajustar.';
  }

  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  async function loadPhoto(key, file) {
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
    v.free = [];
    v.plumbX = null;
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
    for (const [id, p] of Object.entries(v.pts)) {
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
    ED.a.views[ED.tab].pts[id] = q;
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
      startPointDrag(id, toImg(p), !ED.drag.hit && !ED.a.views[ED.tab].pts[id]);
      ED.loupe = { p, q: toImg(p) };
    } else {
      const q = toImg(p);
      ED.a.views[ED.tab].pts[ED.drag.id] = q;
      ED.loupe = { p, q };
    }
    draw();
  }

  function onUp(e) {
    ED.ptrs.delete(e.pointerId);
    if (ED.ptrs.size < 2) ED.pinch = null;
    if (ED.drag && !ED.drag.id && !ED.drag.pan && ED.sel) {
      // Toque simples: marca (ou reposiciona) o ponto selecionado onde o dedo tocou.
      startPointDrag(ED.sel, ED.drag.q, !ED.a.views[ED.tab].pts[ED.sel]);
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
    drawView(ctx, ED.img, ED.tab, ED.a.views[ED.tab], ED.tf, 1, { grid: ED.grid, sel: ED.sel, tmp: ED.freeTmp });
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
    drawView(ctx, ED.img, ED.tab, ED.a.views[ED.tab], { s, x: cx - q.x * s, y: cy - q.y * s }, 1, { grid: false, sel: ED.sel, noLabels: true });
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
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const u = k / tf.s; // 1 pixel de tela em unidades da imagem
    c.save();
    c.translate(tf.x, tf.y);
    c.scale(tf.s, tf.s);
    c.drawImage(img, 0, 0);
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
    if (!opt.only) {
      const seg = (ids, color, w) => {
        c.strokeStyle = color; c.lineWidth = w * u; c.lineCap = 'round';
        for (let i = 0; i + 1 < ids.length; i++) {
          const a = v.pts[ids[i]], b = v.pts[ids[i + 1]];
          if (a && b) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        }
        c.lineCap = 'butt';
      };
      (def.skeleton || []).forEach((ids) => seg(ids, 'rgba(255,255,255,0.7)', 2.5));
      (def.legs || []).forEach((ids) => seg(ids, 'rgba(31,120,209,0.85)', 2.5));
    }
    const results = Angles.computeView(key, v.pts, v.facing);
    def.measures.forEach((m) => {
      if (opt.only && m.code !== opt.only) return;
      if (opt.style === 'apecs' && (m.type === 'knee' || /complementar/.test(m.label) && m.type === 'align')) return;
      const redLine = opt.style === 'apecs' && (m.type === 'align' || m.type === 'vertical');
      Angles.geometry(m, v.pts).forEach((line) => {
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
        const line = Angles.geometry(m, v.pts)[0];
        const at = line[line.length > 2 ? 1 : 0];
        tagLabel(c, `${m.code} ${Angles.fmt(r.value)}°`, at.x + 10 * u, at.y - 10 * u, u);
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
    Object.entries(v.pts).forEach(([id, p]) => { if (!onlyIds || onlyIds.has(id)) dot(c, p, u, '#1f78d1', id === opt.sel); });
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
    const val = (code) => { const r = results.find((x) => x.code === code); return r ? Angles.fmt(r.value) + '°' : null; };
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
    return VIEW_KEYS.map((k) => ({ key: k, def: Angles.VIEWS[k], res: Angles.computeView(k, a.views[k].pts, a.views[k].facing) }));
  }

  function renderResults() {
    const groups = allResults(ED.a);
    main.innerHTML = `${tabsHtml()}
      <div class="card"><h2>Resultados</h2>
      <p class="muted">Valores em graus na convenção descrita em cada medida. Ângulo de foto descreve a configuração observada em apoio estático; não é diagnóstico.</p>
      ${groups.map((g) => `<h3>${esc(g.def.label)}</h3>${g.res.length ? `<div class="table-wrap"><table><tr><th>Código</th><th>Medida</th><th>Valor</th><th>Descrição</th><th>Referência</th><th>Conduta</th></tr>
        ${g.res.map((r) => { const f = flagFor(r); return `<tr><td>${r.code}</td><td>${esc(r.label)}</td><td><b>${Angles.fmt(r.value)}°</b></td><td>${esc(r.text)}</td><td><span class="tag ${f.cls}">${esc(f.txt)}</span></td>
          <td><select data-cond="${r.code}">${CONDUTA.map((o) => `<option ${ED.a.conduta[r.code] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></td></tr>`; }).join('')}
      </table></div>` : '<p class="muted">Nenhuma medida completa nesta vista.</p>'}
      ${ED.a.views[g.key].free.length ? `<p>Ângulos livres: ${ED.a.views[g.key].free.map((f) => `${esc(f.label)} <b>${Angles.fmt(Angles.angleAt(f.pts[0], f.pts[1], f.pts[2]))}°</b>`).join(' · ')}</p>` : ''}`).join('')}
      </div>`;
    main.querySelectorAll('[data-cond]').forEach((s) => (s.onchange = () => { ED.a.conduta[s.dataset.cond] = s.value; saveSoon(); }));
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
    main.innerHTML = `${tabsHtml()}<div class="card"><p class="muted">Gerando o laudo…</p></div>`;
    const prev = ED.a.comparar ? await DB.get('assessments', ED.a.comparar) : null;
    const html = await Report.build({ a: ED.a, s: ED.s, prev, perfil: state.perfil, refs: state.refs, helpers: { loadImg, drawView, allResults, flagFor, refFor, CLASSES, CONDICOES, SITUACOES, fmtDate, esc } });
    main.innerHTML = `${tabsHtml()}
      <div class="card"><div class="row"><button class="primary" id="print">Imprimir / salvar em PDF</button>
      <span class="muted">No iPad: toque em Imprimir, depois em Compartilhar (ou afaste dois dedos na prévia) e escolha "Salvar em Arquivos".</span></div></div>
      <div class="card rp">${html}</div>`;
    $('#report').innerHTML = `<div class="rp">${html}</div>`;
    bindTabs();
    $('#print').onclick = () => window.print();
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
      <td><input data-k="erro" inputmode="decimal" value="${esc(r.erro)}" placeholder="°"></td><td><button data-del="${i}">×</button></td></tr>`;
    main.innerHTML = `<div class="card"><h2>Referências e alvos por medida</h2>
      <p class="muted">Não existe uma escala angular única para o corpo todo. Cadastre aqui, medida por medida, a faixa que você usa, a classe e a fonte.
      Uma faixa criada por você é <b>Classe C — alvo operacional interno</b>: registre a justificativa. Sem faixa, o laudo mostra o valor como contínuo.
      O campo "erro" é o erro de medida local (°); só com ele o laudo afirma que uma mudança entre avaliações supera o erro.</p>
      <p class="muted">Para medidas com sinal (joelho, pé, retropé), use valores positivos para projeção medial, ponta do pé para fora e calcâneo lateral.</p>
      <div class="table-wrap"><table><tr><th>Medida</th><th>Mín (°)</th><th>Máx (°)</th><th>Classe</th><th>Fonte / justificativa</th><th>População</th><th>Erro (°)</th><th></th></tr>
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
  loadSettings().then(showHome);
})();
