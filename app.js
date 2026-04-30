if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ── CONSTANTS ──
const CATEGORIES = [
  { id: 'vivienda',        emoji: '🏠', name: 'Vivienda',      color: '#00d4ff' },
  { id: 'comida',          emoji: '🛒', name: 'Comida',        color: '#ff4d6d' },
  { id: 'transporte',      emoji: '🚗', name: 'Transporte',    color: '#00e5a0' },
  { id: 'salud',           emoji: '💊', name: 'Salud',         color: '#b57bee' },
  { id: 'entretenimiento', emoji: '🎬', name: 'Entret.',       color: '#ffc857' },
  { id: 'ropa',            emoji: '👕', name: 'Ropa',          color: '#f97316' },
  { id: 'servicios',       emoji: '💡', name: 'Servicios',     color: '#38bdf8' },
  { id: 'educacion',       emoji: '📚', name: 'Educación',     color: '#a78bfa' },
  { id: 'restaurantes',    emoji: '🍽️', name: 'Restaurantes', color: '#fb7185' },
  { id: 'ahorro',          emoji: '🏦', name: 'Ahorro',        color: '#00e5a0' },
  { id: 'inversiones',     emoji: '📈', name: 'Inversión',     color: '#00d4ff' },
  { id: 'otros',           emoji: '📦', name: 'Otros',         color: '#64748b' },
];

const INCOME_CATS = [
  { id: 'nomina',    emoji: '💼', name: 'Nómina',    color: '#00e5a0' },
  { id: 'freelance', emoji: '💻', name: 'Freelance', color: '#00d4ff' },
  { id: 'negocio',   emoji: '🏪', name: 'Negocio',   color: '#ffc857' },
  { id: 'otros_ing', emoji: '💵', name: 'Otros',     color: '#64748b' },
];

const INVEST_TYPES = [
  { id: 'acciones',  emoji: '📊', name: 'Acciones',  color: '#00d4ff' },
  { id: 'crypto',    emoji: '₿',  name: 'Crypto',    color: '#ffc857' },
  { id: 'fondos',    emoji: '🏛️', name: 'Fondos',   color: '#b57bee' },
  { id: 'cetes',     emoji: '🇲🇽', name: 'CETES',   color: '#00e5a0' },
  { id: 'bienes',    emoji: '🏘️', name: 'Bienes R.', color: '#f97316' },
  { id: 'otro_inv',  emoji: '💼', name: 'Otro',      color: '#64748b' },
];

const DEBT_TYPES = {
  tarjeta:  { emoji: '💳', label: 'Tarjeta de crédito' },
  credito:  { emoji: '🏦', label: 'Crédito personal' },
  hipoteca: { emoji: '🏠', label: 'Hipoteca' },
  auto:     { emoji: '🚗', label: 'Crédito auto' },
};

const EMOJIS = ['✈️','🚗','🏠','📱','💍','🎓','🏖️','🛡️','💻','🎯','🌎','👶','🐶','🎸','⚽'];

// ── STATE ──
let state = {
  transactions: [],
  goals: [],
  debts: [],
  investments: [],
  settings: { name: '', monthlyIncome: 0, budgets: {} },
  currentTab: 'overview',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  txFilter: 'todos',
  addType: 'gasto',
  selectedCat: '',
  selectedEmoji: '🎯',
  selectedDebtType: 'tarjeta',
  selectedInvestType: 'acciones',
  editingGoalId: null,
  editingDebtId: null,
  editingInvestId: null,
};

CATEGORIES.forEach(c => { if (!state.settings.budgets[c.id]) state.settings.budgets[c.id] = 0; });

// ── STORAGE ──
function save() {
  localStorage.setItem('finanzas_v2', JSON.stringify({
    transactions: state.transactions,
    goals: state.goals,
    debts: state.debts,
    investments: state.investments,
    settings: state.settings,
  }));
}

function load() {
  try {
    const raw = localStorage.getItem('finanzas_v2') || localStorage.getItem('finanzas_state');
    if (!raw) return;
    const d = JSON.parse(raw);
    state.transactions = d.transactions || [];
    state.goals = d.goals || [];
    state.debts = d.debts || [];
    state.investments = d.investments || [];
    if (d.settings) {
      state.settings = { ...state.settings, ...d.settings };
      state.settings.budgets = { ...state.settings.budgets, ...(d.settings.budgets || {}) };
    }
  } catch(e) {}
}

// ── UTILS ──
const fmt = n => '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const todayStr = () => new Date().toISOString().split('T')[0];
const monthName = (m, y) => new Date(y, m, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

function txInMonth(txs, m, y) {
  return txs.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getMonth() === m && d.getFullYear() === y;
  });
}

function calcNetWorth() {
  const income  = state.transactions.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const expense = state.transactions.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  const investValue = state.investments.reduce((s,i) => s + i.currentValue, 0);
  const totalDebt = state.debts.reduce((s,d) => s + d.remaining, 0);
  return (income - expense) + investValue - totalDebt;
}

function calcScore() {
  const txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const income  = txs.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  let score = 50;
  if (income > 0) {
    const sr = (income - expense) / income;
    if (sr >= 0.2) score += 20; else if (sr >= 0.1) score += 10; else if (sr < 0) score -= 20;
  }
  CATEGORIES.forEach(c => {
    const b = state.settings.budgets[c.id];
    if (b > 0) {
      const spent = txs.filter(t => t.type === 'gasto' && t.category === c.id).reduce((s,t) => s + t.amount, 0);
      if (spent > b) score -= 8;
    }
  });
  if (state.goals.length > 0) score += 5;
  if (state.investments.length > 0) score += 10;
  const highRateDebt = state.debts.filter(d => d.rate > 30);
  score -= highRateDebt.length * 5;
  return Math.max(10, Math.min(100, Math.round(score)));
}

