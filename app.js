// ── REGISTER SERVICE WORKER ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ── CATEGORIES ──
const CATEGORIES = [
  { id: 'vivienda',       emoji: '🏠', name: 'Vivienda',       color: '#00d4ff' },
  { id: 'comida',         emoji: '🛒', name: 'Comida',         color: '#ff4d6d' },
  { id: 'transporte',     emoji: '🚗', name: 'Transporte',     color: '#00e5a0' },
  { id: 'salud',          emoji: '💊', name: 'Salud',          color: '#b57bee' },
  { id: 'entretenimiento',emoji: '🎬', name: 'Entret.',        color: '#ffc857' },
  { id: 'ropa',           emoji: '👕', name: 'Ropa',           color: '#f97316' },
  { id: 'servicios',      emoji: '💡', name: 'Servicios',      color: '#38bdf8' },
  { id: 'educacion',      emoji: '📚', name: 'Educación',      color: '#a78bfa' },
  { id: 'restaurantes',   emoji: '🍽️', name: 'Restaurantes',  color: '#fb7185' },
  { id: 'ahorro',         emoji: '🏦', name: 'Ahorro',         color: '#00e5a0' },
  { id: 'inversiones',    emoji: '📈', name: 'Inversión',      color: '#00d4ff' },
  { id: 'otros',          emoji: '📦', name: 'Otros',          color: '#64748b' },
];

const INCOME_CATS = [
  { id: 'nomina',    emoji: '💼', name: 'Nómina',    color: '#00e5a0' },
  { id: 'freelance', emoji: '💻', name: 'Freelance', color: '#00d4ff' },
  { id: 'negocio',   emoji: '🏪', name: 'Negocio',   color: '#ffc857' },
  { id: 'otros_ing', emoji: '💵', name: 'Otros',     color: '#64748b' },
];

const EMOJIS = ['✈️','🚗','🏠','📱','💍','🎓','🏖️','🛡️','💻','🎯','🌎','👶','🐶','🎸','⚽'];

// ── STATE ──
let state = {
  transactions: [],
  goals: [],
  settings: {
    name: '',
    monthlyIncome: 0,
    budgets: {
      vivienda: 0, comida: 0, transporte: 0, salud: 0,
      entretenimiento: 0, ropa: 0, servicios: 0, educacion: 0,
      restaurantes: 0, ahorro: 0, inversiones: 0, otros: 0,
    }
  },
  currentTab: 'overview',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  txFilter: 'todos',
  addType: 'gasto',
  selectedCat: '',
  selectedEmoji: '🎯',
  editingGoalId: null,
};

// ── STORAGE ──
function save() {
  localStorage.setItem('finanzas_state', JSON.stringify({
    transactions: state.transactions,
    goals: state.goals,
    settings: state.settings,
  }));
}

function load() {
  try {
    const raw = localStorage.getItem('finanzas_state');
    if (!raw) return;
    const data = JSON.parse(raw);
    state.transactions = data.transactions || [];
    state.goals = data.goals || [];
    if (data.settings) {
      state.settings = { ...state.settings, ...data.settings };
      state.settings.budgets = { ...state.settings.budgets, ...(data.settings.budgets || {}) };
    }
  } catch(e) {}
}

// ── UTILS ──
function fmt(n) {
  return '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function monthName(m, y) {
  return new Date(y, m, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getCat(id, type) {
  const list = type === 'ingreso' ? INCOME_CATS : CATEGORIES;
  return list.find(c => c.id === id) || { emoji: '📦', name: id, color: '#64748b' };
}

function txInMonth(transactions, m, y) {
  return transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getMonth() === m && d.getFullYear() === y;
  });
}

function calcNetWorth() {
  const totalIncome = state.transactions.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const totalExpense = state.transactions.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  return totalIncome - totalExpense;
}

