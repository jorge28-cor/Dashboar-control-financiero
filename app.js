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
  { id: 'otros',           emoji: '📦', name: 'Otros',         color: '#64748b' },
];

const INCOME_CATS = [
  { id: 'nomina',    emoji: '💼', name: 'Nómina',    color: '#00e5a0' },
  { id: 'freelance', emoji: '💻', name: 'Freelance', color: '#00d4ff' },
  { id: 'negocio',   emoji: '🏪', name: 'Negocio',   color: '#ffc857' },
  { id: 'otros_ing', emoji: '💵', name: 'Otros',     color: '#64748b' },
];

// Investment types grouped by triangle zone
const INVEST_BY_ZONE = {
  seguridad: [
    { id: 'cetes',    emoji: '🇲🇽', name: 'CETES' },
    { id: 'plazo',    emoji: '🏦', name: 'Plazo fijo' },
    { id: 'moneymarket', emoji: '💵', name: 'Money Market' },
    { id: 'cuenta',   emoji: '🏧', name: 'Cta. remunerada' },
  ],
  equilibrio: [
    { id: 'fondos',   emoji: '📂', name: 'Fondos comunes' },
    { id: 'bonos',    emoji: '📜', name: 'Bonos / CER' },
    { id: 'etf',      emoji: '📊', name: 'ETFs' },
    { id: 'cedears',  emoji: '🌎', name: 'CEDEARs' },
  ],
  crecimiento: [
    { id: 'acciones', emoji: '📈', name: 'Acciones' },
    { id: 'crypto',   emoji: '₿',  name: 'Crypto' },
    { id: 'negocio_inv', emoji: '🏪', name: 'Negocio propio' },
    { id: 'otro_inv', emoji: '💼', name: 'Otro' },
  ],
};

const ZONE_CONFIG = {
  seguridad:   { label: 'Seguridad / Liquidez', emoji: '🟢', color: '#00e5a0', desc: 'Bajo riesgo · Alta liquidez · Baja rentabilidad', ideal: { conservador: 60, moderado: 40, agresivo: 20 } },
  equilibrio:  { label: 'Equilibrio',           emoji: '🟡', color: '#ffc857', desc: 'Riesgo medio · Liquidez media · Rentabilidad media', ideal: { conservador: 30, moderado: 40, agresivo: 40 } },
  crecimiento: { label: 'Crecimiento Alto',     emoji: '🔴', color: '#ff4d6d', desc: 'Alto riesgo · Baja liquidez · Alta rentabilidad', ideal: { conservador: 10, moderado: 20, agresivo: 40 } },
};

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
  settings: { name: '', monthlyIncome: 0, budgets: {}, investorProfile: 'moderado' },
  debtPayments: [], // { debtId, amount, date, note }
  currentTab: 'overview',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  txFilter: 'todos',
  addType: 'gasto',
  selectedCat: '',
  selectedEmoji: '🎯',
  selectedDebtType: 'tarjeta',
  selectedZone: 'seguridad',
  selectedInvestType: 'cetes',
  editingGoalId: null,
  editingDebtId: null,
  editingInvestId: null,
};

CATEGORIES.forEach(c => { if (!state.settings.budgets[c.id]) state.settings.budgets[c.id] = 0; });

// ── STORAGE ──
function save() {
  localStorage.setItem('finanzas_v3', JSON.stringify({
    transactions: state.transactions,
    goals: state.goals,
    debts: state.debts,
    investments: state.investments,
    debtPayments: state.debtPayments,
    settings: state.settings,
  }));
}

function load() {
  try {
    const raw = localStorage.getItem('finanzas_v3')
      || localStorage.getItem('finanzas_v2')
      || localStorage.getItem('finanzas_state');
    if (!raw) return;
    const d = JSON.parse(raw);
    state.transactions = d.transactions || [];
    state.goals        = d.goals || [];
    state.debts        = d.debts || [];
    state.investments  = d.investments || [];
    state.debtPayments = d.debtPayments || [];
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
  const income     = state.transactions.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const expense    = state.transactions.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  const investVal  = state.investments.reduce((s,i) => s + i.currentValue, 0);
  const totalDebt  = state.debts.reduce((s,d) => s + d.remaining, 0);
  return (income - expense) + investVal - totalDebt;
}

function calcScore() {
  const txs    = txInMonth(state.transactions, state.currentMonth, state.currentYear);
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
  state.debts.filter(d => d.rate > 30).forEach(() => score -= 5);
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
  document.getElementById('greeting').textContent = state.settings.name ? `${greet}, ${state.settings.name} 👋` : `${greet} 👋`;
  document.getElementById('header-date').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const nw   = calcNetWorth();
  const nwEl = document.getElementById('net-worth');
  nwEl.textContent = fmt(nw);
  nwEl.style.color = nw >= 0 ? 'var(--green)' : 'var(--red)';
  const prevM = state.currentMonth === 0 ? 11 : state.currentMonth - 1;
  const prevY = state.currentMonth === 0 ? state.currentYear - 1 : state.currentYear;
  const prevTxs = txInMonth(state.transactions, prevM, prevY);
  const prevNet = prevTxs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+t.amount,0) - prevTxs.filter(t=>t.type==='gasto').reduce((s,t)=>s+t.amount,0);
  const curTxs  = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const curNet  = curTxs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+t.amount,0) - curTxs.filter(t=>t.type==='gasto').reduce((s,t)=>s+t.amount,0);
  const delta   = curNet - prevNet;
  const deltaEl = document.getElementById('nw-delta');
  deltaEl.textContent = delta !== 0 ? `${delta>0?'▲':'▼'} ${fmt(Math.abs(delta))} vs mes anterior` : 'Primer mes registrado';
  deltaEl.className   = 'nw-delta ' + (delta > 0 ? 'positive' : delta < 0 ? 'negative' : '');
}

