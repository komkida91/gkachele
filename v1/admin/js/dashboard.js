const REPO_OWNER = 'komkida91';
const REPO_NAME = 'gkachele';
const RAW_REQUESTS_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/data/requests.json`;
const DEPLOY_WORKFLOW_FILE = 'deploy-site.yml';
const WORKFLOW_REF = 'main';

const SITES_DATA = [
  {
    nombre: 'GKACHELE',
    url: 'https://gkachele.duckdns.org/',
    rubro: 'Portafolio',
    plan: 'premium',
    version: 'v1.2.0',
    fecha: '2025-10-15',
    status: 'online'
  },
  {
    nombre: 'Blow Dance',
    url: 'https://blowdance.duckdns.org/',
    rubro: 'Danza',
    plan: 'pro',
    version: 'v1.0.2',
    fecha: '2025-10-20',
    status: 'online'
  },
  {
    nombre: 'Dalmau Intendente',
    url: 'https://dalmau-intendente.duckdns.org/',
    rubro: 'Política',
    plan: 'base',
    version: 'v1.0.1',
    fecha: '2025-10-25',
    status: 'online'
  }
];

const state = {
  requests: []
};

const elements = {
  refreshButton: document.getElementById('refreshButton'),
  clearCacheButton: document.getElementById('clearCacheButton'),
  logoutButton: document.getElementById('logoutButton'),
  statusBanner: document.getElementById('statusBanner'),
  statusBar: document.getElementById('dashboardStatus'),
  requestsGrid: document.getElementById('requestsGrid'),
  pendingCounter: document.getElementById('pendingCounter'),
  totalRequests: document.getElementById('totalRequests'),
  pendingRequests: document.getElementById('pendingRequests'),
  approvedRequests: document.getElementById('approvedRequests'),
  sitesOnline: document.getElementById('sitesOnline'),
  requestsStatusPill: document.getElementById('requestsStatusPill'),
  lastUpdateTime: document.getElementById('lastUpdateTime'),
  sitesGrid: document.getElementById('sitesGrid')
};

const emptyRequestsTemplate = document.createElement('div');
emptyRequestsTemplate.className = 'empty-state';
emptyRequestsTemplate.innerHTML = 'No hay solicitudes registradas todavía.';

function getToken() {
  if (typeof getDefaultToken === 'function') {
    return getDefaultToken();
  }

  if (typeof window !== 'undefined' && window.GITHUB_TOKEN_DEFAULT) {
    return window.GITHUB_TOKEN_DEFAULT;
  }

  return '';
}

function setStatus(message = '', type = 'info') {
  if (elements.statusBar) {
    elements.statusBar.textContent = message;
    elements.statusBar.className = `status-bar ${type}`;
  }
}

function setRequestsStatusPill(status = 'pendiente', label = 'Pendiente') {
  if (!elements.requestsStatusPill) return;

  elements.requestsStatusPill.dataset.status = status;
  elements.requestsStatusPill.innerHTML = `
    <i class="fa-solid ${status === 'aprobado' ? 'fa-circle-check' : status === 'error' ? 'fa-circle-exclamation' : 'fa-circle-dot'}"></i>
    ${label}
  `;
}

async function fetchRequests() {
  setStatus('Cargando solicitudes...');
  setRequestsStatusPill('pendiente', 'Cargando');

  const response = await fetch(`${RAW_REQUESTS_URL}?t=${Date.now()}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Error al leer requests.json (HTTP ${response.status})`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('El archivo data/requests.json no contiene JSON válido.');
  }
}

function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-AR');
}

function capitalize(value = '') {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizePlan(plan = '') {
  const normalized = (plan || '').toString().trim().toLowerCase();
  if (['base', 'pro', 'premium'].includes(normalized)) return normalized;
  return 'base';
}

function buildRedesHTML(redes = {}) {
  if (!redes || typeof redes !== 'object') return 'Sin redes registradas';

  const links = Object.entries(redes)
    .filter(([, url]) => Boolean(url))
    .map(([nombre, url]) => `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(capitalize(nombre))}</a>`);

  return links.length ? links.join(' · ') : 'Sin redes registradas';
}

function buildRubroExtra(rubroEspecifico = {}) {
  if (!rubroEspecifico || typeof rubroEspecifico !== 'object') return 'Sin datos adicionales';

  const pairs = Object.entries(rubroEspecifico)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${escapeHTML(capitalize(key.replace(/_/g, ' ')))}: ${escapeHTML(value)}`);

  return pairs.length ? pairs.join(' · ') : 'Sin datos adicionales';
}

function getEntrySlug(entry) {
  if (entry?.slug) return entry.slug;
  if (entry?.payload?.slug) return entry.payload.slug;
  const fallback = entry?.nombre_cliente || entry?.payload?.cliente?.nombre_completo || 'sitio';
  return fallback
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `sitio-${Date.now()}`;
}

