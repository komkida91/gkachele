const REPO_OWNER = 'komkida91';
const REPO_NAME = 'gkachele';
const WORKFLOW_FILE = 'save-request.yml';
const WORKFLOW_REF = 'main';

const workflowUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

const statusMessage = document.getElementById('statusMessage');
const submitButton = document.getElementById('submitButton');
const form = document.getElementById('requestForm');

function setStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function slugify(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'sitio-' + Date.now();
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

async function triggerWorkflow(payload) {
  const token = getToken();

  if (!token) {
    throw new Error('Falta configurar el token de autenticación.');
  }

  const response = await fetch(workflowUrl, {
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
    const errorBody = await response.text();
    throw new Error(`GitHub API respondió ${response.status}: ${errorBody}`);
  }
}

function buildPayload(formData) {
  const nombre = formData.get('nombre_cliente');

  return {
    nombre_cliente: nombre,
    slug: slugify(nombre),
    rubro: formData.get('rubro'),
    plan: formData.get('plan'),
    redes: formData.get('redes_sociales') || '',
    timestamp: new Date().toISOString()
  };
}

async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = buildPayload(formData);

  submitButton.disabled = true;
  submitButton.classList.add('loading');
  setStatus('Enviando solicitud...');

  try {
    await triggerWorkflow(payload);
    form.reset();
    setStatus('✅ Solicitud enviada correctamente. Un asesor te contactará a la brevedad.', 'success');
  } catch (error) {
    console.error('workflow_dispatch error', error);
    setStatus(`❌ No se pudo registrar la solicitud. ${error.message}`, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('loading');
  }
}

if (form) {
  form.addEventListener('submit', handleSubmit);
}

