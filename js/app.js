/**
 * ================================================================
 * DASHBOARD GESTIÓN SOCIAL Y REPUTACIONAL — app.js
 * ================================================================
 *
 * Arquitectura (igual que dashboard CAPEX, adaptado a variables sociales):
 *
 *  1. Estado global: objeto con filtros activos
 *  2. cargarDatos(): fetch del JSON, luego inicializa filtros y renders
 *  3. filtrarDatos(): une registros + proyectos por id_proyecto,
 *     aplica todos los filtros con condiciones AND simultáneas
 *  4. calcularKPIs(): agrega los registros filtrados en métricas clave
 *  5. renderKPIs(): actualiza los valores en las tarjetas del DOM
 *  6. renderChart*(): destruye y recrea cada gráfico Chart.js
 *  7. renderTabla(): genera las filas de la tabla Top Comunidades
 *  8. actualizarDashboard(): orquesta todo al cambiar un filtro
 *  9. bindFiltros(): event listeners en los <select>
 *
 * Filtros combinados: cualquier combinación de Año + Mes + Región +
 * Comunidad + Tipo + Estado se aplica simultáneamente por AND.
 */

'use strict';

/* ── Meses ── */
const MESES_LABELS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                          'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/* ── Paleta verde/azul/ámbar (consistente con el CSS) ── */
const COLORS = {
  greenDeep:  '#2d6a4f',
  greenMid:   '#40916c',
  greenLight: '#52b788',
  greenPale:  '#95d5b2',
  blueMid:    '#2e6fad',
  blueLight:  '#74b3ce',
  amber:      '#e07c24',
  amberLight: '#f4a261',
  red:        '#c0392b',
  teal:       '#1abc9c',
  sky:        '#0ea5e9',
};

const PALETTE = [
  COLORS.greenMid, COLORS.blueMid, COLORS.amber, COLORS.greenLight,
  COLORS.blueLight, COLORS.amberLight, COLORS.teal, COLORS.sky,
];

/* ── Estado global ── */
const estado = {
  datos: null,   // { proyectos: [...], registros: [...] }
  filtros: {
    anio: '', mes: '', region: '', comunidad: '', tipo: '', estadoProy: '',
  },
};

/* ── Instancias Chart.js ── */
const charts = {
  region: null,
  tipo:   null,
  linea:  null,
  quejas: null,
};

/* ================================================================
   1. CARGA DE DATOS
   ================================================================ */