// ── NAVIGATION ──
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
  const map = { overview: renderOverview, transactions: renderTransactions, budget: renderBudget, goals: renderGoals, debts: renderDebts, investments: renderInvestments, financial: renderFinancial };
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
  const txs     = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const income  = txs.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  const net     = income - expense;
  const savingRate  = income > 0 ? Math.round((net / income) * 100) : 0;
  const score       = calcScore();
  const totalDebt   = state.debts.reduce((s,d) => s + d.remaining, 0);
  const totalInvest = state.investments.reduce((s,i) => s + i.currentValue, 0);
  const scoreColor  = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';

  monthNav(container);

  // KPIs
  const kpi = document.createElement('div');
  kpi.className = 'kpi-grid';
  kpi.innerHTML = `
    <div class="kpi-card green"><div class="kpi-label">Ingresos</div><div class="kpi-value" style="color:var(--green)">${fmt(income)}</div><div class="kpi-sub">Este mes</div></div>
    <div class="kpi-card red"><div class="kpi-label">Gastos</div><div class="kpi-value" style="color:var(--red)">${fmt(expense)}</div><div class="kpi-sub">Este mes</div></div>
    <div class="kpi-card accent"><div class="kpi-label">Ahorro neto</div><div class="kpi-value" style="color:${net>=0?'var(--accent)':'var(--red)'}">${fmt(net)}</div><div class="kpi-sub">${savingRate}% tasa</div></div>
    <div class="kpi-card" style="border-color:${scoreColor}44"><div class="kpi-label">Score</div><div class="kpi-value" style="color:${scoreColor}">${score}<span style="font-size:11px;color:var(--muted)">/100</span></div><div class="kpi-sub">${score>=75?'Excelente':score>=50?'Moderado':'Atención'}</div></div>
  `;
  container.appendChild(kpi);

  // Debt + Invest row
  const row2 = document.createElement('div');
  row2.className = 'kpi-grid';
  const investGain = state.investments.reduce((s,i) => s + (i.currentValue - i.cost), 0);
  row2.innerHTML = `
    <div class="kpi-card red" style="cursor:pointer" id="quick-debts"><div class="kpi-label">💳 Deudas</div><div class="kpi-value" style="color:var(--red)">${fmt(totalDebt)}</div><div class="kpi-sub">${state.debts.length} activas →</div></div>
    <div class="kpi-card accent" style="cursor:pointer" id="quick-invest"><div class="kpi-label">📈 Inversiones</div><div class="kpi-value" style="color:var(--accent)">${fmt(totalInvest)}</div><div class="kpi-sub" style="color:${investGain>=0?'var(--green)':'var(--red)'}">${investGain>=0?'+':''}${fmt(investGain)} ganancia →</div></div>
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
    months.push({ label: new Date(y,m,1).toLocaleDateString('es-MX',{month:'short'}), income: t.filter(x=>x.type==='ingreso').reduce((s,x)=>s+x.amount,0), expense: t.filter(x=>x.type==='gasto').reduce((s,x)=>s+x.amount,0) });
  }
  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);
  chartCard.innerHTML = `
    <div class="card-title">Flujo 5 meses</div>
    <div class="mini-chart">
      ${months.map(m=>`<div class="mini-bar-wrap"><div class="mini-bar" style="height:${(m.income/maxVal)*52}px;background:var(--green);opacity:.85"></div><div class="mini-bar" style="height:${(m.expense/maxVal)*52}px;background:var(--red);opacity:.85;margin-top:2px"></div><div class="mini-bar-label">${m.label}</div></div>`).join('')}
    </div>
    <div style="display:flex;gap:14px;margin-top:8px">
      <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)"><span style="width:8px;height:8px;background:var(--green);border-radius:2px;display:inline-block"></span>Ingresos</div>
      <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)"><span style="width:8px;height:8px;background:var(--red);border-radius:2px;display:inline-block"></span>Gastos</div>
    </div>`;
  container.appendChild(chartCard);

  // Recents
  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  const recent = [...state.transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,5);
  recentCard.innerHTML = `
    <div class="section-header"><div class="section-title">Recientes</div><button class="section-action" id="btn-see-all">Ver todos →</button></div>
    ${recent.length===0?`<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Sin movimientos aún.<br>Toca + para agregar.</div></div>`:recent.map(t=>renderTxItem(t)).join('')}`;
  container.appendChild(recentCard);

  // Recs
  const recs = getRecommendations(txs, income, expense, savingRate);
  if (recs.length > 0) {
    const recCard = document.createElement('div');
    recCard.className = 'card';
    recCard.innerHTML = `<div class="card-title">💡 Recomendaciones</div>${recs.map(r=>`<div class="rec-item"><div class="rec-icon">${r.icon}</div><div class="rec-text">${r.text}</div></div>`).join('')}`;
    container.appendChild(recCard);
  }

  document.getElementById('btn-see-all')?.addEventListener('click', () => switchTab('transactions'));
  document.getElementById('quick-debts')?.addEventListener('click', () => switchTab('debts'));
  document.getElementById('quick-invest')?.addEventListener('click', () => switchTab('investments'));
}

function getRecommendations(txs, income, expense, savingRate) {
  const recs = [];
  if (income === 0) { recs.push({ icon: '💼', text: 'Registra tus ingresos para activar el análisis.' }); return recs; }
  if (savingRate < 0) recs.push({ icon: '🚨', text: 'Tus gastos superan tus ingresos este mes.' });
  else if (savingRate >= 20) recs.push({ icon: '✅', text: `Ahorras el ${savingRate}% de tus ingresos. ¡Excelente!` });

  const highDebt = state.debts.filter(d => d.rate > 30);
  if (highDebt.length > 0) recs.push({ icon: '💳', text: `${highDebt.length} deuda(s) con tasa >30%. Priorizalas para ahorrar intereses.` });
  if (state.investments.length === 0) recs.push({ icon: '📈', text: 'Aún sin inversiones. Registra tu portafolio para ver el análisis del triángulo.' });

  // Triangle alert
  if (state.investments.length > 0) {
    const total = state.investments.reduce((s,i) => s + i.currentValue, 0);
    const crec  = state.investments.filter(i=>i.zone==='crecimiento').reduce((s,i)=>s+i.currentValue,0);
    const crePct = total > 0 ? Math.round((crec/total)*100) : 0;
    const profile = state.settings.investorProfile || 'moderado';
    const idealCrec = ZONE_CONFIG.crecimiento.ideal[profile];
    if (crePct > idealCrec + 15) recs.push({ icon: '⚠️', text: `Tu zona de riesgo (${crePct}%) supera lo ideal para tu perfil ${profile} (${idealCrec}%).` });
  }

  CATEGORIES.forEach(c => {
    const b = state.settings.budgets[c.id];
    if (b > 0) {
      const spent = txs.filter(t=>t.type==='gasto'&&t.category===c.id).reduce((s,t)=>s+t.amount,0);
      if (spent > b) recs.push({ icon: '📊', text: `${c.emoji} ${c.name} excedió presupuesto en ${fmt(spent-b)}.` });
    }
  });

  return recs.slice(0,4);
}

// ── TRANSACTIONS ──
function renderTransactions(container) {
  monthNav(container);
  const chips = document.createElement('div');
  chips.className = 'filter-chips';
  chips.innerHTML = ['todos','ingresos','gastos'].map(f => {
    const l = {todos:'🗂 Todos', ingresos:'💰 Ingresos', gastos:'💸 Gastos'};
    return `<div class="chip ${state.txFilter===f?'active':''}" data-filter="${f}">${l[f]}</div>`;
  }).join('') + CATEGORIES.map(c=>`<div class="chip ${state.txFilter===c.id?'active':''}" data-filter="${c.id}">${c.emoji} ${c.name}</div>`).join('');
  container.appendChild(chips);

  let txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  if (state.txFilter==='ingresos') txs=txs.filter(t=>t.type==='ingreso');
  else if (state.txFilter==='gastos') txs=txs.filter(t=>t.type==='gasto');
  else if (state.txFilter!=='todos') txs=txs.filter(t=>t.category===state.txFilter);
  txs = [...txs].sort((a,b)=>new Date(b.date)-new Date(a.date));

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = txs.length===0
    ? `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Sin movimientos aquí.</div></div>`
    : txs.map(t=>renderTxItem(t,true)).join('');
  container.appendChild(card);

  chips.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { state.txFilter = c.dataset.filter; renderTab(); }));
  card.querySelectorAll('.tx-delete').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('¿Eliminar?')) { state.transactions = state.transactions.filter(t=>t.id!==btn.dataset.id); save(); renderTab(); renderHeader(); toast('Eliminado'); }
  }));
}

function renderTxItem(t, showDelete=false) {
  const list = t.type==='ingreso' ? INCOME_CATS : CATEGORIES;
  const cat  = list.find(c=>c.id===t.category) || {emoji:'📦',name:t.category};
  const d    = new Date(t.date+'T12:00:00');
  return `<div class="tx-item fade-in">
    <div class="tx-icon" style="background:${t.type==='ingreso'?'var(--green-dim)':'var(--red-dim)'}">${cat.emoji}</div>
    <div class="tx-info"><div class="tx-desc">${t.desc||cat.name}</div><div class="tx-meta">${cat.name} · ${d.toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</div></div>
    <div class="tx-amount ${t.type==='ingreso'?'income':'expense'}">${t.type==='ingreso'?'+':'-'}${fmt(t.amount)}</div>
    ${showDelete?`<button class="tx-delete" data-id="${t.id}">🗑</button>`:''}
  </div>`;
}

// ── BUDGET ──
function renderBudget(container) {
  monthNav(container);
  const txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const totalIncome  = txs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+t.amount,0);
  const totalExpense = txs.filter(t=>t.type==='gasto').reduce((s,t)=>s+t.amount,0);
  const expected     = state.settings.monthlyIncome;

  const summary = document.createElement('div');
  summary.className = 'card';
  summary.innerHTML = `
    <div class="card-title">Resumen del mes</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:10px">
      <div><div style="font-size:11px;color:var(--muted);margin-bottom:2px">Ingresos</div><div style="font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--green)">${fmt(totalIncome)}</div></div>
      <div style="text-align:right"><div style="font-size:11px;color:var(--muted);margin-bottom:2px">Gastos</div><div style="font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--red)">${fmt(totalExpense)}</div></div>
    </div>
    ${expected>0?`<div style="background:var(--border);border-radius:99px;height:6px;margin-bottom:4px"><div style="width:${Math.min((totalExpense/expected)*100,100)}%;background:${totalExpense>expected?'var(--red)':'var(--accent)'};border-radius:99px;height:100%;transition:width .8s"></div></div><div style="font-size:11px;color:var(--muted)">${Math.round((totalExpense/expected)*100)}% del ingreso esperado</div>`:`<div style="font-size:12px;color:var(--muted)">Configura tu ingreso en ⚙️ para ver el análisis.</div>`}`;
  container.appendChild(summary);

  const catCard = document.createElement('div');
  catCard.className = 'card';
  catCard.innerHTML = '<div class="card-title">Por categoría</div>';
  let hasData = false;
  CATEGORIES.forEach(cat => {
    const budget = state.settings.budgets[cat.id]||0;
    const spent  = txs.filter(t=>t.type==='gasto'&&t.category===cat.id).reduce((s,t)=>s+t.amount,0);
    if (!spent && !budget) return;
    hasData = true;
    const pct  = budget>0 ? Math.min((spent/budget)*100,100) : 100;
    const over = budget>0 && spent>budget;
    const barColor = over ? 'var(--red)' : pct>80 ? 'var(--yellow)' : 'var(--accent)';
    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div class="budget-header"><div class="budget-name">${cat.emoji} ${cat.name} ${over?'<span class="over-tag">EXCEDIDO</span>':''}</div><div class="budget-amounts">${fmt(spent)}${budget>0?' / '+fmt(budget):''}</div></div>
      <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
      ${over?`<div class="budget-warning">Excediste por ${fmt(spent-budget)}</div>`:''}`;
    catCard.appendChild(item);
  });
  if (!hasData) catCard.innerHTML += `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Sin gastos aún.<br>Configura presupuestos en ⚙️</div></div>`;
  container.appendChild(catCard);
}

