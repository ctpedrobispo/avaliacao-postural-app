// Sugestão automática dos pontos a partir da foto. Roda no próprio aparelho (nenhuma foto sai do iPad).
// O modelo (MediaPipe Pose Landmarker, licença Apache-2.0) devolve 33 pontos do corpo; aqui eles são
// convertidos nos pontos do manual. Pontos de osso fino (acrômio, EIAS, EIPS, C7, axila...) são APROXIMAÇÕES
// feitas a partir do ombro e do quadril: o avaliador sempre confere e ajusta.
(function (root) {
  const LM = { nose: 0, earL: 7, earR: 8, shL: 11, shR: 12, hipL: 23, hipR: 24, knL: 25, knR: 26, anL: 27, anR: 28, heL: 29, heR: 30, toL: 31, toR: 32 };
  const MIN_VIS = 0.25;
  const add = (p, v, k) => ({ x: p.x + v.x * k, y: p.y + v.y * k });
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const len = (v) => Math.hypot(v.x, v.y) || 1;

  // lm: 33 pontos normalizados (0..1) do modelo; W, H: tamanho da foto em pixels.
  // Devolve { pts, facing, missing } com pts no formato do app ({x, y} em pixels da foto).
  function mapLandmarks(view, lm, W, H) {
    const g = (i) => lm[i] && (lm[i].visibility == null || lm[i].visibility >= MIN_VIS) ? { x: lm[i].x * W, y: lm[i].y * H } : null;
    const pts = {};
    const put = (id, p) => { if (p && isFinite(p.x) && isFinite(p.y)) pts[id] = { x: p.x, y: p.y }; };
    const pair = (a, b) => (a && b ? (a.x <= b.x ? [a, b] : [b, a]) : null); // [esquerda da foto, direita da foto]
    let facing = null;

    if (view === 'ant' || view === 'post') {
      // O modelo pode trocar esquerda/direita de costas: a lateralidade vem da posição na foto.
      // Anterior: o lado direito do aluno aparece à esquerda da foto. Posterior: à direita da foto.
      const dIsLeftOfPhoto = view === 'ant';
      const two = (iL, iR) => {
        const pr = pair(g(iL), g(iR));
        if (!pr) return null;
        return dIsLeftOfPhoto ? { D: pr[0], E: pr[1] } : { D: pr[1], E: pr[0] };
      };
      const sh = two(LM.shL, LM.shR), hip = two(LM.hipL, LM.hipR);
      const ear = two(LM.earL, LM.earR), kn = two(LM.knL, LM.knR), an = two(LM.anL, LM.anR);
      const he = two(LM.heL, LM.heR), to = two(LM.toL, LM.toR);
      let up = null, torso = 0, shM = null, hipM = null;
      if (sh && hip) {
        shM = mid(sh.D, sh.E); hipM = mid(hip.D, hip.E);
        const d = sub(shM, hipM); torso = len(d); up = { x: d.x / torso, y: d.y / torso };
      }
      const along = (s, h, k) => add(s, sub(h, s), k); // ponto a uma fração k do caminho ombro -> quadril
      ['D', 'E'].forEach((s) => {
        const sfx = s;
        if (view === 'ant') {
          if (ear) put('cab' + sfx, ear[s]);
          if (sh) put('acr' + sfx, sh[s]);
          if (sh && hip) {
            put('axi' + sfx, along(sh[s], hip[s], 0.18));
            put('cxt' + sfx, along(sh[s], hip[s], 0.62));
            put('tro' + sfx, along(sh[s], hip[s], 0.78));
          }
          if (hip && up) { const m = mid(hip.D, hip.E); put('asi' + sfx, add(add(hip[s], sub(m, hip[s]), 0.15), up, 0.06 * torso)); }
          if (kn) put('joe' + sfx, kn[s]);
          if (an) put('tor' + sfx, an[s]);
          if (to) put('ded' + sfx, to[s]);
        } else {
          if (ear) put('or' + sfx, ear[s]);
          if (sh) put('omb' + sfx, sh[s]);
          if (sh && hip) {
            put('axi' + sfx, along(sh[s], hip[s], 0.18));
            put('cu' + sfx, along(sh[s], hip[s], 0.78));
          }
          if (hip && up) { const m = mid(hip.D, hip.E); put('psi' + sfx, add(add(hip[s], sub(m, hip[s]), 0.2), up, 0.04 * torso)); }
          if (kn) put('pop' + sfx, kn[s]);
          if (he) put('cal' + sfx, he[s]);
          if (an && he) {
            put('tn' + sfx + '1', add(an[s], sub(kn ? kn[s] : an[s], an[s]), kn ? 0.3 : 0));
            put('tn' + sfx + '2', add(he[s], sub(an[s], he[s]), 0.4));
          }
        }
      });
      if (view === 'ant') {
        put('nar', g(LM.nose));
        if (shM && up) { put('est', add(shM, up, 0.03 * torso)); put('xif', add(shM, sub(hipM, shM), 0.3)); }
      } else if (shM && up) {
        put('c7p', add(shM, up, 0.07 * torso));
        if (hipM) put('fen', add(hipM, up, -0.05 * torso));
      }
    } else {
      // Lateral: usa só o lado do aluno que está virado para a câmera (direita na lateral direita).
      const R = view === 'latD';
      const I = (r, l) => (R ? r : l);
      const ear = g(I(LM.earR, LM.earL)), sh = g(I(LM.shR, LM.shL)), hip = g(I(LM.hipR, LM.hipL));
      const kn = g(I(LM.knR, LM.knL)), an = g(I(LM.anR, LM.anL)), to = g(I(LM.toR, LM.toL));
      const nose = g(LM.nose);
      if (nose && ear) facing = nose.x > ear.x ? 'dir' : 'esq';
      else if (to && an) facing = to.x > an.x ? 'dir' : 'esq';
      let up = null, torso = 0;
      if (sh && hip) { const d = sub(sh, hip); torso = len(d); up = { x: d.x / torso, y: d.y / torso }; }
      put('tra', ear);
      put('acr', sh);
      put('joe', kn);
      put('mal', an);
      put('ded', to);
      if (hip && up) {
        const sgn = facing === 'dir' ? 1 : facing === 'esq' ? -1 : 0;
        const fwd = { x: sgn, y: 0 }; // para a frente do aluno, no plano da foto
        put('tro', add(hip, up, -0.02 * torso));
        if (sgn) {
          put('asi', add(add(hip, up, 0.06 * torso), fwd, 0.05 * torso));
          put('psi', add(add(hip, up, 0.06 * torso), fwd, -0.08 * torso));
        }
        if (sh && sgn) put('c7', add(add(sh, up, 0.06 * torso), fwd, -0.07 * torso));
      }
    }
    return { pts, facing };
  }

  // ---------- Carregamento do modelo (só na primeira vez; depois fica guardado para usar sem internet) ----------
  let landmarkerP = null;
  const SELF = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';
  function base() { return new URL('vendor/', SELF || document.baseURI).href; }
  function getLandmarker() {
    if (landmarkerP) return landmarkerP;
    landmarkerP = (async () => {
      const mod = await import(base() + 'vision_bundle.mjs');
      const fileset = await mod.FilesetResolver.forVisionTasks(base() + 'wasm');
      return mod.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: base() + 'pose_landmarker_lite.task', delegate: 'CPU' },
        runningMode: 'IMAGE',
        numPoses: 1,
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
      });
    })().catch((e) => { landmarkerP = null; throw e; });
    return landmarkerP;
  }

  // img: elemento <img> ou <canvas> já carregado. Devolve os 33 pontos normalizados ou null se não achou pessoa.
  async function detect(img) {
    const lmk = await getLandmarker();
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const k = Math.min(1, 1024 / Math.max(W, H));
    const c = document.createElement('canvas');
    c.width = Math.round(W * k); c.height = Math.round(H * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const r = lmk.detect(c);
    return r && r.landmarks && r.landmarks[0] ? r.landmarks[0] : null;
  }

  async function suggest(view, img) {
    const lm = await detect(img);
    if (!lm) return null;
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    return mapLandmarks(view, lm, W, H);
  }

  const api = { mapLandmarks, suggest, detect };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Autopose = api;
})(typeof window !== 'undefined' ? window : globalThis);
