/* ============================================
   Amazon Weekly Dashboard — Core Application
   ============================================ */

const STORAGE_KEY = 'amazon_dashboard_data';

const FIELDS = [
  { key: 'week',               label: 'Week',                 type: 'date',   format: 'date' },
  { key: 'units_sold',         label: 'Units Sold',           type: 'number', format: 'int',     section: 'sales' },
  { key: 'revenue',            label: 'Revenue',              type: 'number', format: 'currency', section: 'sales' },
  { key: 'sessions',           label: 'Sessions',             type: 'number', format: 'int',     section: 'sales' },
  { key: 'conversion_rate',    label: 'Conversion Rate',      type: 'number', format: 'pct',     section: 'sales' },
  { key: 'avg_selling_price',  label: 'Avg Selling Price',    type: 'number', format: 'currency', section: 'sales' },
  { key: 'ad_spend',           label: 'Ad Spend',             type: 'number', format: 'currency', section: 'ads' },
  { key: 'tacos',              label: 'TACoS',                type: 'number', format: 'pct',     section: 'ads' },
  { key: 'cpc',                label: 'CPC',                  type: 'number', format: 'currency', section: 'ads' },
  { key: 'ctr',                label: 'CTR',                  type: 'number', format: 'pct',     section: 'ads' },
  { key: 'profit_estimate',    label: 'Profit Estimate',      type: 'number', format: 'currency', section: 'health' },
  { key: 'review_count',       label: 'Review Count',         type: 'number', format: 'int',     section: 'health' },
  { key: 'inventory_on_hand',  label: 'Inventory On Hand',    type: 'number', format: 'int',     section: 'health' },
];

// Metrics where a decrease is good (lower = better)
const LOWER_IS_BETTER = ['tacos', 'cpc', 'ad_spend'];

// ---- Data Layer ----

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveData(data) {
  data.sort((a, b) => a.week.localeCompare(b.week));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function addWeeks(rows) {
  const data = loadData();
  const existingWeeks = new Set(data.map(d => d.week));

  rows.forEach(row => {
    if (existingWeeks.has(row.week)) {
      const idx = data.findIndex(d => d.week === row.week);
      if (idx !== -1) data[idx] = row;
    } else {
      data.push(row);
    }
  });

  saveData(data);
  return data;
}

function deleteWeek(week) {
  const data = loadData().filter(d => d.week !== week);
  saveData(data);
  return data;
}

function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
}

// Compute weeks of inventory left from current units_sold rate
function computeWeeksOfInventory(row) {
  if (!row.units_sold || row.units_sold === 0) return Infinity;
  return row.inventory_on_hand / row.units_sold;
}

// ---- Formatting ----

function fmt(value, format) {
  if (value == null || isNaN(value)) return '—';
  switch (format) {
    case 'currency': return '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'pct':      return Number(value).toFixed(2) + '%';
    case 'int':      return Math.round(value).toLocaleString('en-US');
    case 'date':     return value;
    case 'weeks':    return value === Infinity ? '—' : Number(value).toFixed(1) + 'w';
    default:         return String(value);
  }
}

function fmtChange(pct) {
  if (pct == null || isNaN(pct)) return '';
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(1) + '%';
}

// ---- Rendering ----

let revenueChart = null;
let adChart = null;
let inventoryChart = null;

function render() {
  const data = loadData();
  const weekSelector = document.getElementById('weekSelector');

  if (!data.length) {
    document.getElementById('dashboardContent').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
    weekSelector.innerHTML = '<option>No data</option>';
    return;
  }

  document.getElementById('dashboardContent').classList.remove('hidden');
  document.getElementById('emptyState').classList.add('hidden');

  // Populate week selector
  const currentSelection = weekSelector.value;
  weekSelector.innerHTML = '';
  data.forEach((row, idx) => {
    const opt = document.createElement('option');
    opt.value = row.week;
    opt.textContent = row.week;
    weekSelector.appendChild(opt);
  });

  // Select latest week by default, or preserve selection
  if (data.find(d => d.week === currentSelection)) {
    weekSelector.value = currentSelection;
  } else {
    weekSelector.value = data[data.length - 1].week;
  }

  const selectedWeek = weekSelector.value;
  const currentIdx = data.findIndex(d => d.week === selectedWeek);
  const current = data[currentIdx];
  const previous = currentIdx > 0 ? data[currentIdx - 1] : null;

  renderKPIs(current, previous);
  renderCharts(data);
  renderTable(data);
}

