#!/usr/bin/env node
/**
 * encrypt-pat.js
 * ---------------
 * Genera un JSON cifrado con AES-256-GCM para guardar el PAT del administrador.
 *
 * Uso:
 *   node core/scripts/encrypt-pat.js <passphrase> <pat>
 *
 * También puedes definir variables de entorno:
 *   PAT_PASSPHRASE="frase" ADMIN_PAT="ghp_..." node core/scripts/encrypt-pat.js
 *
 * El resultado (por stdout) es un JSON con:
 *   algorithm, iterations, salt, iv, tag, ciphertext, created_at.
 * Copia ese JSON en admin/config/encrypted-token.json y v1/admin/config/encrypted-token.json.
 */

const crypto = require('crypto');

const passphrase = process.env.PAT_PASSPHRASE || process.argv[2];
const pat = process.env.ADMIN_PAT || process.argv[3];

if (!passphrase || !pat) {
  console.error('❌ Uso: node core/scripts/encrypt-pat.js <passphrase> <pat>');
  console.error('   o define PAT_PASSPHRASE y ADMIN_PAT en el entorno antes de ejecutar.');
  process.exit(1);
}

const iterations = 200000;
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(passphrase, salt, iterations, 32, 'sha256');

const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const ciphertext = Buffer.concat([cipher.update(pat, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();

const payload = {
  algorithm: 'aes-256-gcm',
  iterations,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  tag: authTag.toString('base64'),
  ciphertext: ciphertext.toString('base64'),
  created_at: new Date().toISOString()
};

console.log(JSON.stringify(payload, null, 2));

