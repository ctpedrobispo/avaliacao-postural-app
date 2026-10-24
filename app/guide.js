// Figuras-guia: figura do corpo com o ponto a marcar destacado.
// São imagens ilustrativas (não são fotos do aluno nem medidas): servem para o avaliador não se perder.
(function (root) {
  // Coordenadas na figura (360 x 542 px; imagens do Pedro, guide-*.jpg). Anterior: o lado direito do aluno (D) fica à ESQUERDA da figura.
  // Posterior: o lado direito do aluno fica à DIREITA. Lateral: figura olhando para a DIREITA;
  // quando o aluno olha para a esquerda, a figura é espelhada.
  const ANT = {
    cabD: [160, 60], cabE: [203, 60], nar: [180, 56], est: [181, 100], xif: [181, 148],
    acrD: [126, 103], acrE: [236, 103], axiD: [133, 128], axiE: [228, 128],
    cxtD: [146, 180], cxtE: [214, 180], troD: [138, 208], troE: [222, 208],
    asiD: [141, 222], asiE: [219, 222], joeD: [148, 380], joeE: [210, 380],
    torD: [146, 490], torE: [212, 490], dedD: [128, 527], dedE: [224, 527],
  };
  const POST = {
    orD: [203, 59], orE: [158, 59], c7p: [180, 90], ombD: [238, 101], ombE: [122, 101],
    axiD: [228, 147], axiE: [133, 147], cuD: [222, 205], cuE: [140, 205],
    psiD: [196, 224], psiE: [164, 224], fen: [181, 246], popD: [211, 376], popE: [147, 376],
    calD: [212, 516], calE: [147, 516], tnD1: [212, 470], tnD2: [212, 500], tnE1: [147, 470], tnE2: [147, 500],
  };
  // Na lateral o braço do modelo cobre o quadril: EIAS, EIPS e trocânter são posições aproximadas.
  const LAT = {
    tra: [174, 50], c7: [145, 90], acr: [150, 101], asi: [172, 224], psi: [140, 218],
    tro: [160, 276], joe: [168, 378], mal: [154, 498], ded: [205, 521],
  };
  const TABLE = { ant: ANT, post: POST, latD: LAT, latE: LAT };
  const IMG = { ant: 'guide-ant.jpg', post: 'guide-post.jpg', latD: 'guide-lat.jpg', latE: 'guide-lat.jpg' };

  // Devolve o HTML do cartão-guia para um ponto. facing: 'esq' | 'dir' (só nas laterais).
  function html(view, id, label, hint, facing) {
    const pos = (TABLE[view] || {})[id];
    if (!pos) return '';
    const lateral = view === 'latD' || view === 'latE';
    const mirror = lateral && facing === 'esq';
    const others = Object.entries(TABLE[view]).filter(([k]) => k !== id)
      .map(([, p]) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" opacity=".55"/>`).join('');
    const [x, y] = pos;
    const mark = `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="#ff3b30" stroke-width="3"><animate attributeName="r" values="12;24;12" dur="1.6s" repeatCount="indefinite"/></circle>
      <circle cx="${x}" cy="${y}" r="8" fill="#ff3b30" stroke="#fff" stroke-width="2.5"/>`;
    const svg = `<svg viewBox="0 0 360 542" role="img" aria-label="Onde marcar: ${label}"><g${mirror ? ' transform="translate(360 0) scale(-1 1)"' : ''}><image href="${IMG[view]}" width="360" height="542"/>${others}${mark}</g></svg>`;
    const lado = /D$/.test(id) && !lateral ? 'lado direito do aluno' : /E$/.test(id) && !lateral ? 'lado esquerdo do aluno' : '';
    const naFoto = lado
      ? (/D$/.test(id) === (view === 'ant') ? 'aparece à ESQUERDA na foto' : 'aparece à DIREITA na foto')
      : '';
    return `<div class="g-fig">${svg}</div>
      <div class="g-txt"><b>${label}</b>${hint ? `<span>${hint}</span>` : ''}${lado ? `<span class="g-side">${lado} · ${naFoto}</span>` : ''}<span class="g-note">Figura ilustrativa</span></div>`;
  }

  // Miniatura só da região do ponto (como no APECS). big: figura inteira.
  function thumb(view, id, facing, big) {
    const pos = (TABLE[view] || {})[id];
    if (!pos) return '';
    const lateral = view === 'latD' || view === 'latE', FW = 360, FH = 542;
    const mirror = lateral && facing === 'esq';
    const x = mirror ? FW - pos[0] : pos[0], y = pos[1];
    let vb = [0, 0, FW, FH];
    if (!big) {
      const w = 150, h = 150;
      vb = [Math.max(0, Math.min(FW - w, x - w / 2)), Math.max(0, Math.min(FH - h, y - h / 2)), w, h];
    }
    const others = big ? Object.entries(TABLE[view]).filter(([k]) => k !== id).map(([, p]) => `<circle cx="${mirror ? FW - p[0] : p[0]}" cy="${p[1]}" r="3.5" fill="#fff" opacity=".55"/>`).join('') : '';
    const r = big ? 8 : 7;
    const mark = `<circle cx="${x}" cy="${y}" r="${r + 8}" fill="none" stroke="#ff3b30" stroke-width="2.5"><animate attributeName="r" values="${r + 3};${r + 14};${r + 3}" dur="1.6s" repeatCount="indefinite"/></circle><circle cx="${x}" cy="${y}" r="${r}" fill="#ff3b30" stroke="#fff" stroke-width="2.5"/>`;
    return `<svg viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Onde marcar"><g${mirror ? ' transform="translate(360 0) scale(-1 1)"' : ''}><image href="${IMG[view]}" width="360" height="542"/></g>${others}${mark}</svg>`;
  }
  // "lado direito do aluno · aparece à ESQUERDA na foto" para pontos pares D/E.
  function sideText(view, id) {
    const lateral = view === 'latD' || view === 'latE';
    if (lateral) return '';
    const d = /D$/.test(id), e = /E$/.test(id);
    if (!d && !e) return '';
    return (d ? 'lado direito do aluno' : 'lado esquerdo do aluno') + ' · aparece à ' + (d === (view === 'ant') ? 'ESQUERDA' : 'DIREITA') + ' na foto';
  }

  root.Guide = { html, thumb, sideText, has: (view, id) => !!(TABLE[view] || {})[id] };
})(typeof self !== 'undefined' ? self : this);