function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ── HEADER ──
function renderHeader() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const name = state.settings.name;
  document.getElementById('greeting').textContent = name ? `${greet}, ${name} 👋` : `${greet} 👋`;
  document.getElementById('header-date').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  const nw = calcNetWorth();
  const nwEl = document.getElementById('net-worth');
  nwEl.textContent = fmt(nw);
  nwEl.style.color = nw >= 0 ? 'var(--green)' : 'var(--red)';

  const prevM = state.currentMonth === 0 ? 11 : state.currentMonth - 1;
  const prevY = state.currentMonth === 0 ? state.currentYear - 1 : state.currentYear;
  const prevTxs = txInMonth(state.transactions, prevM, prevY);
  const prevNet = prevTxs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+t.amount,0) - prevTxs.filter(t=>t.type==='gasto').reduce((s,t)=>s+t.amount,0);
  const curTxs  = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const curNet  = curTxs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+t.amount,0) - curTxs.filter(t=>t.type==='gasto').reduce((s,t)=>s+t.amount,0);
  const delta = curNet - prevNet;
  const deltaEl = document.getElementById('nw-delta');
  deltaEl.textContent = delta !== 0 ? `${delta>0?'▲':'▼'} ${fmt(Math.abs(delta))} vs mes anterior` : 'Primer mes registrado';
  deltaEl.className = 'nw-delta ' + (delta > 0 ? 'positive' : delta < 0 ? 'negative' : '');
}

// ── TABS ──
function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  closeMoreMenu();
  renderTab();
}

function renderTab() {
  const content = document.getElementById('tab-content');
  content.innerHTML = '';
  content.classList.remove('tab-enter');
  void content.offsetWidth;
  content.classList.add('tab-enter');
  const map = { overview: renderOverview, transactions: renderTransactions, budget: renderBudget, goals: renderGoals, debts: renderDebts, investments: renderInvestments };
  (map[state.currentTab] || renderOverview)(content);
}

function monthNav(container) {
  const el = document.createElement('div');
  el.className = 'month-selector';
  el.innerHTML = `<button class="month-nav" id="btn-prev-month">‹</button><div class="month-label">${monthName(state.currentMonth, state.currentYear)}</div><button class="month-nav" id="btn-next-month">›</button>`;
  container.appendChild(el);
  document.getElementById('btn-prev-month').addEventListener('click', () => {
    if (state.currentMonth === 0) { state.currentMonth = 11; state.currentYear--; } else state.currentMonth--;
    renderTab(); renderHeader();
  });
  document.getElementById('btn-next-month').addEventListener('click', () => {
    const now = new Date();
    if (state.currentYear < now.getFullYear() || (state.currentYear === now.getFullYear() && state.currentMonth < now.getMonth())) {
      if (state.currentMonth === 11) { state.currentMonth = 0; state.currentYear++; } else state.currentMonth++;
      renderTab(); renderHeader();
    }
  });
}