async function cargarDatos() {
  try {
    const resp = await fetch('./data/social_reputation_data.json');
    if (!resp.ok) throw new Error('Error al cargar datos');
    estado.datos = await resp.json();
    inicializarFiltros();
    actualizarDashboard();
  } catch (err) {
    console.error(err);
    document.getElementById('main-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">No se pudieron cargar los datos.<br>
        Sirve el proyecto desde un servidor local (python -m http.server 8080).</div>
      </div>`;
  }
}

/* ================================================================
   2. INICIALIZAR SELECTS CON OPCIONES ÚNICAS
   ================================================================ */
function inicializarFiltros() {
  const { proyectos, registros } = estado.datos;

  const anios    = [...new Set(registros.map(r => r.anio))].sort();
  const meses    = [...new Set(registros.map(r => r.mes))].sort((a,b) => a - b);
  const regiones = [...new Set(proyectos.map(p => p.region))].sort();
  const comunidades = [...new Set(proyectos.map(p => p.comunidad))].sort();
  const tipos    = [...new Set(proyectos.map(p => p.tipo))].sort();
  const estados  = [...new Set(proyectos.map(p => p.estado))].sort();

  poblarSelect('filtro-anio',      anios);
  poblarSelect('filtro-mes',       meses, m => MESES_LABELS[m]);
  poblarSelect('filtro-region',    regiones);
  poblarSelect('filtro-comunidad', comunidades);
  poblarSelect('filtro-tipo',      tipos);
  poblarSelect('filtro-estado',    estados);
}

function poblarSelect(id, valores, labelFn = v => v) {
  const sel = document.getElementById(id);
  if (!sel) return;
  valores.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = labelFn(v);
    sel.appendChild(opt);
  });
}

/* ================================================================
   3. FILTRADO DE DATOS (lógica AND combinada)
   ================================================================
   Une cada registro con su proyecto vía id_proyecto,
   luego filtra aplicando TODOS los filtros activos simultáneamente.
   Si un filtro está vacío ("") se ignora (no restringe).
   ================================================================ */
function filtrarDatos() {
  const { proyectos, registros } = estado.datos;
  const f = estado.filtros;

  // Mapa id → proyecto para join rápido
  const proyMap = Object.fromEntries(proyectos.map(p => [p.id, p]));

  const registrosFilt = registros.filter(reg => {
    const proy = proyMap[reg.id_proyecto];
    if (!proy) return false;

    if (f.anio       && reg.anio      !== parseInt(f.anio))  return false;
    if (f.mes        && reg.mes       !== parseInt(f.mes))   return false;
    if (f.region     && proy.region   !== f.region)          return false;
    if (f.comunidad  && proy.comunidad!== f.comunidad)       return false;
    if (f.tipo       && proy.tipo     !== f.tipo)            return false;
    if (f.estadoProy && proy.estado   !== f.estadoProy)      return false;

    return true;
  });

  const idsFiltrados = [...new Set(registrosFilt.map(r => r.id_proyecto))];
  const proyectosFilt = proyectos.filter(p => idsFiltrados.includes(p.id));

  return { registrosFilt, proyectosFilt, proyMap };
}

/* ================================================================
   4. CÁLCULO DE KPIs
   ================================================================ */
function calcularKPIs(registrosFilt, proyectosFilt) {
  const n = registrosFilt.length;

  const totalInvertido  = registrosFilt.reduce((s, r) => s + r.monto_invertido, 0);
  const totalBenef      = registrosFilt.reduce((s, r) => s + r.beneficiarios, 0);
  const totalQuejas     = registrosFilt.reduce((s, r) => s + r.quejas, 0);
  const totalMesas      = registrosFilt.reduce((s, r) => s + r.mesas_dialogo, 0);
  const avgConfianza    = n > 0 ? (registrosFilt.reduce((s, r) => s + r.confianza, 0) / n) : 0;
  const avgReputacion   = n > 0 ? (registrosFilt.reduce((s, r) => s + r.reputacion, 0) / n) : 0;

  const activos = proyectosFilt.filter(p => p.estado === 'En ejecución').length;

  return { totalInvertido, totalBenef, totalQuejas, totalMesas,
           avgConfianza, avgReputacion, activos };
}

/* ================================================================
   5. FORMATO DE NÚMEROS
   ================================================================ */
function fmtUSD(v) {
  if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v/1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
function fmtNum(v) {
  if (v >= 1_000) return `${(v/1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

/* ================================================================
   6. RENDER DE KPIs
   ================================================================ */
function renderKPIs({ totalInvertido, totalQuejas, avgConfianza,
                      avgReputacion, activos, totalBenef }) {
  setText('kpi-activos',    activos);
  setText('kpi-invertido',  fmtUSD(totalInvertido));
  setText('kpi-confianza',  avgConfianza.toFixed(1));
  setText('kpi-quejas',     totalQuejas);
  setText('kpi-reputacion', avgReputacion.toFixed(1));
  setText('kpi-beneficiarios', fmtNum(totalBenef));

  // Alerta dinámica en quejas
  const subQ = document.getElementById('kpi-quejas-sub');
  if (subQ) {
    if (totalQuejas === 0) {
      subQ.textContent = '✔ Sin quejas en el período';
      subQ.style.color = 'var(--green-mid)';
    } else if (totalQuejas <= 5) {
      subQ.textContent = `${totalQuejas} quejas — Nivel moderado`;
      subQ.style.color = 'var(--amber)';
    } else {
      subQ.textContent = `⚠ ${totalQuejas} quejas — Atención requerida`;
      subQ.style.color = 'var(--red-alert)';
    }
  }

  // Color del índice de confianza
  const valConf = document.getElementById('kpi-confianza');
  if (valConf) {
    valConf.style.color = avgConfianza >= 75 ? 'var(--green-mid)'
                        : avgConfianza >= 55 ? 'var(--amber)'
                        : 'var(--red-alert)';
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ================================================================
   7. AGRUPACIONES DE DATOS
   ================================================================ */

/** Agrupa por campo de proyecto → suma campos de registro */
function agruparPorCampoProy(registrosFilt, proyMap, campo) {
  const acc = {};
  registrosFilt.forEach(reg => {
    const proy = proyMap[reg.id_proyecto];
    const clave = proy ? proy[campo] : 'N/A';
    if (!acc[clave]) acc[clave] = { monto: 0, quejas: 0, confianza: [], beneficiarios: 0, n: 0 };
    acc[clave].monto        += reg.monto_invertido;
    acc[clave].quejas       += reg.quejas;
    acc[clave].beneficiarios+= reg.beneficiarios;
    acc[clave].confianza.push(reg.confianza);
    acc[clave].n++;
  });

  // Calcular promedio de confianza
  Object.values(acc).forEach(v => {
    v.avgConfianza = v.confianza.length > 0
      ? v.confianza.reduce((s, c) => s + c, 0) / v.confianza.length
      : 0;
  });
  return acc;
}

/** Agrupa por año+mes para serie temporal */
function agruparPorMes(registrosFilt) {
  const acc = {};
  registrosFilt.forEach(reg => {
    const key = `${reg.anio}-${String(reg.mes).padStart(2,'0')}`;
    if (!acc[key]) acc[key] = { label: `${MESES_LABELS[reg.mes]} ${reg.anio}`,
                                 quejas: 0, confianza: [], reputacion: [] };
    acc[key].quejas += reg.quejas;
    acc[key].confianza.push(reg.confianza);
    acc[key].reputacion.push(reg.reputacion);
  });
  return Object.entries(acc).sort(([a],[b]) => a.localeCompare(b)).map(([, v]) => ({
    ...v,
    avgConfianza:  v.confianza.reduce((s,c)=>s+c,0)  / v.confianza.length,
    avgReputacion: v.reputacion.reduce((s,c)=>s+c,0) / v.reputacion.length,
  }));
}

/** Top comunidades por inversión y quejas */
function topComunidades(registrosFilt, proyMap) {
  const acc = {};
  registrosFilt.forEach(reg => {
    const proy = proyMap[reg.id_proyecto];
    const com  = proy ? proy.comunidad : 'N/A';
    if (!acc[com]) acc[com] = {
      comunidad: com, region: proy?.region || '',
      monto: 0, quejas: 0, beneficiarios: 0, confianza: [], n: 0,
    };
    acc[com].monto        += reg.monto_invertido;
    acc[com].quejas       += reg.quejas;
    acc[com].beneficiarios+= reg.beneficiarios;
    acc[com].confianza.push(reg.confianza);
    acc[com].n++;
  });

  return Object.values(acc)
    .map(v => ({
      ...v,
      avgConfianza: v.confianza.length > 0
        ? v.confianza.reduce((s,c)=>s+c,0) / v.confianza.length : 0,
    }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 10);
}

/* ================================================================
   8. RENDER DE GRÁFICOS
   ================================================================ */

function baseOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#8aaa94', font: { family: 'Plus Jakarta Sans', size: 11 },
                  boxWidth: 10, padding: 14 },
      },
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: 'rgba(44,106,79,0.15)',
        borderWidth: 1,
        titleColor: '#1a2e1e',
        bodyColor:  '#4a6155',
        padding: 10,
        boxShadow: '0 4px 12px rgba(28,56,41,0.1)',
      },
    },
    scales: {
      x: {
        ticks: { color: '#8aaa94', font: { family: 'Plus Jakarta Sans', size: 10 } },
        grid:  { color: 'rgba(44,106,79,0.07)' },
      },
      y: {
        ticks: { color: '#8aaa94', font: { family: 'Plus Jakarta Sans', size: 10 },
                 callback: v => fmtUSD(v) },
        grid:  { color: 'rgba(44,106,79,0.07)' },
      },
    },
  };
}

function crearChart(key, canvasId, config) {
  if (charts[key]) { charts[key].destroy(); charts[key] = null; }
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  charts[key] = new Chart(canvas, config);
}

/* ── 8a. Barras horizontales: Inversión por Región ── */
function renderChartRegion(registrosFilt, proyMap) {
  const agr    = agruparPorCampoProy(registrosFilt, proyMap, 'region');
  const labels = Object.keys(agr);
  const montos = labels.map(k => agr[k].monto);

  if (labels.length === 0) { mostrarVacio('canvas-region'); return; }

  const opts = baseOpts();
  opts.indexAxis = 'y';
  opts.plugins.tooltip.callbacks = { label: ctx => ` ${fmtUSD(ctx.raw)}` };
  opts.scales.x.ticks.callback = v => fmtUSD(v);
  opts.scales.y.ticks.callback = undefined;

  crearChart('region', 'canvas-region', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Inversión Social',
        data: montos,
        backgroundColor: PALETTE.map(c => c + '55'),
        borderColor: PALETTE,
        borderWidth: 1.5,
        borderRadius: 5,
      }],
    },
    options: opts,
  });
}

