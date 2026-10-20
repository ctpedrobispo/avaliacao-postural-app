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

test('alinhamento do tronco e cabeça sobre os ombros (complementares)', () => {
  const pts = { acrD: { x: 40, y: 100 }, acrE: { x: 160, y: 100 }, asiD: { x: 60, y: 300 }, asiE: { x: 140, y: 300 }, nar: { x: 100, y: 40 } };
  const res = A.computeView('ant', pts);
  const a12 = res.find((r) => r.code === 'A12');
  const a13 = res.find((r) => r.code === 'A13');
  assert.equal(a12.value, 0);
  assert.equal(a13.value, 0);
  const pts2 = { ombD: { x: 160, y: 100 }, ombE: { x: 40, y: 100 }, psiD: { x: 130, y: 300 }, psiE: { x: 70, y: 300 } };
  assert.equal(A.computeView('post', pts2).find((r) => r.code === 'B11').value, 0);
});
