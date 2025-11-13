const REPO_OWNER = 'komkida91';
const REPO_NAME = 'gkachele';

const SESSION_STORAGE_KEY = 'gkachele_session';
const SESSION_TOKEN_KEY = 'gkachele_session_token';
const TOKEN_STORAGE_KEY = 'github_token';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const WORKFLOW_BACKEND_REPO = 'gkachele-requests';
const WORKFLOW_FILE = 'dispatch-through-app.yml';
const WORKFLOW_REF = 'main';
const WORKFLOW_DISPATCH_URL = `https://api.github.com/repos/${REPO_OWNER}/${WORKFLOW_BACKEND_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

const DEFAULT_DISPATCH_PAYLOAD = {
  slug: 'demo-site',
  nombre: 'Cliente Demo',
  rubro: 'base',
  plan: 'base',
  redes: {}
};

const BRANCH_HINT = (() => {
  const path = (window.location?.pathname || '').toLowerCase();
  if (path.includes('/dev/')) return 'dev';
  if (path.includes('/main/')) return 'main';
  return 'main';
})();

const RELATIVE_REQUESTS_PATH = '../data/requests.json';

function buildRawGithubUrl(branch = 'main') {
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${branch}/data/requests.json`;
}

function buildRawGithackUrl(branch = 'main') {
  return `https://rawcdn.githack.com/${REPO_OWNER}/${REPO_NAME}/${branch}/data/requests.json`;
}

const REQUESTS_SOURCES = [
  RELATIVE_REQUESTS_PATH,
  BRANCH_HINT !== 'main' ? buildRawGithubUrl(BRANCH_HINT) : null,
  BRANCH_HINT !== 'main' ? buildRawGithackUrl(BRANCH_HINT) : null,
  buildRawGithubUrl('main'),
  buildRawGithackUrl('main')
]
  .filter(Boolean)
  .filter((value, index, self) => self.indexOf(value) === index);

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

let lastSuccessfulRequestsSource = '';

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
  sitesGrid: document.getElementById('sitesGrid'),
  dispatchApproveButton: document.getElementById('dispatchApprove'),
  dispatchCancelButton: document.getElementById('dispatchCancel')
};

const emptyRequestsTemplate = document.createElement('div');
emptyRequestsTemplate.className = 'empty-state';
emptyRequestsTemplate.innerHTML = 'No hay solicitudes registradas todavía.';

function encodeToken(token = '') {
  if (!token) return '';
  try {
    return btoa(unescape(encodeURIComponent(token)));
  } catch (error) {
    return btoa(token);
  }
}

function decodeToken(encoded = '') {
  if (!encoded) return '';
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch (error) {
    try {
      return atob(encoded);
    } catch {
      return '';
    }
  }
function getSessionData() {
  const raw =
    sessionStorage.getItem(SESSION_STORAGE_KEY) ||
    localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    clearSessionData();
    return null;
  }
}

function getSessionToken() {
  const encoded =
    sessionStorage.getItem(SESSION_TOKEN_KEY) ||
    localStorage.getItem(SESSION_TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
    localStorage.getItem(TOKEN_STORAGE_KEY);
  return decodeToken(encoded);
}

function ensureAuthenticated() {
  const session = getSessionData();
  const token = getSessionToken();

  if (!session || !token) {
    redirectToLogin();
    return false;
  }

  if (!session.timestamp || Date.now() - session.timestamp > SESSION_TTL_MS) {
    clearSessionData({ keepToken: true });
    redirectToLogin();
    return false;
  }

  return true;
}

function redirectToLogin() {
  window.location.href = 'login.html';
}

function clearSessionData({ keepToken = false } = {}) {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);

  if (!keepToken) {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
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

function withCacheBuster(url = '') {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

function normalizeRequestsPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.requests)) return data.requests;
  return [];
}

