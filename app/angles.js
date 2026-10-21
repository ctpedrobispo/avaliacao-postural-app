// Motor de ângulos da avaliação postural por fotogrametria.
// Funções puras: recebem pontos em coordenadas de imagem (x para a direita, y para baixo)
// e devolvem ângulos em graus. Usado pelo app no navegador e pelos testes no Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Angles = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const deg = (r) => (r * 180) / Math.PI;
  const round1 = (v) => Math.round(v * 10) / 10;
  // Número com uma casa decimal e vírgula, como se escreve no Brasil.
  const fmt = (v) => String(round1(v)).replace('.', ',');
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  // Inclinação de um segmento em relação à horizontal (0–90°) e qual ponto está mais alto.
  function tilt(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return {
      angle: deg(Math.atan2(Math.abs(dy), Math.abs(dx))),
      higher: dy === 0 ? null : dy > 0 ? 'a' : 'b',
    };
  }

  // Inclinação de um segmento em relação à vertical (0–90°).
  // topShift: +1 quando o ponto mais alto está à direita do mais baixo na imagem, −1 à esquerda.
  function fromVertical(a, b) {
    const top = a.y <= b.y ? a : b;
    const bottom = top === a ? b : a;
    const dx = top.x - bottom.x;
    const dy = bottom.y - top.y;
    return { angle: deg(Math.atan2(Math.abs(dx), Math.abs(dy))), topShift: Math.sign(dx) };
  }

  // Ângulo interno no vértice v entre os segmentos v→a e v→b (0–180°).
  function angleAt(a, v, b) {
    const u = { x: a.x - v.x, y: a.y - v.y };
    const w = { x: b.x - v.x, y: b.y - v.y };
    return deg(Math.atan2(Math.abs(u.x * w.y - u.y * w.x), u.x * w.x + u.y * w.y));
  }

  // Mudança de direção com sinal no ponto b, ao percorrer a → b → c.
  // Positivo quando o caminho dobra no sentido horário da tela (y para baixo).
  function signedTurn(a, b, c) {
    const t = { x: b.x - a.x, y: b.y - a.y };
    const l = { x: c.x - b.x, y: c.y - b.y };
    return deg(Math.atan2(t.x * l.y - t.y * l.x, t.x * l.x + t.y * l.y));
  }

  // Desvio frontal do joelho: quadril → joelho → tornozelo.
  // sideSign = +1 para a perna à esquerda da imagem, −1 para a perna à direita.
  // Positivo = joelho projetado medialmente (para a linha média) em relação à linha quadril–tornozelo.
  function kneeFrontal(hip, knee, ankle, sideSign) {
    return signedTurn(hip, knee, ankle) * sideSign;
  }

  // Rotação do pé no plano da foto: tornozelo (ou calcanhar) → 2º dedo em relação à vertical.
  // Na vista anterior a ponta do pé aparece abaixo do tornozelo; vale para os dois sentidos.
  // Positivo = ponta do pé voltada para fora (rotação externa aparente).
  function footRotation(heel, toe, sideSign) {
    const dx = toe.x - heel.x;
    const dy = toe.y - heel.y;
    return -sideSign * deg(Math.atan2(dx, Math.abs(dy)));
  }

  // Retropé na vista posterior: tendão (meio) → tendão (inserção) → base do calcâneo.
  // Positivo = base do calcâneo desviada lateralmente em relação à linha do tendão.
  function rearfoot(tendonTop, tendonBottom, heelBase, sideSign) {
    return signedTurn(tendonTop, tendonBottom, heelBase) * sideSign;
  }

  const pick = (pts, ref) => (Array.isArray(ref) ? midOf(pts, ref) : pts[ref] || null);
  function midOf(pts, refs) {
    const ps = refs.map((r) => pts[r]);
    return ps.every(Boolean) ? mid(ps[0], ps[1]) : null;
  }

  // Lado da imagem em que aparece o lado do paciente.
  // Vista anterior: o lado direito do paciente aparece à esquerda da imagem. Posterior: à direita.
  const imageLeftSide = { ant: 'D', post: 'E' };

  // Definições das vistas, com os códigos do relatório APECS (manual de postura, seção 22).
  const VIEWS = {
    ant: {
      label: 'Anterior (frente)',
      codePrefix: 'A',
      sideNote: 'O lado direito do aluno aparece à ESQUERDA da foto.',
      points: [
        ['cabD', 'Cabeça D', 'ângulo da mandíbula ou lóbulo da orelha, lado direito do aluno'],
        ['cabE', 'Cabeça E', 'mesmo ponto, lado esquerdo do aluno'],
        ['acrD', 'Acrômio D', ''],
        ['acrE', 'Acrômio E', ''],
        ['axiD', 'Axila D', 'prega axilar anterior'],
        ['axiE', 'Axila E', ''],
        ['cxtD', 'Caixa torácica D', 'borda inferior do gradil costal'],
        ['cxtE', 'Caixa torácica E', ''],
        ['troD', 'Tronco D', 'ponto mais profundo da cintura'],
        ['troE', 'Tronco E', ''],
        ['asiD', 'EIAS D', 'espinha ilíaca anterossuperior'],
        ['asiE', 'EIAS E', ''],
        ['joeD', 'Joelho D', 'centro da patela'],
        ['joeE', 'Joelho E', ''],
        ['torD', 'Tornozelo D', 'ponto médio entre os maléolos'],
        ['torE', 'Tornozelo E', ''],
        ['dedD', '2º dedo D', 'ponta do 2º dedo'],
        ['dedE', '2º dedo E', ''],
        ['nar', 'Centro do rosto (nariz)', 'opcional: ponta do nariz, na linha média'],
        ['est', 'Incisura jugular', 'opcional: centro da fúrcula esternal, entre as clavículas'],
        ['xif', 'Processo xifoide', 'opcional: ponta inferior do esterno, na linha média'],
      ],
      measures: [
        { code: 'A1', label: 'Alinhamento corporal', type: 'align', pts: [['cabD', 'cabE'], ['torD', 'torE']] },
        { code: 'A2', label: 'Inclinação da cabeça', type: 'tilt', pts: ['cabD', 'cabE'] },
        { code: 'A3', label: 'Alinhamento dos ombros', type: 'tilt', pts: ['acrD', 'acrE'] },
        { code: 'A4', label: 'Alinhamento das axilas', type: 'tilt', pts: ['axiD', 'axiE'] },
        { code: 'A5', label: 'Inclinação da caixa torácica', type: 'tilt', pts: ['cxtD', 'cxtE'] },
        { code: 'A6', label: 'Ponto mais profundo do tronco', type: 'tilt', pts: ['troD', 'troE'] },
        { code: 'A7', label: 'Inclinação pélvica', type: 'tilt', pts: ['asiD', 'asiE'] },
        { code: 'A8', label: 'Ângulo do joelho direito', type: 'knee', pts: ['asiD', 'joeD', 'torD'], side: 'D' },
        { code: 'A9', label: 'Ângulo do joelho esquerdo', type: 'knee', pts: ['asiE', 'joeE', 'torE'], side: 'E' },
        { code: 'A10', label: 'Rotação do pé direito', type: 'foot', pts: ['torD', 'dedD'], side: 'D' },
        { code: 'A11', label: 'Rotação do pé esquerdo', type: 'foot', pts: ['torE', 'dedE'], side: 'E' },
        { code: 'A12', label: 'Alinhamento do tronco (complementar)', type: 'align', pts: ['est', ['asiD', 'asiE']] },
        { code: 'A13', label: 'Cabeça sobre o tronco (complementar)', type: 'align', pts: ['nar', 'est'] },
        { code: 'A14', label: 'Deslocamento da cabeça em relação aos pés (cm, complementar)', type: 'offset', pts: [['cabD', 'cabE'], ['torD', 'torE']], names: ['cabeça', 'pés'] },
        { code: 'A15', label: 'Deslocamento da caixa torácica em relação ao quadril (cm, complementar)', type: 'offset', pts: [['cxtD', 'cxtE'], ['asiD', 'asiE']], names: ['caixa torácica', 'quadril'] },
        { code: 'A16', label: 'Deslocamento do quadril em relação aos pés (cm, complementar)', type: 'offset', pts: [['asiD', 'asiE'], ['torD', 'torE']], names: ['quadril', 'pés'] },
      ],
    },
    post: {
      label: 'Posterior (costas)',
      codePrefix: 'B',
      sideNote: 'O lado direito do aluno aparece à DIREITA da foto.',
      points: [
        ['orD', 'Orelha D', 'lóbulo da orelha'],
        ['orE', 'Orelha E', ''],
        ['ombD', 'Ombro D', 'acrômio'],
        ['ombE', 'Ombro E', ''],
        ['axiD', 'Axila D', 'prega axilar posterior'],
        ['axiE', 'Axila E', ''],
        ['cuD', 'Topo da curva D', 'ponto mais profundo da cintura'],
        ['cuE', 'Topo da curva E', ''],
        ['psiD', 'EIPS D', 'espinha ilíaca posterossuperior'],
        ['psiE', 'EIPS E', ''],
        ['popD', 'Joelho D', 'centro da fossa poplítea'],
        ['popE', 'Joelho E', ''],
        ['calD', 'Calcanhar D', 'base do calcâneo'],
        ['calE', 'Calcanhar E', ''],
        ['tnD1', 'Tendão D (meio)', 'opcional: linha média da perna, terço distal'],
        ['tnD2', 'Tendão D (inserção)', 'opcional: inserção do tendão no calcâneo'],
        ['tnE1', 'Tendão E (meio)', 'opcional'],
        ['tnE2', 'Tendão E (inserção)', 'opcional'],
        ['c7p', 'C7 (linha média)', 'opcional: processo espinhoso de C7, na linha média'],
        ['fen', 'Fenda glútea', 'opcional: início da fenda interglútea, na linha média'],
      ],
      measures: [
        { code: 'B1', label: 'Alinhamento corporal', type: 'align', pts: [['orD', 'orE'], ['calD', 'calE']] },
        { code: 'B2', label: 'Inclinação da cabeça', type: 'tilt', pts: ['orD', 'orE'] },
        { code: 'B3', label: 'Alinhamento dos ombros', type: 'tilt', pts: ['ombD', 'ombE'] },
        { code: 'B4', label: 'Alinhamento das axilas', type: 'tilt', pts: ['axiD', 'axiE'] },
        { code: 'B5', label: 'Ponto mais profundo do tronco', type: 'tilt', pts: ['cuD', 'cuE'] },
        { code: 'B6', label: 'Inclinação pélvica', type: 'tilt', pts: ['psiD', 'psiE'] },
        { code: 'B7', label: 'Joelhos', type: 'tilt', pts: ['popD', 'popE'] },
        { code: 'B8', label: 'Pés', type: 'tilt', pts: ['calD', 'calE'] },
        { code: 'B9', label: 'Retropé direito (complementar)', type: 'rearfoot', pts: ['tnD1', 'tnD2', 'calD'], side: 'D' },
        { code: 'B10', label: 'Retropé esquerdo (complementar)', type: 'rearfoot', pts: ['tnE1', 'tnE2', 'calE'], side: 'E' },
        { code: 'B11', label: 'Alinhamento do tronco (complementar)', type: 'align', pts: ['c7p', 'fen'] },
        { code: 'B12', label: 'Cabeça sobre C7 (complementar)', type: 'align', pts: [['orD', 'orE'], 'c7p'] },
        { code: 'B13', label: 'Deslocamento da cabeça em relação aos pés (cm, complementar)', type: 'offset', pts: [['orD', 'orE'], ['calD', 'calE']], names: ['cabeça', 'pés'] },
        { code: 'B14', label: 'Deslocamento dos ombros em relação à pelve (cm, complementar)', type: 'offset', pts: [['ombD', 'ombE'], ['psiD', 'psiE']], names: ['ombros', 'pelve'] },
        { code: 'B15', label: 'Deslocamento da pelve em relação aos pés (cm, complementar)', type: 'offset', pts: [['psiD', 'psiE'], ['calD', 'calE']], names: ['pelve', 'pés'] },
      ],
    },
  };

  const lateral = (label, codePrefix, facing) => ({
    label,
    codePrefix,
    defaultFacing: facing,
    sideNote: 'Confira para que lado o aluno está olhando na foto.',
    points: [
      ['tra', 'Orelha (trago)', ''],
      ['c7', 'C7', 'processo espinhoso de C7'],
      ['acr', 'Acrômio', ''],
      ['asi', 'EIAS', 'espinha ilíaca anterossuperior'],
      ['psi', 'EIPS', 'espinha ilíaca posterossuperior'],
      ['tro', 'Trocânter maior', ''],
      ['joe', 'Joelho', 'linha articular lateral'],
      ['mal', 'Maléolo lateral', ''],
      ['ded', 'Antepé', 'cabeça do 5º metatarso ou ponta do pé'],
    ],
    measures: [
      { code: codePrefix + '1', label: 'Alinhamento corporal', type: 'vertical', pts: ['tra', 'mal'], sagittal: true },
      { code: codePrefix + '2', label: 'Deslocamento da cabeça', type: 'head', pts: ['c7', 'tra'] },
      { code: codePrefix + '3', label: 'Ângulo do ombro', type: 'tilt', pts: ['c7', 'acr'], plain: true },
      { code: codePrefix + '4', label: 'Inclinação pélvica', type: 'pelvisSag', pts: ['asi', 'psi'] },
      { code: codePrefix + '5', label: 'Joelho (fêmur em relação à vertical)', type: 'vertical', pts: ['tro', 'joe'], sagittal: true },
      { code: codePrefix + '6', label: 'Tíbia', type: 'vertical', pts: ['joe', 'mal'], sagittal: true, complement: true },
      { code: codePrefix + '7', label: 'Ângulo do pé', type: 'tilt', pts: ['mal', 'ded'], plain: true },
      { code: codePrefix + '8', label: 'Ângulo craniovertebral (complementar)', type: 'cva', pts: ['c7', 'tra'] },
      { code: codePrefix + '9', label: 'Deslocamento da cabeça (trago) em relação ao acrômio (cm, complementar)', type: 'offset', pts: ['tra', 'acr'], names: ['trago', 'acrômio'] },
      { code: codePrefix + '10', label: 'Deslocamento do acrômio em relação ao trocânter (cm, complementar)', type: 'offset', pts: ['acr', 'tro'], names: ['acrômio', 'trocânter'] },
      { code: codePrefix + '11', label: 'Deslocamento do trocânter em relação ao maléolo (cm, complementar)', type: 'offset', pts: ['tro', 'mal'], names: ['trocânter', 'maléolo lateral'] },
    ],
  });
  // Na lateral direita a câmera vê o lado direito: o aluno olha para a direita da foto.
  VIEWS.latD = lateral('Lateral direita', 'C', 'dir');
  VIEWS.latE = lateral('Lateral esquerda', 'D', 'esq');

  // Linhas de ligação desenhadas na foto (estilo APECS): brancas para o tronco, azuis para as pernas.
  VIEWS.ant.skeleton = [['cabD', 'est', 'cabE'], ['acrD', 'axiD', 'troD', 'asiD'], ['acrE', 'axiE', 'troE', 'asiE'], ['xif', 'cxtD', 'troD'], ['xif', 'cxtE', 'troE'], ['est', 'xif']];
  VIEWS.ant.legs = [['asiD', 'joeD', 'torD', 'dedD'], ['asiE', 'joeE', 'torE', 'dedE']];
  VIEWS.post.skeleton = [['orD', 'c7p', 'orE'], ['ombD', 'axiD', 'cuD', 'psiD'], ['ombE', 'axiE', 'cuE', 'psiE'], ['psiD', 'fen', 'psiE'], ['c7p', 'fen']];
  VIEWS.post.legs = [['psiD', 'popD', 'calD'], ['psiE', 'popE', 'calE']];
  ['latD', 'latE'].forEach((k) => {
    VIEWS[k].skeleton = [['tra', 'c7', 'acr'], ['psi', 'tro', 'asi']];
    VIEWS[k].legs = [['tro', 'joe', 'mal', 'ded']];
  });

  const METHOD = {
    tilt: 'Segmento entre os dois marcos em relação à horizontal da foto.',
    align: 'Linha do ponto médio superior ao ponto médio da base em relação à vertical da foto.',
    knee: 'Desvio no joelho entre os segmentos EIAS–joelho e joelho–tornozelo (180° menos o ângulo interno). Alinhamento frontal fotográfico, não eixo mecânico radiográfico.',
    foot: 'Linha tornozelo–2º dedo em relação à vertical da foto.',
    rearfoot: 'Desvio entre a linha do tendão do calcâneo e a linha inserção–base do calcâneo.',
    vertical: 'Segmento entre os dois marcos em relação à vertical da foto.',
    head: 'Linha C7–trago em relação à vertical (convenção APECS). O ângulo craniovertebral é o complemento, medido em relação à horizontal.',
    pelvisSag: 'Linha EIAS–EIPS em relação à horizontal da foto.',
    free: 'Ângulo interno entre os três pontos marcados.',
    cva: 'Ângulo da linha C7–trago em relação à horizontal (ângulo craniovertebral).',
    offset: 'Distância horizontal entre os dois marcos (ou pontos médios), convertida em cm pela escala da calibração. Só existe com a foto calibrada.',
  };

  // Calibração: duas marcas a uma distância real conhecida (fio de prumo vertical ou régua horizontal).
  // Dá a escala (px por cm) e a rotação que torna a referência vertical/horizontal, corrigindo foto inclinada.
  function calibFromPoints(a, b, cm, orient) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (!(len > 0) || !(cm > 0)) return null;
    let rot;
    if (orient === 'h') {
      const d = b.x >= a.x ? { x: b.x - a.x, y: b.y - a.y } : { x: a.x - b.x, y: a.y - b.y };
      rot = -deg(Math.atan2(d.y, d.x));
    } else {
      const d = b.y >= a.y ? { x: b.x - a.x, y: b.y - a.y } : { x: a.x - b.x, y: a.y - b.y };
      rot = deg(Math.atan2(d.x, d.y));
    }
    return { a, b, cm, orient: orient === 'h' ? 'h' : 'v', pxPerCm: len / cm, rot: Math.round(rot * 100) / 100, apply: true };
  }
  function rotatePts(pts, rotDeg) {
    const r = (rotDeg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), out = {};
    Object.keys(pts).forEach((k) => { const p = pts[k]; out[k] = { x: p.x * c - p.y * s, y: p.x * s + p.y * c }; });
    return out;
  }
  // Texto de valor com unidade: graus ou cm.
  function fmtVal(r) { return fmt(r.value) + (r.unit === 'cm' ? ' cm' : '°'); }

  // Calcula uma medida. ctx: { view, facing } (facing: 'esq' | 'dir' = para onde o aluno olha na foto).
  function compute(m, pts, ctx) {
    const p = m.pts.map((r) => pick(pts, r));
    if (p.some((x) => !x)) return null;
    if (m.type === 'offset' && !(ctx && ctx.pxPerCm > 0)) return null;
    const out = { code: m.code, label: m.label, type: m.type, method: METHOD[m.type], unit: m.type === 'offset' ? 'cm' : '°' };
    const facingSign = ctx && ctx.facing === 'dir' ? 1 : -1;
    const sideSignOf = (side) => (imageLeftSide[ctx.view] === side ? 1 : -1);

    if (m.type === 'tilt') {
      const r = tilt(p[0], p[1]);
      out.value = r.angle;
      if (m.plain) out.text = 'em relação à horizontal';
      else if (!r.higher || r.angle < 0.05) out.text = 'nivelado';
      else out.text = 'lado ' + (r.higher === 'a' ? sideOf(m.pts[0]) : sideOf(m.pts[1])) + ' mais alto';
    } else if (m.type === 'align') {
      const r = fromVertical(p[0], p[1]);
      out.value = r.angle;
      out.text = r.angle < 0.05 ? 'alinhado à vertical' : 'parte superior desviada para a ' + (r.topShift > 0 ? 'direita' : 'esquerda') + ' da foto';
    } else if (m.type === 'vertical') {
      const r = fromVertical(p[0], p[1]);
      out.value = r.angle;
      if (r.angle < 0.05) out.text = 'vertical';
      else out.text = 'parte superior ' + (r.topShift * facingSign > 0 ? 'anterior' : 'posterior') + ' à inferior';
      if (m.complement) out.text += ' · ' + fmt(90 - r.angle) + '° em relação à horizontal';
    } else if (m.type === 'head') {
      const r = fromVertical(p[0], p[1]);
      out.value = r.angle;
      const forward = r.topShift * facingSign > 0;
      out.text = 'orelha ' + (forward ? 'anterior' : 'posterior') + ' à C7 · ângulo craniovertebral ' + fmt(90 - r.angle) + '° (horizontal)';
    } else if (m.type === 'pelvisSag') {
      const r = tilt(p[0], p[1]);
      out.value = r.angle;
      out.text = r.angle < 0.05 ? 'EIAS e EIPS niveladas' : r.higher === 'b' ? 'EIAS abaixo da EIPS (inclinação anterior na foto)' : 'EIAS acima da EIPS (inclinação posterior na foto)';
    } else if (m.type === 'knee') {
      const v = kneeFrontal(p[0], p[1], p[2], sideSignOf(m.side));
      out.value = Math.abs(v);
      out.signed = v;
      out.text = Math.abs(v) < 0.05 ? 'alinhado' : v > 0 ? 'projeção medial do joelho em apoio estático' : 'projeção lateral do joelho em apoio estático';
    } else if (m.type === 'foot') {
      const v = footRotation(p[0], p[1], sideSignOf(m.side));
      out.value = Math.abs(v);
      out.signed = v;
      out.text = Math.abs(v) < 0.05 ? 'alinhado à vertical' : v > 0 ? 'ponta do pé para fora' : 'ponta do pé para dentro';
    } else if (m.type === 'rearfoot') {
      const v = rearfoot(p[0], p[1], p[2], sideSignOf(m.side));
      out.value = Math.abs(v);
      out.signed = v;
      out.text = Math.abs(v) < 0.05 ? 'alinhado' : v > 0 ? 'calcâneo desviado lateralmente em apoio estático' : 'calcâneo desviado medialmente em apoio estático';
    } else if (m.type === 'cva') {
      const r = fromVertical(p[0], p[1]);
      const forward = r.topShift * facingSign > 0;
      out.value = forward ? 90 - r.angle : 90 + r.angle;
      out.text = 'orelha ' + (forward ? 'anterior' : 'posterior') + ' à C7 · medido em relação à horizontal';
    } else if (m.type === 'offset') {
      const dx = (p[0].x - p[1].x) / ctx.pxPerCm;
      out.value = Math.abs(dx);
      out.signed = dx;
      const [n0, n1] = m.names || ['ponto', 'referência'];
      if (Math.abs(dx) < 0.05) out.text = n0 + ' e ' + n1 + ' alinhados na foto';
      else if (ctx.view === 'latD' || ctx.view === 'latE') out.text = n0 + (dx * facingSign > 0 ? ' à frente de ' : ' atrás de ') + n1;
      else out.text = n0 + ' desviado para a ' + ((dx > 0) === (ctx.view === 'ant') ? 'esquerda' : 'direita') + ' do aluno, em relação a ' + n1;
    } else if (m.type === 'free') {
      out.value = angleAt(p[0], p[1], p[2]);
      out.text = 'ângulo livre';
    }
    out.value = round1(out.value);
    if (out.signed !== undefined) out.signed = round1(out.signed);
    return out;
  }

  function sideOf(id) {
    const last = id.replace(/\d+$/, '').slice(-1);
    return last === 'D' ? 'direito' : last === 'E' ? 'esquerdo' : id;
  }

  function computeView(viewKey, pts, facing, calib) {
    const def = VIEWS[viewKey];
    const ctx = { view: viewKey, facing: facing || def.defaultFacing, pxPerCm: calib && calib.pxPerCm };
    const use = calib && calib.apply !== false && calib.rot ? rotatePts(pts, calib.rot) : pts;
    return def.measures.map((m) => compute(m, use, ctx)).filter(Boolean);
  }

  // Linhas a desenhar para uma medida: lista de polilinhas.
  function geometry(m, pts) {
    const p = m.pts.map((r) => pick(pts, r));
    if (p.some((x) => !x)) return [];
    return [p];
  }

  return { fmt, fmtVal, calibFromPoints, rotatePts, tilt, fromVertical, angleAt, signedTurn, kneeFrontal, footRotation, rearfoot, mid, compute, computeView, geometry, VIEWS, METHOD, round1 };
});