// ── OVERVIEW ──
function renderOverview(container) {
  const txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const income  = txs.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  const net = income - expense;
  const savingRate = income > 0 ? Math.round((net / income) * 100) : 0;
  const score = calcScore();
  const totalDebt = state.debts.reduce((s,d) => s + d.remaining, 0);
  const totalInvest = state.investments.reduce((s,i) => s + i.currentValue, 0);

  monthNav(container);

  const kpiGrid = document.createElement('div');
  kpiGrid.className = 'kpi-grid';
  kpiGrid.innerHTML = `
    <div class="kpi-card green"><div class="kpi-label">Ingresos</div><div class="kpi-value" style="color:var(--green)">${fmt(income)}</div><div class="kpi-sub">Este mes</div></div>
    <div class="kpi-card red"><div class="kpi-label">Gastos</div><div class="kpi-value" style="color:var(--red)">${fmt(expense)}</div><div class="kpi-sub">Este mes</div></div>
    <div class="kpi-card accent"><div class="kpi-label">Ahorro neto</div><div class="kpi-value" style="color:${net>=0?'var(--accent)':'var(--red)'}">${fmt(net)}</div><div class="kpi-sub">${savingRate}% tasa</div></div>
    <div class="kpi-card purple"><div class="kpi-label">Inversiones</div><div class="kpi-value" style="color:var(--purple)">${fmt(totalInvest)}</div><div class="kpi-sub">${state.investments.length} posiciones</div></div>
  `;
  container.appendChild(kpiGrid);

  // Debt + Score row
  const row2 = document.createElement('div');
  row2.className = 'kpi-grid';
  const scoreColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';
  row2.innerHTML = `
    <div class="kpi-card red" style="border-color:rgba(255,77,109,0.2)">
      <div class="kpi-label">Deuda total</div>
      <div class="kpi-value" style="color:var(--red)">${fmt(totalDebt)}</div>
      <div class="kpi-sub">${state.debts.length} deudas activas</div>
    </div>
    <div class="kpi-card" style="border-color:${scoreColor}33">
      <div class="kpi-label">Score</div>
      <div class="kpi-value" style="color:${scoreColor}">${score}<span style="font-size:12px;color:var(--muted)">/100</span></div>
      <div class="kpi-sub">${score>=75?'Excelente':score>=50?'Moderado':'Atención'}</div>
    </div>
  `;
  container.appendChild(row2);

  // Mini chart
  const chartCard = document.createElement('div');
  chartCard.className = 'card';
  const months = [];
  for (let i = 4; i >= 0; i--) {
    let m = state.currentMonth - i, y = state.currentYear;
    if (m < 0) { m += 12; y--; }
    const t = txInMonth(state.transactions, m, y);
    months.push({
      label: new Date(y, m, 1).toLocaleDateString('es-MX', { month: 'short' }),
      income: t.filter(x => x.type === 'ingreso').reduce((s,x) => s + x.amount, 0),
      expense: t.filter(x => x.type === 'gasto').reduce((s,x) => s + x.amount, 0),
    });
  }
  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);
  chartCard.innerHTML = `
    <div class="card-title">Flujo 5 meses</div>
    <div class="mini-chart">
      ${months.map(m => `
        <div class="mini-bar-wrap">
          <div class="mini-bar" style="height:${(m.income/maxVal)*52}px;background:var(--green);opacity:0.85"></div>
          <div class="mini-bar" style="height:${(m.expense/maxVal)*52}px;background:var(--red);opacity:0.85;margin-top:2px"></div>
          <div class="mini-bar-label">${m.label}</div>
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:14px;margin-top:8px">
      <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)"><span style="width:8px;height:8px;background:var(--green);border-radius:2px;display:inline-block"></span>Ingresos</div>
      <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)"><span style="width:8px;height:8px;background:var(--red);border-radius:2px;display:inline-block"></span>Gastos</div>
    </div>
  `;
  container.appendChild(chartCard);

  // Recent transactions
  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  const recent = [...state.transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0, 5);
  recentCard.innerHTML = `
    <div class="section-header">
      <div class="section-title">Recientes</div>
      <button class="section-action" id="btn-see-all">Ver todos →</button>
    </div>
    ${recent.length === 0
      ? `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Sin movimientos aún.<br>Toca + para agregar.</div></div>`
      : recent.map(t => renderTxItem(t)).join('')}
  `;
  container.appendChild(recentCard);

  // Recommendations
  const recs = getRecommendations(txs, income, expense, savingRate);
  if (recs.length > 0) {
    const recCard = document.createElement('div');
    recCard.className = 'card';
    recCard.innerHTML = `<div class="card-title">💡 Recomendaciones</div>${recs.map(r => `<div class="rec-item"><div class="rec-icon">${r.icon}</div><div class="rec-text">${r.text}</div></div>`).join('')}`;
    container.appendChild(recCard);
  }

  document.getElementById('btn-see-all')?.addEventListener('click', () => switchTab('transactions'));
}

function getRecommendations(txs, income, expense, savingRate) {
  const recs = [];
  if (income === 0) { recs.push({ icon: '💼', text: 'Registra tus ingresos para activar el análisis.' }); return recs; }
  if (savingRate < 0) recs.push({ icon: '🚨', text: 'Tus gastos superan tus ingresos. Revisa el presupuesto.' });
  else if (savingRate >= 20) recs.push({ icon: '✅', text: `Ahorras el ${savingRate}% de tus ingresos. ¡Excelente!` });

  const highDebt = state.debts.filter(d => d.rate > 30);
  if (highDebt.length > 0) recs.push({ icon: '💳', text: `Tienes ${highDebt.length} deuda(s) con tasa >30%. Priorizalas para ahorrar en intereses.` });

  if (state.investments.length === 0) recs.push({ icon: '📈', text: 'Aún no registras inversiones. Diversifica tu patrimonio.' });

  CATEGORIES.forEach(c => {
    const b = state.settings.budgets[c.id];
    if (b > 0) {
      const spent = txs.filter(t => t.type === 'gasto' && t.category === c.id).reduce((s,t) => s + t.amount, 0);
      if (spent > b) recs.push({ icon: '📊', text: `${c.emoji} ${c.name} excedió el presupuesto en ${fmt(spent - b)}.` });
    }
  });

  return recs.slice(0, 4);
}

// ── TRANSACTIONS ──
function renderTransactions(container) {
  monthNav(container);

  const chips = document.createElement('div');
  chips.className = 'filter-chips';
  chips.innerHTML = ['todos','ingresos','gastos'].map(f => {
    const l = { todos:'🗂 Todos', ingresos:'💰 Ingresos', gastos:'💸 Gastos' };
    return `<div class="chip ${state.txFilter===f?'active':''}" data-filter="${f}">${l[f]}</div>`;
  }).join('') + CATEGORIES.map(c => `<div class="chip ${state.txFilter===c.id?'active':''}" data-filter="${c.id}">${c.emoji} ${c.name}</div>`).join('');
  container.appendChild(chips);

  let txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  if (state.txFilter === 'ingresos') txs = txs.filter(t => t.type === 'ingreso');
  else if (state.txFilter === 'gastos') txs = txs.filter(t => t.type === 'gasto');
  else if (state.txFilter !== 'todos') txs = txs.filter(t => t.category === state.txFilter);
  txs = [...txs].sort((a,b) => new Date(b.date)-new Date(a.date));

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = txs.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Sin movimientos aquí.</div></div>`
    : txs.map(t => renderTxItem(t, true)).join('');
  container.appendChild(card);

  chips.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { state.txFilter = c.dataset.filter; renderTab(); }));
  card.querySelectorAll('.tx-delete').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('¿Eliminar?')) { state.transactions = state.transactions.filter(t => t.id !== btn.dataset.id); save(); renderTab(); renderHeader(); toast('Eliminado'); }
  }));
}

