const REPO_OWNER = 'komkida91';
const REPO_NAME = 'gkachele';
const WORKFLOW_TARGET_FILE = 'save-request.yml';
const WORKFLOW_TARGET_REF = 'main';

const SESSION_STORAGE_KEY = 'gkachele_session';
const SESSION_TOKEN_KEY = 'gkachele_session_token';

const WORKFLOW_BACKEND_REPO = 'gkachele-requests';
const WORKFLOW_BACKEND_FILE = 'submit-request-through-app.yml';
const WORKFLOW_BACKEND_REF = 'main';

const workflowBackendUrl = `https://api.github.com/repos/${REPO_OWNER}/${WORKFLOW_BACKEND_REPO}/actions/workflows/${WORKFLOW_BACKEND_FILE}/dispatches`;

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

function sanitize(value = '') {
  return value ? value.toString().trim() : '';
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

function getStoredValue(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function getSessionData() {
  const rawData = getStoredValue(SESSION_STORAGE_KEY);
  if (!rawData) return null;
  try {
    return JSON.parse(rawData);
  } catch {
    return null;
  }
}

function getSessionToken() {
  const encoded = getStoredValue(SESSION_TOKEN_KEY);
  return decodeToken(encoded);
}

function redirectToLogin() {
  window.location.href = 'login.html';
}

function ensureAuthenticated() {
  const session = getSessionData();
  const token = getSessionToken();

  if (!session || !token) {
    return false;
  }

  const ttl = 7 * 24 * 60 * 60 * 1000;
  if (!session.timestamp || Date.now() - session.timestamp > ttl) {
    return false;
  }

  return true;
}

function encodeToBase64(value = '') {
  if (!value) return '';
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch (_) {
    return btoa(value);
  }
}

async function triggerWorkflow(inputs) {
  const sessionToken = getSessionToken();

  if (!sessionToken) {
    throw new Error('Debes iniciar sesión para enviar solicitudes.');
  }

  const encodedInputs = encodeToBase64(JSON.stringify(inputs));

  const response = await fetch(workflowBackendUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `token ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: WORKFLOW_BACKEND_REF,
      inputs: {
        session_token: sessionToken,
        inputs_base64: encodedInputs,
        workflow_file: WORKFLOW_TARGET_FILE,
        workflow_ref: WORKFLOW_TARGET_REF
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Backend respondió ${response.status}: ${errorBody}`);
  }
}

function formDataToObject(formData) {
  const data = {};
  formData.forEach((value, key) => {
    data[key] = sanitize(value);
  });
  return data;
}

function collectRubroFields(rubro, data) {
  const campos = {};

  switch (rubro) {
    case 'restaurante':
      if (data.menu_url) campos.menu_url = data.menu_url;
      if (data.horarios) campos.horarios = data.horarios;
      if (data.reservas) campos.reservas = data.reservas;
      if (data.capacidad) campos.capacidad = data.capacidad;
      if (data.especialidad_culinaria) campos.especialidad_culinaria = data.especialidad_culinaria;
      break;
    case 'danza':
      if (data.clases) campos.clases = data.clases;
      if (data.horarios_clases) campos.horarios_clases = data.horarios_clases;
      if (data.niveles) campos.niveles = data.niveles;
      if (data.estilos) campos.estilos = data.estilos;
      if (data.profesores) campos.profesores = data.profesores;
      break;
    case 'cosmeticos':
      if (data.productos_url) campos.productos_url = data.productos_url;
      if (data.catalogo) campos.catalogo = data.catalogo;
      if (data.categorias) campos.categorias = data.categorias;
      if (data.ofertas) campos.ofertas = data.ofertas;
      if (data.envios) campos.envios = data.envios;
      break;
    case 'politica':
      if (data.propuestas) campos.propuestas = data.propuestas;
      if (data.agenda) campos.agenda = data.agenda;
      if (data.eventos) campos.eventos = data.eventos;
      if (data.noticias) campos.noticias = data.noticias;
      break;
    case 'fitness':
      if (data.planes_fitness) campos.planes = data.planes_fitness;
      if (data.horarios_fitness) campos.horarios = data.horarios_fitness;
      if (data.entrenadores) campos.entrenadores = data.entrenadores;
      if (data.instalaciones) campos.instalaciones = data.instalaciones;
      if (data.precios) campos.precios = data.precios;
      break;
    case 'educacion':
      if (data.cursos) campos.cursos = data.cursos;
      if (data.horarios_educacion) campos.horarios = data.horarios_educacion;
      if (data.niveles_educacion) campos.niveles = data.niveles_educacion;
      if (data.profesores_educacion) campos.profesores = data.profesores_educacion;
      if (data.inscripcion) campos.inscripcion = data.inscripcion;
      break;
    default:
      break;
  }

  return Object.keys(campos).length ? campos : null;
}

function buildStructuredPayload(rawData) {
  const fechaCreacion = new Date().toISOString();
  const slug = slugify(rawData.nombre || 'sitio');
  const dominioPreferido = sanitize(rawData.dominio);
  const dominioBase = dominioPreferido ? slugify(dominioPreferido) : slug;

  const redesSociales = {
    facebook: rawData.facebook || null,
    instagram: rawData.instagram || null,
    twitter: rawData.twitter || null,
    whatsapp: rawData.whatsapp || null,
    youtube: rawData.youtube || null,
    tiktok: rawData.tiktok || null,
    linkedin: null
  };

  const payload = {
    plan: rawData.plan,
    slug,
    cliente: {
      nombre_completo: rawData.nombre,
      email: rawData.email,
      telefono: rawData.telefono,
      rubro: rawData.rubro
    },
    personalizacion: {
      colores_preferidos: rawData.colores || '',
      tipografia: rawData.tipografia || null,
      logo_url: rawData.logo_url || null,
      logo_upload: null
    },
    redes_sociales: redesSociales,
    direccion: {
      calle: rawData.direccion_calle || '',
      ciudad: rawData.direccion_ciudad || '',
      provincia: rawData.direccion_provincia || '',
      codigo_postal: rawData.direccion_cp || '',
      pais: 'Argentina'
    },
    rubro_especifico: collectRubroFields(rawData.rubro, rawData),
    dominio: {
      preferido: dominioPreferido || dominioBase,
      generado: `${dominioBase}.gkachele.duckdns.org`
    },
    descripcion: rawData.descripcion || '',
    estado: 'pendiente_pago',
    fecha_creacion: fechaCreacion
  };

  return { payload, slug, fechaCreacion };
}

function buildWorkflowInputs(formData) {
  const data = formDataToObject(formData);
  const { payload, slug, fechaCreacion } = buildStructuredPayload(data);

  return {
    nombre_cliente: payload.cliente.nombre_completo,
    slug,
    rubro: payload.cliente.rubro,
    plan: payload.plan,
    redes: JSON.stringify(payload.redes_sociales),
    timestamp: fechaCreacion,
    payload: JSON.stringify(payload)
  };
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!ensureAuthenticated()) {
    setStatus('❌ Debes iniciar sesión para registrar solicitudes.', 'error');
    setTimeout(() => redirectToLogin(), 1200);
    return;
  }

  const formData = new FormData(form);
  const workflowInputs = buildWorkflowInputs(formData);

  submitButton.disabled = true;
  submitButton.classList.add('loading');
  setStatus('Enviando solicitud...');

  try {
    await triggerWorkflow(workflowInputs);
    form.reset();
    setStatus('✅ Solicitud enviada correctamente. Un asesor te contactará a la brevedad.', 'success');
  } catch (error) {
    console.error('workflow_dispatch error', error);
    if (/401|403/.test(error.message)) {
      setStatus('❌ Sesión inválida o expirada. Iniciá sesión nuevamente.', 'error');
      setTimeout(() => redirectToLogin(), 1500);
    } else {
      setStatus(`❌ No se pudo registrar la solicitud. ${error.message}`, 'error');
    }
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('loading');
  }
}

if (form) {
  if (!ensureAuthenticated()) {
    setStatus('🔒 Iniciá sesión para cargar nuevas solicitudes.', 'error');
    submitButton.disabled = true;
    submitButton.classList.add('loading');
    setTimeout(() => redirectToLogin(), 1500);
  }
  form.addEventListener('submit', handleSubmit);
}

