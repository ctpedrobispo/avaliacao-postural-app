// Testes das medidas corporais. Rodar com: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./app/medidas.js');

const rec = (data, v, extra) => Object.assign({ id: data, data, v: M.limpa(v) }, extra);

test('limpa: vírgula decimal, vazio e inválido ficam de fora (nunca zero)', () => {
  const v = M.limpa({ braco_D: '35,5', braco_E: '', coxa_D: '0', coxa_E: 'abc', cintura: 80, torax: null });
  assert.deepEqual(v, { braco_D: 35.5, cintura: 80 });
  assert.deepEqual(M.limpa(null), {});
});

test('campos: pares direito e esquerdo e medidas únicas', () => {
  const ks = M.CAMPOS.map((c) => c.k);
  ['braco_D', 'braco_E', 'bracoC_D', 'bracoC_E', 'ant_D', 'ant_E', 'coxa_D', 'coxa_E', 'pant_D', 'pant_E', 'pescoco', 'torax', 'cintura', 'abdomen', 'quadril'].forEach((k) => assert.ok(ks.includes(k), k));
  assert.equal(new Set(ks).size, ks.length);
  assert.equal(M.nomeDe('pant_E'), 'Panturrilha (esquerdo)');
});

test('aviso: só avisa valores implausíveis, não bloqueia', () => {
  assert.equal(M.aviso({ cintura: 85 }).length, 0);
  assert.equal(M.aviso({ cintura: 850, braco_D: 3 }).length, 2);
});

test('serie: ordem por data, só onde há valor', () => {
  const lista = [rec('2026-10-01', { cintura: 82 }), rec('2026-08-01', { cintura: 86, quadril: 100 }), rec('2026-09-01', { quadril: 99 })];
  assert.deepEqual(M.serie(lista, 'cintura'), [{ data: '2026-08-01', value: 86 }, { data: '2026-10-01', value: 82 }]);
  assert.deepEqual(M.serie(lista, 'coxa_D'), []);
});

test('rcq: razão contínua, sem classificação; ausente fica nulo', () => {
  assert.equal(M.rcq({ cintura: 80, quadril: 100 }), 0.8);
  assert.equal(M.rcq({ cintura: 80 }), null);
  assert.deepEqual(M.serieRcq([rec('2026-08-01', { cintura: 86, quadril: 100 }), rec('2026-10-01', { cintura: 82, quadril: 100 })]).map((p) => p.value), [0.86, 0.82]);
});

test('evolucao: variação desde o primeiro e desde o anterior', () => {
  const lista = [rec('2026-08-01', { braco_D: 34 }), rec('2026-09-01', { braco_D: 35 }), rec('2026-10-01', { braco_D: 36.5 })];
  const l = M.evolucao(lista);
  assert.equal(l.length, 1);
  assert.equal(l[0].atual, 36.5);
  assert.equal(l[0].desdePrimeiro, 2.5);
  assert.equal(l[0].desdeAnterior, 1.5);
  const so1 = M.evolucao([rec('2026-08-01', { cintura: 80 })]);
  assert.equal(so1[0].desdePrimeiro, null);
  assert.equal(so1[0].desdeAnterior, null);
});

test('assimetria: diferença D − E na medição mais recente com os dois lados', () => {
  const lista = [rec('2026-08-01', { coxa_D: 58, coxa_E: 57 }), rec('2026-10-01', { coxa_D: 60, coxa_E: 58.5, pant_D: 38 })];
  const a = M.assimetria(lista);
  assert.equal(a.length, 1);
  assert.deepEqual([a[0].id, a[0].data, a[0].dif], ['coxa', '2026-10-01', 1.5]);
});

test('linhasCsv: uma linha por medida e data, com vírgula decimal', () => {
  const rows = M.linhasCsv([rec('2026-10-01', { cintura: 82, quadril: 100.5 }, { obs: 'jejum' })]);
  assert.deepEqual(rows[0], ['2026-10-01', 'Cintura', '82', 'cm', 'jejum']);
  assert.deepEqual(rows[1], ['2026-10-01', 'Quadril', '100,5', 'cm', 'jejum']);
  assert.equal(rows[2][1], 'Relação cintura/quadril');
  assert.equal(rows[2][2], '0,82');
});