function calcScore() {
  const txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const income = txs.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);

  let score = 50;
  if (income > 0) {
    const savingRate = (income - expense) / income;
    if (savingRate >= 0.2) score += 20;
    else if (savingRate >= 0.1) score += 10;
    else if (savingRate < 0) score -= 20;
  }

  // Budget adherence
  const budgets = state.settings.budgets;
  let overCount = 0;
  CATEGORIES.forEach(cat => {
    if (budgets[cat.id] > 0) {
      const spent = txs.filter(t => t.type === 'gasto' && t.category === cat.id).reduce((s,t) => s + t.amount, 0);
      if (spent > budgets[cat.id]) overCount++;
    }
  });
  score -= overCount * 8;

  // Goals progress
  if (state.goals.length > 0) score += 10;

  return Math.max(10, Math.min(100, Math.round(score)));
}

// ── TOAST ──
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ── RENDER HEADER ──
function renderHeader() {
  const name = state.settings.name;
  const hour = new Date().getHours();
  let greet = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('greeting').textContent = name ? `${greet}, ${name} 👋` : `${greet} 👋`;

  const now = new Date();
  document.getElementById('header-date').textContent = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  const nw = calcNetWorth();
  const nwEl = document.getElementById('net-worth');
  nwEl.textContent = fmt(nw);
  nwEl.style.color = nw >= 0 ? 'var(--green)' : 'var(--red)';

  // Compare with previous month
  const prevMonth = state.currentMonth === 0 ? 11 : state.currentMonth - 1;
  const prevYear = state.currentMonth === 0 ? state.currentYear - 1 : state.currentYear;
  const prevTxs = txInMonth(state.transactions, prevMonth, prevYear);
  const prevIncome = prevTxs.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const prevExpense = prevTxs.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  const prevNW = prevIncome - prevExpense;

  const curTxs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const curIncome = curTxs.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const curExpense = curTxs.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  const curNet = curIncome - curExpense;

  const delta = curNet - prevNW;
  const deltaEl = document.getElementById('nw-delta');
  if (delta !== 0) {
    deltaEl.textContent = `${delta > 0 ? '▲' : '▼'} ${fmt(Math.abs(delta))} vs mes anterior`;
    deltaEl.className = 'nw-delta ' + (delta > 0 ? 'positive' : 'negative');
  } else {
    deltaEl.textContent = 'Primer mes registrado';
    deltaEl.className = 'nw-delta';
  }
}

// ── TABS ──
function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  renderTab();
}

function renderTab() {
  const content = document.getElementById('tab-content');
  content.innerHTML = '';
  content.classList.remove('tab-enter');
  void content.offsetWidth;
  content.classList.add('tab-enter');

  if (state.currentTab === 'overview') renderOverview(content);
  else if (state.currentTab === 'transactions') renderTransactions(content);
  else if (state.currentTab === 'budget') renderBudget(content);
  else if (state.currentTab === 'goals') renderGoals(content);
}

