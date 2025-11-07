#!/usr/bin/env bash

set -euo pipefail

SLUG="${1:-}"
CLIENT_NAME="${2:-}"
RUBRO="${3:-}"
PLAN="${4:-}"
REDES_RAW="${5:-}"

if [[ -z "$SLUG" || -z "$CLIENT_NAME" || -z "$RUBRO" || -z "$PLAN" ]]; then
  echo "Uso: core/scripts/create-site.sh <slug> <nombre_cliente> <rubro> <plan> [redes]" >&2
  exit 1
fi

REPO_DIR="$(pwd)"
PROJECTS_DIR="$REPO_DIR/proyectos"
TEMPLATES_DIR="$REPO_DIR/core/templates"
SITE_DIR="$PROJECTS_DIR/$SLUG"

if [[ ! -d "$PROJECTS_DIR" ]]; then
  mkdir -p "$PROJECTS_DIR"
fi

TEMPLATE_DIR="$TEMPLATES_DIR/$RUBRO"
if [[ ! -d "$TEMPLATE_DIR" ]] || [[ -z "$(ls -A "$TEMPLATE_DIR" 2>/dev/null)" ]]; then
  echo "⚠️  Template para '$RUBRO' no encontrado. Usando 'base'."
  TEMPLATE_DIR="$TEMPLATES_DIR/base"
fi

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"
cp -R "$TEMPLATE_DIR"/. "$SITE_DIR" 2>/dev/null || true

DOMAIN_PATH="gkachele.duckdns.org/proyectos/$SLUG"

COLOR_PRIMARY="#1f6feb"
COLOR_SECONDARY="#0d1117"
COLOR_ACCENT="#ff6b35"
COLOR_TEXT="#f0f3ff"
COLOR_BG="#050508"
FONT_FAMILY="'Poppins', 'Segoe UI', sans-serif"

case "$PLAN" in
  pro)
    COLOR_PRIMARY="#22c1c3"
    COLOR_SECONDARY="#0f172a"
    COLOR_ACCENT="#f97316"
    ;;
  premium)
    COLOR_PRIMARY="#b16cea"
    COLOR_SECONDARY="#1f1f28"
    COLOR_ACCENT="#ffa260"
    FONT_FAMILY="'Metropolis', 'Segoe UI', sans-serif"
    ;;
  base|*)
    COLOR_PRIMARY="#1f6feb"
    COLOR_SECONDARY="#0d1117"
    COLOR_ACCENT="#ff6b35"
    FONT_FAMILY="'Poppins', 'Segoe UI', sans-serif"
    ;;
esac

export REDES_INPUT="$REDES_RAW"

SOCIALS_JSON=$(node <<'NODE'
const raw = process.env.REDES_INPUT || '';
const lines = raw.replace(/\r/g, '').split(/\n+/).map(line => line.trim()).filter(Boolean);
const socials = {
  facebook: '#',
  instagram: '#',
  twitter: '#',
  whatsapp: '#'
};

const patterns = {
  facebook: /facebook\.com|fb\.com|@facebook/i,
  instagram: /instagram\.com|insta\.|@/i,
  twitter: /twitter\.com|x\.com|@/i,
  whatsapp: /wa\.me|whatsapp\.com/i
};

for (const line of lines) {
  const lower = line.toLowerCase();
  for (const [key, regex] of Object.entries(patterns)) {
    if (regex.test(lower)) {
      const match = line.match(/https?:\/\/[^\s]+/i);
      socials[key] = match ? match[0] : line.replace(/^[^:]+:\s*/i, '').trim();
    }
  }
}

process.stdout.write(JSON.stringify(socials));
NODE
)

SITE_DESCRIPTION="Sitio profesional para ${CLIENT_NAME}."
SITE_KEYWORDS="${RUBRO}, ${PLAN}, ${CLIENT_NAME}, GKACHELE"
HERO_TITLE="Bienvenido a ${CLIENT_NAME}"
HERO_SUBTITLE="Tu nueva presencia digital en minutos." 
HERO_DESCRIPTION="Creamos experiencias digitales a medida para potenciar tu negocio."
SECTION_TITLE="Servicios Destacados"
CONTACT_EMAIL="contacto@gkachele.com"
CONTACT_PHONE="+54 9 11 2345 6789"

export SITE_NAME="$CLIENT_NAME"
export SITE_DESCRIPTION
export SITE_KEYWORDS
export DOMAIN_PATH
export COLOR_PRIMARY COLOR_SECONDARY COLOR_ACCENT COLOR_TEXT COLOR_BG FONT_FAMILY
export HERO_TITLE HERO_SUBTITLE HERO_DESCRIPTION SECTION_TITLE CONTACT_EMAIL CONTACT_PHONE
export SOCIALS_JSON

REPLACEMENTS=$(node <<'NODE'
const socials = JSON.parse(process.env.SOCIALS_JSON || '{}');

const replacements = {
  SITE_NAME: process.env.SITE_NAME,
  SITE_DESCRIPTION: process.env.SITE_DESCRIPTION,
  SITE_KEYWORDS: process.env.SITE_KEYWORDS,
  DOMAIN: process.env.DOMAIN_PATH,
  COLOR_PRIMARY: process.env.COLOR_PRIMARY,
  COLOR_SECONDARY: process.env.COLOR_SECONDARY,
  COLOR_ACCENT: process.env.COLOR_ACCENT,
  COLOR_TEXT: process.env.COLOR_TEXT,
  COLOR_BG: process.env.COLOR_BG,
  FONT_FAMILY: process.env.FONT_FAMILY,
  HERO_TITLE: process.env.HERO_TITLE,
  HERO_SUBTITLE: process.env.HERO_SUBTITLE,
  HERO_DESCRIPTION: process.env.HERO_DESCRIPTION,
  SECTION_TITLE: process.env.SECTION_TITLE,
  CONTACT_EMAIL: process.env.CONTACT_EMAIL,
  CONTACT_PHONE: process.env.CONTACT_PHONE,
  FACEBOOK_URL: socials.facebook || '#',
  INSTAGRAM_URL: socials.instagram || '#',
  TWITTER_URL: socials.twitter || '#',
  WHATSAPP_URL: socials.whatsapp || '#',
  BASE_URL: `https://${process.env.DOMAIN_PATH}`,
  SITEMAP_URL: `https://${process.env.DOMAIN_PATH}/sitemap.xml`,
  LAST_MOD: new Date().toISOString().split('T')[0]
};

process.stdout.write(JSON.stringify(replacements));
NODE

export SITE_DIR="$SITE_DIR"
node <<'NODE'
const fs = require('fs');
const path = require('path');

const replacements = JSON.parse(process.argv[1]);
const siteDir = process.env.SITE_DIR;

const replaceInFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, value);
  }
  fs.writeFileSync(filePath, content, 'utf8');
};

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      replaceInFile(fullPath);
    }
  }
};

walk(siteDir);
NODE
"$REPLACEMENTS"

echo "✅ Sitio creado en proyectos/$SLUG usando plantilla '$RUBRO' (${PLAN})."

