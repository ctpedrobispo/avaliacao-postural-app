// Testes do motor de ângulos. Rodar com: node --test apps/avaliacao-postural/angles.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./app/angles.js');

const near = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const P = (x, y) => ({ x, y });

test('tilt: horizontal, 45° e lado mais alto', () => {
  near(A.tilt(P(0, 0), P(100, 0)).angle, 0);
  const r = A.tilt(P(0, 0), P(100, -100));
  near(r.angle, 45);
  assert.equal(r.higher, 'b');
  assert.equal(A.tilt(P(0, 0), P(100, 10)).higher, 'a');
});

test('fromVertical: ângulo e deslocamento do ponto mais alto', () => {
  near(A.fromVertical(P(0, 0), P(0, 100)).angle, 0);
  const r = A.fromVertical(P(0, 100), P(100, 0));
  near(r.angle, 45);
  assert.equal(r.topShift, 1);
});

test('angleAt: ângulo reto e raso', () => {
  near(A.angleAt(P(1, 0), P(0, 0), P(0, 1)), 90);
  near(A.angleAt(P(-1, 0), P(0, 0), P(1, 0)), 180);
});

test('joelho: projeção medial é positiva nos dois lados da foto', () => {
  // Perna à esquerda da foto: linha média fica à direita (+x).
  const left = A.kneeFrontal(P(0, 0), P(10, 100), P(0, 200), 1);
  near(left, 11.4, 0.1);
  // Perna à direita da foto, espelhada.
  const right = A.kneeFrontal(P(0, 0), P(-10, 100), P(0, 200), -1);
  near(right, 11.4, 0.1);
  // Joelho para fora: negativo.
  assert.ok(A.kneeFrontal(P(0, 0), P(-10, 100), P(0, 200), 1) < 0);
});

test('pé: ponta para fora é positiva', () => {
  near(A.footRotation(P(0, 100), P(-10, 0), 1), 5.7, 0.1);
  near(A.footRotation(P(0, 100), P(10, 0), -1), 5.7, 0.1);
  assert.ok(A.footRotation(P(0, 100), P(10, 0), 1) < 0);
});

test('vista anterior: código, joelho direito e lado mais alto do ombro', () => {
  // Aluno de frente: direito à esquerda da foto.
  const pts = {
    acrD: P(100, 300), acrE: P(300, 290),
    asiD: P(140, 500), joeD: P(160, 700), torD: P(140, 900),
  };
  const res = A.computeView('ant', pts);
  const ombro = res.find((r) => r.code === 'A3');
  assert.match(ombro.text, /esquerdo mais alto/);
  const joelho = res.find((r) => r.code === 'A8');
  assert.ok(joelho.signed > 0);
  assert.match(joelho.text, /projeção medial/);
  assert.equal(res.find((r) => r.code === 'A9'), undefined);
});

test('vista lateral: cabeça à frente da C7 e complemento craniovertebral', () => {
  // Aluno olhando para a direita da foto (padrão da lateral direita).
  const pts = { c7: P(200, 300), tra: P(250, 230) };
  const r = A.computeView('latD', pts).find((x) => x.code === 'C2');
  near(r.value, 35.5, 0.1);
  assert.match(r.text, /anterior/);
  assert.match(r.text, /54,5° \(horizontal\)/);
});

test('pelve lateral: EIAS abaixo da EIPS = inclinação anterior', () => {
  const r = A.computeView('latE', { asi: P(300, 520), psi: P(200, 500) }).find((x) => x.code === 'D4');
  near(r.value, 11.3, 0.1);
  assert.match(r.text, /anterior/);
});

test('lateral direita: pontos medidos sobre o relatório APECS batem com os valores dele', () => {
  // Coordenadas lidas dos marcadores do APECS na foto reduzida (1/4) da lateral direita, 01/10/2026.
  const pts = { tra: P(226, 124), c7: P(178, 177), tro: P(192, 436), joe: P(184, 620), mal: P(157, 810), ded: P(222, 849) };
  const r = Object.fromEntries(A.computeView('latD', pts).map((x) => [x.code, x.value]));
  near(r.C2, 42, 2); // APECS 42°
  near(r.C5, 2, 2); // APECS 2°
  near(r.C6, 7, 2); // APECS 7°
  near(r.C1, 5, 2); // APECS 5°
  near(r.C7, 29, 2.5); // APECS 29°
});

test('vista anterior: pontos medidos sobre o relatório APECS batem com os valores dele', () => {
  // Coordenadas lidas dos marcadores do APECS na foto reduzida (1/4) da vista anterior, 01/10/2026.
  const pts = {
    asiD: P(194, 375), joeD: P(199, 610), torD: P(183, 748), dedD: P(166, 810),
    asiE: P(301, 378), joeE: P(308, 610), torE: P(306, 748), dedE: P(313, 810),
  };
  const r = Object.fromEntries(A.computeView('ant', pts).map((x) => [x.code, x]));
  near(r.A8.value, 7, 1.5); // APECS 7°
  near(r.A9.value, 3, 1.5); // APECS 3°
  near(r.A10.value, 16, 1.5); // APECS 16°
  near(r.A11.value, 8, 2); // APECS 8°
  // Os dois pés com a ponta para fora.
  assert.ok(r.A10.signed > 0 && r.A11.signed > 0);
});