// ── GOALS ──
function renderGoals(container) {
  container.innerHTML = `<div class="section-header"><div class="section-title">Mis Metas</div></div>`;
  if (!state.goals.length) {
    container.innerHTML += `<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-text">Sin metas aún.</div></div>`;
  } else {
    state.goals.forEach(g => {
      const pct  = Math.min(Math.round((g.current/g.target)*100),100);
      const rem  = Math.max(g.target-g.current,0);
      const eta  = state.settings.monthlyIncome*0.2 > 0 ? Math.ceil(rem/(state.settings.monthlyIncome*0.2)) : null;
      const card = document.createElement('div');
      card.className = 'goal-card';
      card.innerHTML = `
        <div class="goal-header"><div><div class="goal-emoji">${g.emoji}</div><div class="goal-name">${g.name}</div><div class="goal-eta">${rem===0?'🎉 ¡Meta alcanzada!':eta?`~${eta} meses`:'Configura ingreso'}</div></div><div class="goal-pct">${pct}%</div></div>
        <div class="goal-bar-bg"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
        <div class="goal-amounts"><span style="color:var(--green);font-family:'JetBrains Mono',monospace;font-size:13px">${fmt(g.current)}</span><span style="color:var(--muted);font-size:12px">Meta: <strong style="color:var(--text);font-family:'JetBrains Mono',monospace">${fmt(g.target)}</strong></span></div>
        <div class="goal-actions"><button class="btn-sm" data-goal-add="${g.id}">+ Agregar</button><button class="btn-sm" data-goal-edit="${g.id}">Editar</button><button class="btn-sm danger" data-goal-del="${g.id}">Eliminar</button></div>`;
      container.appendChild(card);
    });
  }
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-goal';
  addBtn.textContent = '+ Nueva meta';
  container.appendChild(addBtn);
  addBtn.addEventListener('click', () => { state.editingGoalId=null; openGoalModal(); });
  container.querySelectorAll('[data-goal-del]').forEach(b=>b.addEventListener('click',()=>{if(confirm('¿Eliminar?')){state.goals=state.goals.filter(g=>g.id!==b.dataset.goalDel);save();renderTab();toast('Meta eliminada');}}));
  container.querySelectorAll('[data-goal-edit]').forEach(b=>b.addEventListener('click',()=>{state.editingGoalId=b.dataset.goalEdit;openGoalModal();}));
  container.querySelectorAll('[data-goal-add]').forEach(b=>b.addEventListener('click',()=>{
    const g=state.goals.find(x=>x.id===b.dataset.goalAdd);if(!g)return;
    const a=parseFloat(prompt(`¿Cuánto agregas a "${g.name}"?`));
    if(!isNaN(a)&&a>0){g.current=Math.min(g.current+a,g.target);save();renderTab();toast(`${fmt(a)} agregados`);}
  }));
}

