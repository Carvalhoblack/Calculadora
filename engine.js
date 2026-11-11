/**
 * Motor de cálculo da Calculadora Web.
 *
 * Não usa eval(): a expressão é convertida em tokens, interpretada por um
 * parser de descida recursiva e avaliada sobre uma árvore sintática.
 * Funciona no navegador (window.CalcEngine) e no Node.js (require).
 *
 * Gramática (da menor para a maior precedência):
 *   expressão = termo (("+" | "-") termo)*
 *   termo     = unário (("*" | "/") unário | multiplicação implícita)*
 *   unário    = ("-" | "+") unário | potência
 *   potência  = pós-fixo ("^" unário)?          (associativa à direita)
 *   pós-fixo  = primário ("%" | "!")*
 *   primário  = número | constante | função "(" expressão ")" | "(" expressão ")"
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalcEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class CalcError extends Error {
    constructor(message) {
      super(message);
      this.name = 'CalcError';
    }
  }

  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  const CONSTANTS = { pi: Math.PI, e: Math.E };
  const FUNCTIONS = ['sqrt', 'abs', 'log', 'ln', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan'];

  /** Padroniza símbolos de exibição para os usados pelo parser. */
  function normalize(input) {
    return String(input)
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/[−–]/g, '-')
      .replace(/π/g, 'pi')
      .replace(/√/g, 'sqrt')
      .replace(/,/g, '.')
      .replace(/\s+/g, '');
  }

  /** Quebra o texto em tokens. */
  function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (/[0-9.]/.test(ch)) {
        let j = i;
        let dots = 0;
        while (j < src.length && /[0-9.]/.test(src[j])) {
          if (src[j] === '.') dots++;
          j++;
        }
        const text = src.slice(i, j);
        if (dots > 1 || text === '.') throw new CalcError('Número inválido');
        tokens.push({ type: 'num', value: parseFloat(text) });
        i = j;
      } else if (/[a-z]/i.test(ch)) {
        let j = i;
        while (j < src.length && /[a-z]/i.test(src[j])) j++;
        tokens.push({ type: 'id', value: src.slice(i, j).toLowerCase() });
        i = j;
      } else if ('+-*/^%!'.includes(ch)) {
        tokens.push({ type: 'op', value: ch });
        i++;
      } else if (ch === '(' || ch === ')') {
        tokens.push({ type: ch });
        i++;
      } else {
        throw new CalcError('Caractere inválido: ' + ch);
      }
    }
    return tokens;
  }

  /** Constrói a árvore sintática a partir dos tokens. */
  function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];
    const isOp = (v) => peek() && peek().type === 'op' && peek().value === v;
    const expect = (type) => {
      const t = next();
      if (!t || t.type !== type) throw new CalcError('Parêntese não fechado');
    };

    function expression() {
      let left = term();
      while (isOp('+') || isOp('-')) {
        const op = next().value;
        left = { type: 'bin', op, left, right: term() };
      }
      return left;
    }

    function term() {
      let left = unary();
      for (;;) {
        if (isOp('*') || isOp('/')) {
          const op = next().value;
          left = { type: 'bin', op, left, right: unary() };
        } else if (peek() && (peek().type === '(' || peek().type === 'id' || peek().type === 'num')) {
          // multiplicação implícita: 2(3+1), 2pi, (1+1)(2+2)
          left = { type: 'bin', op: '*', left, right: unary() };
        } else {
          return left;
        }
      }
    }

    function unary() {
      if (isOp('-')) {
        next();
        return { type: 'neg', value: unary() };
      }
      if (isOp('+')) {
        next();
        return unary();
      }
      return power();
    }

    function power() {
      const base = postfix();
      if (isOp('^')) {
        next();
        return { type: 'bin', op: '^', left: base, right: unary() };
      }
      return base;
    }

    function postfix() {
      let node = primary();
      while (isOp('%') || isOp('!')) {
        const op = next().value;
        node = { type: op === '%' ? 'pct' : 'fact', value: node };
      }
      return node;
    }

    function primary() {
      const t = next();
      if (!t) throw new CalcError('Expressão incompleta');
      if (t.type === 'num') return { type: 'num', value: t.value };
      if (t.type === 'id') {
        const isFn = FUNCTIONS.includes(t.value);
        if (peek() && peek().type === '(') {
          if (!isFn) throw new CalcError('Função desconhecida: ' + t.value);
          next();
          const arg = expression();
          expect(')');
          return { type: 'call', name: t.value, arg };
        }
        if (has(CONSTANTS, t.value)) return { type: 'num', value: CONSTANTS[t.value] };
        if (isFn) throw new CalcError('Use parênteses: ' + t.value + '(...)');
        throw new CalcError('Desconhecido: ' + t.value);
      }
      if (t.type === '(') {
        const inner = expression();
        expect(')');
        return inner;
      }
      throw new CalcError('Expressão inválida');
    }

    if (tokens.length === 0) throw new CalcError('Expressão vazia');
    const ast = expression();
    if (pos < tokens.length) throw new CalcError('Expressão inválida');
    return ast;
  }

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0) throw new CalcError('Fatorial só aceita inteiros não negativos');
    if (n > 170) throw new CalcError('Número muito grande');
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  function callFunction(name, x, ctx) {
    const deg = ctx.angleMode === 'deg';
    const toRad = (v) => (deg ? (v * Math.PI) / 180 : v);
    const fromRad = (v) => (deg ? (v * 180) / Math.PI : v);
    // elimina ruído de ponto flutuante, ex.: sin(180°) = 1.2e-16 -> 0
    const clean = (v) => (Math.abs(v) < 1e-12 ? 0 : v);

    switch (name) {
      case 'sqrt':
        if (x < 0) throw new CalcError('Raiz de número negativo');
        return Math.sqrt(x);
      case 'abs':
        return Math.abs(x);
      case 'log':
        if (x <= 0) throw new CalcError('Logaritmo exige número positivo');
        return Math.log10(x);
      case 'ln':
        if (x <= 0) throw new CalcError('Logaritmo exige número positivo');
        return Math.log(x);
      case 'sin':
        return clean(Math.sin(toRad(x)));
      case 'cos':
        return clean(Math.cos(toRad(x)));
      case 'tan': {
        const r = toRad(x);
        if (Math.abs(Math.cos(r)) < 1e-12) throw new CalcError('Tangente indefinida');
        return clean(Math.tan(r));
      }
      case 'asin':
        if (Math.abs(x) > 1) throw new CalcError('Entrada fora do intervalo [-1, 1]');
        return clean(fromRad(Math.asin(x)));
      case 'acos':
        if (Math.abs(x) > 1) throw new CalcError('Entrada fora do intervalo [-1, 1]');
        return clean(fromRad(Math.acos(x)));
      case 'atan':
        return clean(fromRad(Math.atan(x)));
      /* istanbul ignore next */
      default:
        throw new CalcError('Função desconhecida: ' + name);
    }
  }

  function evaluateNode(node, ctx) {
    switch (node.type) {
      case 'num':
        return node.value;
      case 'neg':
        return -evaluateNode(node.value, ctx);
      case 'pct':
        return evaluateNode(node.value, ctx) / 100;
      case 'fact':
        return factorial(evaluateNode(node.value, ctx));
      case 'call':
        return callFunction(node.name, evaluateNode(node.arg, ctx), ctx);
      case 'bin': {
        const l = evaluateNode(node.left, ctx);
        // "200 + 10%" significa 200 + 10% de 200
        if ((node.op === '+' || node.op === '-') && node.right.type === 'pct') {
          const p = evaluateNode(node.right.value, ctx);
          return node.op === '+' ? l + (l * p) / 100 : l - (l * p) / 100;
        }
        const r = evaluateNode(node.right, ctx);
        switch (node.op) {
          case '+':
            return l + r;
          case '-':
            return l - r;
          case '*':
            return l * r;
          case '/':
            if (r === 0) throw new CalcError('Divisão por zero');
            return l / r;
          case '^':
            return Math.pow(l, r);
        }
        throw new CalcError('Operador inválido');
      }
    }
    throw new CalcError('Expressão inválida');
  }

  /**
   * Formata o número com até 12 dígitos significativos e usa a notação
   * "m×10^n" para valores muito grandes ou muito pequenos. Essa notação
   * pode ser reinterpretada pelo próprio motor.
   */
  function format(n) {
    if (!Number.isFinite(n)) throw new CalcError('Resultado indefinido');
    let r = Number(n.toPrecision(12));
    if (Object.is(r, -0)) r = 0;
    const abs = Math.abs(r);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-6)) {
      const parts = r.toExponential().split('e');
      return parts[0] + '×10^' + parseInt(parts[1], 10);
    }
    return String(r);
  }

  /**
   * Avalia uma expressão.
   * @param {string} input    Ex.: "2+3×(4−1)"
   * @param {{angleMode?: 'deg'|'rad'}} [options]
   * @returns {{value: number, formatted: string}}
   */
  function evaluate(input, options) {
    const ctx = { angleMode: options && options.angleMode === 'rad' ? 'rad' : 'deg' };
    let src = normalize(input);
    if (!src) throw new CalcError('Expressão vazia');

    // fecha automaticamente parênteses abertos: "(2+3" -> "(2+3)"
    const open = (src.match(/\(/g) || []).length;
    const close = (src.match(/\)/g) || []).length;
    if (open > close) src += ')'.repeat(open - close);

    const value = evaluateNode(parse(tokenize(src)), ctx);
    if (!Number.isFinite(value)) throw new CalcError('Resultado indefinido');
    return { value, formatted: format(value) };
  }

  return { evaluate, format, tokenize, CalcError };
});
