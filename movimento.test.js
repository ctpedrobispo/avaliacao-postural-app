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

test('step-down lateral: escore de Piva/Rabin só com todos os itens observáveis; joelho conta o maior nível', () => {
  const t = (o) => Mov.summarize({ t: { stepdown: o } }).tests.find((x) => x.id === 'stepdown');
  const base = { variante: 'Lateral (rubrica de Piva/Rabin)', altura: '20', jo2: { D: true }, jo3: { D: true }, tronco: { D: true }, visib: 'Sim' };
  const r = Mov.summarize({ t: { stepdown: base } });
  const l = r.tests[0].lines.find((x) => /Piva\/Rabin \(lateral/.test(x));
  assert.ok(/direito 3 · esquerdo 0/.test(l), l);
  assert.ok(/sem diagnóstico/.test(l) && /altura 20 cm/.test(l));
  assert.deepEqual(r.metrics.find((m) => m.key === 'stepdown.piva'), { key: 'stepdown.piva', label: 'Step-down lateral: escore de Piva/Rabin', unit: 'pontos', D: 3, E: 0 });
  assert.ok(t({ ...base, visib: 'Não' }).lines.some((x) => /não calculado/.test(x)));
  assert.ok(!t({ ...base, visib: '' }).lines.some((x) => /Piva\/Rabin \(lateral/.test(x)));
  assert.ok(!t({ ...base, variante: 'Anterior (forward)' }).lines.some((x) => /Piva\/Rabin/.test(x)), 'anterior não usa a rubrica lateral');
  const max = t({ variante: 'Lateral (rubrica de Piva/Rabin)', visib: 'Sim', mao: { E: true }, tronco: { E: true }, pelve: { E: true }, jo3: { E: true }, equil: { E: true } });
  assert.ok(/esquerdo 6/.test(max.lines.find((x) => /Piva\/Rabin \(lateral/.test(x))), 'máximo 6');
});

test('joelho na parede: referência de McBride só com pé dominante, protocolo, sexo e idade', () => {
  assert.equal(Mov.wbltRef('Feminino', 73, 7.0).pos, 'na faixa central P25–P75');
  assert.equal(Mov.wbltRef('Feminino', 25, 7.0).pos, 'abaixo de P25');
  assert.equal(Mov.wbltRef('Feminino', 25, 9.8).pos, 'na faixa central P25–P75', 'extremo publicado fica na faixa central');
  assert.equal(Mov.wbltRef('Masculino', 35, 14.5).pos, 'acima de P75');
  assert.equal(Mov.wbltRef('Masculino', 85, 5.0).faixa, '80+');
  assert.equal(Mov.wbltRef('Masculino', 17, 9), null, 'menor de 18 anos: sem referência');
  assert.equal(Mov.wbltRef('Outro', 30, 9), null);
  assert.equal(Mov.wbltRef('', 30, 9), null);
  const ctx = Mov.ctxOf({ nascimento: '1953-05-10', sexo: 'Feminino' }, '2026-11-11');
  assert.equal(ctx.idade, 73);
  assert.equal(Mov.ctxOf({ nascimento: '1953-12-10', sexo: 'Feminino' }, '2026-11-11').idade, 72, 'aniversário ainda não chegou');
  const mov = { t: { jpar: { dist: { D: ['6,5', '7', '6'], E: ['5', '5,5', '5'] }, dom: 'Direito', proto: 'Sim' } } };
  const l = Mov.summarize(mov, ctx).tests[0].lines.find((x) => /McBride/.test(x));
  assert.ok(/7 cm no pé direito — na faixa central P25–P75 \(5–8 cm\)/.test(l) && /não classificação de risco/.test(l), l);
  const sem = Mov.summarize({ t: { jpar: { ...mov.t.jpar, proto: 'Não' } } }, ctx).tests[0].lines.find((x) => /McBride/.test(x));
  assert.ok(/não aplicada/.test(sem));
  assert.ok(!Mov.summarize({ t: { jpar: { dist: mov.t.jpar.dist } } }, ctx).tests[0].lines.some((x) => /McBride/.test(x)), 'sem escolher nada, nada sobre McBride no laudo');
  assert.ok(/diferença entre os máximos/.test(Mov.summarize(mov, ctx).tests[0].lines[0]), 'diferença bruta continua, sem faixa de 2 ou 3 cm');
});

test('Thomas: convenção de sinal está nos rótulos', () => {
  const th = Mov.TESTS.find((x) => x.id === 'thomas');
  assert.ok(/0 = horizontal.*abaixo.*acima/.test(th.campos.find((c) => c.k === 'quadril').label));
  assert.ok(/0 = extensão completa/.test(th.campos.find((c) => c.k === 'joelho').label));
});

test('Thomas: ângulo com sinal não ganha diferença percentual', () => {
  const l = Mov.summarize({ t: { thomas: { quadril: { D: '-5', E: '2' }, joelho: { D: '60', E: '50' } } } }).tests[0].lines;
  const q = l.find((x) => /Coxa em relação/.test(x)), j = l.find((x) => /Flexão do joelho/.test(x));
  assert.ok(/diferença 7 °$/.test(q), q);
  assert.ok(/diferença 10 ° \(16,7%\)/.test(j), j);
});