function renderTxItem(t, showDelete = false) {
  const list = t.type === 'ingreso' ? INCOME_CATS : CATEGORIES;
  const cat = list.find(c => c.id === t.category) || { emoji: '📦', name: t.category };
  const d = new Date(t.date + 'T12:00:00');
  return `<div class="tx-item fade-in">
    <div class="tx-icon" style="background:${t.type==='ingreso'?'var(--green-dim)':'var(--red-dim)'}">${cat.emoji}</div>
    <div class="tx-info">
      <div class="tx-desc">${t.desc || cat.name}</div>
      <div class="tx-meta">${cat.name} · ${d.toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</div>
    </div>
    <div class="tx-amount ${t.type==='ingreso'?'income':'expense'}">${t.type==='ingreso'?'+':'-'}${fmt(t.amount)}</div>
    ${showDelete ? `<button class="tx-delete" data-id="${t.id}">🗑</button>` : ''}
  </div>`;
}

// ── BUDGET ──
function renderBudget(container) {
  monthNav(container);
  const txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const totalIncome  = txs.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const totalExpense = txs.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  const expected = state.settings.monthlyIncome;

  const summary = document.createElement('div');
  summary.className = 'card';
  summary.innerHTML = `
    <div class="card-title">Resumen del mes</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:10px">
      <div><div style="font-size:11px;color:var(--muted);margin-bottom:2px">Ingresos reales</div><div style="font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--green)">${fmt(totalIncome)}</div></div>
      <div style="text-align:right"><div style="font-size:11px;color:var(--muted);margin-bottom:2px">Total gastado</div><div style="font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--red)">${fmt(totalExpense)}</div></div>
    </div>
    ${expected > 0 ? `
      <div style="background:var(--border);border-radius:99px;height:6px;margin-bottom:4px">
        <div style="width:${Math.min((totalExpense/expected)*100,100)}%;background:${totalExpense>expected?'var(--red)':'var(--accent)'};border-radius:99px;height:100%;transition:width 0.8s"></div>
      </div>
      <div style="font-size:11px;color:var(--muted)">${Math.round((totalExpense/expected)*100)}% del ingreso esperado usado</div>
    ` : `<div style="font-size:12px;color:var(--muted)">Configura tu ingreso en ⚙️ para ver el análisis.</div>`}
  `;
  container.appendChild(summary);

  const catCard = document.createElement('div');
  catCard.className = 'card';
  catCard.innerHTML = '<div class="card-title">Por categoría</div>';
  let hasData = false;
  CATEGORIES.forEach(cat => {
    const budget = state.settings.budgets[cat.id] || 0;
    const spent  = txs.filter(t => t.type==='gasto' && t.category===cat.id).reduce((s,t) => s+t.amount, 0);
    if (spent === 0 && budget === 0) return;
    hasData = true;
    const pct  = budget > 0 ? Math.min((spent/budget)*100, 100) : 100;
    const over = budget > 0 && spent > budget;
    const barColor = over ? 'var(--red)' : pct > 80 ? 'var(--yellow)' : 'var(--accent)';
    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div class="budget-header">
        <div class="budget-name">${cat.emoji} ${cat.name} ${over?'<span class="over-tag">EXCEDIDO</span>':''}</div>
        <div class="budget-amounts">${fmt(spent)}${budget>0?' / '+fmt(budget):''}</div>
      </div>
      <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
      ${over?`<div class="budget-warning">Excediste por ${fmt(spent-budget)}</div>`:''}
    `;
    catCard.appendChild(item);
  });
  if (!hasData) catCard.innerHTML += `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Sin gastos aún.<br>Configura presupuestos en ⚙️</div></div>`;
  container.appendChild(catCard);
}

// ── GOALS ──
function renderGoals(container) {
  container.innerHTML = `<div class="section-header"><div class="section-title">Mis Metas</div></div>`;
  if (state.goals.length === 0) {
    container.innerHTML += `<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-text">Sin metas aún.<br>Crea una para ahorrar con propósito.</div></div>`;
  } else {
    state.goals.forEach(g => {
      const pct = Math.min(Math.round((g.current/g.target)*100), 100);
      const remaining = Math.max(g.target - g.current, 0);
      const monthly = state.settings.monthlyIncome * 0.2;
      const eta = monthly > 0 ? Math.ceil(remaining/monthly) : null;
      const card = document.createElement('div');
      card.className = 'goal-card';
      card.innerHTML = `
        <div class="goal-header">
          <div><div class="goal-emoji">${g.emoji}</div><div class="goal-name">${g.name}</div>
          <div class="goal-eta">${remaining===0?'🎉 ¡Meta alcanzada!':eta?`~${eta} meses restantes`:'Configura ingreso para ETA'}</div></div>
          <div class="goal-pct">${pct}%</div>
        </div>
        <div class="goal-bar-bg"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
        <div class="goal-amounts">
          <span style="color:var(--green);font-family:'JetBrains Mono',monospace;font-size:13px">${fmt(g.current)}</span>
          <span style="color:var(--muted);font-size:12px">Meta: <strong style="color:var(--text);font-family:'JetBrains Mono',monospace">${fmt(g.target)}</strong></span>
        </div>
        <div class="goal-actions">
          <button class="btn-sm" data-goal-add="${g.id}">+ Agregar</button>
          <button class="btn-sm" data-goal-edit="${g.id}">Editar</button>
          <button class="btn-sm danger" data-goal-del="${g.id}">Eliminar</button>
        </div>
      `;
      container.appendChild(card);
    });
  }
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-goal';
  addBtn.textContent = '+ Nueva meta de ahorro';
  container.appendChild(addBtn);
  addBtn.addEventListener('click', () => { state.editingGoalId = null; openGoalModal(); });
  container.querySelectorAll('[data-goal-del]').forEach(b => b.addEventListener('click', () => {
    if (confirm('¿Eliminar meta?')) { state.goals = state.goals.filter(g => g.id !== b.dataset.goalDel); save(); renderTab(); toast('Meta eliminada'); }
  }));
  container.querySelectorAll('[data-goal-edit]').forEach(b => b.addEventListener('click', () => { state.editingGoalId = b.dataset.goalEdit; openGoalModal(); }));
  container.querySelectorAll('[data-goal-add]').forEach(b => b.addEventListener('click', () => {
    const g = state.goals.find(x => x.id === b.dataset.goalAdd);
    if (!g) return;
    const a = parseFloat(prompt(`¿Cuánto agregas a "${g.name}"?`));
    if (!isNaN(a) && a > 0) { g.current = Math.min(g.current + a, g.target); save(); renderTab(); toast(`${fmt(a)} agregados`); }
  }));
}

// ── DEBTS ──
function renderDebts(container) {
  const totalRemaining = state.debts.reduce((s,d) => s + d.remaining, 0);
  const totalMonthly   = state.debts.reduce((s,d) => s + d.monthly, 0);
  const avgRate = state.debts.length > 0 ? (state.debts.reduce((s,d) => s + d.rate, 0) / state.debts.length).toFixed(1) : 0;

  const summary = document.createElement('div');
  summary.className = 'kpi-grid';
  summary.innerHTML = `
    <div class="kpi-card red"><div class="kpi-label">Deuda total</div><div class="kpi-value" style="color:var(--red)">${fmt(totalRemaining)}</div><div class="kpi-sub">${state.debts.length} deudas</div></div>
    <div class="kpi-card"><div class="kpi-label">Pago mensual</div><div class="kpi-value" style="color:var(--yellow)">${fmt(totalMonthly)}</div><div class="kpi-sub">suma mensual</div></div>
  `;
  container.appendChild(summary);

  if (state.debts.length > 0) {
    const tip = document.createElement('div');
    tip.className = 'card';
    const highRate = [...state.debts].sort((a,b) => b.rate - a.rate)[0];
    tip.innerHTML = `
      <div class="card-title">💡 Estrategia recomendada</div>
      <div class="rec-item">
        <div class="rec-icon">🎯</div>
        <div class="rec-text"><strong>Método avalancha:</strong> Paga primero <strong>${highRate.name}</strong> (${highRate.rate}% tasa). Ahorrarás más en intereses a largo plazo.</div>
      </div>
      <div class="rec-item">
        <div class="rec-icon">📊</div>
        <div class="rec-text">Tasa promedio de tus deudas: <strong style="color:var(--yellow)">${avgRate}%</strong> anual</div>
      </div>
    `;
    container.appendChild(tip);
  }

  const listCard = document.createElement('div');
  listCard.className = 'card';
  listCard.innerHTML = '<div class="section-header"><div class="section-title">Mis Deudas</div></div>';

  if (state.debts.length === 0) {
    listCard.innerHTML += `<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">Sin deudas registradas.<br>¡O agrega una para darle seguimiento!</div></div>`;
  } else {
    state.debts.forEach(d => {
      const paidPct = Math.round(((d.total - d.remaining) / d.total) * 100);
      const monthsLeft = d.monthly > 0 ? Math.ceil(d.remaining / d.monthly) : null;
      const dtype = DEBT_TYPES[d.type] || { emoji: '💳', label: d.type };
      const item = document.createElement('div');
      item.className = 'debt-item';
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-size:15px;font-weight:700">${dtype.emoji} ${d.name}</div>
            <div style="font-size:11px;color:var(--muted)">${dtype.label} · ${d.rate}% anual</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:var(--red);font-weight:700">${fmt(d.remaining)}</div>
            <div style="font-size:11px;color:var(--muted)">-${fmt(d.monthly)}/mes</div>
          </div>
        </div>
        <div style="background:var(--border);border-radius:99px;height:7px;margin-bottom:5px">
          <div style="width:${paidPct}%;background:linear-gradient(90deg,var(--green),var(--accent));border-radius:99px;height:100%;transition:width 0.8s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:var(--muted)">${paidPct}% pagado de ${fmt(d.total)}</span>
          <span style="font-size:11px;color:var(--muted)">${monthsLeft ? `~${monthsLeft} meses` : ''}</span>
        </div>
        <div class="goal-actions" style="margin-top:10px">
          <button class="btn-sm" data-debt-pay="${d.id}">Registrar pago</button>
          <button class="btn-sm" data-debt-edit="${d.id}">Editar</button>
          <button class="btn-sm danger" data-debt-del="${d.id}">Eliminar</button>
        </div>
      `;
      listCard.appendChild(item);
    });
  }

  container.appendChild(listCard);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-goal';
  addBtn.textContent = '+ Agregar deuda';
  container.appendChild(addBtn);
  addBtn.addEventListener('click', () => { state.editingDebtId = null; openDebtModal(); });

  container.querySelectorAll('[data-debt-del]').forEach(b => b.addEventListener('click', () => {
    if (confirm('¿Eliminar deuda?')) { state.debts = state.debts.filter(d => d.id !== b.dataset.debtDel); save(); renderTab(); renderHeader(); toast('Deuda eliminada'); }
  }));
  container.querySelectorAll('[data-debt-edit]').forEach(b => b.addEventListener('click', () => {
    state.editingDebtId = b.dataset.debtEdit; openDebtModal();
  }));
  container.querySelectorAll('[data-debt-pay]').forEach(b => b.addEventListener('click', () => {
    const debt = state.debts.find(d => d.id === b.dataset.debtPay);
    if (!debt) return;
    const a = parseFloat(prompt(`¿Cuánto pagaste a "${debt.name}"? (pago: ${fmt(debt.monthly)})`));
    if (!isNaN(a) && a > 0) {
      debt.remaining = Math.max(debt.remaining - a, 0);
      save(); renderTab(); renderHeader(); toast(`${fmt(a)} registrado en ${debt.name}`);
    }
  }));
}

// ── INVESTMENTS ──
function renderInvestments(container) {
  const totalCost  = state.investments.reduce((s,i) => s + i.cost, 0);
  const totalValue = state.investments.reduce((s,i) => s + i.currentValue, 0);
  const totalGain  = totalValue - totalCost;
  const gainPct    = totalCost > 0 ? ((totalGain/totalCost)*100).toFixed(1) : 0;

  const summary = document.createElement('div');
  summary.className = 'kpi-grid';
  summary.innerHTML = `
    <div class="kpi-card accent"><div class="kpi-label">Valor actual</div><div class="kpi-value" style="color:var(--accent)">${fmt(totalValue)}</div><div class="kpi-sub">${state.investments.length} posiciones</div></div>
    <div class="kpi-card ${totalGain>=0?'green':'red'}"><div class="kpi-label">Ganancia/Pérdida</div><div class="kpi-value" style="color:${totalGain>=0?'var(--green)':'var(--red)'}">${totalGain>=0?'+':''}${fmt(totalGain)}</div><div class="kpi-sub">${gainPct}% total</div></div>
  `;
  container.appendChild(summary);

  // Distribution by type
  if (state.investments.length > 0) {
    const byType = {};
    INVEST_TYPES.forEach(t => { byType[t.id] = 0; });
    state.investments.forEach(i => { byType[i.type] = (byType[i.type] || 0) + i.currentValue; });
    const distCard = document.createElement('div');
    distCard.className = 'card';
    distCard.innerHTML = '<div class="card-title">Distribución del portafolio</div>';
    INVEST_TYPES.forEach(t => {
      if (!byType[t.id]) return;
      const pct = totalValue > 0 ? Math.round((byType[t.id]/totalValue)*100) : 0;
      const item = document.createElement('div');
      item.style.cssText = 'margin-bottom:12px';
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:13px;font-weight:600">${t.emoji} ${t.name}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted2)">${fmt(byType[t.id])} · ${pct}%</span>
        </div>
        <div style="background:var(--border);border-radius:99px;height:6px">
          <div style="width:${pct}%;background:${t.color};border-radius:99px;height:100%;transition:width 0.8s;box-shadow:0 0 6px ${t.color}44"></div>
        </div>
      `;
      distCard.appendChild(item);
    });
    container.appendChild(distCard);
  }

  // List
  const listCard = document.createElement('div');
  listCard.className = 'card';
  listCard.innerHTML = '<div class="section-header"><div class="section-title">Mis Posiciones</div></div>';

  if (state.investments.length === 0) {
    listCard.innerHTML += `<div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-text">Sin inversiones registradas.<br>Agrega acciones, crypto, fondos, etc.</div></div>`;
  } else {
    [...state.investments].sort((a,b) => b.currentValue - a.currentValue).forEach(inv => {
      const itype = INVEST_TYPES.find(t => t.id === inv.type) || { emoji: '💼', name: inv.type, color: '#64748b' };
      const gain  = inv.currentValue - inv.cost;
      const gainP = inv.cost > 0 ? ((gain/inv.cost)*100).toFixed(1) : 0;
      const item  = document.createElement('div');
      item.className = 'tx-item';
      item.innerHTML = `
        <div class="tx-icon" style="background:${itype.color}22;font-size:18px">${itype.emoji}</div>
        <div class="tx-info">
          <div class="tx-desc">${inv.name}</div>
          <div class="tx-meta">${itype.name}${inv.notes ? ' · ' + inv.notes : ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--accent)">${fmt(inv.currentValue)}</div>
          <div style="font-size:11px;color:${gain>=0?'var(--green)':'var(--red)'}">${gain>=0?'+':''}${fmt(gain)} (${gainP}%)</div>
        </div>
        <button class="tx-delete" data-inv-del="${inv.id}">🗑</button>
      `;
      listCard.appendChild(item);
    });

    // Edit buttons
    listCard.querySelectorAll('.tx-item').forEach((item, idx) => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('tx-delete')) return;
        state.editingInvestId = [...state.investments].sort((a,b) => b.currentValue - a.currentValue)[idx].id;
        openInvestModal();
      });
    });
  }

  container.appendChild(listCard);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-goal';
  addBtn.textContent = '+ Agregar inversión';
  container.appendChild(addBtn);
  addBtn.addEventListener('click', () => { state.editingInvestId = null; openInvestModal(); });

  listCard.querySelectorAll('[data-inv-del]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('¿Eliminar inversión?')) { state.investments = state.investments.filter(i => i.id !== b.dataset.invDel); save(); renderTab(); renderHeader(); toast('Inversión eliminada'); }
  }));
}

