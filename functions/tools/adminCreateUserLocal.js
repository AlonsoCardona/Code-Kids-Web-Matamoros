#!/usr/bin/env node
/**
 * Local helper to create a user like the adminCreateUser HTTPS function.
 * Usage (PowerShell):
 *   node tools/adminCreateUserLocal.js --emailDomain codekids.com --nombre Juan --apellidoPaterno Perez --apellidoMaterno Lopez --role profesor --schoolId ESC001 --key C:\ruta\service-account.json
 *
 * Required args: --nombre, --apellidoPaterno, --apellidoMaterno, --role
 * Optional: --schoolId, --emailDomain (default codekids.com), --key (path to service account JSON)
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.replace(/^--/, '');
    const val = (i + 1 < args.length && !args[i + 1].startsWith('--')) ? args[++i] : true;
    out[key] = val;
  }
  return out;
}

function ensureInitialized(opts) {
  if (admin.apps.length) return;
  if (opts.key) {
    const keyPath = path.resolve(process.cwd(), opts.key);
    if (!fs.existsSync(keyPath)) {
      console.error(`❌ Service account key not found at: ${keyPath}`);
      process.exit(1);
    }
    const cred = admin.credential.cert(require(keyPath));
    admin.initializeApp({ credential: cred });
  } else {
    // ADC (gcloud auth application-default login) or environment default
    admin.initializeApp();
  }
}

function mapRoleLetter(role) {
  const r = (role || '').toString().toLowerCase();
  if (r === 'admin' || r === 'administrador') return 'a';
  if (r === 'profesor' || r === 'teacher' || r === 'docente') return 'c';
  return 'b'; // estudiante default
}

function randomPassword(len = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const nums = '23456789';
  const syms = '!@#$%^&*';
  const all = upper + lower + nums + syms;
  let pw = '';
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += nums[Math.floor(Math.random() * nums.length)];
  pw += syms[Math.floor(Math.random() * syms.length)];
  for (let i = 4; i < len; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split('').sort(() => Math.random() - 0.5).join('');
}

async function nextCounterForRoleLetter(letter) {
  const db = admin.firestore();
  const ref = db.collection('counters').doc(`users-role-${letter}`);
  const res = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? (snap.data().value || 0) : 0;
    const next = cur + 1;
    tx.set(ref, { value: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });
  return res;
}

async function main() {
  const opts = parseArgs();
  const {
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    role,
    schoolId = null,
    emailDomain = 'codekids.com',
  } = opts;

  if (!nombre || !apellidoPaterno || !apellidoMaterno || !role) {
    console.error('Uso: --nombre --apellidoPaterno --apellidoMaterno --role [--schoolId] [--emailDomain codekids.com] [--key C:\\ruta\\clave.json]');
    process.exit(1);
  }

  ensureInitialized(opts);

  const roleLetter = mapRoleLetter(role);
  const first = nombre.trim()[0]?.toLowerCase() || 'u';
  const year = new Date().getFullYear();
  const auth = admin.auth();
  const db = admin.firestore();

  let index = await nextCounterForRoleLetter(roleLetter);
  let email;
  // Try more attempts locally to avoid collisions
  for (let attempts = 0; attempts < 50; attempts++) {
    email = `${first}${year}${roleLetter}${index}@${emailDomain}`;
    try {
      await auth.getUserByEmail(email);
      // exists -> increment and retry
      index++;
    } catch (lookupErr) {
      // if user-not-found -> email free
      if (lookupErr && lookupErr.code && lookupErr.code !== 'auth/user-not-found') {
        console.error('❌ getUserByEmail error inesperado:', lookupErr.code, lookupErr.message);
        process.exit(2);
      }
      break;
    }
  }

  let tempPassword = randomPassword(12);
  for (let tries = 0; tries < 3; tries++) {
    const q = await db.collection('users').where('tempPassword', '==', tempPassword).limit(1).get();
    if (q.empty) break;
    tempPassword = randomPassword(12);
  }

  const displayName = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim();

  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password: tempPassword, displayName, disabled: false });
  } catch (e) {
    console.error('❌ createUser_failed:', e.code, e.message);
    process.exit(3);
  }

  try {
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      email,
      displayName,
      searchableDisplayName: displayName.toLowerCase(),
      role: (role[0].toUpperCase() + role.slice(1).toLowerCase()),
      rol: role.toLowerCase(),
      roleLetter,
      schoolId: schoolId || null,
      photoURL: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
      passwordChangeRequired: true,
      passwordValidUntil: null,
      tempPassword,
    });
  } catch (e) {
    try { await auth.updateUser(userRecord.uid, { disabled: true }); } catch (_) {}
    console.error('❌ firestore_write_failed:', e.message);
    process.exit(4);
  }

  try {
    await db.collection('activityLog').add({
      type: 'USER_CREATED_LOCAL',
      data: { userUid: userRecord.uid, role, email },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (_) { /* non-blocking */ }

  console.log(JSON.stringify({ ok: true, uid: userRecord.uid, email, tempPassword }, null, 2));
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(10);
});