// ── OVERVIEW ──
function renderOverview(container) {
  const txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  const income = txs.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  const net = income - expense;
  const savingRate = income > 0 ? Math.round((net / income) * 100) : 0;
  const score = calcScore();

  // Month selector
  const monthSel = document.createElement('div');
  monthSel.className = 'month-selector';
  monthSel.innerHTML = `
    <button class="month-nav" id="btn-prev-month">‹</button>
    <div class="month-label">${monthName(state.currentMonth, state.currentYear)}</div>
    <button class="month-nav" id="btn-next-month">›</button>
  `;
  container.appendChild(monthSel);

  // KPIs
  const kpiGrid = document.createElement('div');
  kpiGrid.className = 'kpi-grid';
  kpiGrid.innerHTML = `
    <div class="kpi-card green">
      <div class="kpi-label">Ingresos</div>
      <div class="kpi-value" style="color:var(--green)">${fmt(income)}</div>
      <div class="kpi-sub">Este mes</div>
    </div>
    <div class="kpi-card red">
      <div class="kpi-label">Gastos</div>
      <div class="kpi-value" style="color:var(--red)">${fmt(expense)}</div>
      <div class="kpi-sub">Este mes</div>
    </div>
    <div class="kpi-card accent">
      <div class="kpi-label">Ahorro neto</div>
      <div class="kpi-value" style="color:${net >= 0 ? 'var(--accent)' : 'var(--red)'}">${fmt(net)}</div>
      <div class="kpi-sub">${savingRate}% tasa de ahorro</div>
    </div>
    <div class="kpi-card purple">
      <div class="kpi-label">Transacciones</div>
      <div class="kpi-value" style="color:var(--purple)">${txs.length}</div>
      <div class="kpi-sub">Este mes</div>
    </div>
  `;
  container.appendChild(kpiGrid);

  // Score card
  const scoreCard = document.createElement('div');
  scoreCard.className = 'card';
  const scoreColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';
  const scoreLabel = score >= 75 ? '🟢 Salud Excelente' : score >= 50 ? '🟡 Salud Moderada' : '🔴 Requiere Atención';
  const r = 40, circ = 2 * Math.PI * r;
  const dash = circ * (1 - score / 100);
  scoreCard.innerHTML = `
    <div class="card-title">Score Financiero</div>
    <div class="score-wrap">
      <svg width="100" height="100">
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--border)" stroke-width="8"/>
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="${scoreColor}" stroke-width="8"
          stroke-dasharray="${circ}" stroke-dashoffset="${dash}"
          stroke-linecap="round" transform="rotate(-90 50 50)"
          style="filter:drop-shadow(0 0 6px ${scoreColor});transition:stroke-dashoffset 1s ease"/>
        <text x="50" y="47" text-anchor="middle" fill="${scoreColor}" font-size="20" font-weight="700" font-family="JetBrains Mono,monospace">${score}</text>
        <text x="50" y="62" text-anchor="middle" fill="var(--muted)" font-size="10">/100</text>
      </svg>
      <div class="score-info">
        <div class="score-badge" style="background:${scoreColor}22;color:${scoreColor}">${scoreLabel}</div>
        <div class="score-desc">${getScoreDesc(score, savingRate, income, expense)}</div>
      </div>
    </div>
  `;
  container.appendChild(scoreCard);

  // Mini bar chart (last 5 months)
  const chartCard = document.createElement('div');
  chartCard.className = 'card';
  const months = [];
  for (let i = 4; i >= 0; i--) {
    let m = state.currentMonth - i;
    let y = state.currentYear;
    if (m < 0) { m += 12; y--; }
    const t = txInMonth(state.transactions, m, y);
    const inc = t.filter(x => x.type === 'ingreso').reduce((s,x) => s + x.amount, 0);
    const exp = t.filter(x => x.type === 'gasto').reduce((s,x) => s + x.amount, 0);
    months.push({ label: new Date(y, m, 1).toLocaleDateString('es-MX', { month: 'short' }), income: inc, expense: exp });
  }
  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);
  chartCard.innerHTML = `
    <div class="card-title">Últimos 5 meses</div>
    <div class="mini-chart">
      ${months.map(m => `
        <div class="mini-bar-wrap">
          <div class="mini-bar" style="height:${(m.income/maxVal)*48}px;background:var(--green);opacity:0.8"></div>
          <div class="mini-bar" style="height:${(m.expense/maxVal)*48}px;background:var(--red);opacity:0.8;margin-top:2px"></div>
          <div class="mini-bar-label">${m.label}</div>
        </div>
      `).join('')}
    </div>
    <div style="display:flex;gap:14px;margin-top:8px">
      <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:var(--green);border-radius:2px;display:inline-block"></span>Ingresos</div>
      <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:var(--red);border-radius:2px;display:inline-block"></span>Gastos</div>
    </div>
  `;
  container.appendChild(chartCard);

  // Recent transactions
  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  const recent = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  recentCard.innerHTML = `
    <div class="section-header">
      <div class="section-title">Recientes</div>
      <button class="section-action" id="btn-see-all">Ver todos →</button>
    </div>
    ${recent.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">Sin movimientos aún.<br>Toca + para agregar uno.</div>
      </div>
    ` : recent.map(t => renderTxItem(t)).join('')}
  `;
  container.appendChild(recentCard);

  // Recommendations
  const recs = getRecommendations(txs, income, expense, savingRate);
  if (recs.length > 0) {
    const recCard = document.createElement('div');
    recCard.className = 'card';
    recCard.innerHTML = `
      <div class="card-title">💡 Recomendaciones</div>
      ${recs.map(r => `<div class="rec-item"><div class="rec-icon">${r.icon}</div><div class="rec-text">${r.text}</div></div>`).join('')}
    `;
    container.appendChild(recCard);
  }

  // Events
  document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    if (state.currentMonth === 0) { state.currentMonth = 11; state.currentYear--; }
    else state.currentMonth--;
    renderTab(); renderHeader();
  });
  document.getElementById('btn-next-month')?.addEventListener('click', () => {
    const now = new Date();
    if (state.currentYear < now.getFullYear() || (state.currentYear === now.getFullYear() && state.currentMonth < now.getMonth())) {
      if (state.currentMonth === 11) { state.currentMonth = 0; state.currentYear++; }
      else state.currentMonth++;
      renderTab(); renderHeader();
    }
  });
  document.getElementById('btn-see-all')?.addEventListener('click', () => switchTab('transactions'));
}

function getScoreDesc(score, savingRate, income, expense) {
  if (income === 0) return 'Registra tus ingresos para calcular tu score.';
  if (score >= 75) return `Excelente trabajo. Ahorras el ${savingRate}% de tus ingresos y tienes tus presupuestos controlados.`;
  if (score >= 50) return `Vas bien. Intenta aumentar tu tasa de ahorro al 20% y revisa las categorías excedidas.`;
  return `Tus gastos superan o se acercan a tus ingresos. Revisa el presupuesto por categoría.`;
}

function getRecommendations(txs, income, expense, savingRate) {
  const recs = [];
  if (income === 0) { recs.push({ icon: '💼', text: 'Registra tus ingresos del mes para activar el análisis completo.' }); return recs; }
  if (savingRate < 0) recs.push({ icon: '🚨', text: 'Tus gastos superan tus ingresos este mes. Revisa en qué categorías puedes reducir.' });
  else if (savingRate < 10) recs.push({ icon: '⚠️', text: `Ahorras solo el ${savingRate}%. El objetivo recomendado es al menos 20%.` });
  else if (savingRate >= 20) recs.push({ icon: '✅', text: `¡Excelente! Ahorras el ${savingRate}% de tus ingresos. Considera invertir el excedente.` });

  CATEGORIES.forEach(cat => {
    const budget = state.settings.budgets[cat.id];
    if (budget > 0) {
      const spent = txs.filter(t => t.type === 'gasto' && t.category === cat.id).reduce((s,t) => s + t.amount, 0);
      if (spent > budget) recs.push({ icon: '📊', text: `${cat.emoji} ${cat.name} superó el presupuesto en ${fmt(spent - budget)}.` });
    }
  });

  if (state.goals.length === 0) recs.push({ icon: '🎯', text: 'Crea una meta de ahorro para mantenerte motivado.' });
  return recs.slice(0, 4);
}

// ── TRANSACTIONS ──
function renderTransactions(container) {
  const monthSel = document.createElement('div');
  monthSel.className = 'month-selector';
  monthSel.innerHTML = `
    <button class="month-nav" id="btn-prev-month">‹</button>
    <div class="month-label">${monthName(state.currentMonth, state.currentYear)}</div>
    <button class="month-nav" id="btn-next-month">›</button>
  `;
  container.appendChild(monthSel);

  const chips = document.createElement('div');
  chips.className = 'filter-chips';
  const filters = ['todos', 'ingresos', 'gastos', ...CATEGORIES.map(c => c.id)];
  const labels = { todos: '🗂 Todos', ingresos: '💰 Ingresos', gastos: '💸 Gastos' };
  chips.innerHTML = ['todos','ingresos','gastos'].map(f => `
    <div class="chip ${state.txFilter === f ? 'active' : ''}" data-filter="${f}">${labels[f]}</div>
  `).join('') + CATEGORIES.map(c => `
    <div class="chip ${state.txFilter === c.id ? 'active' : ''}" data-filter="${c.id}">${c.emoji} ${c.name}</div>
  `).join('');
  container.appendChild(chips);

  let txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);
  if (state.txFilter === 'ingresos') txs = txs.filter(t => t.type === 'ingreso');
  else if (state.txFilter === 'gastos') txs = txs.filter(t => t.type === 'gasto');
  else if (state.txFilter !== 'todos') txs = txs.filter(t => t.category === state.txFilter);
  txs = [...txs].sort((a,b) => new Date(b.date) - new Date(a.date));

  const card = document.createElement('div');
  card.className = 'card';
  if (txs.length === 0) {
    card.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Sin movimientos aquí.<br>Toca + para agregar.</div></div>`;
  } else {
    card.innerHTML = txs.map(t => renderTxItem(t, true)).join('');
  }
  container.appendChild(card);

  chips.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      state.txFilter = c.dataset.filter;
      renderTab();
    });
  });

  document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    if (state.currentMonth === 0) { state.currentMonth = 11; state.currentYear--; }
    else state.currentMonth--;
    renderTab(); renderHeader();
  });
  document.getElementById('btn-next-month')?.addEventListener('click', () => {
    const now = new Date();
    if (state.currentYear < now.getFullYear() || (state.currentYear === now.getFullYear() && state.currentMonth < now.getMonth())) {
      if (state.currentMonth === 11) { state.currentMonth = 0; state.currentYear++; }
      else state.currentMonth++;
      renderTab(); renderHeader();
    }
  });

  card.querySelectorAll('.tx-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('¿Eliminar este movimiento?')) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        save(); renderTab(); renderHeader();
        toast('Movimiento eliminado');
      }
    });
  });
}