// ── MODAL: ADD TRANSACTION ──
function openAddModal(type = 'gasto') {
  state.addType = type; state.selectedCat = '';
  document.getElementById('modal-add').classList.remove('hidden');
  document.getElementById('inp-amount').value = '';
  document.getElementById('inp-desc').value = '';
  document.getElementById('inp-date').value = todayStr();
  renderCategoryGrid(); updateTypeToggle();
}

function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  const cats = state.addType === 'ingreso' ? INCOME_CATS : CATEGORIES;
  grid.innerHTML = cats.map(c => `<button class="cat-btn ${state.selectedCat===c.id?'selected':''}" data-cat="${c.id}"><span class="cat-btn-emoji">${c.emoji}</span><span class="cat-btn-name">${c.name}</span></button>`).join('');
  grid.querySelectorAll('.cat-btn').forEach(b => b.addEventListener('click', () => { state.selectedCat = b.dataset.cat; renderCategoryGrid(); }));
}

function updateTypeToggle() {
  document.querySelectorAll('.type-btn[data-type]').forEach(b => b.classList.toggle('active', b.dataset.type === state.addType));
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('inp-amount').value);
  const desc   = document.getElementById('inp-desc').value.trim();
  const date   = document.getElementById('inp-date').value;
  if (!amount || amount <= 0) { toast('Monto inválido'); return; }
  if (!state.selectedCat) { toast('Selecciona categoría'); return; }
  if (!date) { toast('Selecciona fecha'); return; }
  state.transactions.push({ id: uid(), type: state.addType, amount, desc, category: state.selectedCat, date });
  save(); closeModal('modal-add'); renderTab(); renderHeader();
  toast(`${state.addType === 'ingreso' ? 'Ingreso' : 'Gasto'} registrado ✓`);
}

