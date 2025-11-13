const SESSION_STORAGE_KEY = 'gkachele_session';
const SESSION_TOKEN_KEY = 'gkachele_session_token';
const TOKEN_STORAGE_KEY = 'github_token';
const EMAIL_STORAGE_KEY = 'gkachele_admin_email';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const form = document.getElementById('login-form');
const tokenInput = document.getElementById('tokenInput');
const detectTokenButton = document.getElementById('detectToken');
const clearTokenButton = document.getElementById('clearToken');
const tokenStatus = document.getElementById('tokenStatus');
const emailInput = document.getElementById('email');
const rememberSessionCheckbox = document.getElementById('rememberSession');
const rememberTokenCheckbox = document.getElementById('rememberToken');
const errorMessage = document.getElementById('error-message');

function encodeToken(token = '') {
  if (!token) return '';
  try {
    return btoa(unescape(encodeURIComponent(token)));
  } catch (_) {
    return btoa(token);
  }
}

function decodeToken(encoded = '') {
  if (!encoded) return '';
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch (_) {
    try {
      return atob(encoded);
    } catch {
      return '';
    }
  }
}

function setError(message = '') {
  if (!errorMessage) return;
  if (!message) {
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';
    return;
  }
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
}

function setTokenStatus(message, status = 'info') {
  if (!tokenStatus) return;
  tokenStatus.textContent = message;
  tokenStatus.className = `token-helper__status ${status}`;
}

function maskToken(token = '') {
  if (!token) return '';
  if (token.length <= 10) return `${token.slice(0, 2)}***`;
  return `${token.slice(0, 4)}***${token.slice(-3)}`;
}

function getStoredToken() {
  const encoded =
    sessionStorage.getItem(SESSION_TOKEN_KEY) ||
    localStorage.getItem(SESSION_TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
    localStorage.getItem(TOKEN_STORAGE_KEY);
  return decodeToken(encoded || '');
}

function storeToken(token, persist) {
  if (!token) {
    clearStoredToken();
    return;
  }

  const encoded = encodeToken(token);
  sessionStorage.setItem(SESSION_TOKEN_KEY, encoded);
  sessionStorage.setItem(TOKEN_STORAGE_KEY, encoded);

  if (persist) {
    localStorage.setItem(SESSION_TOKEN_KEY, encoded);
    localStorage.setItem(TOKEN_STORAGE_KEY, encoded);
  } else {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function clearStoredToken() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function getStoredSession() {
  const raw =
    sessionStorage.getItem(SESSION_STORAGE_KEY) ||
    localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function persistSession(email, remember) {
  const payload = {
    email: email || null,
    timestamp: Date.now()
  };

  const serialized = JSON.stringify(payload);
  sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);

  if (remember) {
    localStorage.setItem(SESSION_STORAGE_KEY, serialized);
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function hasValidSession() {
  const session = getStoredSession();
  const token = getStoredToken();
  if (!session || !token) return false;
  if (!session.timestamp) return false;
  return Date.now() - session.timestamp < SESSION_TTL_MS;
}

function parseTokenFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return '';
  const params = new URLSearchParams(hash);
  const token = params.get('token') || '';
  if (token) {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }
  return token.trim();
}

function redirectToDashboard() {
  window.location.href = 'index.html';
}

function populateForm() {
  const savedEmail = localStorage.getItem(EMAIL_STORAGE_KEY);
  if (savedEmail && emailInput) {
    emailInput.value = savedEmail;
  }

  const existingToken = getStoredToken();

  if (existingToken) {
    setTokenStatus(`Token cargado (${maskToken(existingToken)})`, 'success');
  } else {
    const detected = parseTokenFromHash();
    if (detected) {
      storeToken(detected, rememberTokenCheckbox?.checked ?? true);
      if (tokenInput) tokenInput.value = '';
      setTokenStatus(`Token detectado (${maskToken(detected)})`, 'success');
    } else {
      setTokenStatus('Pegá el token o usa el enlace con #token=...', 'info');
    }
  }
}

function handleDetect() {
  const detected = parseTokenFromHash();
  if (!detected) {
    setTokenStatus('No se encontró token en la URL actual.', 'error');
    return;
  }

  storeToken(detected, rememberTokenCheckbox?.checked ?? true);
  if (tokenInput) tokenInput.value = '';
  setTokenStatus(`Token detectado (${maskToken(detected)})`, 'success');
  setError('');
}

function handleClearToken() {
  clearStoredToken();
  if (tokenInput) tokenInput.value = '';
  setTokenStatus('Token eliminado de este navegador.', 'info');
  setError('');
}

function handleLogin(event) {
  event.preventDefault();
  setError('');

  const typedToken = tokenInput?.value.trim();
  const storedToken = getStoredToken();
  const token = typedToken || storedToken;

  if (!token) {
    setError('Falta el token de sesión.');
    tokenInput?.focus();
    return;
  }

  if (typedToken) {
    storeToken(token, rememberTokenCheckbox?.checked ?? true);
  }

  const email = emailInput?.value.trim() || '';
  const rememberSession = rememberSessionCheckbox?.checked ?? true;
  const rememberToken = rememberTokenCheckbox?.checked ?? true;

  storeToken(token, rememberToken);
  persistSession(email, rememberSession);

  if (email) {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  } else {
    localStorage.removeItem(EMAIL_STORAGE_KEY);
  }

  setTokenStatus(`Token almacenado (${maskToken(token)})`, 'success');
  redirectToDashboard();
}

function boot() {
  populateForm();

  if (hasValidSession()) {
    redirectToDashboard();
    return;
  }

  form?.addEventListener('submit', handleLogin);
  detectTokenButton?.addEventListener('click', handleDetect);
  clearTokenButton?.addEventListener('click', handleClearToken);

  tokenInput?.addEventListener('input', () => {
    setError('');
    if (tokenInput.value.trim()) {
      setTokenStatus('Token listo para guardar.', 'info');
    } else {
      const stored = getStoredToken();
      if (stored) {
        setTokenStatus(`Token cargado (${maskToken(stored)})`, 'success');
      } else {
        setTokenStatus('Pegá el token o usa el enlace con #token=...', 'info');
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', boot);