test('alinhamento do tronco e cabeça sobre o tronco (complementares)', () => {
  const pts = { est: { x: 100, y: 100 }, nar: { x: 100, y: 40 }, asiD: { x: 60, y: 300 }, asiE: { x: 140, y: 300 } };
  const res = A.computeView('ant', pts);
  assert.equal(res.find((r) => r.code === 'A12').value, 0);
  assert.equal(res.find((r) => r.code === 'A13').value, 0);
  const inclinado = A.computeView('ant', { ...pts, est: { x: 110, y: 100 } }).find((r) => r.code === 'A12');
  assert.ok(inclinado.value > 2 && inclinado.value < 6);
  const post = A.computeView('post', { c7p: { x: 100, y: 80 }, fen: { x: 100, y: 300 }, orD: { x: 110, y: 40 }, orE: { x: 90, y: 40 } });
  assert.equal(post.find((r) => r.code === 'B11').value, 0);
  assert.equal(post.find((r) => r.code === 'B12').value, 0);
});

test('calibração: escala em px/cm e correção de foto inclinada', () => {
  // fio de prumo de 100 cm desenhado de (100,0) a (110,100): inclinado 5,7° na foto
  const cal = A.calibFromPoints({ x: 100, y: 0 }, { x: 110, y: 100 }, 100, 'v');
  assert.ok(Math.abs(cal.pxPerCm - Math.hypot(10, 100) / 100) < 1e-9);
  const rot = A.rotatePts({ a: { x: 100, y: 0 }, b: { x: 110, y: 100 } }, cal.rot);
  assert.ok(Math.abs(rot.a.x - rot.b.x) < 0.05, "a referência fica vertical");
  // ombros inclinados só porque a foto está torcida: com a calibração, ficam nivelados
  const th = 5.7106 * Math.PI / 180;
  const rotate = (p) => ({ x: p.x * Math.cos(-th) - p.y * Math.sin(-th), y: p.x * Math.sin(-th) + p.y * Math.cos(-th) });
  const pts = { acrD: rotate({ x: 40, y: 100 }), acrE: rotate({ x: 160, y: 100 }) };
  const semCal = A.computeView('ant', pts).find((r) => r.code === 'A3');
  const comCal = A.computeView('ant', pts, undefined, cal).find((r) => r.code === 'A3');
  assert.ok(semCal.value > 4);
  assert.ok(comCal.value < 0.2);
  // régua horizontal
  const calH = A.calibFromPoints({ x: 0, y: 0 }, { x: 100, y: 10 }, 50, 'h');
  const r2 = A.rotatePts({ a: { x: 0, y: 0 }, b: { x: 100, y: 10 } }, calH.rot);
  assert.ok(Math.abs(r2.a.y - r2.b.y) < 0.05);
});

test('deslocamento em cm só existe com calibração e usa a escala', () => {
  const pts = { cabD: { x: 140, y: 100 }, cabE: { x: 160, y: 100 }, torD: { x: 90, y: 900 }, torE: { x: 110, y: 900 } };
  assert.equal(A.computeView('ant', pts).find((r) => r.code === 'A14'), undefined);
  const cal = { pxPerCm: 5, rot: 0, apply: true };
  const r = A.computeView('ant', pts, undefined, cal).find((x) => x.code === 'A14');
  assert.equal(r.unit, 'cm');
  assert.equal(r.value, 10); // 50 px / 5 px por cm
  assert.match(r.text, /esquerda do aluno/); // cabeça mais à direita da foto = esquerda do aluno
  assert.equal(A.fmtVal(r), '10 cm');
});

test('ângulo craniovertebral lateral', () => {
  // trago 45° à frente de C7 (aluno olhando para a direita): CVA = 45°
  const pts = { c7: { x: 100, y: 200 }, tra: { x: 150, y: 150 } };
  const r = A.computeView('latD', pts, 'dir').find((x) => x.code === 'C8');
  assert.equal(r.value, 45);
  const atras = A.computeView('latD', { c7: { x: 100, y: 200 }, tra: { x: 50, y: 150 } }, 'dir').find((x) => x.code === 'C8');
  assert.equal(atras.value, 135);
});

test('ângulo livre: 3 pontos, linha × horizontal, linha × vertical e incompleto', () => {
  const tres = { tipo: '3pt', pts: [{ x: 100, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 100 }] };
  assert.equal(A.freeValue(tres).value, 90);
  assert.equal(A.freeValue({ pts: tres.pts }).value, 90, 'sem tipo = 3 pontos (dados antigos)');
  const h = A.freeValue({ tipo: 'h', pts: [{ x: 0, y: 0 }, { x: 100, y: 100 }] });
  assert.equal(h.value, 45);
  const v = A.freeValue({ tipo: 'v', pts: [{ x: 0, y: 0 }, { x: 0, y: 100 }] });
  assert.equal(v.value, 0);
  assert.equal(A.freeValue({ tipo: '3pt', pts: [{ x: 1, y: 1 }, null, { x: 2, y: 2 }] }), null);
  assert.equal(A.freeValue({ tipo: 'h', pts: [{ x: 1, y: 1 }] }), null);
});

test('lateral: ângulo incluído trocânter–joelho–maléolo (complementar)', () => {
  const pts = { tro: { x: 100, y: 100 }, joe: { x: 100, y: 200 }, mal: { x: 100, y: 300 } };
  ['latD', 'latE'].forEach((k) => {
    const r = A.computeView(k, pts, 'dir', null).find((x) => /trocânter–joelho–maléolo/.test(x.label));
    assert.ok(r, k);
    assert.equal(r.value, 180);
    assert.ok(/não diferencia flexão de hiperextensão/.test(r.text));
  });
});