// ── MODAL: DEBT ──
function openDebtModal() {
  const modal = document.getElementById('modal-debt');
  modal.classList.remove('hidden');
  const d = state.editingDebtId ? state.debts.find(x => x.id === state.editingDebtId) : null;
  document.getElementById('debt-modal-title').textContent = d ? 'Editar Deuda' : 'Nueva Deuda';
  document.getElementById('inp-debt-name').value      = d ? d.name : '';
  document.getElementById('inp-debt-total').value     = d ? d.total : '';
  document.getElementById('inp-debt-remaining').value = d ? d.remaining : '';
  document.getElementById('inp-debt-monthly').value   = d ? d.monthly : '';
  document.getElementById('inp-debt-rate').value      = d ? d.rate : '';
  state.selectedDebtType = d ? d.type : 'tarjeta';
  document.querySelectorAll('[data-dtype]').forEach(b => b.classList.toggle('active', b.dataset.dtype === state.selectedDebtType));
}

function saveDebt() {
  const name      = document.getElementById('inp-debt-name').value.trim();
  const total     = parseFloat(document.getElementById('inp-debt-total').value) || 0;
  const remaining = parseFloat(document.getElementById('inp-debt-remaining').value) || 0;
  const monthly   = parseFloat(document.getElementById('inp-debt-monthly').value) || 0;
  const rate      = parseFloat(document.getElementById('inp-debt-rate').value) || 0;
  if (!name) { toast('Ingresa un nombre'); return; }
  if (total <= 0) { toast('Ingresa el saldo total'); return; }
  const data = { name, type: state.selectedDebtType, total, remaining, monthly, rate };
  if (state.editingDebtId) {
    const i = state.debts.findIndex(d => d.id === state.editingDebtId);
    if (i >= 0) state.debts[i] = { ...state.debts[i], ...data };
  } else {
    state.debts.push({ id: uid(), ...data });
  }
  save(); closeModal('modal-debt'); renderTab(); renderHeader(); toast('Deuda guardada ✓');
}