// ── DEBTS ──
function renderDebts(container) {
  const totalRemaining = state.debts.reduce((s,d)=>s+d.remaining,0);
  const totalMonthly   = state.debts.reduce((s,d)=>s+d.monthly,0);
  const totalPaid      = state.debts.reduce((s,d)=>s+(d.total-d.remaining),0);
  const totalOriginal  = state.debts.reduce((s,d)=>s+d.total,0);
  const paidPct        = totalOriginal>0 ? Math.round((totalPaid/totalOriginal)*100) : 0;

  // Summary KPIs
  const kpi = document.createElement('div');
  kpi.className = 'kpi-grid';
  kpi.innerHTML = `
    <div class="kpi-card red"><div class="kpi-label">Deuda restante</div><div class="kpi-value" style="color:var(--red)">${fmt(totalRemaining)}</div><div class="kpi-sub">${state.debts.length} deudas</div></div>
    <div class="kpi-card"><div class="kpi-label">Pago mensual</div><div class="kpi-value" style="color:var(--yellow)">${fmt(totalMonthly)}</div><div class="kpi-sub">suma mensual</div></div>`;
  container.appendChild(kpi);

  // Progress overall
  if (state.debts.length > 0) {
    const progCard = document.createElement('div');
    progCard.className = 'card';
    progCard.innerHTML = `
      <div class="card-title">Progreso general de pago</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;color:var(--muted2)">Pagado: <strong style="color:var(--green)">${fmt(totalPaid)}</strong></span>
        <span style="font-size:13px;color:var(--muted)">${paidPct}%</span>
      </div>
      <div style="background:var(--border);border-radius:99px;height:10px;overflow:hidden">
        <div style="width:${paidPct}%;background:linear-gradient(90deg,var(--green),var(--accent));border-radius:99px;height:100%;transition:width 1s ease"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">Total original: ${fmt(totalOriginal)}</div>`;
    container.appendChild(progCard);

    // Strategy tip
    const highRate = [...state.debts].sort((a,b)=>b.rate-a.rate)[0];
    const tip = document.createElement('div');
    tip.className = 'card';
    tip.innerHTML = `
      <div class="card-title">💡 Estrategia recomendada</div>
      <div class="rec-item"><div class="rec-icon">🎯</div><div class="rec-text"><strong>Método avalancha:</strong> Paga primero <strong>${highRate.name}</strong> (${highRate.rate}% tasa anual). Ahorra más en intereses a largo plazo.</div></div>
      <div class="rec-item"><div class="rec-icon">📊</div><div class="rec-text">Tasa promedio: <strong style="color:var(--yellow)">${(state.debts.reduce((s,d)=>s+d.rate,0)/state.debts.length).toFixed(1)}%</strong> anual</div></div>`;
    container.appendChild(tip);
  }

  // Debt list
  const listCard = document.createElement('div');
  listCard.className = 'card';
  listCard.innerHTML = '<div class="section-header"><div class="section-title">Mis Deudas</div></div>';

  if (!state.debts.length) {
    listCard.innerHTML += `<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">Sin deudas registradas.<br>¡O agrega una para darle seguimiento!</div></div>`;
  } else {
    state.debts.forEach(d => {
      const paid  = Math.round(((d.total-d.remaining)/d.total)*100);
      const mLeft = d.monthly>0 ? Math.ceil(d.remaining/d.monthly) : null;
      const dtype = DEBT_TYPES[d.type] || {emoji:'💳',label:d.type};
      const urgColor = d.rate>30 ? 'var(--red)' : d.rate>15 ? 'var(--yellow)' : 'var(--green)';
      const item  = document.createElement('div');
      item.className = 'debt-item';
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div><div style="font-size:15px;font-weight:700">${dtype.emoji} ${d.name}</div><div style="font-size:11px;color:var(--muted)">${dtype.label}</div></div>
          <div style="text-align:right">
            <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:var(--red);font-weight:700">${fmt(d.remaining)}</div>
            <div style="font-size:11px;background:${urgColor}22;color:${urgColor};padding:2px 7px;border-radius:99px;display:inline-block;margin-top:2px">${d.rate}% tasa</div>
          </div>
        </div>
        <div style="background:var(--border);border-radius:99px;height:7px;margin-bottom:5px;overflow:hidden">
          <div style="width:${paid}%;background:linear-gradient(90deg,var(--green),var(--accent));border-radius:99px;height:100%;transition:width .8s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:10px">
          <span>${paid}% pagado · ${fmt(d.monthly)}/mes</span>
          <span>${mLeft?`~${mLeft} meses restantes`:''}</span>
        </div>
        <div class="goal-actions">
          <button class="btn-sm" data-debt-pay="${d.id}">💰 Pagar</button>
          <button class="btn-sm" data-debt-history="${d.id}">📋 Historial</button>
          <button class="btn-sm" data-debt-edit="${d.id}">Editar</button>
          <button class="btn-sm danger" data-debt-del="${d.id}">Eliminar</button>
        </div>`;
      listCard.appendChild(item);
    });
  }
  container.appendChild(listCard);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-goal';
  addBtn.textContent = '+ Agregar deuda';
  container.appendChild(addBtn);

  addBtn.addEventListener('click', () => { state.editingDebtId=null; openDebtModal(); });
  container.querySelectorAll('[data-debt-del]').forEach(b=>b.addEventListener('click',()=>{if(confirm('¿Eliminar deuda?')){state.debts=state.debts.filter(d=>d.id!==b.dataset.debtDel);save();renderTab();renderHeader();toast('Deuda eliminada');}}));
  container.querySelectorAll('[data-debt-edit]').forEach(b=>b.addEventListener('click',()=>{state.editingDebtId=b.dataset.debtEdit;openDebtModal();}));
  container.querySelectorAll('[data-debt-pay]').forEach(b=>b.addEventListener('click',()=>{
    openPayDebtModal(b.dataset.debtPay);
  }));
  container.querySelectorAll('[data-debt-history]').forEach(b=>b.addEventListener('click',()=>{
    showDebtHistory(b.dataset.debtHistory, container);
  }));
}

// ── MODAL: PAY DEBT ──
function openPayDebtModal(debtId) {
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) return;

  let modal = document.getElementById('modal-pay-debt');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-pay-debt';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop" id="pay-debt-backdrop"></div>
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="modal-title" id="pay-debt-title">Registrar Pago</h2>
        <div id="pay-debt-info"></div>
        <div class="form-group">
          <label>Monto pagado ($)</label>
          <div class="amount-input-wrap">
            <span class="currency-sign">$</span>
            <input type="number" id="inp-pay-amount" placeholder="0.00" inputmode="decimal" />
          </div>
        </div>
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" id="inp-pay-date" />
        </div>
        <div class="form-group">
          <label>Nota (opcional)</label>
          <input type="text" id="inp-pay-note" placeholder="ej. Pago mínimo, abono extra..." />
        </div>
        <button class="btn-primary" id="btn-confirm-pay">Confirmar pago</button>
        <button class="btn-ghost" id="btn-cancel-pay">Cancelar</button>
      </div>`;
    document.getElementById('app').appendChild(modal);
    document.getElementById('pay-debt-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('btn-cancel-pay').addEventListener('click', () => modal.classList.add('hidden'));
  }

  // Always update the paying debt ID fresh and replace the confirm button listener
  modal.dataset.currentDebtId = debtId;
  const oldBtn = document.getElementById('btn-confirm-pay');
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);
  newBtn.addEventListener('click', () => confirmDebtPayment(modal.dataset.currentDebtId));

  document.getElementById('pay-debt-title').textContent = `Pagar: ${debt.name}`;
  document.getElementById('pay-debt-info').innerHTML = `
    <div class="pay-debt-summary">
      <div class="pay-debt-row"><span>Saldo actual</span><span style="color:var(--red);font-family:'JetBrains Mono',monospace;font-weight:700">${fmt(debt.remaining)}</span></div>
      <div class="pay-debt-row"><span>Pago mensual sugerido</span><span style="color:var(--yellow);font-family:'JetBrains Mono',monospace">${fmt(debt.monthly)}</span></div>
      <div class="pay-debt-row"><span>Tasa anual</span><span style="color:var(--muted2)">${debt.rate}%</span></div>
    </div>`;
  document.getElementById('inp-pay-amount').value = debt.monthly || '';
  document.getElementById('inp-pay-date').value = todayStr();
  document.getElementById('inp-pay-note').value = '';
  modal.classList.remove('hidden');
}

function confirmDebtPayment(debtId) {
  const amount = parseFloat(document.getElementById('inp-pay-amount').value);
  const date   = document.getElementById('inp-pay-date').value;
  const note   = document.getElementById('inp-pay-note').value.trim();
  if (!amount || amount <= 0) { toast('Ingresa un monto válido'); return; }
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) { toast('Error: deuda no encontrada'); return; }
  const prev = debt.remaining;
  debt.remaining = Math.max(prev - amount, 0);
  state.debtPayments.push({ id: uid(), debtId: debt.id, debtName: debt.name, amount, date: date || todayStr(), note, balanceBefore: prev, balanceAfter: debt.remaining });
  save();
  document.getElementById('modal-pay-debt').classList.add('hidden');
  renderTab(); renderHeader();
  toast(`${fmt(amount)} pagado — Saldo: ${fmt(debt.remaining)} ✓`);
  if (debt.remaining === 0) setTimeout(() => toast(`🎉 ¡${debt.name} completamente pagada!`), 1800);
}

function showDebtHistory(debtId, container) {
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) return;
  const payments = state.debtPayments.filter(p => p.debtId === debtId).sort((a,b) => new Date(b.date)-new Date(a.date));
  let modal = document.getElementById('modal-debt-history');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-debt-history';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop" id="hist-backdrop"></div>
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="modal-title" id="hist-title"></h2>
        <div id="hist-content"></div>
        <button class="btn-ghost" id="btn-close-hist">Cerrar</button>
      </div>`;
    document.getElementById('app').appendChild(modal);
    document.getElementById('hist-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('btn-close-hist').addEventListener('click', () => modal.classList.add('hidden'));
  }
  const totalPaid = payments.reduce((s,p) => s+p.amount, 0);
  document.getElementById('hist-title').textContent = `Historial: ${debt.name}`;
  document.getElementById('hist-content').innerHTML = `
    <div style="background:var(--card);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:12px;color:var(--muted)">Total pagado</span>
        <span style="font-family:'JetBrains Mono',monospace;color:var(--green)">${fmt(totalPaid)}</span>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:12px;color:var(--muted)">Saldo restante</span>
        <span style="font-family:'JetBrains Mono',monospace;color:var(--red)">${fmt(debt.remaining)}</span>
      </div>
    </div>
    ${payments.length === 0
      ? `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Sin pagos registrados aún.</div></div>`
      : payments.map(p => `
        <div class="tx-item">
          <div class="tx-icon" style="background:var(--green-dim)">💳</div>
          <div class="tx-info">
            <div class="tx-desc">${p.note || 'Pago registrado'}</div>
            <div class="tx-meta">${new Date(p.date+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})} · Saldo: ${fmt(p.balanceAfter)}</div>
          </div>
          <div class="tx-amount income">-${fmt(p.amount)}</div>
        </div>`).join('')}
  `;
  modal.classList.remove('hidden');
}

// ── FINANCIAL STATE ──
function renderFinancial(container) {
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();
  const allTxs  = state.transactions;
  const curTxs  = txInMonth(allTxs, m, y);
  const income  = curTxs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+t.amount,0);
  const expense = curTxs.filter(t=>t.type==='gasto').reduce((s,t)=>s+t.amount,0);
  const totalIncome  = allTxs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+t.amount,0);
  const totalExpense = allTxs.filter(t=>t.type==='gasto').reduce((s,t)=>s+t.amount,0);
  const cashBalance  = totalIncome - totalExpense;
  const totalInvest  = state.investments.reduce((s,i)=>s+i.currentValue,0);
  const investCost   = state.investments.reduce((s,i)=>s+i.cost,0);
  const investGain   = totalInvest - investCost;
  const totalDebt    = state.debts.reduce((s,d)=>s+d.remaining,0);
  const totalAssets  = Math.max(cashBalance,0) + totalInvest;
  const netWorth     = totalAssets - totalDebt;
  const savingRate   = income>0 ? ((income-expense)/income*100).toFixed(1) : 0;
  const debtToIncome = income>0 ? ((state.debts.reduce((s,d)=>s+d.monthly,0)/income)*100).toFixed(1) : 0;
  const debtToAsset  = totalAssets>0 ? ((totalDebt/totalAssets)*100).toFixed(1) : 0;
  const rentInvest   = investCost>0 ? ((investGain/investCost)*100).toFixed(1) : 0;

  // ── HEADER ──
  const header = document.createElement('div');
  header.className = 'card';
  header.style.background = 'linear-gradient(135deg,#151d2e,#1a2540)';
  header.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:16px;font-weight:800;margin-bottom:2px">📑 Estado Financiero</div>
        <div style="font-size:12px;color:var(--muted)">${now.toLocaleDateString('es-MX',{month:'long',year:'numeric'})}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:var(--muted);letter-spacing:1px">PATRIMONIO NETO</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:800;color:${netWorth>=0?'var(--green)':'var(--red)'}">${fmt(netWorth)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${netWorth>=0?'▲ Activos > Pasivos':'▼ Pasivos > Activos'}</div>
      </div>
    </div>`;
  container.appendChild(header);

  // ── GRÁFICO: ACTIVOS vs PASIVOS vs PATRIMONIO (barras horizontales) ──
  const chartCard = document.createElement('div');
  chartCard.className = 'card';
  const maxBar = Math.max(totalAssets, totalDebt, Math.abs(netWorth), 1);
  chartCard.innerHTML = `
    <div class="card-title">📊 Activos · Pasivos · Patrimonio</div>
    ${[
      { label:'Activos', value:totalAssets, color:'#00e5a0', sub: `Efectivo ${fmt(Math.max(cashBalance,0))} + Inversiones ${fmt(totalInvest)}` },
      { label:'Pasivos', value:totalDebt,   color:'#ff4d6d', sub: `${state.debts.length} deuda(s) activa(s)` },
      { label:'Patrimonio', value:Math.abs(netWorth), color: netWorth>=0?'#00d4ff':'#ff4d6d', sub: netWorth>=0?'Activos − Pasivos':'⚠️ Patrimonio negativo' },
    ].map(b=>`
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:13px;font-weight:600">${b.label}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:${b.color}">${fmt(b.value)}</span>
        </div>
        <div style="background:var(--border);border-radius:99px;height:10px;overflow:hidden">
          <div style="width:${Math.min((b.value/maxBar)*100,100)}%;background:${b.color};height:100%;border-radius:99px;box-shadow:0 0 8px ${b.color}55;transition:width 1s ease"></div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px">${b.sub}</div>
      </div>`).join('')}`;
  container.appendChild(chartCard);

  // ── GRÁFICO: FLUJO 6 MESES (SVG real) ──
  const flowCard = document.createElement('div');
  flowCard.className = 'card';
  const months6 = [];
  for (let i=5; i>=0; i--) {
    let mm=m-i, yy=y; if(mm<0){mm+=12;yy--;}
    const t=txInMonth(allTxs,mm,yy);
    const inc=t.filter(x=>x.type==='ingreso').reduce((s,x)=>s+x.amount,0);
    const exp=t.filter(x=>x.type==='gasto').reduce((s,x)=>s+x.amount,0);
    months6.push({ label:new Date(yy,mm,1).toLocaleDateString('es-MX',{month:'short'}), inc, exp, net:inc-exp });
  }
  const W=320, H=120, pad=28, barW=28, gap=(W-pad*2-barW*6)/5;
  const maxV=Math.max(...months6.map(x=>Math.max(x.inc,x.exp)),1);
  const scaleH = v => Math.max((v/maxV)*(H-20), 2);
  const bars = months6.map((mm,i)=>{
    const x = pad + i*(barW+gap);
    const hInc = scaleH(mm.inc), hExp = scaleH(mm.exp);
    const netColor = mm.net>=0?'#00e5a0':'#ff4d6d';
    return `
      <rect x="${x}" y="${H-hInc}" width="${barW/2-1}" height="${hInc}" rx="2" fill="#00e5a0" opacity="0.85"/>
      <rect x="${x+barW/2+1}" y="${H-hExp}" width="${barW/2-1}" height="${hExp}" rx="2" fill="#ff4d6d" opacity="0.85"/>
      <text x="${x+barW/2}" y="${H+12}" text-anchor="middle" fill="#64748b" font-size="9" font-family="Syne,sans-serif">${mm.label}</text>
      ${mm.net!==0?`<text x="${x+barW/2}" y="${H-Math.max(hInc,hExp)-3}" text-anchor="middle" fill="${netColor}" font-size="8" font-family="JetBrains Mono,monospace">${mm.net>0?'+':''}${(mm.net/1000).toFixed(0)}k</text>`:''}`;
  }).join('');
  flowCard.innerHTML = `
    <div class="card-title">💹 Flujo de Caja — 6 meses</div>
    <svg width="100%" viewBox="0 0 ${W} ${H+18}" style="overflow:visible;margin-top:8px">
      <line x1="${pad}" y1="0" x2="${pad}" y2="${H}" stroke="#1e2d45" stroke-width="1"/>
      <line x1="${pad}" y1="${H}" x2="${W-pad+10}" y2="${H}" stroke="#1e2d45" stroke-width="1"/>
      ${bars}
    </svg>
    <div style="display:flex;gap:16px;margin-top:6px">
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:#00e5a0;border-radius:2px;display:inline-block"></span>Ingresos</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:#ff4d6d;border-radius:2px;display:inline-block"></span>Gastos</div>
      <div style="font-size:11px;color:var(--muted)">Número = neto del mes</div>
    </div>`;
  container.appendChild(flowCard);

  // ── GRÁFICO: GASTOS POR CATEGORÍA (dona SVG) ──
  const byCategory = {};
  curTxs.filter(t=>t.type==='gasto').forEach(t=>{ byCategory[t.category]=(byCategory[t.category]||0)+t.amount; });
  const catEntries = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if (catEntries.length > 0) {
    const donutCard = document.createElement('div');
    donutCard.className = 'card';
    const catColors = ['#00d4ff','#ff4d6d','#00e5a0','#ffc857','#b57bee','#f97316'];
    const total = catEntries.reduce((s,[,v])=>s+v,0);
    // Build donut
    const R=50, cx=70, cy=65, stroke=18;
    const circ = 2*Math.PI*R;
    let offset=0;
    const slices = catEntries.map(([cat,val],i)=>{
      const pct = val/total;
      const dash = pct*circ;
      const slice = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${catColors[i]}" stroke-width="${stroke}" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" style="filter:drop-shadow(0 0 3px ${catColors[i]}66)"/>`;
      offset += dash;
      return slice;
    }).join('');
    const legend = catEntries.map(([cat,val],i)=>{
      const c = CATEGORIES.find(x=>x.id===cat)||{emoji:'📦',name:cat};
      const pct = Math.round((val/total)*100);
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="width:10px;height:10px;background:${catColors[i]};border-radius:2px;flex-shrink:0;display:inline-block"></span><span style="font-size:12px;flex:1">${c.emoji} ${c.name}</span><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted2)">${pct}%</span></div>`;
    }).join('');
    donutCard.innerHTML = `
      <div class="card-title">🍩 Gastos del mes por categoría</div>
      <div style="display:flex;gap:12px;align-items:center">
        <svg width="140" height="130" style="flex-shrink:0">
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#1e2d45" stroke-width="${stroke}"/>
          ${slices}
          <text x="${cx}" y="${cy-6}" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="700" font-family="JetBrains Mono,monospace">${fmt(total)}</text>
          <text x="${cx}" y="${cy+10}" text-anchor="middle" fill="#64748b" font-size="9" font-family="Syne,sans-serif">total gastos</text>
        </svg>
        <div style="flex:1">${legend}</div>
      </div>`;
    container.appendChild(donutCard);
  }

  // ── ESTADO DE RESULTADOS ──
  const resultsCard = document.createElement('div');
  resultsCard.className = 'card';
  const byIncomeCat = {};
  curTxs.filter(t=>t.type==='ingreso').forEach(t=>{ byIncomeCat[t.category]=(byIncomeCat[t.category]||0)+t.amount; });
  resultsCard.innerHTML = `
    <div class="card-title">📋 Estado de Resultados — ${now.toLocaleDateString('es-MX',{month:'long'})}</div>
    <div class="fs-section-label" style="color:var(--green)">INGRESOS</div>
    ${Object.entries(byIncomeCat).map(([cat,val])=>{ const c=INCOME_CATS.find(x=>x.id===cat)||{emoji:'💵',name:cat}; return `<div class="fs-row"><span>${c.emoji} ${c.name}</span><span style="color:var(--green)">${fmt(val)}</span></div>`; }).join('') || `<div class="fs-row"><span style="color:var(--muted)">Sin ingresos este mes</span><span>—</span></div>`}
    <div class="fs-row fs-total"><span>Total Ingresos</span><span style="color:var(--green)">${fmt(income)}</span></div>
    <div style="height:1px;background:var(--border);margin:10px 0"></div>
    <div class="fs-section-label" style="color:var(--red)">GASTOS</div>
    ${catEntries.map(([cat,val])=>{ const c=CATEGORIES.find(x=>x.id===cat)||{emoji:'📦',name:cat}; return `<div class="fs-row"><span>${c.emoji} ${c.name}</span><span style="color:var(--red)">${fmt(val)}</span></div>`; }).join('') || `<div class="fs-row"><span style="color:var(--muted)">Sin gastos este mes</span><span>—</span></div>`}
    <div class="fs-row fs-total"><span>Total Gastos</span><span style="color:var(--red)">${fmt(expense)}</span></div>
    <div style="height:1px;background:var(--border);margin:10px 0"></div>
    <div class="fs-row fs-patrimonio"><span>${income-expense>=0?'✅ Resultado':'❌ Resultado'}</span><span style="color:${income-expense>=0?'var(--green)':'var(--red)'};font-weight:800">${income>=expense?'+':''}${fmt(income-expense)}</span></div>`;
  container.appendChild(resultsCard);

  // ── BALANCE GENERAL ──
  const balanceCard = document.createElement('div');
  balanceCard.className = 'card';
  balanceCard.innerHTML = `
    <div class="card-title">⚖️ Balance General</div>
    <div class="fs-section-label" style="color:var(--green)">ACTIVOS</div>
    <div class="fs-row"><span>💵 Efectivo / Ahorro</span><span style="color:var(--green)">${fmt(Math.max(cashBalance,0))}</span></div>
    <div class="fs-row"><span>📈 Inversiones</span><span style="color:var(--accent)">${fmt(totalInvest)}</span></div>
    <div class="fs-row fs-total"><span>Total Activos</span><span style="color:var(--green)">${fmt(totalAssets)}</span></div>
    <div style="height:1px;background:var(--border);margin:10px 0"></div>
    <div class="fs-section-label" style="color:var(--red)">PASIVOS</div>
    ${state.debts.map(d=>`<div class="fs-row"><span>${DEBT_TYPES[d.type]?.emoji||'💳'} ${d.name}</span><span style="color:var(--red)">${fmt(d.remaining)}</span></div>`).join('') || `<div class="fs-row"><span style="color:var(--muted)">Sin deudas</span><span>—</span></div>`}
    <div class="fs-row fs-total"><span>Total Pasivos</span><span style="color:var(--red)">${fmt(totalDebt)}</span></div>
    <div style="height:1px;background:var(--border);margin:10px 0"></div>
    <div class="fs-row fs-patrimonio"><span>💎 Patrimonio Neto</span><span style="color:${netWorth>=0?'var(--green)':'var(--red)'}">${fmt(netWorth)}</span></div>`;
  container.appendChild(balanceCard);

  // ── INDICADORES CON GAUGE SVG ──
  const kpiCard = document.createElement('div');
  kpiCard.className = 'card';
  const indicators = [
    { label:'Tasa de Ahorro', value:parseFloat(savingRate), display:`${savingRate}%`, good:parseFloat(savingRate)>=20, tip:'Ideal >20%', max:50 },
    { label:'Deuda / Ingresos', value:parseFloat(debtToIncome), display:`${debtToIncome}%`, good:parseFloat(debtToIncome)<=35, tip:'Ideal <35%', max:100 },
    { label:'Deuda / Activos', value:parseFloat(debtToAsset), display:`${debtToAsset}%`, good:parseFloat(debtToAsset)<=50, tip:'Ideal <50%', max:100 },
    { label:'Rentabilidad inversión', value:parseFloat(rentInvest), display:`${rentInvest}%`, good:parseFloat(rentInvest)>=0, tip:'Ganancia total', max:50 },
  ];
  kpiCard.innerHTML = `<div class="card-title">📐 Indicadores Clave</div>`;
  indicators.forEach(ind => {
    const pct = Math.min(Math.max((ind.value/ind.max)*100,0),100);
    const color = ind.good ? '#00e5a0' : '#ff4d6d';
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)';
    item.innerHTML = `
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;margin-bottom:2px">${ind.label}</div>
        <div style="background:var(--border);border-radius:99px;height:5px;width:100%;margin-top:5px;overflow:hidden">
          <div style="width:${pct}%;background:${color};height:100%;border-radius:99px;transition:width 1s ease;box-shadow:0 0 6px ${color}55"></div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px">${ind.tip}</div>
      </div>
      <div style="text-align:right;margin-left:14px;min-width:70px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:800;color:${color}">${ind.display}</div>
        <div style="font-size:10px;color:${color}">${ind.good?'✅ OK':'⚠️ Revisar'}</div>
      </div>`;
    kpiCard.appendChild(item);
  });
  container.appendChild(kpiCard);

  // ── PORTAFOLIO si hay inversiones ──
  if (state.investments.length > 0) {
    const invCard = document.createElement('div');
    invCard.className = 'card';
    invCard.innerHTML = `
      <div class="card-title">📈 Portafolio de Inversiones</div>
      <div class="fs-row"><span>Capital invertido</span><span style="font-family:'JetBrains Mono',monospace">${fmt(investCost)}</span></div>
      <div class="fs-row"><span>Valor actual</span><span style="color:var(--accent);font-family:'JetBrains Mono',monospace">${fmt(totalInvest)}</span></div>
      <div class="fs-row fs-total"><span>${investGain>=0?'Ganancia':'Pérdida'}</span><span style="color:${investGain>=0?'var(--green)':'var(--red)'};font-family:'JetBrains Mono',monospace">${investGain>=0?'+':''}${fmt(investGain)}</span></div>
      <div style="margin-top:12px">
        ${['seguridad','equilibrio','crecimiento'].map(z=>{
          const zVal=state.investments.filter(i=>i.zone===z).reduce((s,i)=>s+i.currentValue,0);
          if(!zVal)return '';
          const pct=totalInvest>0?Math.round((zVal/totalInvest)*100):0;
          const cfg=ZONE_CONFIG[z];
          return `<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>${cfg.emoji} ${cfg.label.split('/')[0]}</span><span style="color:var(--muted2)">${fmt(zVal)} · ${pct}%</span></div><div style="background:var(--border);height:6px;border-radius:99px;overflow:hidden"><div style="width:${pct}%;background:${cfg.color};height:100%;border-radius:99px;box-shadow:0 0 5px ${cfg.color}55;transition:width 1s"></div></div></div>`;
        }).join('')}
      </div>`;
    container.appendChild(invCard);
  }
}

