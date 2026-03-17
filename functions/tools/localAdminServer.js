#!/usr/bin/env node
/**
 * Local HTTP server that mirrors the /adminCreateUser function.
 * Start:
 *   node tools/localAdminServer.js --port 5055 --key C:\ruta\service-account.json
 * Use in browser (DevTools console on http://127.0.0.1:5002):
 *   window.CODEKIDS_LOCAL_ADMIN_ENDPOINT = 'http://127.0.0.1:5055/adminCreateUser'
 * Then use the Admin dashboard normally.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { port: 5055 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = (i + 1 < args.length && !args[i + 1].startsWith('--')) ? args[++i] : true;
    out[k] = v;
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
    admin.initializeApp();
  }
}

function mapRoleLetter(role) {
  const r = (role || '').toString().toLowerCase();
  if (r === 'admin' || r === 'administrador') return 'a';
  if (r === 'profesor' || r === 'teacher' || r === 'docente') return 'c';
  return 'b';
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

async function verifyAdminFromToken(token) {
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded.admin === true) return decoded;
    // fallback: check Firestore role/rol
    const db = admin.firestore();
    const snap = await db.collection('users').doc(decoded.uid).get();
    const roleRaw = snap.exists ? (snap.data().role || snap.data().rol) : null;
    const role = (roleRaw || '').toString().trim().toLowerCase();
    if (role === 'admin' || role === 'administrador') return decoded;
    return null;
  } catch (e) {
    return null;
  }
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

function send(res, status, obj) {
  const body = JSON.stringify(obj || {});
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(body);
}

function parseJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => raw += c);
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch (_) { resolve({}); }
    });
  });
}

async function handleCreateUser(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido' });

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const adminUser = token ? await verifyAdminFromToken(token) : null;
  if (!adminUser) return send(res, 403, { error: 'No autorizado' });

  const body = await parseJson(req);
  const { nombre, apellidoPaterno, apellidoMaterno, role, schoolId } = body || {};
  if (!nombre || !apellidoPaterno || !apellidoMaterno || !role) {
    return send(res, 400, { error: 'Campos requeridos: nombre, apellidoPaterno, apellidoMaterno, role' });
  }

  const roleLetter = mapRoleLetter(role);
  const first = nombre.trim()[0]?.toLowerCase() || 'u';
  const year = new Date().getFullYear();
  const auth = admin.auth();
  const db = admin.firestore();

  let index = await nextCounterForRoleLetter(roleLetter);
  let email;
  for (let attempts = 0; attempts < 50; attempts++) {
    email = `${first}${year}${roleLetter}${index}@codekids.com`;
    try {
      await auth.getUserByEmail(email);
      index++;
    } catch (lookupErr) {
      if (lookupErr && lookupErr.code && lookupErr.code !== 'auth/user-not-found') {
        return send(res, 500, { error: 'getUserByEmail_failed', code: lookupErr.code, message: lookupErr.message });
      }
      break;
    }
  }

  let tempPassword = randomPassword(12);
  for (let i = 0; i < 3; i++) {
    const q = await db.collection('users').where('tempPassword', '==', tempPassword).limit(1).get();
    if (q.empty) break;
    tempPassword = randomPassword(12);
  }

  const displayName = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim();
  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password: tempPassword, displayName, disabled: false });
  } catch (e) {
    return send(res, 500, { error: 'createUser_failed', code: e.code, message: e.message });
  }

  try {
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      nombre, apellidoPaterno, apellidoMaterno,
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
    return send(res, 500, { error: 'firestore_write_failed', message: e.message });
  }

  try {
    await db.collection('activityLog').add({
      type: 'USER_CREATED_LOCAL_HTTP',
      data: { actorUid: adminUser.uid, userUid: userRecord.uid, role, email },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (_) {}

  return send(res, 200, { uid: userRecord.uid, email, tempPassword });
}

async function start() {
  const opts = parseArgs();
  ensureInitialized(opts);
  const server = http.createServer(async (req, res) => {
    const { pathname } = url.parse(req.url);
    if (pathname === '/adminCreateUser') {
      return handleCreateUser(req, res);
    }
    if (pathname === '/adminDeleteUser') {
      // Verify admin
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const adminUser = token ? await verifyAdminFromToken(token) : null;
      if (!adminUser) return send(res, 403, { error: 'No autorizado' });
      const body = await parseJson(req);
      const { uid } = body || {};
      if (!uid) return send(res, 400, { error: 'uid requerido' });
      try {
        await admin.firestore().collection('users').doc(uid).delete();
      } catch (e) { /* ignore */ }
      try {
        await admin.auth().deleteUser(uid);
      } catch (e) {
        return send(res, 500, { error: 'deleteUser_failed', code: e.code, message: e.message });
      }
      return send(res, 200, { ok: true });
    }
    if (pathname === '/adminUpdateUser') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const adminUser = token ? await verifyAdminFromToken(token) : null;
      if (!adminUser) return send(res, 403, { error: 'No autorizado' });
      const body = await parseJson(req);
      const { uid, nombre, apellidoPaterno, apellidoMaterno, role, schoolId } = body || {};
      if (!uid) return send(res, 400, { error: 'uid requerido' });
      const db = admin.firestore();
      const updates = {};
      if (typeof nombre === 'string') updates.nombre = nombre;
      if (typeof apellidoPaterno === 'string') updates.apellidoPaterno = apellidoPaterno;
      if (typeof apellidoMaterno === 'string') updates.apellidoMaterno = apellidoMaterno;
      if (typeof role === 'string') {
        updates.role = role[0].toUpperCase() + role.slice(1).toLowerCase();
        updates.rol = role.toLowerCase();
        updates.roleLetter = mapRoleLetter(role);
      }
      if (typeof schoolId === 'string' || schoolId === null) updates.schoolId = schoolId || null;
      const displayName = `${updates.nombre || ''} ${updates.apellidoPaterno || ''} ${updates.apellidoMaterno || ''}`.trim();
      if (displayName) {
        updates.displayName = displayName;
        updates.searchableDisplayName = displayName.toLowerCase();
      }
      try {
        await db.collection('users').doc(uid).set(updates, { merge: true });
      } catch (e) {
        return send(res, 500, { error: 'firestore_update_failed', message: e.message });
      }
      // Try to update Auth displayName non-critically
      if (displayName) {
        try { await admin.auth().updateUser(uid, { displayName }); } catch (_) {}
      }
      return send(res, 200, { ok: true });
    }
    if (pathname === '/adminSetUserPassword') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const adminUser = token ? await verifyAdminFromToken(token) : null;
      if (!adminUser) return send(res, 403, { error: 'No autorizado' });
      const body = await parseJson(req);
      const { uid, newPassword, generateRandom } = body || {};
      if (!uid) return send(res, 400, { error: 'uid requerido' });
      let finalPw = newPassword;
      if (generateRandom || !finalPw) finalPw = randomPassword(12);
      try {
        await admin.auth().updateUser(uid, { password: finalPw });
      } catch (e) {
        return send(res, 500, { error: 'update_password_failed', code: e.code, message: e.message });
      }
      try {
        await admin.firestore().collection('users').doc(uid).set({
          tempPassword: finalPw,
          passwordChangeRequired: true,
          forcePasswordChange: true,
          lastPasswordResetByAdminAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) {
        return send(res, 500, { error: 'firestore_update_failed', message: e.message });
      }
      return send(res, 200, { ok: true, newPassword: finalPw });
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      });
      return res.end();
    }
    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  server.listen(Number(opts.port) || 5055, () => {
    console.log(`Local Admin Server listening on http://127.0.0.1:${opts.port || 5055}`);
  });
}

start().catch((e) => {
  console.error('❌ Failed to start local server:', e);
  process.exit(1);
});