// ── MODAL: INVESTMENT ──
function openInvestModal() {
  document.getElementById('modal-invest').classList.remove('hidden');
  const inv = state.editingInvestId ? state.investments.find(x => x.id === state.editingInvestId) : null;
  document.getElementById('invest-modal-title').textContent = inv ? 'Editar Inversión' : 'Nueva Inversión';
  document.getElementById('inp-invest-name').value  = inv ? inv.name : '';
  document.getElementById('inp-invest-cost').value  = inv ? inv.cost : '';
  document.getElementById('inp-invest-value').value = inv ? inv.currentValue : '';
  document.getElementById('inp-invest-notes').value = inv ? (inv.notes || '') : '';
  state.selectedInvestType = inv ? inv.type : 'acciones';
  renderInvestTypeGrid();
}

function renderInvestTypeGrid() {
  const grid = document.getElementById('invest-type-grid');
  grid.innerHTML = INVEST_TYPES.map(t => `
    <button class="cat-btn ${state.selectedInvestType===t.id?'selected':''}" data-itype="${t.id}">
      <span class="cat-btn-emoji">${t.emoji}</span>
      <span class="cat-btn-name">${t.name}</span>
    </button>`).join('');
  grid.querySelectorAll('[data-itype]').forEach(b => b.addEventListener('click', () => { state.selectedInvestType = b.dataset.itype; renderInvestTypeGrid(); }));
}

function saveInvestment() {
  const name  = document.getElementById('inp-invest-name').value.trim();
  const cost  = parseFloat(document.getElementById('inp-invest-cost').value) || 0;
  const value = parseFloat(document.getElementById('inp-invest-value').value) || 0;
  const notes = document.getElementById('inp-invest-notes').value.trim();
  if (!name) { toast('Ingresa un nombre'); return; }
  if (cost <= 0) { toast('Ingresa el valor invertido'); return; }
  const data = { name, type: state.selectedInvestType, cost, currentValue: value || cost, notes };
  if (state.editingInvestId) {
    const i = state.investments.findIndex(x => x.id === state.editingInvestId);
    if (i >= 0) state.investments[i] = { ...state.investments[i], ...data };
  } else {
    state.investments.push({ id: uid(), ...data });
  }
  save(); closeModal('modal-invest'); renderTab(); renderHeader(); toast('Inversión guardada ✓');
}