// ── INVESTMENTS ──
function renderInvestments(container) {
  const totalCost   = state.investments.reduce((s,i)=>s+i.cost,0);
  const totalValue  = state.investments.reduce((s,i)=>s+i.currentValue,0);
  const totalGain   = totalValue - totalCost;
  const gainPct     = totalCost>0 ? ((totalGain/totalCost)*100).toFixed(1) : 0;
  const profile     = state.settings.investorProfile || 'moderado';

  // KPIs
  const kpi = document.createElement('div');
  kpi.className = 'kpi-grid';
  kpi.innerHTML = `
    <div class="kpi-card accent"><div class="kpi-label">Valor actual</div><div class="kpi-value" style="color:var(--accent)">${fmt(totalValue)}</div><div class="kpi-sub">${state.investments.length} posiciones</div></div>
    <div class="kpi-card ${totalGain>=0?'green':'red'}"><div class="kpi-label">Ganancia / Pérdida</div><div class="kpi-value" style="color:${totalGain>=0?'var(--green)':'var(--red)'}">${totalGain>=0?'+':''}${fmt(totalGain)}</div><div class="kpi-sub">${gainPct}% total</div></div>`;
  container.appendChild(kpi);

  // Triangle visualization
  const triCard = document.createElement('div');
  triCard.className = 'card';

  const zones = ['seguridad','equilibrio','crecimiento'];
  const zoneValues = {};
  zones.forEach(z => { zoneValues[z] = state.investments.filter(i=>i.zone===z).reduce((s,i)=>s+i.currentValue,0); });
  const profileLabels = { conservador:'🛡️ Conservador', moderado:'⚖️ Moderado', agresivo:'🚀 Agresivo' };

  triCard.innerHTML = `<div class="card-title">📐 Triángulo de Inversión</div><div style="font-size:11px;color:var(--muted);margin-bottom:14px">Perfil: <strong style="color:var(--accent)">${profileLabels[profile]}</strong> — Toca ⚙️ para cambiar</div>`;

  zones.forEach(z => {
    const cfg       = ZONE_CONFIG[z];
    const val       = zoneValues[z];
    const real      = totalValue>0 ? Math.round((val/totalValue)*100) : 0;
    const ideal     = cfg.ideal[profile];
    const diff      = real - ideal;
    const barColor  = Math.abs(diff)<=5 ? 'var(--green)' : Math.abs(diff)<=15 ? 'var(--yellow)' : 'var(--red)';
    const diffLabel = diff===0 ? '✅ Ideal' : diff>0 ? `▲ +${diff}% sobre ideal` : `▼ ${Math.abs(diff)}% bajo ideal`;

    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:16px';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700">${cfg.emoji} ${cfg.label}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--muted2)">${real}% <span style="color:var(--muted);font-size:10px">/ ideal ${ideal}%</span></div>
      </div>
      <div style="background:var(--border);border-radius:99px;height:8px;margin-bottom:4px;position:relative;overflow:visible">
        <div style="width:${real}%;background:${cfg.color};border-radius:99px;height:100%;transition:width 1s ease;box-shadow:0 0 6px ${cfg.color}55"></div>
        <div style="position:absolute;top:-3px;left:${ideal}%;width:2px;height:14px;background:white;opacity:0.4;border-radius:1px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px">
        <span style="color:var(--muted)">${fmt(val)} · ${cfg.desc}</span>
        <span style="color:${barColor};font-weight:600">${totalValue>0?diffLabel:''}</span>
      </div>`;
    triCard.appendChild(row);
  });

  // Overall balance alert
  if (totalValue > 0) {
    const crec = Math.round((zoneValues.crecimiento/totalValue)*100);
    const seg  = Math.round((zoneValues.seguridad/totalValue)*100);
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `background:${crec>ZONE_CONFIG.crecimiento.ideal[profile]+15?'var(--red-dim)':'var(--green-dim)'};border-radius:12px;padding:10px 12px;margin-top:8px;font-size:12px;color:var(--text)`;
    alertDiv.innerHTML = crec > ZONE_CONFIG.crecimiento.ideal[profile]+15
      ? `⚠️ <strong>Portafolio agresivo:</strong> ${crec}% en zona de riesgo alto. Considera mover parte a Seguridad o Equilibrio.`
      : seg > 70
      ? `💤 <strong>Portafolio muy conservador:</strong> ${seg}% en zona segura. Tu dinero crece poco. Considera diversificar.`
      : `✅ <strong>Distribución saludable</strong> para tu perfil ${profile}.`;
    triCard.appendChild(alertDiv);
  }

  container.appendChild(triCard);

  // Distribution by type
  if (state.investments.length > 0) {
    const distCard = document.createElement('div');
    distCard.className = 'card';
    distCard.innerHTML = '<div class="card-title">Distribución por tipo</div>';
    const allTypes = [...INVEST_BY_ZONE.seguridad, ...INVEST_BY_ZONE.equilibrio, ...INVEST_BY_ZONE.crecimiento];
    const byType = {};
    state.investments.forEach(i => { byType[i.type] = (byType[i.type]||0) + i.currentValue; });
    Object.entries(byType).sort((a,b)=>b[1]-a[1]).forEach(([tid, val]) => {
      const t   = allTypes.find(x=>x.id===tid) || { emoji:'📦', name:tid };
      const pct = totalValue>0 ? Math.round((val/totalValue)*100) : 0;
      const zone = Object.entries(INVEST_BY_ZONE).find(([,arr])=>arr.some(x=>x.id===tid))?.[0]||'equilibrio';
      const zColor = ZONE_CONFIG[zone]?.color || 'var(--accent)';
      const item = document.createElement('div');
      item.style.cssText = 'margin-bottom:12px';
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:13px;font-weight:600">${t.emoji} ${t.name}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted2)">${fmt(val)} · ${pct}%</span>
        </div>
        <div style="background:var(--border);border-radius:99px;height:6px;overflow:hidden">
          <div style="width:${pct}%;background:${zColor};border-radius:99px;height:100%;transition:width .8s;box-shadow:0 0 5px ${zColor}44"></div>
        </div>`;
      distCard.appendChild(item);
    });
    container.appendChild(distCard);
  }

  // List
  const listCard = document.createElement('div');
  listCard.className = 'card';
  listCard.innerHTML = '<div class="section-header"><div class="section-title">Mis Posiciones</div></div>';

  if (!state.investments.length) {
    listCard.innerHTML += `<div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-text">Sin inversiones registradas.<br>Agrega acciones, crypto, fondos, etc.</div></div>`;
  } else {
    [...state.investments].sort((a,b)=>b.currentValue-a.currentValue).forEach(inv => {
      const allTypes = [...INVEST_BY_ZONE.seguridad,...INVEST_BY_ZONE.equilibrio,...INVEST_BY_ZONE.crecimiento];
      const t     = allTypes.find(x=>x.id===inv.type)||{emoji:'📦',name:inv.type};
      const gain  = inv.currentValue - inv.cost;
      const gainP = inv.cost>0 ? ((gain/inv.cost)*100).toFixed(1) : 0;
      const zCfg  = ZONE_CONFIG[inv.zone] || ZONE_CONFIG.equilibrio;
      const item  = document.createElement('div');
      item.className = 'tx-item';
      item.style.cursor = 'pointer';
      item.dataset.invId = inv.id;
      item.innerHTML = `
        <div class="tx-icon" style="background:${zCfg.color}22">${t.emoji}</div>
        <div class="tx-info">
          <div class="tx-desc">${inv.name}</div>
          <div class="tx-meta">${zCfg.emoji} ${zCfg.label.split('/')[0].trim()}${inv.notes?' · '+inv.notes:''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--accent)">${fmt(inv.currentValue)}</div>
          <div style="font-size:11px;color:${gain>=0?'var(--green)':'var(--red)'}">${gain>=0?'+':''}${fmt(gain)} (${gainP}%)</div>
        </div>
        <button class="tx-delete" data-inv-del="${inv.id}">🗑</button>`;
      listCard.appendChild(item);
    });
  }
  container.appendChild(listCard);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-goal';
  addBtn.textContent = '+ Agregar inversión';
  container.appendChild(addBtn);

  addBtn.addEventListener('click', () => { state.editingInvestId=null; openInvestModal(); });
  listCard.querySelectorAll('[data-inv-del]').forEach(b=>b.addEventListener('click',(e)=>{
    e.stopPropagation();
    if(confirm('¿Eliminar inversión?')){state.investments=state.investments.filter(i=>i.id!==b.dataset.invDel);save();renderTab();renderHeader();toast('Eliminada');}
  }));
  listCard.querySelectorAll('[data-inv-id]').forEach(item=>item.addEventListener('click',()=>{
    state.editingInvestId=item.dataset.invId; openInvestModal();
  }));
}

