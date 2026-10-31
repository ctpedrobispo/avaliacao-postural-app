// Mecânica da corrida em vídeo 2D, pelo Manual de Biomecânica da Corrida Pedro Bispo v3.0.
// Tempos pela marcação de quadros (contato inicial e saída do pé), cadência e diferença entre os lados;
// ângulos medidos em quadros escolhidos, com modelos por vista. Sem cadência ideal e sem ponto de corte (Classe D).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Corrida = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VISTAS = [
    { id: 'latD', nome: 'Lateral direita', tempos: true },
    { id: 'latE', nome: 'Lateral esquerda', tempos: true },
    { id: 'post', nome: 'Posterior', tempos: true },
    { id: 'front', nome: 'Frontal', tempos: false },
  ];

  // Condições gerais (manual, itens 12 a 16). A velocidade fica em cada vídeo: a biomecânica muda com ela.
  const CONDICOES = [
    ['local', 'Esteira ou solo', ['', 'Esteira', 'Pista', 'Rua / solo']],
    ['inclinacao', 'Inclinação da esteira (%)'],
    ['adaptacao', 'Adaptação à esteira antes de filmar (min)'],
    ['calcado', 'Calçado'],
    ['camera', 'Câmera / aparelho'],
    ['alturaCam', 'Altura da câmera (m)'],
    ['distCam', 'Distância da câmera (m)'],
    ['momento', 'Momento (ex.: início do treino, após fadiga controlada)'],
    ['sintomas', 'Sintomas durante ou após a corrida'],
  ];

  const MOMENTOS = ['Contato inicial', 'Apoio médio', 'Saída do pé', 'Balanço', 'Outro'];
  const QUALIDADE = ['', 'alta', 'moderada', 'baixa'];

  // Modelos de ângulos por vista. Variáveis que o manual considera mais defensáveis em 2D (item 7.1).
  // PENDENTE DE VALIDAÇÃO: pontos e nomes conferidos pelo Pedro com o manual antes de usar no laudo.
  const LAT = [
    { id: 'ic', nome: 'Contato inicial (lateral)', angulos: [
      { label: 'Tíbia × vertical', tipo: 'v', dicas: ['Joelho (linha articular)', 'Maléolo lateral'] },
      { label: 'Flexão do joelho', tipo: '3pt', dicas: ['Trocânter maior', 'Joelho (vértice)', 'Maléolo lateral'] },
      { label: 'Tronco × vertical', tipo: 'v', dicas: ['Acrômio', 'Trocânter maior'] },
      { label: 'Pé × horizontal', tipo: 'h', dicas: ['Calcanhar', 'Antepé'] },
    ] },
    { id: 'ms', nome: 'Apoio médio (lateral)', angulos: [
      { label: 'Flexão do joelho', tipo: '3pt', dicas: ['Trocânter maior', 'Joelho (vértice)', 'Maléolo lateral'] },
      { label: 'Tronco × vertical', tipo: 'v', dicas: ['Acrômio', 'Trocânter maior'] },
    ] },
    { id: 'to', nome: 'Saída do pé (lateral)', angulos: [
      { label: 'Coxa × vertical (extensão do quadril)', tipo: 'v', dicas: ['Trocânter maior', 'Joelho (linha articular)'] },
      { label: 'Tronco × vertical', tipo: 'v', dicas: ['Acrômio', 'Trocânter maior'] },
    ] },
  ];
  const MODELOS = {
    latD: LAT,
    latE: LAT,
    post: [
      { id: 'ms', nome: 'Apoio médio (posterior)', angulos: [
        { label: 'Pelve × horizontal (queda pélvica aparente)', tipo: 'h', dicas: ['EIPS D', 'EIPS E'] },
        { label: 'Calcâneo × vertical (retropé aparente)', tipo: 'v', dicas: ['Meio do tendão do calcâneo', 'Base do calcâneo'] },
        { label: 'Tronco × vertical', tipo: 'v', dicas: ['C7', 'Meio das EIPS'] },
      ] },
    ],
    front: [
      { id: 'ms', nome: 'Apoio médio (frontal)', angulos: [
        { label: 'Pelve × horizontal', tipo: 'h', dicas: ['EIAS D', 'EIAS E'] },
        { label: 'Quadril–joelho–tornozelo (perna de apoio)', tipo: '3pt', dicas: ['EIAS', 'Centro da patela (vértice)', 'Tornozelo'] },
      ] },
    ],
  };

  const num = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(x) ? null : x; };
  const media = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : null);
  const dp = (l) => { if (l.length < 2) return null; const m = media(l); return Math.sqrt(l.reduce((s, x) => s + (x - m) * (x - m), 0) / (l.length - 1)); };
  const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

  // Câmera lenta: o arquivo pode tocar mais devagar que a realidade. fator = quadros/s da gravação ÷ quadros/s do arquivo.
  // Tempo real = tempo no arquivo ÷ fator (ex.: gravado a 240 q/s e salvo a 30 q/s → fator 8).
  function fator(v) {
    const g = num(v && v.fpsGrav), f = num(v && v.fpsArq);
    return g && f ? g / f : 1;
  }

  // passos: [{ lado: 'D' | 'E', ic, to }] com tempos em segundos do arquivo (ic = contato inicial, to = saída do pé).
  // Contato = to − ic; voo = próximo contato (qualquer lado) − saída deste; passo = próximo contato − este contato.
  // Passos incompletos (sem to, ou to antes de ic) ficam fora. Nenhum valor ausente vira zero.
  function tempos(passos, fat) {
    const k = fat && fat > 0 ? fat : 1;
    const ok = (passos || []).filter((p) => p && (p.lado === 'D' || p.lado === 'E') && num(p.ic) != null && num(p.to) != null && num(p.to) > num(p.ic))
      .map((p) => ({ lado: p.lado, ic: num(p.ic), to: num(p.to) })).sort((a, b) => a.ic - b.ic);
    const porPasso = ok.map((p, i) => {
      const nx = ok[i + 1];
      const voo = nx && nx.ic >= p.to ? ((nx.ic - p.to) / k) * 1000 : null;
      const passo = nx ? ((nx.ic - p.ic) / k) * 1000 : null;
      return { lado: p.lado, contato: ((p.to - p.ic) / k) * 1000, voo, passo };
    });
    const lado = (s) => {
      const L = porPasso.filter((p) => p.lado === s);
      const c = L.map((p) => p.contato), v = L.map((p) => p.voo).filter((x) => x != null);
      return { n: L.length, contato: { media: r1(media(c)), dp: r1(dp(c)) }, voo: { media: r1(media(v)), dp: r1(dp(v)) } };
    };
    const D = lado('D'), E = lado('E');
    const passosMs = porPasso.map((p) => p.passo).filter((x) => x != null && x > 0);
    const cad = passosMs.length ? 60000 / media(passosMs) : null;
    const dif = (a, b) => (a != null && b != null && a + b > 0 ? r1((Math.abs(a - b) / ((a + b) / 2)) * 100) : null);
    return {
      n: ok.length,
      porPasso,
      lados: { D, E },
      cadencia: cad == null ? null : Math.round(cad),
      difContato: dif(D.contato.media, E.contato.media),
      difVoo: dif(D.voo.media, E.voo.media),
    };
  }

  // Avisos do protocolo (manual, itens 8, 9 e 14). Não classificam a técnica; dizem o que limita a análise.
  function avisos(v, t) {
    const out = [];
    if (!String((v && v.velocidade) || '').trim()) out.push('Velocidade não registrada: cadência, contato e ângulos não devem ser interpretados sem ela.');
    const g = num(v && v.fpsGrav);
    if (g == null) out.push('Quadros por segundo da gravação não informados: os tempos ficam sem escala confiável.');
    else if (g < 60) out.push('Gravação abaixo de 60 quadros/s: contato inicial, saída do pé e tempo de contato ficam imprecisos.');
    if (g != null && num(v && v.fpsArq) == null) out.push('Quadros/s do arquivo não informados: os tempos foram calculados como se o vídeo tocasse em tempo real (sem câmera lenta).');
    if (t && t.n) ['D', 'E'].forEach((s) => {
      const n = t.lados[s].n;
      if (n && n < 7) out.push(`Lado ${s === 'D' ? 'direito' : 'esquerdo'}: ${n} passada(s) válida(s). O protocolo pede de 7 a 10 por lado.`);
    });
    return out;
  }

  // Sugestão de qualidade (manual, item 16). Quem decide é o avaliador.
  function qualidadeSugerida(corrida) {
    const vs = VISTAS.filter((x) => corrida && corrida.vistas && corrida.vistas[x.id] && corrida.vistas[x.id].usada);
    if (!vs.length) return '';
    let baixa = false;
    vs.forEach((x) => {
      const v = corrida.vistas[x.id];
      const g = num(v.fpsGrav);
      if (g == null || g < 60 || !String(v.velocidade || '').trim()) baixa = true;
      if (x.tempos && (v.passos || []).length) {
        const t = tempos(v.passos, fator(v));
        if ((t.lados.D.n && t.lados.D.n < 7) || (t.lados.E.n && t.lados.E.n < 7)) baixa = true;
      }
    });
    if (baixa) return 'baixa';
    return vs.length >= 4 ? 'alta' : 'moderada';
  }

  const fmt = (v, casas) => (v == null ? '' : String(casas ? v : Math.round(v)).replace('.', ','));

  return { VISTAS, CONDICOES, MOMENTOS, QUALIDADE, MODELOS, fator, tempos, avisos, qualidadeSugerida, fmt, num };
});
