const test = require('node:test');
const assert = require('node:assert/strict');
const Angles = require('./app/angles.js');
const Auto = require('./app/autopose.js');

// Pessoa sintética de pé, 1000x2000 px. Índices do modelo: 0 nariz, 7/8 orelhas, 11/12 ombros, 23/24 quadris,
// 25/26 joelhos, 27/28 tornozelos, 29/30 calcanhares, 31/32 ponta do pé (esquerdo = 7, 11, 23, ... do aluno).
function person(leftOfStudentOnPhotoLeft) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  const xs = leftOfStudentOnPhotoLeft ? { L: 0.4, R: 0.6 } : { L: 0.6, R: 0.4 };
  const set = (i, x, y) => (lm[i] = { x, y, visibility: 1 });
  set(0, 0.5, 0.08);
  set(7, xs.L, 0.09); set(8, xs.R, 0.09);
  set(11, xs.L - 0.05, 0.22); set(12, xs.R + 0.05, 0.22);
  set(23, xs.L, 0.5); set(24, xs.R, 0.5);
  set(25, xs.L, 0.7); set(26, xs.R, 0.7);
  set(27, xs.L, 0.9); set(28, xs.R, 0.9);
  set(29, xs.L, 0.93); set(30, xs.R, 0.93);
  set(31, xs.L, 0.96); set(32, xs.R, 0.96);
  return lm;
}

test('todos os pontos sugeridos existem na definição da vista', () => {
  ['ant', 'post', 'latD', 'latE'].forEach((view) => {
    const r = Auto.mapLandmarks(view, person(true), 1000, 2000);
    const ids = new Set(Angles.VIEWS[view].points.map((p) => p[0]));
    Object.keys(r.pts).forEach((id) => assert.ok(ids.has(id), view + ': ' + id));
    assert.ok(Object.keys(r.pts).length >= 8, view);
  });
});

test('anterior: lado direito do aluno fica à esquerda da foto, mesmo se o modelo trocar os lados', () => {
  [true, false].forEach((flag) => {
    const r = Auto.mapLandmarks('ant', person(flag), 1000, 2000);
    assert.ok(r.pts.acrD.x < r.pts.acrE.x, 'ombro D à esquerda da foto');
    assert.ok(r.pts.joeD.x < r.pts.joeE.x);
    assert.ok(r.pts.torD.x < r.pts.torE.x);
  });
});

test('posterior: lado direito do aluno fica à direita da foto', () => {
  [true, false].forEach((flag) => {
    const r = Auto.mapLandmarks('post', person(flag), 1000, 2000);
    assert.ok(r.pts.ombD.x > r.pts.ombE.x);
    assert.ok(r.pts.calD.x > r.pts.calE.x);
    assert.ok(r.pts.psiD.x > r.pts.psiE.x);
  });
});

test('lateral: direção do aluno vem do nariz e as referências ficam do lado certo', () => {
  const lm = person(true);
  lm[0] = { x: 0.68, y: 0.08, visibility: 1 }; // nariz à direita da orelha
  const r = Auto.mapLandmarks('latD', lm, 1000, 2000);
  assert.equal(r.facing, 'dir');
  assert.ok(r.pts.asi.x > r.pts.psi.x, 'EIAS à frente da EIPS');
  assert.ok(r.pts.c7.x < r.pts.acr.x, 'C7 atrás do ombro');
  lm[0] = { x: 0.32, y: 0.08, visibility: 1 };
  const r2 = Auto.mapLandmarks('latE', lm, 1000, 2000);
  assert.equal(r2.facing, 'esq');
  assert.ok(r2.pts.asi.x < r2.pts.psi.x);
});

test('ponto pouco visível não é sugerido', () => {
  const lm = person(true);
  lm[25].visibility = 0.05; lm[26].visibility = 0.05;
  const r = Auto.mapLandmarks('ant', lm, 1000, 2000);
  assert.equal(r.pts.joeD, undefined);
  assert.ok(r.pts.torD);
});