function renderKPIs(current, previous) {
  const sections = { sales: 'salesKPIs', ads: 'adsKPIs', health: 'healthKPIs' };

  Object.values(sections).forEach(id => {
    document.getElementById(id).innerHTML = '';
  });

  // Render standard metric cards
  FIELDS.filter(f => f.section).forEach(field => {
    const val = current[field.key];
    const prevVal = previous ? previous[field.key] : null;

    let changePct = null;
    if (prevVal != null && prevVal !== 0) {
      changePct = ((val - prevVal) / Math.abs(prevVal)) * 100;
    }

    const card = createKPICard(field.label, fmt(val, field.format), changePct, field.key);
    document.getElementById(sections[field.section]).appendChild(card);
  });

  // Add computed "Weeks of Inventory" card to health section
  const woi = computeWeeksOfInventory(current);
  const prevWoi = previous ? computeWeeksOfInventory(previous) : null;
  let woiChange = null;
  if (prevWoi != null && prevWoi !== Infinity && prevWoi !== 0) {
    woiChange = ((woi - prevWoi) / Math.abs(prevWoi)) * 100;
  }
  const woiCard = createKPICard('Weeks of Inventory', fmt(woi, 'weeks'), woiChange, 'weeks_of_inventory');
  document.getElementById(sections.health).appendChild(woiCard);

  // Add WoW change summary card
  if (previous) {
    const revChange = ((current.revenue - previous.revenue) / previous.revenue) * 100;
    const summaryCard = createKPICard('WoW Revenue', fmtChange(revChange), revChange, 'revenue');
    summaryCard.querySelector('.kpi-value').textContent = fmt(current.revenue - previous.revenue, 'currency');
    summaryCard.querySelector('.kpi-label').textContent = 'WOW REVENUE CHANGE';
    document.getElementById(sections.sales).appendChild(summaryCard);
  }
}

function createKPICard(label, value, changePct, key) {
  const card = document.createElement('div');
  card.className = 'kpi-card';

  let changeHTML = '';
  if (changePct != null && !isNaN(changePct)) {
    const isGood = LOWER_IS_BETTER.includes(key) ? changePct <= 0 : changePct >= 0;
    const dir = changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'neutral';
    const colorClass = changePct === 0 ? 'neutral' : (isGood ? 'up' : 'down');
    const arrow = changePct > 0 ? '&#9650;' : changePct < 0 ? '&#9660;' : '&#8212;';
    changeHTML = `<div class="kpi-change ${colorClass}">${arrow} ${fmtChange(Math.abs(changePct))}</div>`;
  }

  card.innerHTML = `
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
    ${changeHTML}
  `;

  return card;
}

function renderCharts(data) {
  const labels = data.map(d => d.week);
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 12 } }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b' },
        grid: { color: 'rgba(42, 47, 66, 0.5)' }
      },
      y: {
        ticks: { color: '#64748b' },
        grid: { color: 'rgba(42, 47, 66, 0.5)' }
      }
    }
  };

  // Revenue + Units chart
  const revenueCtx = document.getElementById('revenueChart').getContext('2d');
  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(revenueCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: data.map(d => d.revenue),
          borderColor: '#4f8cff',
          backgroundColor: 'rgba(79, 140, 255, 0.1)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Units Sold',
          data: data.map(d => d.units_sold),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: false,
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          position: 'left',
          title: { display: true, text: 'Revenue ($)', color: '#94a3b8' }
        },
        y1: {
          position: 'right',
          ticks: { color: '#64748b' },
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Units', color: '#94a3b8' }
        }
      }
    }
  });

  // Ad Performance chart
  const adCtx = document.getElementById('adChart').getContext('2d');
  if (adChart) adChart.destroy();
  adChart = new Chart(adCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'TACoS (%)',
          data: data.map(d => d.tacos),
          borderColor: '#f59e0b',
          tension: 0.3
        },
        {
          label: 'CPC ($)',
          data: data.map(d => d.cpc),
          borderColor: '#ef4444',
          tension: 0.3
        },
        {
          label: 'CTR (%)',
          data: data.map(d => d.ctr),
          borderColor: '#8b5cf6',
          tension: 0.3
        }
      ]
    },
    options: chartOptions
  });

  // Inventory chart
  const invCtx = document.getElementById('inventoryChart').getContext('2d');
  if (inventoryChart) inventoryChart.destroy();
  inventoryChart = new Chart(invCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Inventory On Hand',
        data: data.map(d => d.inventory_on_hand),
        backgroundColor: 'rgba(79, 140, 255, 0.6)',
        borderColor: '#4f8cff',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: chartOptions
  });
}

