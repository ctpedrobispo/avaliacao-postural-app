// Testes das exportações. Rodar com: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./app/exporta.js');

const P = (x, y) => ({ x, y });
const vazia = () => ({ pts: {}, free: [], facing: null, calib: null });
const aval = (data, extra) => Object.assign({ data, views: { ant: vazia(), post: vazia(), latD: vazia(), latE: vazia() } }, extra);

test('csv: BOM, ponto e vírgula, aspas só quando precisa', () => {
  const s = E.csv([['a', 'b;c'], ['d "e"', '']]);
  assert.ok(s.startsWith('﻿'));
  assert.equal(s, '﻿a;"b;c"\r\n"d ""e""";\r\n');
});

test('medidas: cabeçalho sem nome do aluno e avaliação vazia só tem cabeçalho', () => {
  const rows = E.medidas([aval('2026-10-31')]);
  assert.deepEqual(rows, [E.CABECALHO]);
  assert.ok(!E.CABECALHO.some((c) => /nome|aluno/i.test(c)));
});

test('medidas: medida do protocolo com vírgula decimal e ordem por data', () => {
  const a2 = aval('2026-10-31');
  a2.views.ant.pts = { acrD: P(0, 0), acrE: P(100, -10) };
  const a1 = aval('2026-09-01');
  a1.views.ant.pts = { acrD: P(0, 0), acrE: P(100, 0) };
  const rows = E.medidas([a2, a1]);
  const a3 = rows.filter((r) => r[2] === 'A3');
  assert.equal(a3.length, 2);
  assert.equal(a3[0][0], '2026-09-01');
  assert.equal(a3[0][4], '0');
  assert.match(a3[1][4], /^5,7$/);
  assert.equal(a3[1][5], 'graus');
});

test('medidas: ângulos livres, fotos de teste e fotos avulsas; incompleto não entra', () => {
  const a = aval('2026-10-31', {
    livres: [{ nome: 'Foto 1', free: [{ tipo: '3pt', label: 'Joelho', pts: [P(1, 0), P(0, 0), P(0, 1)] }, { tipo: '3pt', label: 'Sem pontos', pts: [] }] }],
    mov: { fotos: { ohs: [{ nome: 'Frente', free: [{ tipo: 'h', label: 'Ombros', pts: [P(0, 0), P(100, 0)] }] }] } },
  });
  const rows = E.medidas([a], { testNome: (id) => (id === 'ohs' ? 'Agachamento overhead' : id) });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[1].slice(1, 6), ['Frente', '', 'Ombros', '0', 'graus']);
  assert.equal(rows[1][7], 'teste de movimento: Agachamento overhead');
  assert.deepEqual(rows[2].slice(3, 5), ['Joelho', '90']);
});

test('modelo: guarda nome, tipo e dicas, sem pontos', () => {
  const m = E.modelo('  Corrida lateral ', [{ tipo: 'v', label: 'Tronco', pts: [P(1, 2), P(3, 4)] }, { label: 'Joelho', pts: [] }], { '3pt': ['a', 'b', 'c'], v: ['x', 'y'] });
  assert.equal(m.nome, 'Corrida lateral');
  assert.deepEqual(m.angulos, [{ label: 'Tronco', tipo: 'v', dicas: ['x', 'y'] }, { label: 'Joelho', tipo: '3pt', dicas: ['a', 'b', 'c'] }]);
  assert.ok(!JSON.stringify(m).includes('"x":1'));
  assert.equal(E.modelo('', []).nome, 'Meu modelo');
});

test('medidas: corrida com cadência, tempos por lado e ângulos dos quadros', () => {
  const passos = [];
  let t = 1;
  for (let i = 0; i < 14; i++) { passos.push({ lado: i % 2 ? 'E' : 'D', ic: t, to: t + 0.25 }); t += 0.35; }
  const a = aval('2026-10-31', { corrida: { vistas: {
    latD: { usada: true, velocidade: '10 km/h', fpsGrav: '120', fpsArq: '120', passos, quadros: [{ nome: 'Contato inicial D', free: [{ tipo: 'v', label: 'Tíbia × vertical', pts: [P(0, 0), P(0, 100)] }] }] },
    post: { usada: false, passos: [] },
  } } });
  const rows = E.medidas([a]).filter((r) => r[7] === 'corrida');
  assert.deepEqual(rows[0].slice(1, 6), ['Lateral direita', '', 'Cadência', '171', 'passos/min']);
  assert.ok(rows.some((r) => r[3] === 'Tempo de contato direito' && r[4] === '250' && r[5] === 'ms'));
  assert.ok(rows.some((r) => r[3] === 'Tempo de voo esquerdo'));
  assert.ok(rows.some((r) => r[1] === 'Lateral direita · Contato inicial D' && r[3] === 'Tíbia × vertical' && r[4] === '0'));
  assert.ok(!rows.some((r) => r[1].startsWith('Posterior')));
});
