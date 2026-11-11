/**
 * Interface da Calculadora Web.
 * Depende de engine.js (window.CalcEngine) carregado antes deste arquivo.
 */
(function () {
  'use strict';

  const { evaluate, CalcError } = window.CalcEngine;

  const MAX_LEN = 120;
  const MAX_HISTORY = 50;
  const BINARY = ['+', '−', '×', '÷', '^'];
  const FN_SUFFIX = /(asin|acos|atan|sin|cos|tan|log|ln|abs|√)\($/;
  const STORAGE = { history: 'calc.history', theme: 'calc.theme', angle: 'calc.angle', sci: 'calc.sci' };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    expression: $('#expression'),
    result: $('#result'),
    keys: $('#keys'),
    sciKeys: $('#sci-keys'),
    btnAngle: $('#btn-angle'),
    btnSci: $('#btn-sci'),
    btnHistory: $('#btn-history'),
    btnTheme: $('#btn-theme'),
    btnClearHistory: $('#btn-clear-history'),
    historyPanel: $('#history-panel'),
    historyList: $('#history-list'),
    copy: document.querySelector('[data-action="copy"]'),
    toast: $('#toast'),
  };

  const state = {
    expr: '',
    lastExpression: '',
    lastResult: '',
    justEvaluated: false,
    angleMode: 'deg',
    history: [],
  };

  /* ---------- Armazenamento seguro (pode falhar em modo privado) ---------- */
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      /* sem persistência, o app continua funcionando */
    }
  }

  /* ---------- Utilidades ---------- */
  function toDisplay(text) {
    return text.replace(/\./g, ',').replace(/-/g, '−');
  }

  function preview(expr) {
    let s = expr;
    let prev;
    do {
      prev = s;
      s = s.replace(/[+−×÷^(]+$/, '').replace(/(asin|acos|atan|sin|cos|tan|log|ln|abs|√)$/, '');
    } while (s !== prev);
    if (!s) return '';
    try {
      return toDisplay(evaluate(s, { angleMode: state.angleMode }).formatted);
    } catch (_) {
      return '';
    }
  }

  let toastTimer;
  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1500);
  }

  /* ---------- Renderização ---------- */
  function render() {
    els.result.classList.remove('error');
    if (state.justEvaluated) {
      els.expression.textContent = state.lastExpression + ' =';
      els.result.textContent = state.expr;
    } else {
      els.expression.textContent = state.expr || '\u00A0';
      els.result.textContent = state.expr ? preview(state.expr) || '\u00A0' : '0';
    }
  }

  function showError(message) {
    els.result.textContent = message;
    els.result.classList.add('error');
    els.result.classList.remove('shake');
    void els.result.offsetWidth; // reinicia a animação
    els.result.classList.add('shake');
  }

  function renderHistory() {
    els.historyList.textContent = '';
    if (state.history.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'history-empty';
      empty.textContent = 'Nenhum cálculo ainda.';
      els.historyList.appendChild(empty);
      return;
    }
    state.history.forEach((item) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      btn.title = 'Clique para reutilizar a expressão';
      const small = document.createElement('small');
      small.textContent = item.expression;
      const strong = document.createElement('strong');
      strong.textContent = '= ' + item.result;
      btn.append(small, strong);
      btn.addEventListener('click', () => {
        state.expr = item.expression;
        state.justEvaluated = false;
        render();
      });
      li.appendChild(btn);
      els.historyList.appendChild(li);
    });
  }

  function addHistory(expression, result) {
    state.history.unshift({ expression, result });
    state.history = state.history.slice(0, MAX_HISTORY);
    save(STORAGE.history, state.history);
    renderHistory();
  }

  /* ---------- Entrada de dados ---------- */
  function insert(value) {
    if (!state.justEvaluated && state.expr.length >= MAX_LEN) return;

    const isBinary = BINARY.includes(value);
    const isPostfix = value === '%' || value === '!';

    if (state.justEvaluated) {
      state.justEvaluated = false;
      // dígito, função ou parêntese começam um novo cálculo;
      // operador continua a partir do resultado
      if (!isBinary && !isPostfix) state.expr = '';
    }

    const expr = state.expr;
    const last = expr.slice(-1);

    if (isBinary) {
      if (expr === '') {
        if (value === '−') state.expr = '−';
      } else if (last === '(') {
        if (value === '−') state.expr += value;
      } else if (BINARY.includes(last)) {
        if (value === '−' && '×÷^'.includes(last)) {
          state.expr += value; // permite 3×−2
        } else {
          const stripped = expr.replace(/[+−×÷^]+$/, '');
          if (stripped !== '') state.expr = stripped + value;
          else if (value === '−') state.expr = '−';
          else state.expr = '';
        }
      } else {
        state.expr += value;
      }
    } else if (isPostfix) {
      if (/[0-9)πe%!]$/.test(expr)) state.expr += value;
    } else if (value === ',') {
      const segment = (expr.match(/[0-9,]*$/) || [''])[0];
      if (segment === '') state.expr += '0,';
      else if (!segment.includes(',')) state.expr += ',';
    } else {
      state.expr += value;
    }

    render();
  }

  function clearAll() {
    state.expr = '';
    state.lastExpression = '';
    state.justEvaluated = false;
    render();
  }

  function backspace() {
    state.justEvaluated = false;
    state.expr = FN_SUFFIX.test(state.expr) ? state.expr.replace(FN_SUFFIX, '') : state.expr.slice(0, -1);
    render();
  }

  function equals() {
    if (!state.expr || state.justEvaluated) return;
    try {
      const { formatted } = evaluate(state.expr, { angleMode: state.angleMode });
      const display = toDisplay(formatted);
      addHistory(state.expr, display);
      state.lastExpression = state.expr;
      state.lastResult = display;
      state.expr = display;
      state.justEvaluated = true;
      render();
    } catch (err) {
      if (err instanceof CalcError) showError(err.message);
      else throw err;
    }
  }

  function insertAnswer() {
    if (state.lastResult) insert(state.lastResult);
  }

  function copyResult() {
    const text = els.result.textContent.trim();
    if (!text || els.result.classList.contains('error')) return;
    const done = () => toast('Copiado!');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => toast('Não foi possível copiar'));
    } else {
      toast('Não foi possível copiar');
    }
  }

  const actions = {
    clear: clearAll,
    backspace,
    equals,
    ans: insertAnswer,
    copy: copyResult,
  };

  /* ---------- Preferências ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    els.btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function applyAngle(mode) {
    state.angleMode = mode;
    els.btnAngle.textContent = mode.toUpperCase();
  }

  function setSci(visible) {
    els.sciKeys.hidden = !visible;
    els.btnSci.setAttribute('aria-pressed', String(visible));
  }

  function setHistoryOpen(open) {
    els.historyPanel.hidden = !open;
    els.btnHistory.setAttribute('aria-pressed', String(open));
  }

  /* ---------- Eventos ---------- */
  els.keys.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.insert) insert(btn.dataset.insert);
    else if (btn.dataset.action && actions[btn.dataset.action]) actions[btn.dataset.action]();
    // clique de mouse: remove o foco para que Enter do teclado calcule
    if (e.detail > 0) btn.blur();
  });

  els.copy.addEventListener('click', (e) => {
    copyResult();
    if (e.detail > 0) els.copy.blur();
  });

  els.btnTheme.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    save(STORAGE.theme, next);
  });

  els.btnAngle.addEventListener('click', () => {
    const next = state.angleMode === 'deg' ? 'rad' : 'deg';
    applyAngle(next);
    save(STORAGE.angle, next);
    render();
  });

  els.btnSci.addEventListener('click', () => {
    const visible = els.sciKeys.hidden;
    setSci(visible);
    save(STORAGE.sci, visible);
  });

  els.btnHistory.addEventListener('click', () => {
    setHistoryOpen(els.historyPanel.hidden);
  });

  els.btnClearHistory.addEventListener('click', () => {
    state.history = [];
    save(STORAGE.history, state.history);
    renderHistory();
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;

    if (/^[0-9]$/.test(k)) insert(k);
    else if (k === '.' || k === ',') insert(',');
    else if (k === '+') insert('+');
    else if (k === '-') insert('−');
    else if (k === '*' || k === 'x' || k === 'X') insert('×');
    else if (k === '/') insert('÷');
    else if (k === '^') insert('^');
    else if (k === '(' || k === ')') insert(k);
    else if (k === '%') insert('%');
    else if (k === '!') insert('!');
    else if (k === 'Enter' || k === '=') equals();
    else if (k === 'Backspace') backspace();
    else if (k === 'Escape' || k === 'Delete') clearAll();
    else return;

    e.preventDefault();
  });

  /* ---------- Inicialização ---------- */
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(load(STORAGE.theme, prefersDark ? 'dark' : 'light'));
  applyAngle(load(STORAGE.angle, 'deg') === 'rad' ? 'rad' : 'deg');
  setSci(load(STORAGE.sci, false) === true);
  const saved = load(STORAGE.history, []);
  state.history = Array.isArray(saved) ? saved.slice(0, MAX_HISTORY) : [];
  renderHistory();
  render();
})();
