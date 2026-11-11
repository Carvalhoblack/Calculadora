'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate, format, CalcError } = require('./engine.js');

const calc = (expr, options) => evaluate(expr, options).formatted;

test('operações básicas e precedência', () => {
  assert.equal(calc('2+3*4'), '14');
  assert.equal(calc('(2+3)*4'), '20');
  assert.equal(calc('10/4'), '2.5');
  assert.equal(calc('7−10'), '-3');
  assert.equal(calc('6×7'), '42');
  assert.equal(calc('9÷3'), '3');
});

test('aceita vírgula como separador decimal', () => {
  assert.equal(calc('1,5+1'), '2.5');
});

test('corrige erros de ponto flutuante', () => {
  assert.equal(calc('0,1+0,2'), '0.3');
  assert.equal(calc('1,1×3'), '3.3');
});

test('menos unário e potência', () => {
  assert.equal(calc('-2^2'), '-4');
  assert.equal(calc('2^3^2'), '512');
  assert.equal(calc('2^-1'), '0.5');
  assert.equal(calc('3×−2'), '-6');
});

test('porcentagem', () => {
  assert.equal(calc('50%'), '0.5');
  assert.equal(calc('200+10%'), '220');
  assert.equal(calc('200−10%'), '180');
  assert.equal(calc('200×10%'), '20');
});

test('funções e constantes', () => {
  assert.equal(calc('sqrt(16)'), '4');
  assert.equal(calc('√(16)'), '4');
  assert.equal(calc('abs(-7)'), '7');
  assert.equal(calc('log(1000)'), '3');
  assert.equal(calc('ln(e)'), '1');
  assert.ok(calc('2π').startsWith('6.2831853071'));
});

test('trigonometria em graus e radianos', () => {
  assert.equal(calc('sin(30)'), '0.5');
  assert.equal(calc('cos(90)'), '0');
  assert.equal(calc('sin(pi/2)', { angleMode: 'rad' }), '1');
  assert.equal(calc('asin(1)'), '90');
  assert.throws(() => evaluate('tan(90)'), CalcError);
});

test('fatorial', () => {
  assert.equal(calc('5!'), '120');
  assert.equal(calc('0!'), '1');
  assert.throws(() => evaluate('3,5!'), CalcError);
  assert.throws(() => evaluate('171!'), CalcError);
});

test('multiplicação implícita e parênteses automáticos', () => {
  assert.equal(calc('2(3+1)'), '8');
  assert.equal(calc('(1+1)(2+2)'), '8');
  assert.equal(calc('(2+3'), '5');
});

test('erros são reportados com CalcError', () => {
  assert.throws(() => evaluate('1/0'), /zero/);
  assert.throws(() => evaluate('sqrt(-1)'), CalcError);
  assert.throws(() => evaluate('log(0)'), CalcError);
  assert.throws(() => evaluate('2+'), CalcError);
  assert.throws(() => evaluate(')'), CalcError);
  assert.throws(() => evaluate('2..3'), CalcError);
  assert.throws(() => evaluate('foo(2)'), CalcError);
  assert.throws(() => evaluate('abc'), CalcError);
  assert.throws(() => evaluate(''), CalcError);
  assert.throws(() => evaluate('0^-1'), CalcError);
});

test('não executa código arbitrário', () => {
  assert.throws(() => evaluate('process.exit()'), CalcError);
  assert.throws(() => evaluate('constructor(1)'), CalcError);
  assert.throws(() => evaluate('alert(1)'), CalcError);
});

test('formatação de números grandes e pequenos', () => {
  assert.equal(format(1e21), '1×10^21');
  assert.equal(calc('1000000×1000000×1000'), '1×10^15');
  assert.equal(format(0.0000001), '1×10^-7');
  assert.equal(format(-0), '0');
  // o formato exponencial pode ser reavaliado pelo motor
  assert.equal(calc('1×10^21'), '1×10^21');
});
