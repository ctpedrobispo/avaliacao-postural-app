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
        ['nar', 'Ponta do nariz', 'opcional: usado no alinhamento da cabeça sobre os ombros'],
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
        { code: 'A12', label: 'Alinhamento do tronco (complementar)', type: 'align', pts: [['acrD', 'acrE'], ['asiD', 'asiE']] },
        { code: 'A13', label: 'Cabeça sobre os ombros (complementar)', type: 'align', pts: ['nar', ['acrD', 'acrE']] },
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
        { code: 'B11', label: 'Alinhamento do tronco (complementar)', type: 'align', pts: [['ombD', 'ombE'], ['psiD', 'psiE']] },
        { code: 'B12', label: 'Cabeça sobre os ombros (complementar)', type: 'align', pts: [['orD', 'orE'], ['ombD', 'ombE']] },
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
    ],
  });
  // Na lateral direita a câmera vê o lado direito: o aluno olha para a direita da foto.
  VIEWS.latD = lateral('Lateral direita', 'C', 'dir');
  VIEWS.latE = lateral('Lateral esquerda', 'D', 'esq');

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
  };

  // Calcula uma medida. ctx: { view, facing } (facing: 'esq' | 'dir' = para onde o aluno olha na foto).
  function compute(m, pts, ctx) {
    const p = m.pts.map((r) => pick(pts, r));
    if (p.some((x) => !x)) return null;
    const out = { code: m.code, label: m.label, type: m.type, method: METHOD[m.type], unit: '°' };
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

  function computeView(viewKey, pts, facing) {
    const def = VIEWS[viewKey];
    const ctx = { view: viewKey, facing: facing || def.defaultFacing };
    return def.measures.map((m) => compute(m, pts, ctx)).filter(Boolean);
  }

  // Linhas a desenhar para uma medida: lista de polilinhas.
  function geometry(m, pts) {
    const p = m.pts.map((r) => pick(pts, r));
    if (p.some((x) => !x)) return [];
    return [p];
  }

  return { fmt, tilt, fromVertical, angleAt, signedTurn, kneeFrontal, footRotation, rearfoot, mid, compute, computeView, geometry, VIEWS, METHOD, round1 };
});