function describeSource(source = '') {
  if (!source) return 'origen desconocido';
  if (source.startsWith('../../')) return 'contenido estático del sitio';
  if (source.includes('rawcdn.githack.com')) {
    const match = source.match(/\/([^/]+)\/data\/requests\.json/i);
    const branch = match?.[1] || 'rama';
    return `githack (${branch})`;
  }
  if (source.includes('raw.githubusercontent.com')) {
    const match = source.match(/\/([^/]+)\/data\/requests\.json/i);
    const branch = match?.[1] || 'rama';
    return `raw GitHub (${branch})`;
  }
  return source;
}

async function fetchRequests() {
  setStatus('Cargando solicitudes...');
  setRequestsStatusPill('pendiente', 'Cargando');

  let lastError = null;

  for (const source of REQUESTS_SOURCES) {
    try {
      const response = await fetch(withCacheBuster(source), { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const normalized = normalizeRequestsPayload(data);

      if (!Array.isArray(normalized)) {
        throw new Error('La respuesta no contiene un array de solicitudes.');
      }

      lastSuccessfulRequestsSource = source;
      return normalized;
    } catch (error) {
      lastError = error;
      console.warn(`fetchRequests: fallo al usar ${source}`, error);
    }
  }

  const fallbackMessage = lastError ? lastError.message || String(lastError) : 'origen desconocido';
  throw new Error(`No se pudo leer data/requests.json (${fallbackMessage}).`);
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
    setStatus('Copiá manualmente desde el JSON (clipboard no disponible).', 'error');
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

function buildDispatchPayload(entry = {}) {
  const payload = entry?.payload || {};
  const cliente = payload?.cliente || {};
  const redes = payload?.redes_sociales || (() => {
    try {
      return JSON.parse(entry?.redes || '{}');
    } catch {
      return {};
    }
  })();

  return {
    slug: entry.slug || payload.slug || getEntrySlug(entry),
    nombre: entry.nombre_cliente || cliente.nombre_completo || 'Cliente Demo',
    rubro: entry.rubro || cliente.rubro || 'base',
    plan: entry.plan || payload.plan || 'base',
    redes
  };
}

function encodePayloadToBase64(payload) {
  try {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)));
  } catch (error) {
    console.error('encodePayloadToBase64 error', error, payload);
    throw new Error('No se pudo serializar el payload antes de enviarlo.');
  }
}

