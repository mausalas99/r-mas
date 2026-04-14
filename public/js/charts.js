// charts.js — Chart.js rendering and lifecycle management

let sparkCharts = {};
let detailChart = null;

/**
 * Build date labels for trend charts from lab history entries
 * @param {Array} sets - Array of lab history entries with timestamp property
 * @returns {Array<string>} Array of formatted date labels (MM/DD)
 */
export function buildTendChartLabels(sets) {
  if (!sets || sets.length === 0) return [];
  return sets.map(s => {
    const d = new Date(s.timestamp);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${m}/${day}`;
  });
}

/**
 * Render trend cards with sparkline charts for current patient's lab history
 * Displays key parameters (Hb, Leucocitos, Plaquetas, Glucosa, Creatinina, Na, K)
 */
export function renderTendencias() {
  const container = document.getElementById('tend-container');
  if (!container) return;

  // Destroy existing charts
  Object.keys(sparkCharts).forEach(k => {
    if (sparkCharts[k]) {
      sparkCharts[k].destroy();
      delete sparkCharts[k];
    }
  });

  // Get current patient and lab history
  const currentPatientId = window.currentPatient?.id;
  if (!currentPatientId) {
    container.innerHTML = '<div class="tend-empty">Selecciona un paciente</div>';
    return;
  }

  const labHistory = window.labHistory?.[currentPatientId] || [];
  if (labHistory.length === 0) {
    container.innerHTML = '<div class="tend-empty">No hay historial de laboratorios</div>';
    return;
  }

  // Build trend cards
  const params = ['Hb', 'Leucocitos', 'Plaquetas', 'Glucosa', 'Creatinina', 'Na', 'K'];
  let html = '<div class="tend-grid">';

  params.forEach(param => {
    const sets = labHistory.filter(entry => entry[param] && entry[param] !== '---');
    if (sets.length === 0) return;

    html += `<div class="tend-card" onclick="openTendDetail('${param}')" data-param="${param}">
      <div class="tend-card-title">${param}</div>
      <canvas id="spark-${param}" width="200" height="80"></canvas>
      <div class="tend-card-latest">${sets[sets.length - 1][param]}</div>
    </div>`;
  });

  html += '</div>';
  container.innerHTML = html;

  // Render sparkline charts
  params.forEach(param => {
    const canvas = document.getElementById(`spark-${param}`);
    if (!canvas) return;

    const sets = labHistory.filter(entry => entry[param] && entry[param] !== '---');
    if (sets.length === 0) return;

    const labels = buildTendChartLabels(sets);
    const data = sets.map(s => parseFloat(s[param]) || 0);

    sparkCharts[param] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  });
}

/**
 * Open detail modal with full-size trend chart for a specific parameter
 * @param {string} param - Lab parameter name (e.g., 'Hb', 'Glucosa')
 */
export function openTendDetail(param) {
  const backdrop = document.getElementById('tend-detail-backdrop');
  const canvas = document.getElementById('tend-detail-canvas');
  if (!backdrop || !canvas) return;

  const currentPatientId = window.currentPatient?.id;
  const labHistory = window.labHistory?.[currentPatientId] || [];
  const sets = labHistory.filter(entry => entry[param] && entry[param] !== '---');

  if (sets.length === 0) return;

  const labels = buildTendChartLabels(sets);
  const data = sets.map(s => parseFloat(s[param]) || 0);

  document.getElementById('tend-detail-title').textContent = `Tendencia: ${param}`;
  backdrop.style.display = 'flex';

  if (detailChart) {
    detailChart.destroy();
    detailChart = null;
  }

  detailChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: param,
        data: data,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { display: true, grid: { display: true } },
        y: { display: true, grid: { display: true } }
      }
    }
  });
}

/**
 * Close detail modal and destroy the detail chart
 */
export function closeTendDetail() {
  const backdrop = document.getElementById('tend-detail-backdrop');
  if (backdrop) backdrop.style.display = 'none';

  if (detailChart) {
    detailChart.destroy();
    detailChart = null;
  }
}

/**
 * Destroy all sparkline and detail charts to free resources
 */
export function destroyAllCharts() {
  Object.keys(sparkCharts).forEach(k => {
    if (sparkCharts[k]) {
      sparkCharts[k].destroy();
      delete sparkCharts[k];
    }
  });
  if (detailChart) {
    detailChart.destroy();
    detailChart = null;
  }
}