// ── MODAL: GOAL ──
function openGoalModal() {
  document.getElementById('modal-goal').classList.remove('hidden');
  state.selectedEmoji = '🎯';
  const g = state.editingGoalId ? state.goals.find(x => x.id === state.editingGoalId) : null;
  document.getElementById('inp-goal-name').value    = g ? g.name : '';
  document.getElementById('inp-goal-target').value  = g ? g.target : '';
  document.getElementById('inp-goal-current').value = g ? g.current : '';
  if (g) state.selectedEmoji = g.emoji;
  const eg = document.getElementById('emoji-grid');
  eg.innerHTML = EMOJIS.map(e => `<div class="emoji-opt ${state.selectedEmoji===e?'selected':''}" data-emoji="${e}">${e}</div>`).join('');
  eg.querySelectorAll('.emoji-opt').forEach(el => el.addEventListener('click', () => {
    state.selectedEmoji = el.dataset.emoji;
    eg.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('selected'));
    el.classList.add('selected');
  }));
}

function saveGoal() {
  const name    = document.getElementById('inp-goal-name').value.trim();
  const target  = parseFloat(document.getElementById('inp-goal-target').value);
  const current = parseFloat(document.getElementById('inp-goal-current').value) || 0;
  if (!name) { toast('Ingresa un nombre'); return; }
  if (!target || target <= 0) { toast('Ingresa el monto objetivo'); return; }
  if (state.editingGoalId) {
    const g = state.goals.find(x => x.id === state.editingGoalId);
    if (g) Object.assign(g, { name, target, current, emoji: state.selectedEmoji });
  } else {
    state.goals.push({ id: uid(), name, target, current, emoji: state.selectedEmoji });
  }
  save(); closeModal('modal-goal'); renderTab(); toast('Meta guardada ✓');
}

// ── MODAL: SETTINGS ──
function openSettings() {
  document.getElementById('modal-settings').classList.remove('hidden');
  document.getElementById('inp-name').value   = state.settings.name;
  document.getElementById('inp-income').value = state.settings.monthlyIncome || '';
  document.getElementById('budget-inputs').innerHTML = CATEGORIES.map(c => `
    <div class="budget-inp-row">
      <div class="budget-inp-label">${c.emoji} ${c.name}</div>
      <input type="number" inputmode="decimal" placeholder="0" value="${state.settings.budgets[c.id]||''}" data-budget="${c.id}" />
    </div>`).join('');
}

function saveSettings() {
  state.settings.name = document.getElementById('inp-name').value.trim();
  state.settings.monthlyIncome = parseFloat(document.getElementById('inp-income').value) || 0;
  document.querySelectorAll('[data-budget]').forEach(inp => { state.settings.budgets[inp.dataset.budget] = parseFloat(inp.value) || 0; });
  save(); closeModal('modal-settings'); renderHeader(); renderTab(); toast('Configuración guardada ✓');
}

// ── MORE MENU ──
function openMoreMenu() {
  document.getElementById('more-menu').classList.remove('hidden');
  document.querySelector('.nav-btn[data-tab="more"]').classList.add('active');
}
function closeMoreMenu() {
  document.getElementById('more-menu').classList.add('hidden');
}

// ── CLOSE MODAL ──
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ── INIT ──
function init() {
  load();

  // Toast
  const toastEl = document.createElement('div');
  toastEl.id = 'toast';
  document.body.appendChild(toastEl);

  setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      document.getElementById('main').classList.remove('hidden');
      renderHeader(); renderTab();
    }, 400);
  }, 900);

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === 'add') { openAddModal('gasto'); return; }
      if (tab === 'more') { openMoreMenu(); return; }
      switchTab(tab);
    });
  });

  // More menu items
  document.querySelectorAll('.more-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });
  document.getElementById('more-backdrop').addEventListener('click', closeMoreMenu);

  // Transaction modal
  document.querySelectorAll('.type-btn[data-type]').forEach(b => b.addEventListener('click', () => {
    state.addType = b.dataset.type; state.selectedCat = ''; updateTypeToggle(); renderCategoryGrid();
  }));
  document.getElementById('btn-save-tx').addEventListener('click', saveTransaction);
  document.getElementById('btn-cancel-tx').addEventListener('click', () => closeModal('modal-add'));
  document.getElementById('modal-backdrop').addEventListener('click', () => closeModal('modal-add'));

  // Debt modal
  document.getElementById('btn-save-debt').addEventListener('click', saveDebt);
  document.getElementById('btn-cancel-debt').addEventListener('click', () => closeModal('modal-debt'));
  document.getElementById('debt-backdrop').addEventListener('click', () => closeModal('modal-debt'));
  document.querySelectorAll('[data-dtype]').forEach(b => b.addEventListener('click', () => {
    state.selectedDebtType = b.dataset.dtype;
    document.querySelectorAll('[data-dtype]').forEach(x => x.classList.toggle('active', x.dataset.dtype === state.selectedDebtType));
  }));

  // Investment modal
  document.getElementById('btn-save-invest').addEventListener('click', saveInvestment);
  document.getElementById('btn-cancel-invest').addEventListener('click', () => closeModal('modal-invest'));
  document.getElementById('invest-backdrop').addEventListener('click', () => closeModal('modal-invest'));

  // Settings
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('btn-cancel-settings').addEventListener('click', () => closeModal('modal-settings'));
  document.getElementById('settings-backdrop').addEventListener('click', () => closeModal('modal-settings'));
  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (confirm('¿Borrar TODOS los datos? No se puede deshacer.')) { localStorage.clear(); location.reload(); }
  });

  // Goal modal
  document.getElementById('btn-save-goal').addEventListener('click', saveGoal);
  document.getElementById('btn-cancel-goal').addEventListener('click', () => closeModal('modal-goal'));
  document.getElementById('goal-backdrop').addEventListener('click', () => closeModal('modal-goal'));
}

document.addEventListener('DOMContentLoaded', init);