async function triggerApprovalWorkflow(action = 'approve_request', entry = null) {
  if (!ensureAuthenticated()) {
    throw new Error('Sesión expirada. Iniciá sesión nuevamente.');
  }

  const sessionToken = getSessionToken();

  if (!sessionToken) {
    clearSessionData();
    throw new Error('No hay un token configurado en este dispositivo.');
  }

  const payload = entry ? buildDispatchPayload(entry) : DEFAULT_DISPATCH_PAYLOAD;
  const encodedPayload = encodePayloadToBase64(payload);

  const response = await fetch(WORKFLOW_DISPATCH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: WORKFLOW_REF,
      inputs: {
        session_token: sessionToken,
        action,
        payload: encodedPayload,
        payload_encoding: 'base64'
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Workflow dispatch falló (${response.status}): ${text}`);
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
    approveBtn.addEventListener('click', async () => {
      if (estado !== 'pendiente') return;
      const originalLabel = approveBtn.innerHTML;
      approveBtn.disabled = true;
      approveBtn.innerHTML = '<i class="fa-solid fa-gear fa-spin"></i> Enviando...';
      setStatus(`Enviando approve_request a través del backend seguro para ${entry?.nombre_cliente || entry?.slug || 'solicitud'}...`);
      try {
        await triggerApprovalWorkflow('approve_request', entry);
        setStatus('✅ Workflow approve_request disparado. Revisá la pestaña Actions.', 'success');
      } catch (error) {
        console.error('approve dispatch error', error);
        setStatus(`❌ ${error.message}`, 'error');
        approveBtn.disabled = false;
        approveBtn.innerHTML = originalLabel;
        return;
      }
      approveBtn.innerHTML = originalLabel;
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn cancel';
    cancelBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Cancelar';
    cancelBtn.disabled = estado !== 'pendiente';
    cancelBtn.addEventListener('click', async () => {
      if (estado !== 'pendiente') return;
      const originalLabel = cancelBtn.innerHTML;
      cancelBtn.disabled = true;
      cancelBtn.innerHTML = '<i class="fa-solid fa-gear fa-spin"></i> Enviando...';
      setStatus(`Enviando cancel_request mediante el backend seguro para ${entry?.nombre_cliente || entry?.slug || 'solicitud'}...`);
      try {
        await triggerApprovalWorkflow('cancel_request', entry);
        setStatus('✅ Workflow cancel_request disparado correctamente.', 'success');
      } catch (error) {
        console.error('cancel dispatch error', error);
        setStatus(`❌ ${error.message}`, 'error');
        cancelBtn.disabled = false;
        cancelBtn.innerHTML = originalLabel;
        return;
      }
      cancelBtn.innerHTML = originalLabel;
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn--secondary';
    copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar JSON';
    copyBtn.addEventListener('click', () => copyPayload(payload));

    actions.append(approveBtn, cancelBtn, copyBtn);
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

  const sessionLocal = localStorage.getItem(SESSION_STORAGE_KEY);
  const tokenLocal =
    localStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
  localStorage.clear();
  if (sessionLocal) {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionLocal);
  }
  if (tokenLocal) {
    localStorage.setItem(SESSION_TOKEN_KEY, tokenLocal);
    localStorage.setItem(TOKEN_STORAGE_KEY, tokenLocal);
  }

  const sessionTemp = sessionStorage.getItem(SESSION_STORAGE_KEY);
  const tokenTemp =
    sessionStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
  sessionStorage.clear();
  if (sessionTemp) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionTemp);
  }
  if (tokenTemp) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, tokenTemp);
    sessionStorage.setItem(TOKEN_STORAGE_KEY, tokenTemp);
  }
  window.location.reload();
}

function logout() {
  const confirmation = window.confirm('¿Cerrar sesión en el panel de administración?');
  if (!confirmation) return;

  clearSessionData({ keepToken: false });
  redirectToLogin();
}

async function refresh() {
  try {
    const authenticated = await ensureAuthenticated();
    if (!authenticated) return;

    const data = await fetchRequests();
    state.requests = Array.isArray(data) ? data : [];
    renderRequests(state.requests);
    updateStats();
    updateLastUpdateTime();
    const sourceLabel = describeSource(lastSuccessfulRequestsSource);
    setStatus(`Solicitudes actualizadas correctamente (${sourceLabel}).`, 'success');
  } catch (error) {
    console.error('fetchRequests error', error);
    setStatus(`❌ ${error.message}`, 'error');
    setRequestsStatusPill('error', 'Error al cargar');
  }
}

async function init() {
  const authenticated = await ensureAuthenticated();
  if (!authenticated) {
    return;
  }

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

  if (elements.dispatchApproveButton) {
    elements.dispatchApproveButton.addEventListener('click', async () => {
      setStatus('Enviando approve_request manual vía GitHub Actions...');
      try {
        await triggerApprovalWorkflow('approve_request');
        setStatus('✅ Workflow approve_request en ejecución.', 'success');
      } catch (error) {
        console.error('manual approve dispatch error', error);
        setStatus(`❌ ${error.message}`, 'error');
      }
    });
  }

  if (elements.dispatchCancelButton) {
    elements.dispatchCancelButton.addEventListener('click', async () => {
      setStatus('Enviando cancel_request manual vía GitHub Actions...');
      try {
        await triggerApprovalWorkflow('cancel_request');
        setStatus('✅ Workflow cancel_request en ejecución.', 'success');
      } catch (error) {
        console.error('manual cancel dispatch error', error);
        setStatus(`❌ ${error.message}`, 'error');
      }
    });
  }

  await refresh();
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error('Error al iniciar el panel', error);
    setStatus('No se pudo iniciar el panel. Reintentá más tarde.', 'error');
  });
});