/* ── 8b. Doughnut: distribución por Tipo de Proyecto ── */
function renderChartTipo(registrosFilt, proyMap) {
  const agr    = agruparPorCampoProy(registrosFilt, proyMap, 'tipo');
  const labels = Object.keys(agr);
  const montos = labels.map(k => agr[k].monto);

  if (labels.length === 0) { mostrarVacio('canvas-tipo'); return; }

  crearChart('tipo', 'canvas-tipo', {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: montos,
        backgroundColor: PALETTE.slice(0, labels.length).map(c => c + '66'),
        borderColor:      PALETTE.slice(0, labels.length),
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#8aaa94', font: { family: 'Plus Jakarta Sans', size: 10 },
                    boxWidth: 10, padding: 10 },
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: 'rgba(44,106,79,0.15)',
          borderWidth: 1,
          titleColor: '#1a2e1e',
          bodyColor:  '#4a6155',
          padding: 10,
          callbacks: { label: ctx => ` ${ctx.label}: ${fmtUSD(ctx.raw)}` },
        },
      },
    },
  });
}

/* ── 8c. Línea: evolución mensual de Índice de Reputación y Confianza ── */
function renderChartLinea(registrosFilt) {
  const series = agruparPorMes(registrosFilt);
  if (series.length === 0) { mostrarVacio('canvas-linea'); return; }

  const labels = series.map(s => s.label);
  const conf   = series.map(s => +s.avgConfianza.toFixed(1));
  const rep    = series.map(s => +s.avgReputacion.toFixed(1));

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#8aaa94', font: { family: 'Plus Jakarta Sans', size: 11 },
                  boxWidth: 10, padding: 14 },
      },
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: 'rgba(44,106,79,0.15)',
        borderWidth: 1,
        titleColor: '#1a2e1e',
        bodyColor:  '#4a6155',
        padding: 10,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} / 100` },
      },
    },
    scales: {
      x: {
        ticks: { color: '#8aaa94', font: { family: 'Plus Jakarta Sans', size: 10 } },
        grid:  { color: 'rgba(44,106,79,0.07)' },
      },
      y: {
        min: 0, max: 100,
        ticks: { color: '#8aaa94', font: { family: 'Plus Jakarta Sans', size: 10 },
                 callback: v => `${v}` },
        grid:  { color: 'rgba(44,106,79,0.07)' },
      },
    },
    elements: {
      point: { radius: 4, hoverRadius: 7, borderWidth: 2 },
      line:  { tension: 0.35 },
    },
  };

  crearChart('linea', 'canvas-linea', {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Índice de Confianza',
          data: conf,
          borderColor: COLORS.greenMid,
          backgroundColor: 'rgba(64,145,108,0.1)',
          fill: true,
          pointBackgroundColor: COLORS.greenMid,
          pointBorderColor: '#fff',
        },
        {
          label: 'Índice de Reputación',
          data: rep,
          borderColor: COLORS.blueMid,
          borderDash: [5, 4],
          backgroundColor: 'transparent',
          pointBackgroundColor: COLORS.blueMid,
          pointBorderColor: '#fff',
        },
      ],
    },
    options: opts,
  });
}

/* ── 8d. Barras: número de quejas por región/comunidad (alerta) ── */
function renderChartQuejas(registrosFilt, proyMap) {
  const agr    = agruparPorCampoProy(registrosFilt, proyMap, 'comunidad');
  // Mostrar TODAS las comunidades, ordenadas por nº de quejas descendente
  const labels = Object.keys(agr).sort((a, b) => agr[b].quejas - agr[a].quejas);
  const quejas = labels.map(k => agr[k].quejas);

  if (labels.length === 0) { mostrarVacio('canvas-quejas'); return; }

  const opts = baseOpts();
  opts.plugins.tooltip.callbacks = { label: ctx => ` ${ctx.raw} queja(s)` };
  opts.scales.y.ticks.callback = v => v;
  // Ajustar alto del canvas según cantidad de comunidades para no dejar espacios
  const canvas = document.getElementById('canvas-quejas');
  if (canvas) {
    const minHeight = Math.max(280, labels.length * 28);
    canvas.parentElement.style.minHeight = minHeight + 'px';
  }

  crearChart('quejas', 'canvas-quejas', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Nº Quejas',
        data: quejas,
        backgroundColor: quejas.map(q =>
          q === 0 ? 'rgba(82,183,136,0.35)'
          : q <= 4 ? 'rgba(224,124,36,0.35)'
          : 'rgba(192,57,43,0.35)'
        ),
        borderColor: quejas.map(q =>
          q === 0 ? COLORS.greenLight
          : q <= 4 ? COLORS.amber
          : COLORS.red
        ),
        borderWidth: 1.5,
        borderRadius: 5,
      }],
    },
    options: opts,
  });
}

/* ── Auxiliares canvas ── */
function mostrarVacio(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.style.display = 'none';
  const parent = canvas.parentElement;
  const prev = parent.querySelector('.empty-state');
  if (prev) prev.remove();
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `<div class="empty-state-icon">🌱</div>
    <div class="empty-state-text">Sin datos para los filtros seleccionados</div>`;
  parent.appendChild(div);
}

function restaurarCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.style.display = '';
  const parent = canvas.parentElement;
  const prev = parent.querySelector('.empty-state');
  if (prev) prev.remove();
}

/* ================================================================
   9. RENDER TABLA TOP COMUNIDADES
   ================================================================ */
function renderTabla(registrosFilt, proyMap) {
  const top   = topComunidades(registrosFilt, proyMap);
  const tbody = document.getElementById('tabla-top-body');
  if (!tbody) return;

  if (top.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">
      Sin datos para los filtros seleccionados</td></tr>`;
    return;
  }

  tbody.innerHTML = top.map((item, i) => {
    const conf = item.avgConfianza;
    const progClass = conf >= 75 ? 'prog-high' : conf >= 55 ? 'prog-medium' : 'prog-low';
    const confColor = conf >= 75 ? 'var(--green-mid)' : conf >= 55 ? 'var(--amber)' : 'var(--red-alert)';

    const qClass = item.quejas === 0 ? 'quejas-0'
                 : item.quejas <= 4  ? 'quejas-low'
                 : 'quejas-high';

    return `
    <tr>
      <td style="color:var(--text-muted);font-size:0.7rem;text-align:center;">${i+1}</td>
      <td>
        <div style="font-weight:700;color:var(--text-primary)">${item.comunidad}</div>
        <div style="font-size:0.65rem;color:var(--text-muted)">${item.region}</div>
      </td>
      <td style="color:var(--text-primary)">${fmtUSD(item.monto)}</td>
      <td>${fmtNum(item.beneficiarios)}</td>
      <td>
        <span class="quejas-badge ${qClass}">
          ${item.quejas === 0 ? '✓' : '⚠'} ${item.quejas}
        </span>
      </td>
      <td class="progress-cell">
        <div class="progress-wrap">
          <div class="progress-bar">
            <div class="progress-fill ${progClass}"
                 style="width:${Math.min(conf,100).toFixed(0)}%"></div>
          </div>
          <span class="progress-pct" style="color:${confColor}">${conf.toFixed(0)}</span>
        </div>
      </td>
      <td style="color:var(--text-muted)">${item.n} registros</td>
    </tr>`;
  }).join('');
}

