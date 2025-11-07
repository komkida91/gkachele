const REPO_OWNER = 'komkida91';
const REPO_NAME = 'gkachele';
const RAW_REQUESTS_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/data/requests.json`;
const DEPLOY_WORKFLOW_FILE = 'deploy-site.yml';
const WORKFLOW_REF = 'main';

const requestsBody = document.getElementById('requestsBody');
const pendingCounter = document.getElementById('pendingCounter');
const refreshButton = document.getElementById('refreshButton');
const statusBar = document.getElementById('dashboardStatus');

function setStatus(message, type = 'info') {
  statusBar.textContent = message;
  statusBar.className = `status-bar ${type}`;
}

function getToken() {
  if (typeof getDefaultToken === 'function') {
    return getDefaultToken();
  }

  if (typeof window !== 'undefined' && window.GITHUB_TOKEN_DEFAULT) {
    return window.GITHUB_TOKEN_DEFAULT;
  }

  return '';
}

async function fetchRequests() {
  setStatus('Cargando solicitudes...');

  const url = `${RAW_REQUESTS_URL}?cache=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Error al leer requests.json (${response.status})`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('El archivo requests.json está mal formado.');
  }
}

function createStatusTag(estado = 'pendiente') {
  const span = document.createElement('span');
  const normalized = estado.toLowerCase();
  span.className = `status-tag ${normalized === 'aprobado' ? 'approved' : 'pending'}`;
  span.innerHTML = `<i class="fa-solid ${normalized === 'aprobado' ? 'fa-circle-check' : 'fa-circle-dot'}"></i> ${normalized}`;
  return span;
}

function formatRedes(redes = {}) {
  if (!redes || typeof redes !== 'object') return '—';
  const entries = Object.entries(redes)
    .filter(([, value]) => value)
    .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));
  return entries.length ? entries.join(', ') : '—';
}

function redesTooltip(redes = {}) {
  if (!redes || typeof redes !== 'object') return '';
  const entries = Object.entries(redes)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`);
  return entries.join('\n');
}

function getEntrySlug(entry) {
  if (entry?.slug) return entry.slug;
  if (entry?.payload?.slug) return entry.payload.slug;
  const fallback = entry?.nombre_cliente || entry?.payload?.cliente?.nombre_completo || 'sitio';
  return fallback.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || `sitio-${Date.now()}`;
}

function renderTable(requests = []) {
  requestsBody.innerHTML = '';

  if (!requests.length) {
    const row = document.createElement('tr');
    row.className = 'empty-state';
    row.innerHTML = '<td data-label="Aviso">No hay solicitudes registradas.</td>';
    requestsBody.appendChild(row);
    pendingCounter.textContent = '0 pendientes';
    setStatus('');
    return;
  }

  let pending = 0;

  requests.forEach((entry) => {
    const payload = entry?.payload || {};
    const cliente = payload?.cliente || {};
    const nombre = entry?.nombre_cliente || cliente?.nombre_completo || '—';
    const rubro = entry?.rubro || cliente?.rubro || '—';
    const plan = entry?.plan || payload?.plan || '—';
    const redesData = payload?.redes_sociales || (() => {
      try { return JSON.parse(entry?.redes || '{}'); } catch { return {}; }
    })();
    const estado = entry?.estado || 'pendiente';
    const slug = getEntrySlug(entry);

    const row = document.createElement('tr');

    const clienteCell = document.createElement('td');
    clienteCell.dataset.label = 'Cliente';
    const contactoDetalle = [];
    if (cliente?.email) contactoDetalle.push(cliente.email);
    if (cliente?.telefono) contactoDetalle.push(cliente.telefono);
    clienteCell.innerHTML = `<strong>${nombre}</strong>${contactoDetalle.length ? `<br><small>${contactoDetalle.join(' · ')}</small>` : ''}`;

    const rubroCell = document.createElement('td');
    rubroCell.dataset.label = 'Rubro';
    rubroCell.textContent = rubro || '—';

    const planCell = document.createElement('td');
    planCell.dataset.label = 'Plan';
    planCell.textContent = plan || '—';

    const redesCell = document.createElement('td');
    redesCell.dataset.label = 'Redes';
    redesCell.textContent = formatRedes(redesData);
    redesCell.title = redesTooltip(redesData);

    const estadoCell = document.createElement('td');
    estadoCell.dataset.label = 'Estado';
    estadoCell.appendChild(createStatusTag(estado));

    const actionCell = document.createElement('td');
    actionCell.dataset.label = 'Acciones';

    if (estado === 'pendiente') {
      pending += 1;
      const button = document.createElement('button');
      button.className = 'approve-btn';
      button.innerHTML = '<i class="fa-solid fa-check"></i> Aprobar';
      button.addEventListener('click', () => approveRequest({ ...entry, slug }));
      actionCell.appendChild(button);
    } else {
      actionCell.textContent = '—';
    }

    row.append(clienteCell, rubroCell, planCell, redesCell, estadoCell, actionCell);
    requestsBody.appendChild(row);
  });

  pendingCounter.textContent = `${pending} pendiente${pending === 1 ? '' : 's'}`;
  setStatus('');
}

async function triggerDeployWorkflow(payload) {
  const token = getToken();

  if (!token) {
    throw new Error('Falta configurar el token de autenticación.');
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${DEPLOY_WORKFLOW_FILE}/dispatches`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: WORKFLOW_REF,
      inputs: payload
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API respondió ${response.status}: ${text}`);
  }
}

async function approveRequest(entry = {}) {
  const payload = entry.payload || {};
  const displayName = entry?.nombre_cliente || payload?.cliente?.nombre_completo || entry?.slug || 'solicitud';
  const token = getToken();

  if (!token) {
    setStatus('Debes configurar el token de GitHub antes de aprobar.', 'error');
    return;
  }

  setStatus(`Aprobando solicitud de ${displayName}...`);

  try {
    await triggerDeployWorkflow({
      nombre_cliente: entry.nombre_cliente || payload?.cliente?.nombre_completo || displayName,
      slug: getEntrySlug(entry),
      rubro: entry.rubro || payload?.cliente?.rubro || '',
      plan: entry.plan || payload?.plan || '',
      redes: JSON.stringify(payload?.redes_sociales || {}),
      payload: JSON.stringify(payload || {})
    });

    setStatus('✅ Workflow de despliegue disparado. Actualiza en unos minutos para ver el estado.', 'success');
  } catch (error) {
    console.error('deploy-site error', error);
    setStatus(`❌ No se pudo aprobar la solicitud. ${error.message}`, 'error');
  }
}

async function refresh() {
  try {
    const requests = await fetchRequests();
    renderTable(Array.isArray(requests) ? requests : []);
  } catch (error) {
    console.error('fetchRequests error', error);
    setStatus(`❌ ${error.message}`, 'error');
  }
}

if (refreshButton) {
  refreshButton.addEventListener('click', refresh);
}

refresh();

