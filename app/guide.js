// Figuras-guia: figura do corpo com o ponto a marcar destacado.
// São imagens ilustrativas (não são fotos do aluno nem medidas): servem para o avaliador não se perder.
(function (root) {
  // Coordenadas na figura (360 x 542 px). Anterior: o lado direito do aluno (D) fica à ESQUERDA da figura.
  // Posterior: o lado direito do aluno fica à DIREITA. Lateral: figura olhando para a DIREITA;
  // quando o aluno olha para a esquerda, a figura é espelhada.
  const ANT = {
    cabD: [161, 70], cabE: [203, 70], nar: [181, 64], est: [180, 99], xif: [180, 190],
    acrD: [126, 111], acrE: [240, 111], axiD: [134, 150], axiE: [226, 150],
    cxtD: [145, 220], cxtE: [216, 220], troD: [141, 235], troE: [220, 235],
    asiD: [146, 246], asiE: [219, 246], joeD: [151, 387], joeE: [210, 387],
    torD: [150, 505], torE: [212, 505], dedD: [141, 531], dedE: [220, 531],
  };
  const POST = {
    orD: [205, 62], orE: [160, 62], c7p: [183, 89], ombD: [239, 110], ombE: [126, 110],
    axiD: [231, 165], axiE: [135, 165], cuD: [220, 222], cuE: [146, 222],
    psiD: [200, 282], psiE: [165, 282], fen: [183, 292], popD: [210, 397], popE: [152, 397],
    calD: [216, 517], calE: [149, 517], tnD1: [213, 475], tnD2: [215, 510], tnE1: [151, 475], tnE2: [150, 510],
  };
  const LAT = {
    tra: [176, 62], c7: [150, 98], acr: [172, 115], asi: [200, 247], psi: [152, 243],
    tro: [175, 287], joe: [176, 395], mal: [172, 505], ded: [215, 525],
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

  root.Guide = { html, has: (view, id) => !!(TABLE[view] || {})[id] };
})(typeof self !== 'undefined' ? self : this);
