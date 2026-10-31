// Testes da mecânica da corrida. Rodar com: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./app/corrida.js');

// Corrida simétrica: contato 0,25 s, voo 0,10 s, passo 0,35 s (≈171 passos/min), lados alternados.
const passos = (n, contato, voo, inicio) => {
  const L = [];
  let t = inicio || 1;
  for (let i = 0; i < n; i++) { L.push({ lado: i % 2 ? 'E' : 'D', ic: t, to: t + contato }); t += contato + voo; }
  return L;
};

test('tempos: contato, voo, cadência e lados', () => {
  const t = C.tempos(passos(14, 0.25, 0.1), 1);
  assert.equal(t.n, 14);
  assert.equal(t.lados.D.n, 7);
  assert.equal(t.lados.E.n, 7);
  assert.equal(t.lados.D.contato.media, 250);
  assert.equal(t.lados.D.voo.media, 100);
  assert.equal(t.lados.E.voo.media, 100);
  assert.equal(t.cadencia, 171);
  assert.equal(t.difContato, 0);
});

test('tempos: câmera lenta divide pelo fator (240 q/s salvo a 30 q/s)', () => {
  assert.equal(C.fator({ fpsGrav: '240', fpsArq: '30' }), 8);
  assert.equal(C.fator({ fpsGrav: '', fpsArq: '30' }), 1);
  const t = C.tempos(passos(8, 2, 0.8), 8); // no arquivo: 2 s de contato = 250 ms reais
  assert.equal(t.lados.D.contato.media, 250);
  assert.equal(t.lados.D.voo.media, 100);
});

test('tempos: passo incompleto ou invertido não entra; ausente não vira zero', () => {
  const t = C.tempos([{ lado: 'D', ic: 1, to: 1.2 }, { lado: 'E', ic: 1.5, to: null }, { lado: 'D', ic: 2, to: 1.9 }, { lado: 'X', ic: 3, to: 3.2 }], 1);
  assert.equal(t.n, 1);
  assert.equal(t.lados.E.n, 0);
  assert.equal(t.lados.E.contato.media, null);
  assert.equal(t.lados.D.voo.media, null);
  assert.equal(t.cadencia, null);
  assert.equal(t.difContato, null);
});

test('tempos: diferença entre lados em %', () => {
  const L = passos(10, 0.25, 0.1).map((p) => (p.lado === 'E' ? { ...p, to: p.ic + 0.275 } : p));
  const t = C.tempos(L, 1);
  assert.equal(t.lados.E.contato.media, 275);
  assert.equal(t.difContato, 9.5);
});

test('avisos: velocidade, fps e menos de 7 passadas', () => {
  const t = C.tempos(passos(6, 0.25, 0.1), 1);
  const a = C.avisos({ velocidade: '', fpsGrav: '30' }, t);
  assert.ok(a.some((x) => /Velocidade não registrada/.test(x)));
  assert.ok(a.some((x) => /abaixo de 60/.test(x)));
  assert.ok(a.some((x) => /direito: 3 passada/.test(x)));
  assert.deepEqual(C.avisos({ velocidade: '10 km/h', fpsGrav: '120', fpsArq: '120' }, C.tempos(passos(14, 0.25, 0.1), 1)), []);
  assert.ok(C.avisos({ velocidade: '10 km/h', fpsGrav: '240' }, null).some((x) => /tempo real/.test(x)));
});

test('qualidade sugerida: baixa, moderada e alta', () => {
  const boa = () => ({ usada: true, velocidade: '10 km/h', fpsGrav: '120', fpsArq: '120', passos: passos(14, 0.25, 0.1) });
  assert.equal(C.qualidadeSugerida({ vistas: {} }), '');
  assert.equal(C.qualidadeSugerida({ vistas: { latD: boa(), post: boa() } }), 'moderada');
  assert.equal(C.qualidadeSugerida({ vistas: { latD: boa(), latE: boa(), post: boa(), front: { usada: true, velocidade: '10', fpsGrav: '60' } } }), 'alta');
  assert.equal(C.qualidadeSugerida({ vistas: { latD: { ...boa(), velocidade: '' } } }), 'baixa');
  assert.equal(C.qualidadeSugerida({ vistas: { latD: { ...boa(), passos: passos(6, 0.25, 0.1) } } }), 'baixa');
});

test('modelos: lateral, posterior e frontal com dicas na ordem dos pontos', () => {
  ['latD', 'latE', 'post', 'front'].forEach((k) => assert.ok(C.MODELOS[k].length));
  C.MODELOS.latD.concat(C.MODELOS.post, C.MODELOS.front).forEach((m) => m.angulos.forEach((x) => assert.equal(x.dicas.length, x.tipo === '3pt' ? 3 : 2)));
});