function renderTxItem(t, showDelete = false) {
  const cat = getCat(t.category, t.type);
  const bgColor = t.type === 'ingreso' ? 'var(--green-dim)' : 'var(--red-dim)';
  const d = new Date(t.date + 'T12:00:00');
  const dateStr = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  return `
    <div class="tx-item fade-in">
      <div class="tx-icon" style="background:${bgColor}">${cat.emoji}</div>
      <div class="tx-info">
        <div class="tx-desc">${t.desc || cat.name}</div>
        <div class="tx-meta">${cat.name} · ${dateStr}</div>
      </div>
      <div class="tx-amount ${t.type === 'ingreso' ? 'income' : 'expense'}">
        ${t.type === 'ingreso' ? '+' : '-'}${fmt(t.amount)}
      </div>
      ${showDelete ? `<button class="tx-delete" data-id="${t.id}">🗑</button>` : ''}
    </div>
  `;
}

// ── BUDGET ──
function renderBudget(container) {
  const txs = txInMonth(state.transactions, state.currentMonth, state.currentYear);

  const monthSel = document.createElement('div');
  monthSel.className = 'month-selector';
  monthSel.innerHTML = `
    <button class="month-nav" id="btn-prev-month">‹</button>
    <div class="month-label">${monthName(state.currentMonth, state.currentYear)}</div>
    <button class="month-nav" id="btn-next-month">›</button>
  `;
  container.appendChild(monthSel);

  // Income card
  const incomeCard = document.createElement('div');
  incomeCard.className = 'card';
  const totalIncome = txs.filter(t => t.type === 'ingreso').reduce((s,t) => s + t.amount, 0);
  const totalExpense = txs.filter(t => t.type === 'gasto').reduce((s,t) => s + t.amount, 0);
  const expected = state.settings.monthlyIncome;
  incomeCard.innerHTML = `
    <div class="card-title">Resumen del mes</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:2px">Ingresos reales</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--green)">${fmt(totalIncome)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--muted);margin-bottom:2px">Total gastado</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--red)">${fmt(totalExpense)}</div>
      </div>
    </div>
    ${expected > 0 ? `
      <div style="background:var(--border);border-radius:99px;height:6px;margin-bottom:4px">
        <div style="width:${Math.min((totalExpense/expected)*100,100)}%;background:${totalExpense>expected?'var(--red)':'var(--accent)'};border-radius:99px;height:100%;transition:width 0.8s ease"></div>
      </div>
      <div style="font-size:11px;color:var(--muted)">${Math.round((totalExpense/expected)*100)}% del ingreso esperado usado</div>
    ` : `<div style="font-size:12px;color:var(--muted)">Configura tu ingreso mensual en ⚙️ para ver el análisis completo.</div>`}
  `;
  container.appendChild(incomeCard);

  // Per category
  const catCard = document.createElement('div');
  catCard.className = 'card';
  catCard.innerHTML = '<div class="card-title">Presupuesto por categoría</div>';

  let hasBudgets = false;
  CATEGORIES.forEach(cat => {
    const budget = state.settings.budgets[cat.id] || 0;
    const spent = txs.filter(t => t.type === 'gasto' && t.category === cat.id).reduce((s,t) => s + t.amount, 0);
    if (spent === 0 && budget === 0) return;
    hasBudgets = true;

    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 100;
    const over = budget > 0 && spent > budget;
    const barColor = over ? 'var(--red)' : spent / (budget || spent) > 0.8 ? 'var(--yellow)' : 'var(--accent)';

    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div class="budget-header">
        <div class="budget-name">${cat.emoji} ${cat.name} ${over ? '<span class="over-tag">EXCEDIDO</span>' : ''}</div>
        <div class="budget-amounts">${fmt(spent)} ${budget > 0 ? '/ ' + fmt(budget) : ''}</div>
      </div>
      <div class="budget-bar-bg">
        <div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div>
      </div>
      ${over ? `<div class="budget-warning">Excediste por ${fmt(spent - budget)}</div>` : ''}
    `;
    catCard.appendChild(item);
  });

  if (!hasBudgets) {
    catCard.innerHTML += `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Sin gastos ni presupuestos aún.<br>Configura tus presupuestos en ⚙️</div></div>`;
  }

  container.appendChild(catCard);

  document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    if (state.currentMonth === 0) { state.currentMonth = 11; state.currentYear--; }
    else state.currentMonth--;
    renderTab(); renderHeader();
  });
  document.getElementById('btn-next-month')?.addEventListener('click', () => {
    const now = new Date();
    if (state.currentYear < now.getFullYear() || (state.currentYear === now.getFullYear() && state.currentMonth < now.getMonth())) {
      if (state.currentMonth === 11) { state.currentMonth = 0; state.currentYear++; }
      else state.currentMonth++;
      renderTab(); renderHeader();
    }
  });
}

// ── GOALS ──
function renderGoals(container) {
  const title = document.createElement('div');
  title.className = 'section-header';
  title.innerHTML = '<div class="section-title">Mis Metas</div>';
  container.appendChild(title);

  if (state.goals.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<div class="empty-state-icon">🎯</div><div class="empty-state-text">Sin metas aún.<br>Crea una para empezar a ahorrar con propósito.</div>`;
    container.appendChild(empty);
  } else {
    state.goals.forEach(g => {
      const pct = Math.min(Math.round((g.current / g.target) * 100), 100);
      const remaining = Math.max(g.target - g.current, 0);
      const monthly = state.settings.monthlyIncome * 0.2;
      const eta = monthly > 0 ? Math.ceil(remaining / monthly) : null;

      const card = document.createElement('div');
      card.className = 'goal-card';
      card.innerHTML = `
        <div class="goal-header">
          <div>
            <div class="goal-emoji">${g.emoji}</div>
            <div class="goal-name">${g.name}</div>
            <div class="goal-eta">${eta ? `~${eta} meses restantes` : remaining === 0 ? '🎉 ¡Meta alcanzada!' : 'Configura tu ingreso para ver ETA'}</div>
          </div>
          <div class="goal-pct">${pct}%</div>
        </div>
        <div class="goal-bar-bg">
          <div class="goal-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-amounts">
          <span style="color:var(--green);font-family:'JetBrains Mono',monospace;font-size:13px">${fmt(g.current)} ahorrado</span>
          <span style="color:var(--muted);font-size:12px">Meta: <strong style="color:var(--text);font-family:'JetBrains Mono',monospace">${fmt(g.target)}</strong></span>
        </div>
        <div class="goal-actions">
          <button class="btn-sm" data-goal-add="${g.id}">+ Agregar ahorro</button>
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

  addBtn.addEventListener('click', () => {
    state.editingGoalId = null;
    openGoalModal();
  });

  container.querySelectorAll('[data-goal-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('¿Eliminar esta meta?')) {
        state.goals = state.goals.filter(g => g.id !== btn.dataset.goalDel);
        save(); renderTab(); toast('Meta eliminada');
      }
    });
  });

  container.querySelectorAll('[data-goal-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editingGoalId = btn.dataset.goalEdit;
      openGoalModal();
    });
  });

  container.querySelectorAll('[data-goal-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.goalAdd;
      const goal = state.goals.find(g => g.id === id);
      if (!goal) return;
      const amtStr = prompt(`¿Cuánto agregas a "${goal.name}"?`);
      const amt = parseFloat(amtStr);
      if (!isNaN(amt) && amt > 0) {
        goal.current = Math.min(goal.current + amt, goal.target);
        save(); renderTab(); toast(`${fmt(amt)} agregados a ${goal.name}`);
      }
    });
  });
}

// ── MODAL: ADD TRANSACTION ──
function openAddModal(type = 'gasto') {
  state.addType = type;
  state.selectedCat = '';
  const modal = document.getElementById('modal-add');
  modal.classList.remove('hidden');
  document.getElementById('inp-amount').value = '';
  document.getElementById('inp-desc').value = '';
  document.getElementById('inp-date').value = todayStr();
  renderCategoryGrid();
  updateTypeToggle();
}

function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  const cats = state.addType === 'ingreso' ? INCOME_CATS : CATEGORIES;
  grid.innerHTML = cats.map(c => `
    <button class="cat-btn ${state.selectedCat === c.id ? 'selected' : ''}" data-cat="${c.id}">
      <span class="cat-btn-emoji">${c.emoji}</span>
      <span class="cat-btn-name">${c.name}</span>
    </button>
  `).join('');
  grid.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedCat = btn.dataset.cat;
      renderCategoryGrid();
    });
  });
}

function updateTypeToggle() {
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === state.addType);
  });
}

function closeAddModal() {
  document.getElementById('modal-add').classList.add('hidden');
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('inp-amount').value);
  const desc = document.getElementById('inp-desc').value.trim();
  const date = document.getElementById('inp-date').value;
  const cat = state.selectedCat;

  if (!amount || amount <= 0) { toast('Ingresa un monto válido'); return; }
  if (!cat) { toast('Selecciona una categoría'); return; }
  if (!date) { toast('Selecciona una fecha'); return; }

  state.transactions.push({ id: uid(), type: state.addType, amount, desc, category: cat, date });
  save();
  closeAddModal();
  renderTab();
  renderHeader();
  toast(`${state.addType === 'ingreso' ? 'Ingreso' : 'Gasto'} registrado ✓`);
}

// ── MODAL: GOAL ──
function openGoalModal() {
  const modal = document.getElementById('modal-goal');
  modal.classList.remove('hidden');
  state.selectedEmoji = '🎯';

  const goal = state.editingGoalId ? state.goals.find(g => g.id === state.editingGoalId) : null;
  document.getElementById('inp-goal-name').value = goal ? goal.name : '';
  document.getElementById('inp-goal-target').value = goal ? goal.target : '';
  document.getElementById('inp-goal-current').value = goal ? goal.current : '';
  if (goal) state.selectedEmoji = goal.emoji;

  const emojiGrid = document.getElementById('emoji-grid');
  emojiGrid.innerHTML = EMOJIS.map(e => `
    <div class="emoji-opt ${state.selectedEmoji === e ? 'selected' : ''}" data-emoji="${e}">${e}</div>
  `).join('');
  emojiGrid.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedEmoji = el.dataset.emoji;
      emojiGrid.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
}

function saveGoal() {
  const name = document.getElementById('inp-goal-name').value.trim();
  const target = parseFloat(document.getElementById('inp-goal-target').value);
  const current = parseFloat(document.getElementById('inp-goal-current').value) || 0;

  if (!name) { toast('Ingresa un nombre'); return; }
  if (!target || target <= 0) { toast('Ingresa un monto objetivo'); return; }

  if (state.editingGoalId) {
    const g = state.goals.find(x => x.id === state.editingGoalId);
    if (g) { g.name = name; g.target = target; g.current = current; g.emoji = state.selectedEmoji; }
  } else {
    state.goals.push({ id: uid(), name, target, current, emoji: state.selectedEmoji });
  }

  save();
  document.getElementById('modal-goal').classList.add('hidden');
  renderTab();
  toast('Meta guardada ✓');
}

// ── MODAL: SETTINGS ──
function openSettings() {
  document.getElementById('modal-settings').classList.remove('hidden');
  document.getElementById('inp-name').value = state.settings.name;
  document.getElementById('inp-income').value = state.settings.monthlyIncome || '';

  const budgetInputs = document.getElementById('budget-inputs');
  budgetInputs.innerHTML = CATEGORIES.map(c => `
    <div class="budget-inp-row">
      <div class="budget-inp-label">${c.emoji} ${c.name}</div>
      <input type="number" inputmode="decimal" placeholder="0" value="${state.settings.budgets[c.id] || ''}" data-budget="${c.id}" />
    </div>
  `).join('');
}

function saveSettings() {
  state.settings.name = document.getElementById('inp-name').value.trim();
  state.settings.monthlyIncome = parseFloat(document.getElementById('inp-income').value) || 0;

  document.querySelectorAll('[data-budget]').forEach(inp => {
    state.settings.budgets[inp.dataset.budget] = parseFloat(inp.value) || 0;
  });

  save();
  document.getElementById('modal-settings').classList.add('hidden');
  renderHeader();
  renderTab();
  toast('Configuración guardada ✓');
}

// ── INIT ──
function init() {
  load();

  // Hide splash
  setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      document.getElementById('main').classList.remove('hidden');
      renderHeader();
      renderTab();
    }, 400);
  }, 1000);

  // Toast element
  const toast_el = document.createElement('div');
  toast_el.id = 'toast';
  document.body.appendChild(toast_el);

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === 'add') { openAddModal('gasto'); return; }
      switchTab(tab);
    });
  });

  // Add modal
  document.querySelectorAll('.type-btn').forEach(b => {
    b.addEventListener('click', () => {
      state.addType = b.dataset.type;
      state.selectedCat = '';
      updateTypeToggle();
      renderCategoryGrid();
    });
  });
  document.getElementById('btn-save-tx').addEventListener('click', saveTransaction);
  document.getElementById('btn-cancel-tx').addEventListener('click', closeAddModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeAddModal);

  // Settings
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('btn-cancel-settings').addEventListener('click', () => document.getElementById('modal-settings').classList.add('hidden'));
  document.getElementById('settings-backdrop').addEventListener('click', () => document.getElementById('modal-settings').classList.add('hidden'));
  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('finanzas_state');
      location.reload();
    }
  });

  // Goal modal
  document.getElementById('btn-save-goal').addEventListener('click', saveGoal);
  document.getElementById('btn-cancel-goal').addEventListener('click', () => document.getElementById('modal-goal').classList.add('hidden'));
  document.getElementById('goal-backdrop').addEventListener('click', () => document.getElementById('modal-goal').classList.add('hidden'));
}

document.addEventListener('DOMContentLoaded', init);