function copyPayload(payload = {}) {
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    setStatus('Copiá manualmente desde el modal JSON (clipboard no disponible).', 'error');
    return Promise.reject(new Error('Clipboard API no disponible'));
  }

  const pretty = JSON.stringify(payload, null, 2);
  return navigator.clipboard.writeText(pretty)
    .then(() => {
      setStatus('JSON copiado al portapapeles.', 'success');
    })
    .catch(() => {
      setStatus('No se pudo copiar el JSON en este navegador.', 'error');
    });
}

async function triggerDeployWorkflow(payload) {
  const token = getToken();

  if (!token) {
    throw new Error('Debes configurar el token de GitHub en este navegador.');
  }

  const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${DEPLOY_WORKFLOW_FILE}/dispatches`, {
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

async function approveRequest(entry = {}, button) {
  const payload = entry.payload || {};
  const displayName = entry?.nombre_cliente || payload?.cliente?.nombre_completo || entry?.slug || 'solicitud';
  const targetButton = button;

  if (targetButton) {
    targetButton.disabled = true;
    targetButton.innerHTML = '<i class="fa-solid fa-gear fa-spin"></i> Procesando...';
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

    setStatus('✅ Workflow de despliegue disparado. Refrescá en unos minutos para ver el estado actualizado.', 'success');
  } catch (error) {
    console.error('deploy-site error', error);
    setStatus(`❌ No se pudo aprobar la solicitud. ${error.message}`, 'error');
  } finally {
    if (targetButton) {
      targetButton.disabled = false;
      targetButton.innerHTML = '<i class="fa-solid fa-circle-check"></i> Aprobar';
    }
  }
}

function renderRequests(requests = []) {
  if (!elements.requestsGrid) return;

  elements.requestsGrid.innerHTML = '';

  if (!requests.length) {
    elements.requestsGrid.appendChild(emptyRequestsTemplate.cloneNode(true));
    return;
  }

  const sorted = [...requests].sort((a, b) => {
    const estadoA = (a?.estado || 'pendiente').toLowerCase();
    const estadoB = (b?.estado || 'pendiente').toLowerCase();

    if (estadoA !== estadoB) {
      return estadoA === 'pendiente' ? -1 : 1;
    }

    const dateA = new Date(a?.created_at || a?.payload?.fecha_creacion || 0).getTime();
    const dateB = new Date(b?.created_at || b?.payload?.fecha_creacion || 0).getTime();
    return dateB - dateA;
  });

  sorted.forEach((entry) => {
    const payload = entry?.payload || {};
    const cliente = payload?.cliente || {};
    const plan = normalizePlan(entry?.plan || payload?.plan);
    const estado = (entry?.estado || 'pendiente').toLowerCase();

    const card = document.createElement('article');
    card.className = 'request-card';

    card.innerHTML = `
      <div class="request-header">
        <div>
          <div class="request-name">${escapeHTML(entry?.nombre_cliente || cliente?.nombre_completo || 'Sin nombre')}</div>
          <div class="meta-item">
            <span class="meta-label">Recibido</span>
            <span class="meta-value">${escapeHTML(formatDate(entry?.created_at || payload?.fecha_creacion))}</span>
          </div>
        </div>
        <div>
          <span class="request-plan" data-plan="${plan}">
            <i class="fa-solid fa-layer-group"></i>
            ${escapeHTML(plan.toUpperCase())}
          </span>
          <div class="status-pill" data-status="${estado}">
            <i class="fa-solid ${estado === 'aprobado' ? 'fa-circle-check' : 'fa-circle-dot'}"></i>
            ${escapeHTML(capitalize(estado))}
          </div>
        </div>
      </div>
      <div class="request-meta">
        <div class="meta-item">
          <span class="meta-label">Rubro</span>
          <span class="meta-value">${escapeHTML(entry?.rubro || cliente?.rubro || 'Sin rubro')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Dominio</span>
          <span class="meta-value">${escapeHTML(payload?.dominio?.preferido || 'Por definir')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Email</span>
          <span class="meta-value">${escapeHTML(cliente?.email || 'Sin email')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Teléfono</span>
          <span class="meta-value">${escapeHTML(cliente?.telefono || 'Sin teléfono')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Redes</span>
          <span class="meta-value">${buildRedesHTML(payload?.redes_sociales)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Datos Rubro</span>
          <span class="meta-value">${buildRubroExtra(payload?.rubro_especifico)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Colores</span>
          <span class="meta-value">${escapeHTML(payload?.personalizacion?.colores_preferidos || 'Sin especificar')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Tipografía</span>
          <span class="meta-value">${escapeHTML(payload?.personalizacion?.tipografia || 'Por definir')}</span>
        </div>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'request-actions';

    const approveBtn = document.createElement('button');
    approveBtn.className = 'btn';
    approveBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Aprobar';
    approveBtn.disabled = estado !== 'pendiente';
    approveBtn.addEventListener('click', () => approveRequest(entry, approveBtn));

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn--secondary';
    copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar JSON';
    copyBtn.addEventListener('click', () => copyPayload(payload));

    actions.append(approveBtn, copyBtn);
    card.appendChild(actions);

    elements.requestsGrid.appendChild(card);
  });
}

function updateStats() {
  const total = state.requests.length;
  const pending = state.requests.filter((entry) => (entry?.estado || 'pendiente').toLowerCase() === 'pendiente').length;
  const approved = state.requests.filter((entry) => (entry?.estado || '').toLowerCase() === 'aprobado').length;
  const sitesOnline = SITES_DATA.filter((site) => site.status === 'online').length;

  if (elements.totalRequests) elements.totalRequests.textContent = total;
  if (elements.pendingRequests) elements.pendingRequests.textContent = pending;
  if (elements.approvedRequests) elements.approvedRequests.textContent = approved;
  if (elements.sitesOnline) elements.sitesOnline.textContent = sitesOnline;

  if (elements.pendingCounter) {
    elements.pendingCounter.textContent = `${pending} pendiente${pending === 1 ? '' : 's'}`;
  }

  if (total === 0) {
    setRequestsStatusPill('pendiente', 'Sin datos');
  } else if (pending > 0) {
    setRequestsStatusPill('pendiente', `${pending} pendiente${pending === 1 ? '' : 's'}`);
  } else {
    setRequestsStatusPill('aprobado', 'Todo aprobado');
  }
}

function renderSites() {
  if (!elements.sitesGrid) return;

  elements.sitesGrid.innerHTML = '';

  SITES_DATA.forEach((site) => {
    const card = document.createElement('article');
    card.className = 'site-card';
    card.innerHTML = `
      <div class="site-header">
        <div class="site-name">${escapeHTML(site.nombre)}</div>
        <span class="site-status" data-status="${escapeHTML(site.status)}">
          <i class="fa-solid fa-circle"></i>
          ${escapeHTML(site.status === 'online' ? 'Online' : 'Offline')}
        </span>
      </div>
      <div class="site-info">
        <div class="site-info-row">
          <span class="site-info-label">Rubro</span>
          <span>${escapeHTML(site.rubro)}</span>
        </div>
        <div class="site-info-row">
          <span class="site-info-label">Plan</span>
          <span class="badge badge--${normalizePlan(site.plan)}">${escapeHTML(site.plan)}</span>
        </div>
        <div class="site-info-row">
          <span class="site-info-label">Versión</span>
          <span>${escapeHTML(site.version)}</span>
        </div>
        <div class="site-info-row">
          <span class="site-info-label">Creado</span>
          <span>${escapeHTML(site.fecha)}</span>
        </div>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'site-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn';
    viewBtn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Ver';
    viewBtn.addEventListener('click', () => window.open(site.url, '_blank', 'noopener'));

    const testBtn = document.createElement('button');
    testBtn.className = 'btn btn--secondary';
    testBtn.innerHTML = '<i class="fa-solid fa-heartbeat"></i> Test';
    testBtn.addEventListener('click', () => window.open(site.url, '_blank', 'noopener'));

    actions.append(viewBtn, testBtn);
    card.appendChild(actions);

    elements.sitesGrid.appendChild(card);
  });
}

function updateLastUpdateTime() {
  if (!elements.lastUpdateTime) return;
  const now = new Date();
  elements.lastUpdateTime.textContent = now.toLocaleTimeString('es-AR');
}

function clearCache() {
  const confirmation = window.confirm('¿Limpiar cache local (sin cerrar sesión) y recargar el panel?');
  if (!confirmation) return;

  const session = localStorage.getItem('gkachele_session');
  localStorage.clear();
  if (session) {
    localStorage.setItem('gkachele_session', session);
  }
  sessionStorage.clear();
  window.location.reload();
}

function logout() {
  const confirmation = window.confirm('¿Cerrar sesión en el panel de administración?');
  if (!confirmation) return;

  localStorage.removeItem('gkachele_session');
  window.location.href = 'login.html';
}

async function refresh() {
  try {
    const data = await fetchRequests();
    state.requests = Array.isArray(data) ? data : [];
    renderRequests(state.requests);
    updateStats();
    updateLastUpdateTime();
    setStatus('Solicitudes actualizadas correctamente.', 'success');
  } catch (error) {
    console.error('fetchRequests error', error);
    setStatus(`❌ ${error.message}`, 'error');
    setRequestsStatusPill('error', 'Error al cargar');
  }
}

function init() {
  renderSites();
  updateStats();
  updateLastUpdateTime();

  if (elements.refreshButton) {
    elements.refreshButton.addEventListener('click', refresh);
  }

  if (elements.clearCacheButton) {
    elements.clearCacheButton.addEventListener('click', clearCache);
  }

  if (elements.logoutButton) {
    elements.logoutButton.addEventListener('click', logout);
  }

  refresh();
}

init();