function renderTable(data) {
  const tbody = document.getElementById('dataTableBody');
  tbody.innerHTML = '';

  data.forEach(row => {
    const tr = document.createElement('tr');
    const woi = computeWeeksOfInventory(row);

    tr.innerHTML = `
      <td>${row.week}</td>
      <td>${fmt(row.units_sold, 'int')}</td>
      <td>${fmt(row.revenue, 'currency')}</td>
      <td>${fmt(row.ad_spend, 'currency')}</td>
      <td>${fmt(row.tacos, 'pct')}</td>
      <td>${fmt(row.cpc, 'currency')}</td>
      <td>${fmt(row.ctr, 'pct')}</td>
      <td>${fmt(row.conversion_rate, 'pct')}</td>
      <td>${fmt(row.sessions, 'int')}</td>
      <td>${fmt(row.review_count, 'int')}</td>
      <td>${fmt(row.inventory_on_hand, 'int')}</td>
      <td>${fmt(woi, 'weeks')}</td>
      <td>${fmt(row.profit_estimate, 'currency')}</td>
      <td>${fmt(row.avg_selling_price, 'currency')}</td>
      <td><button class="delete-row-btn" data-week="${row.week}" title="Delete week">&times;</button></td>
    `;

    tbody.appendChild(tr);
  });

  // Delete row handlers
  tbody.querySelectorAll('.delete-row-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteWeek(btn.dataset.week);
      render();
      showToast('Week deleted', 'success');
    });
  });
}

// ---- Toast Notifications ----

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---- Modal & Form Handling ----

function initModal() {
  const overlay = document.getElementById('modalOverlay');
  const tabs = document.querySelectorAll('.modal-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Open modal
  document.getElementById('addDataBtn').addEventListener('click', () => {
    overlay.classList.add('active');
  });

  // Close modal
  document.getElementById('closeModal').addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Manual entry form
  const form = document.getElementById('manualForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const row = {};

    FIELDS.forEach(field => {
      const val = formData.get(field.key);
      row[field.key] = field.type === 'number' ? parseFloat(val) : val;
    });

    if (!row.week) {
      showToast('Please enter a week date', 'error');
      return;
    }

    addWeeks([row]);
    form.reset();
    overlay.classList.remove('active');
    render();
    showToast('Week added successfully', 'success');
  });
}

function initCSVUpload() {
  const zone = document.getElementById('csvUploadZone');
  const fileInput = document.getElementById('csvFileInput');

  zone.addEventListener('click', () => fileInput.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleCSVFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleCSVFile(fileInput.files[0]);
    fileInput.value = '';
  });
}

async function handleCSVFile(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('Please upload a .csv file', 'error');
    return;
  }

  try {
    const rows = await CSVParser.readFile(file);
    if (!rows.length) {
      showToast('No valid data found in CSV', 'error');
      return;
    }

    addWeeks(rows);
    document.getElementById('modalOverlay').classList.remove('active');
    render();
    showToast(`Imported ${rows.length} week(s)`, 'success');
  } catch (err) {
    showToast('Failed to parse CSV: ' + err.message, 'error');
  }
}

function initExport() {
  document.getElementById('exportBtn').addEventListener('click', () => {
    const data = loadData();
    if (!data.length) {
      showToast('No data to export', 'error');
      return;
    }
    CSVParser.download(data);
    showToast('CSV exported', 'success');
  });
}

function initClearData() {
  document.getElementById('clearDataBtn').addEventListener('click', () => {
    if (confirm('Delete all dashboard data? This cannot be undone.')) {
      clearAllData();
      render();
      showToast('All data cleared', 'success');
    }
  });
}

function initWeekSelector() {
  document.getElementById('weekSelector').addEventListener('change', render);
}

// ---- Load Sample Data ----

function initLoadSample() {
  document.getElementById('loadSampleBtn').addEventListener('click', async () => {
    try {
      const response = await fetch('sample-data.csv');
      const text = await response.text();
      const rows = CSVParser.parse(text);
      if (rows.length) {
        addWeeks(rows);
        render();
        showToast(`Loaded ${rows.length} sample weeks`, 'success');
      }
    } catch {
      showToast('Could not load sample data', 'error');
    }
  });
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
  initModal();
  initCSVUpload();
  initExport();
  initClearData();
  initWeekSelector();
  initLoadSample();
  render();
});