/* ================================================================
   10. ACTUALIZACIÓN COMPLETA
   ================================================================ */
function actualizarDashboard() {
  const { registrosFilt, proyectosFilt, proyMap } = filtrarDatos();

  const kpis = calcularKPIs(registrosFilt, proyectosFilt);
  renderKPIs(kpis);

  // Restaurar canvas antes de re-renderizar
  ['canvas-region','canvas-tipo','canvas-linea','canvas-quejas']
    .forEach(id => restaurarCanvas(id));

  renderChartRegion(registrosFilt, proyMap);
  renderChartTipo(registrosFilt, proyMap);
  renderChartLinea(registrosFilt);
  renderChartQuejas(registrosFilt, proyMap);
  renderTabla(registrosFilt, proyMap);
  actualizarChips();
}

/* ================================================================
   11. CHIPS DE FILTROS ACTIVOS
   ================================================================ */
function actualizarChips() {
  const container = document.getElementById('active-filters');
  if (!container) return;
  const f = estado.filtros;
  const labels = {
    anio:       f.anio       ? `Año: ${f.anio}` : null,
    mes:        f.mes        ? `Mes: ${MESES_LABELS[f.mes]}` : null,
    region:     f.region     ? `Región: ${f.region}` : null,
    comunidad:  f.comunidad  ? `Com: ${f.comunidad}` : null,
    tipo:       f.tipo       ? `Tipo: ${f.tipo}` : null,
    estadoProy: f.estadoProy ? `Estado: ${f.estadoProy}` : null,
  };
  container.innerHTML = Object.values(labels).filter(Boolean)
    .map(l => `<span class="filter-chip">🌿 ${l}</span>`).join('');
}

/* ================================================================
   12. EVENT LISTENERS
   ================================================================ */
function bindFiltros() {
  const selectores = [
    { id: 'filtro-anio',      key: 'anio' },
    { id: 'filtro-mes',       key: 'mes' },
    { id: 'filtro-region',    key: 'region' },
    { id: 'filtro-comunidad', key: 'comunidad' },
    { id: 'filtro-tipo',      key: 'tipo' },
    { id: 'filtro-estado',    key: 'estadoProy' },
  ];

  selectores.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', e => {
      estado.filtros[key] = e.target.value;
      actualizarDashboard();
    });
  });

  // Botón restablecer
  const btnClear = document.getElementById('btn-clear-filters');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      Object.keys(estado.filtros).forEach(k => estado.filtros[k] = '');
      selectores.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      actualizarDashboard();
    });
  }

  // Toggle sidebar móvil
  const btnToggle = document.getElementById('btn-toggle-filters');
  const sidebar   = document.getElementById('filters-sidebar');
  if (btnToggle && sidebar) {
    btnToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      btnToggle.textContent = sidebar.classList.contains('open')
        ? '▲ Ocultar filtros' : '▼ Mostrar filtros';
    });
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  bindFiltros();
  cargarDatos();
});
