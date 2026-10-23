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

test('modelos de medida por teste: tipos, pontos nomeados e sem termos de diagnóstico', () => {
  const proibido = /valgo|varo|encurtad|fraqueza|risco de les|escoliose/i;
  const comModelo = Mov.TESTS.filter((x) => x.modelos);
  assert.ok(comModelo.length >= 4, 'overhead, step-down, joelho na parede e Thomas têm modelo');
  comModelo.forEach((x) => x.modelos.forEach((md) => {
    assert.ok(md.nome && md.angulos.length);
    const nomes = new Set();
    md.angulos.forEach((a) => {
      assert.ok(['3pt', 'h', 'v'].includes(a.tipo), a.label);
      assert.equal(a.dicas.length, a.tipo === '3pt' ? 3 : 2, a.label);
      assert.ok(!nomes.has(a.label), 'rótulo repetido: ' + a.label);
      nomes.add(a.label);
      assert.ok(!proibido.test(a.label + ' ' + a.dicas.join(' ')), a.label);
    });
  }));
});

test('Thomas: sem controle da pelve confirmado, o resumo avisa que a leitura é limitada', () => {
  const base = { t: { thomas: { quadril: { D: '10', E: '5' } } } };
  const sem = Mov.summarize(base).tests.find((t) => t.id === 'thomas');
  assert.ok(sem.lines.some((l) => /Controle da pelve não confirmado/.test(l)));
  const com = Mov.summarize({ t: { thomas: { quadril: { D: '10', E: '5' }, ctrl_pelve: 'Controlada e verificada' } } }).tests.find((t) => t.id === 'thomas');
  assert.ok(!com.lines.some((l) => /não confirmado/.test(l)));
});

test('agachamento overhead registra base e carga', () => {
  const r = Mov.summarize({ t: { ohs: { base: 'Largura dos ombros, pés paralelos', carga: 'Bastão' } } }).tests.find((t) => t.id === 'ohs');
  assert.ok(r.lines.some((l) => /Base/.test(l)) && r.lines.some((l) => /Carga/.test(l)));
});