// ── MODAL: TRANSACTION ──
function openAddModal(type='gasto') {
  state.addType=type; state.selectedCat='';
  document.getElementById('modal-add').classList.remove('hidden');
  document.getElementById('inp-amount').value='';
  document.getElementById('inp-desc').value='';
  document.getElementById('inp-date').value=todayStr();
  renderCategoryGrid(); updateTypeToggle();
}
function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  const cats = state.addType==='ingreso' ? INCOME_CATS : CATEGORIES;
  grid.innerHTML = cats.map(c=>`<button class="cat-btn ${state.selectedCat===c.id?'selected':''}" data-cat="${c.id}"><span class="cat-btn-emoji">${c.emoji}</span><span class="cat-btn-name">${c.name}</span></button>`).join('');
  grid.querySelectorAll('.cat-btn').forEach(b=>b.addEventListener('click',()=>{state.selectedCat=b.dataset.cat;renderCategoryGrid();}));
}
function updateTypeToggle() {
  document.querySelectorAll('.type-btn[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===state.addType));
}
function saveTransaction() {
  const amount=parseFloat(document.getElementById('inp-amount').value);
  const desc=document.getElementById('inp-desc').value.trim();
  const date=document.getElementById('inp-date').value;
  if(!amount||amount<=0){toast('Monto inválido');return;}
  if(!state.selectedCat){toast('Selecciona categoría');return;}
  state.transactions.push({id:uid(),type:state.addType,amount,desc,category:state.selectedCat,date});
  save();closeModal('modal-add');renderTab();renderHeader();toast(`${state.addType==='ingreso'?'Ingreso':'Gasto'} registrado ✓`);
}

// ── MODAL: DEBT ──
function openDebtModal() {
  document.getElementById('modal-debt').classList.remove('hidden');
  const d=state.editingDebtId ? state.debts.find(x=>x.id===state.editingDebtId) : null;
  document.getElementById('debt-modal-title').textContent=d?'Editar Deuda':'Nueva Deuda';
  document.getElementById('inp-debt-name').value=d?d.name:'';
  document.getElementById('inp-debt-total').value=d?d.total:'';
  document.getElementById('inp-debt-remaining').value=d?d.remaining:'';
  document.getElementById('inp-debt-monthly').value=d?d.monthly:'';
  document.getElementById('inp-debt-rate').value=d?d.rate:'';
  state.selectedDebtType=d?d.type:'tarjeta';
  document.querySelectorAll('[data-dtype]').forEach(b=>b.classList.toggle('active',b.dataset.dtype===state.selectedDebtType));
}
function saveDebt() {
  const name=document.getElementById('inp-debt-name').value.trim();
  const total=parseFloat(document.getElementById('inp-debt-total').value)||0;
  const remaining=parseFloat(document.getElementById('inp-debt-remaining').value)||0;
  const monthly=parseFloat(document.getElementById('inp-debt-monthly').value)||0;
  const rate=parseFloat(document.getElementById('inp-debt-rate').value)||0;
  if(!name){toast('Ingresa un nombre');return;}
  if(total<=0){toast('Ingresa el saldo total');return;}
  const data={name,type:state.selectedDebtType,total,remaining,monthly,rate};
  if(state.editingDebtId){const i=state.debts.findIndex(d=>d.id===state.editingDebtId);if(i>=0)state.debts[i]={...state.debts[i],...data};}
  else state.debts.push({id:uid(),...data});
  save();closeModal('modal-debt');renderTab();renderHeader();toast('Deuda guardada ✓');
}

// ── MODAL: INVESTMENT ──
function openInvestModal() {
  document.getElementById('modal-invest').classList.remove('hidden');
  const inv=state.editingInvestId ? state.investments.find(x=>x.id===state.editingInvestId) : null;
  document.getElementById('invest-modal-title').textContent=inv?'Editar Inversión':'Nueva Inversión';
  document.getElementById('inp-invest-name').value=inv?inv.name:'';
  document.getElementById('inp-invest-cost').value=inv?inv.cost:'';
  document.getElementById('inp-invest-value').value=inv?inv.currentValue:'';
  document.getElementById('inp-invest-notes').value=inv?inv.notes||'':'';
  state.selectedZone=inv?inv.zone:'seguridad';
  state.selectedInvestType=inv?inv.type:(INVEST_BY_ZONE[state.selectedZone][0].id);
  updateTriangleSelector();
  renderInvestTypeGrid();
}
function updateTriangleSelector() {
  document.querySelectorAll('.tri-btn').forEach(b=>b.classList.toggle('active',b.dataset.zone===state.selectedZone));
}
function renderInvestTypeGrid() {
  const grid=document.getElementById('invest-type-grid');
  const types=INVEST_BY_ZONE[state.selectedZone]||[];
  grid.innerHTML=types.map(t=>`<button class="cat-btn ${state.selectedInvestType===t.id?'selected':''}" data-itype="${t.id}"><span class="cat-btn-emoji">${t.emoji}</span><span class="cat-btn-name">${t.name}</span></button>`).join('');
  grid.querySelectorAll('[data-itype]').forEach(b=>b.addEventListener('click',()=>{state.selectedInvestType=b.dataset.itype;renderInvestTypeGrid();}));
}
function saveInvestment() {
  const name=document.getElementById('inp-invest-name').value.trim();
  const cost=parseFloat(document.getElementById('inp-invest-cost').value)||0;
  const value=parseFloat(document.getElementById('inp-invest-value').value)||0;
  const notes=document.getElementById('inp-invest-notes').value.trim();
  if(!name){toast('Ingresa un nombre');return;}
  if(cost<=0){toast('Ingresa el valor invertido');return;}
  const data={name,zone:state.selectedZone,type:state.selectedInvestType,cost,currentValue:value||cost,notes};
  if(state.editingInvestId){const i=state.investments.findIndex(x=>x.id===state.editingInvestId);if(i>=0)state.investments[i]={...state.investments[i],...data};}
  else state.investments.push({id:uid(),...data});
  save();closeModal('modal-invest');renderTab();renderHeader();toast('Inversión guardada ✓');
}

// ── MODAL: SETTINGS ──
function openSettings() {
  document.getElementById('modal-settings').classList.remove('hidden');
  document.getElementById('inp-name').value=state.settings.name;
  document.getElementById('inp-income').value=state.settings.monthlyIncome||'';
  const p=state.settings.investorProfile||'moderado';
  document.querySelectorAll('[data-profile]').forEach(b=>b.classList.toggle('active',b.dataset.profile===p));
  document.getElementById('budget-inputs').innerHTML=CATEGORIES.map(c=>`
    <div class="budget-inp-row"><div class="budget-inp-label">${c.emoji} ${c.name}</div><input type="number" inputmode="decimal" placeholder="0" value="${state.settings.budgets[c.id]||''}" data-budget="${c.id}" /></div>`).join('');
}
function saveSettings() {
  state.settings.name=document.getElementById('inp-name').value.trim();
  state.settings.monthlyIncome=parseFloat(document.getElementById('inp-income').value)||0;
  document.querySelectorAll('[data-budget]').forEach(inp=>{state.settings.budgets[inp.dataset.budget]=parseFloat(inp.value)||0;});
  save();closeModal('modal-settings');renderHeader();renderTab();toast('Configuración guardada ✓');
}

// ── MODAL: GOAL ──
function openGoalModal() {
  document.getElementById('modal-goal').classList.remove('hidden');
  state.selectedEmoji='🎯';
  const g=state.editingGoalId?state.goals.find(x=>x.id===state.editingGoalId):null;
  document.getElementById('inp-goal-name').value=g?g.name:'';
  document.getElementById('inp-goal-target').value=g?g.target:'';
  document.getElementById('inp-goal-current').value=g?g.current:'';
  if(g)state.selectedEmoji=g.emoji;
  const eg=document.getElementById('emoji-grid');
  eg.innerHTML=EMOJIS.map(e=>`<div class="emoji-opt ${state.selectedEmoji===e?'selected':''}" data-emoji="${e}">${e}</div>`).join('');
  eg.querySelectorAll('.emoji-opt').forEach(el=>el.addEventListener('click',()=>{state.selectedEmoji=el.dataset.emoji;eg.querySelectorAll('.emoji-opt').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');}));
}
function saveGoal() {
  const name=document.getElementById('inp-goal-name').value.trim();
  const target=parseFloat(document.getElementById('inp-goal-target').value);
  const current=parseFloat(document.getElementById('inp-goal-current').value)||0;
  if(!name){toast('Ingresa un nombre');return;}
  if(!target||target<=0){toast('Ingresa el monto objetivo');return;}
  if(state.editingGoalId){const g=state.goals.find(x=>x.id===state.editingGoalId);if(g)Object.assign(g,{name,target,current,emoji:state.selectedEmoji});}
  else state.goals.push({id:uid(),name,target,current,emoji:state.selectedEmoji});
  save();closeModal('modal-goal');renderTab();toast('Meta guardada ✓');
}

// ── MORE MENU ──
function openMoreMenu() { document.getElementById('more-menu').classList.remove('hidden'); }
function closeMoreMenu() { document.getElementById('more-menu').classList.add('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ── INIT ──
function init() {
  load();

  const toastEl=document.createElement('div');
  toastEl.id='toast';
  document.body.appendChild(toastEl);

  setTimeout(()=>{
    document.getElementById('splash').style.opacity='0';
    setTimeout(()=>{
      document.getElementById('splash').style.display='none';
      document.getElementById('main').classList.remove('hidden');
      renderHeader(); renderTab();
    },400);
  },900);

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const tab=btn.dataset.tab;
    if(tab==='add'){openAddModal('gasto');return;}
    switchTab(tab);
  }));

  // More FAB
  document.getElementById('btn-more').addEventListener('click', openMoreMenu);
  document.getElementById('more-backdrop').addEventListener('click', closeMoreMenu);
  document.querySelectorAll('.more-item').forEach(item=>item.addEventListener('click',()=>switchTab(item.dataset.tab)));

  // Transaction
  document.querySelectorAll('.type-btn[data-type]').forEach(b=>b.addEventListener('click',()=>{state.addType=b.dataset.type;state.selectedCat='';updateTypeToggle();renderCategoryGrid();}));
  document.getElementById('btn-save-tx').addEventListener('click',saveTransaction);
  document.getElementById('btn-cancel-tx').addEventListener('click',()=>closeModal('modal-add'));
  document.getElementById('modal-backdrop').addEventListener('click',()=>closeModal('modal-add'));

  // Debt
  document.getElementById('btn-save-debt').addEventListener('click',saveDebt);
  document.getElementById('btn-cancel-debt').addEventListener('click',()=>closeModal('modal-debt'));
  document.getElementById('debt-backdrop').addEventListener('click',()=>closeModal('modal-debt'));
  document.querySelectorAll('[data-dtype]').forEach(b=>b.addEventListener('click',()=>{state.selectedDebtType=b.dataset.dtype;document.querySelectorAll('[data-dtype]').forEach(x=>x.classList.toggle('active',x.dataset.dtype===state.selectedDebtType));}));

  // Investment
  document.getElementById('btn-save-invest').addEventListener('click',saveInvestment);
  document.getElementById('btn-cancel-invest').addEventListener('click',()=>closeModal('modal-invest'));
  document.getElementById('invest-backdrop').addEventListener('click',()=>closeModal('modal-invest'));
  document.querySelectorAll('.tri-btn').forEach(b=>b.addEventListener('click',()=>{
    state.selectedZone=b.dataset.zone;
    state.selectedInvestType=INVEST_BY_ZONE[state.selectedZone][0].id;
    updateTriangleSelector();renderInvestTypeGrid();
  }));

  // Settings
  document.getElementById('btn-settings').addEventListener('click',openSettings);
  document.getElementById('btn-save-settings').addEventListener('click',saveSettings);
  document.getElementById('btn-cancel-settings').addEventListener('click',()=>closeModal('modal-settings'));
  document.getElementById('settings-backdrop').addEventListener('click',()=>closeModal('modal-settings'));
  document.querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>{
    state.settings.investorProfile=b.dataset.profile;
    document.querySelectorAll('[data-profile]').forEach(x=>x.classList.toggle('active',x.dataset.profile===b.dataset.profile));
  }));
  document.getElementById('btn-clear-data').addEventListener('click',()=>{if(confirm('¿Borrar TODOS los datos?')){localStorage.clear();location.reload();}});

  // Goal
  document.getElementById('btn-save-goal').addEventListener('click',saveGoal);
  document.getElementById('btn-cancel-goal').addEventListener('click',()=>closeModal('modal-goal'));
  document.getElementById('goal-backdrop').addEventListener('click',()=>closeModal('modal-goal'));
}

document.addEventListener('DOMContentLoaded', init);
