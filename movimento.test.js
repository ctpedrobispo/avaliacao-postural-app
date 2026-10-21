const test = require('node:test');
const assert = require('node:assert/strict');
const Mov = require('./app/movimento.js');

test('resumo dos testes de movimento: observações, assimetria e três tentativas', () => {
  const mov = {
    t: {
      ohs: { rep: '5', jo_med: { D: true, E: false }, tronco: true, dor: 'Sem dor', obs: 'Calçado de corrida' },
      jpar: { dist: { D: ['9', '10', '11'], E: ['7', '8', '8,5'] }, calc: { D: false, E: true } },
      thomas: { quadril: { D: '10', E: '5' } },
    },
    livres: [{ nome: 'Ponte unilateral', unidade: 'repetições', d: '12', e: '10', obs: '' }],
  };
  const r = Mov.summarize(mov);
  const ohs = r.tests.find((t) => t.id === 'ohs');
  assert.ok(ohs.lines.some((l) => /Joelho: projeção medial.*lado direito/.test(l)));
  assert.ok(ohs.lines.some((l) => /Tronco: inclinação anterior acentuada/.test(l)));
  assert.ok(ohs.lines.some((l) => /Observação: Calçado de corrida/.test(l)));
  assert.ok(!ohs.lines.some((l) => /esquerdo/.test(l) && /Joelho/.test(l)), 'lado não marcado não aparece');
  const jp = r.tests.find((t) => t.id === 'jpar');
  assert.ok(jp.lines[0].includes('máx. 11') && jp.lines[0].includes('diferença entre os máximos 2,5 cm'));
  const th = r.metrics.find((m) => m.key === 'thomas.quadril');
  assert.equal(th.D, 10);
  assert.equal(th.E, 5);
  assert.ok(r.metrics.find((m) => m.key === 'livre.Ponte unilateral'));
  assert.equal(r.tests.find((t) => t.id === 'stepdown'), undefined, 'teste sem registro não entra no laudo');
});

test('sem dados, resumo vazio', () => {
  assert.deepEqual(Mov.summarize(null).tests, []);
  assert.deepEqual(Mov.summarize({ t: {}, livres: [] }).tests, []);
});
