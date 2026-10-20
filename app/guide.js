// Figuras-guia: esquema do corpo com o ponto a marcar destacado.
// São desenhos ilustrativos (não são fotos nem medidas): servem para o avaliador não se perder.
(function (root) {
  // Coordenadas no desenho (viewBox 200 x 460). Nas vistas anterior e posterior o centro do corpo é x = 100.
  // Anterior: o lado direito do aluno (D) fica à ESQUERDA do desenho. Posterior: fica à DIREITA.
  const L = 62, R = 138; // atalhos de simetria usados abaixo
  const sym = (x) => 200 - x;

  const ANT = {
    cabD: [78, 46], cabE: [122, 46], nar: [100, 38], est: [100, 82], xif: [100, 152],
    acrD: [L, 92], acrE: [R, 92], axiD: [68, 114], axiE: [132, 114],
    cxtD: [77, 172], cxtE: [123, 172], troD: [75, 194], troE: [125, 194],
    asiD: [79, 226], asiE: [121, 226], joeD: [83, 312], joeE: [117, 312],
    torD: [85, 400], torE: [115, 400], dedD: [80, 438], dedE: [120, 438],
  };
  // Posterior: mesmas alturas, mas o lado D passa para a direita do desenho.
  const POST = {
    orD: [122, 44], orE: [78, 44], ombD: [R, 92], ombE: [L, 92], axiD: [132, 114], axiE: [68, 114],
    cuD: [125, 194], cuE: [75, 194], psiD: [114, 220], psiE: [86, 220],
    popD: [117, 314], popE: [83, 314], calD: [115, 434], calE: [85, 434],
    tnD1: [116, 384], tnD2: [115, 420], tnE1: [84, 384], tnE2: [85, 420], c7p: [100, 78], fen: [100, 250],
  };
  // Lateral desenhada com o aluno olhando para a DIREITA; a figura é espelhada quando olha para a esquerda.
  const LAT = {
    tra: [97, 42], c7: [85, 76], acr: [100, 94], asi: [110, 222], psi: [89, 216],
    tro: [100, 244], joe: [102, 314], mal: [98, 406], ded: [146, 436],
  };
  const TABLE = { ant: ANT, post: POST, latD: LAT, latE: LAT };

  const C = { stroke: 'var(--muted)', fill: 'var(--bg)' };
  function body(view) {
    const s = `fill="${C.fill}" stroke="${C.stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
    const limb = (d, w) => `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-opacity=".55" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (view === 'ant' || view === 'post') {
      return `<circle cx="100" cy="40" r="22" ${s}/>
        <rect x="91" y="60" width="18" height="18" ${s}/>
        <path d="M62 86 Q100 74 138 86 L132 132 Q126 172 128 202 L124 238 L76 238 L72 202 Q74 172 68 132 Z" ${s}/>
        ${limb('M60 94 L46 170 L42 238', 15)}${limb('M140 94 L154 170 L158 238', 15)}
        ${limb('M86 238 L84 314 L85 404', 22)}${limb('M114 238 L116 314 L115 404', 22)}
        <ellipse cx="82" cy="430" rx="14" ry="14" ${s}/><ellipse cx="118" cy="430" rx="14" ry="14" ${s}/>`;
    }
    return `<circle cx="100" cy="40" r="22" ${s}/>
      <rect x="92" y="60" width="16" height="20" ${s}/>
      <path d="M84 84 Q100 74 118 86 L117 150 Q122 192 114 236 L88 236 Q82 192 84 140 Z" ${s}/>
      ${limb('M100 96 L102 170 L106 232', 14)}
      ${limb('M100 240 L102 314 L98 404', 24)}
      <path d="M86 408 L108 408 L148 428 Q152 440 140 442 L90 442 Q82 440 84 428 Z" ${s}/>`;
  }

  // Devolve o HTML do cartão-guia para um ponto. facing: 'esq' | 'dir' (só nas laterais).
  function html(view, id, label, hint, facing) {
    const pos = (TABLE[view] || {})[id];
    if (!pos) return '';
    const mirror = (view === 'latD' || view === 'latE') && facing === 'esq';
    const others = Object.entries(TABLE[view]).filter(([k]) => k !== id)
      .map(([, p]) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--muted)" opacity=".45"/>`).join('');
    const [x, y] = pos;
    // Ampliação em torno do ponto, para mostrar a região exata.
    const mark = `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="#e53935" stroke-width="3"><animate attributeName="r" values="12;22;12" dur="1.6s" repeatCount="indefinite"/></circle>
      <circle cx="${x}" cy="${y}" r="8" fill="#e53935" stroke="#fff" stroke-width="2.5"/>`;
    const svg = `<svg viewBox="0 0 200 460" role="img" aria-label="Onde marcar: ${label}"><g${mirror ? ' transform="translate(200 0) scale(-1 1)"' : ''}>${body(view === 'latD' || view === 'latE' ? 'lat' : view)}${others}${mark}</g></svg>`;
    const lado = /D$/.test(id) && view !== 'latD' && view !== 'latE' ? 'lado direito do aluno' : /E$/.test(id) && view !== 'latD' && view !== 'latE' ? 'lado esquerdo do aluno' : '';
    const naFoto = lado
      ? (/D$/.test(id) === (view === 'ant') ? 'aparece à ESQUERDA na foto' : 'aparece à DIREITA na foto')
      : '';
    return `<div class="g-fig">${svg}</div>
      <div class="g-txt"><b>${label}</b>${hint ? `<span>${hint}</span>` : ''}${lado ? `<span class="g-side">${lado} · ${naFoto}</span>` : ''}<span class="g-note">Esquema ilustrativo</span></div>`;
  }

  root.Guide = { html, has: (view, id) => !!(TABLE[view] || {})[id] };
})(typeof self !== 'undefined' ? self : this);
