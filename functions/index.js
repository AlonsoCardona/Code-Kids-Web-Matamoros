/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

const admin = require('firebase-admin');
try { admin.initializeApp(); } catch (e) { /* already initialized */ }

// ==============================
// Helpers
// ==============================
function getClientIp(req) {
	// Behind Firebase Hosting proxy, prefer x-forwarded-for
	const xf = (req.headers['x-forwarded-for'] || '').toString();
	return (xf.split(',')[0] || req.ip || 'unknown').trim();
}

function normalizeEmail(email) {
	return (email || '').toString().trim().toLowerCase();
}

// Rate limit: max N requests per key within WINDOW_MS
async function checkAndIncrementRateLimit({key, max = 5, windowMs = 60 * 60 * 1000}) {
	const db = admin.firestore();
	const now = Date.now();
	const ref = db.collection('rateLimits').doc(key);
	const snap = await ref.get();
	let data = { count: 0, resetAt: now + windowMs };
	if (snap.exists) {
		data = snap.data();
		// Reset window if expired
		const resetAt = typeof data.resetAt === 'number' ? data.resetAt : (data.resetAt?.toMillis?.() || now);
		if (resetAt <= now) {
			data = { count: 0, resetAt: now + windowMs };
		}
	}
	data.count = (data.count || 0) + 1;
	await ref.set({ count: data.count, resetAt: data.resetAt, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
	return data.count <= max;
}

async function logActivity(type, data) {
	try {
		const db = admin.firestore();
		await db.collection('activityLog').add({
			type,
			data: data || {},
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
		});
	} catch (e) {
		logger.warn('logActivity failed', e);
	}
}

// Helper: write admin notification
async function createAdminNotification(data) {
	const db = admin.firestore();
	const ref = db.collection('adminNotifications').doc();
	await ref.set({
		type: data.type,
		userEmail: data.userEmail,
		userUid: data.userUid || null,
		requesterIp: data.requesterIp || null,
		status: 'PENDING',
		createdAt: admin.firestore.FieldValue.serverTimestamp(),
	});
	return ref.id;
}

// Endpoint: request password reset (admin mediated)
exports.requestAdminPasswordReset = onRequest(async (req, res) => {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Método no permitido'});
	}
	try {
		const { email } = req.body || {};
		if (!email || typeof email !== 'string') {
			return res.status(400).json({error: 'Email requerido'});
		}

		// Rate limit por IP y por email
		const ip = getClientIp(req);
		const emailKey = `email:${normalizeEmail(email)}`;
		const ipKey = `ip:${ip}`;
		const [okIp, okEmail] = await Promise.all([
			checkAndIncrementRateLimit({key: ipKey, max: 5, windowMs: 60 * 60 * 1000}),
			checkAndIncrementRateLimit({key: emailKey, max: 5, windowMs: 60 * 60 * 1000})
		]);
		if (!okIp || !okEmail) {
			// Responder genérico para no filtrar información
			return res.status(200).json({message: 'Solicitud registrada'});
		}
		const auth = admin.auth();
		let userRecord;
		try {
			userRecord = await auth.getUserByEmail(email);
		} catch (e) {
			// Do not reveal existence
			logger.warn('Password reset request for non-existing email');
			return res.status(200).json({message: 'Solicitud registrada'});
		}
		await createAdminNotification({ 
			type: 'PASSWORD_RESET_REQUEST', 
			userEmail: userRecord.email,
			userUid: userRecord.uid,
			requesterIp: ip
		});
		await logActivity('PASSWORD_RESET_REQUEST', { userEmail: userRecord.email, userUid: userRecord.uid, ip });
		return res.status(200).json({message: 'Solicitud registrada'});
	} catch (err) {
		logger.error('requestAdminPasswordReset error', err);
		return res.status(500).json({error: 'Error interno'});
	}
});

// ==============================
// Resolve password reset (Admin only)
// ==============================
async function verifyAdminFromRequest(req) {
	try {
		const authHeader = req.headers.authorization || '';
		const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
		if (!token) return null;
		const decoded = await admin.auth().verifyIdToken(token);
		if (decoded.admin === true) {
			logger.info('verifyAdminFromRequest: admin claim true', { uid: decoded.uid });
			return decoded; // custom claim
		}
		// Fallback: check Firestore user role
		const db = admin.firestore();
		const snap = await db.collection('users').doc(decoded.uid).get();
		const roleRaw = snap.exists ? (snap.data().role || snap.data().rol) : null;
		const role = (roleRaw || '').toString().trim().toLowerCase();
		if (role && (role === 'admin' || role === 'administrador')) {
			logger.info('verifyAdminFromRequest: role match admin', { uid: decoded.uid, role });
			return decoded;
		}
		logger.warn('verifyAdminFromRequest: not admin', { uid: decoded.uid, role });
		return null;
	} catch (e) {
		logger.warn('verifyAdminFromRequest failed', e);
		return null;
	}
}

function validatePasswordComplexity(pw, email) {
	if (typeof pw !== 'string') return false;
	const local = (email || '').split('@')[0] || '';
	const hasLen = pw.length >= 12;
	const hasUpper = /[A-Z]/.test(pw);
	const hasLower = /[a-z]/.test(pw);
	const hasDigit = /\d/.test(pw);
	const hasSymbol = /[^A-Za-z0-9]/.test(pw);
	const notContainsLocal = local ? !pw.toLowerCase().includes(local.toLowerCase()) : true;
	return hasLen && hasUpper && hasLower && hasDigit && hasSymbol && notContainsLocal;
}

exports.resolveAdminPasswordReset = onRequest(async (req, res) => {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Método no permitido' });
	}
	try {
		const adminUser = await verifyAdminFromRequest(req);
		if (!adminUser) {
			return res.status(403).json({ error: 'No autorizado' });
		}

		const { notificationId, newPassword } = req.body || {};
		if (!notificationId || !newPassword) {
			return res.status(400).json({ error: 'Parámetros inválidos' });
		}

		const db = admin.firestore();
		const notifRef = db.collection('adminNotifications').doc(notificationId);
		const notifSnap = await notifRef.get();
		if (!notifSnap.exists) {
			return res.status(404).json({ error: 'Solicitud no encontrada' });
		}
		const notif = notifSnap.data();
		if (notif.status === 'RESOLVED') {
			return res.status(200).json({ message: 'Ya resuelta' });
		}

		// Validate complexity relative to email
		if (!validatePasswordComplexity(newPassword, notif.userEmail)) {
			return res.status(400).json({ error: 'Contraseña no cumple con complejidad' });
		}

		// Update user password
		if (!notif.userUid) {
			// look up by email if uid missing
			const record = await admin.auth().getUserByEmail(notif.userEmail);
			notif.userUid = record.uid;
		}
		await admin.auth().updateUser(notif.userUid, { password: newPassword });

		// Force user to change password after first login and set validity window to 90 días para seguridad
		const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
		await db.collection('users').doc(notif.userUid).set({
			passwordChangeRequired: true,
			passwordValidUntil: validUntil,
			lastPasswordResetByAdminAt: admin.firestore.FieldValue.serverTimestamp(),
			lastPasswordResetBy: adminUser.uid
		}, { merge: true });

		await notifRef.set({
			status: 'RESOLVED',
			resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
			resolvedByUid: adminUser.uid
		}, { merge: true });

		await logActivity('PASSWORD_RESET_RESOLVED', { userUid: notif.userUid, adminUid: adminUser.uid });

		return res.status(200).json({ message: 'Contraseña actualizada y solicitud resuelta' });
	} catch (err) {
		logger.error('resolveAdminPasswordReset error', err);
		return res.status(500).json({ error: 'Error interno' });
	}
});

// ==============================
// Admin: Create user endpoint
// ==============================
function mapRoleLetter(role) {
	const r = (role || '').toString().toLowerCase();
	if (r === 'admin') return 'a';
	if (r === 'profesor' || r === 'teacher') return 'c';
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

exports.adminCreateUser = onRequest(async (req, res) => {
	if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
	try {
		const adminUser = await verifyAdminFromRequest(req);
		if (!adminUser) return res.status(403).json({ error: 'No autorizado' });

		const { nombre, apellidoPaterno, apellidoMaterno, role, schoolId } = req.body || {};
		if (!nombre || !apellidoPaterno || !apellidoMaterno || !role) {
			return res.status(400).json({ error: 'Campos requeridos: nombre, apellidoPaterno, apellidoMaterno, role' });
		}

		const roleLetter = mapRoleLetter(role);
		const first = nombre.trim()[0]?.toLowerCase() || 'u';
		const year = new Date().getFullYear();

		// Generate sequential index atomically
		let index = await nextCounterForRoleLetter(roleLetter);
		const auth = admin.auth();
		let email;
		// Ensure unique email even if counter collided
		for (let attempts = 0; attempts < 5; attempts++) {
			email = `${first}${year}${roleLetter}${index}@codekids.com`;
			try {
				await auth.getUserByEmail(email);
				// exists -> increment and retry
				index++;
			} catch (lookupErr) {
				// If error code is auth/user-not-found it's free; other errors propagate
				if (lookupErr && lookupErr.code && lookupErr.code !== 'auth/user-not-found') {
					logger.error('adminCreateUser getUserByEmail unexpected error', { code: lookupErr.code, message: lookupErr.message });
					throw lookupErr;
				}
				break; // email free
			}
		}

		// Generate temp password and ensure not duplicated across tempPassword (best-effort)
		const db = admin.firestore();
		let tempPassword = randomPassword(12);
		for (let tries = 0; tries < 3; tries++) {
			const q = await db.collection('users').where('tempPassword', '==', tempPassword).limit(1).get();
			if (q.empty) break;
			tempPassword = randomPassword(12);
		}

		// Create auth user
		const displayName = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim();
		let userRecord;
		try {
			userRecord = await auth.createUser({ email, password: tempPassword, displayName, disabled: false });
		} catch (createErr) {
			logger.error('adminCreateUser createUser failed', { code: createErr.code, message: createErr.message, stack: createErr.stack });
			// Surface specific auth errors if local
			const isLocal = (req.headers['x-forwarded-host'] || '').includes('localhost') || (req.headers.host || '').includes('127.0.0.1');
			if (isLocal) {
				return res.status(500).json({ error: 'createUser_failed', code: createErr.code || null, message: createErr.message || null });
			}
			throw createErr;
		}

		// Create Firestore user doc
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
		} catch (firestoreErr) {
			logger.error('adminCreateUser Firestore write failed', { message: firestoreErr.message, stack: firestoreErr.stack });
			// Attempt rollback: disable the just-created auth user to avoid orphan
			try { await auth.updateUser(userRecord.uid, { disabled: true }); } catch (_) {}
			const isLocal = (req.headers['x-forwarded-host'] || '').includes('localhost') || (req.headers.host || '').includes('127.0.0.1');
			if (isLocal) {
				return res.status(500).json({ error: 'firestore_write_failed', message: firestoreErr.message || null });
			}
			throw firestoreErr;
		}

		await logActivity('USER_CREATED', { actorUid: adminUser.uid, userUid: userRecord.uid, role: role, email });

		return res.status(200).json({ uid: userRecord.uid, email, tempPassword });
	} catch (e) {
		logger.error('adminCreateUser error', e);
		return res.status(500).json({ error: 'Error interno' });
	}
});

// ==============================
// Solicitud de recuperación de contraseña
// ==============================
exports.requestPasswordReset = onRequest({ cors: true }, async (req, res) => {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const { email } = req.body;
	if (!email || typeof email !== 'string') {
		return res.status(400).json({ error: 'Email es requerido' });
	}

	const normalizedEmail = normalizeEmail(email);
	const clientIp = getClientIp(req);

	// Rate limit por IP
	const rateLimitKey = `passwordReset_${clientIp}`;
	const limited = await checkAndIncrementRateLimit({ key: rateLimitKey, max: 3, windowMs: 15 * 60 * 1000 });
	if (limited) {
		logger.warn('requestPasswordReset rate limited', { ip: clientIp, email: normalizedEmail });
		// Responder siempre con éxito para evitar enumeración de usuarios
		return res.status(200).json({ success: true, message: 'Solicitud recibida' });
	}

	try {
		const db = admin.firestore();

		// Buscar usuario por email
		const usersRef = db.collection('users');
		const snapshot = await usersRef.where('email', '==', normalizedEmail).limit(1).get();

		let userId = null;
		let userName = 'Usuario';

		if (!snapshot.empty) {
			const userDoc = snapshot.docs[0];
			userId = userDoc.id;
			const userData = userDoc.data();
			userName = userData.displayName || 
			           (userData.nombre ? `${userData.nombre} ${userData.apellidoPaterno || ''}`.trim() : null) ||
			           'Usuario';
		}

		// Crear solicitud (siempre, incluso si el usuario no existe, para evitar enumeración)
		await db.collection('passwordResetRequests').add({
			email: normalizedEmail,
			userId: userId,
			userName: userName,
			requestedAt: admin.firestore.FieldValue.serverTimestamp(),
			status: 'pending',
			resolvedAt: null,
			resolvedBy: null,
			tempPassword: null,
			requestIp: clientIp
		});

		logger.info('Password reset request created', { email: normalizedEmail, userId });

		// Siempre responder con éxito
		return res.status(200).json({ success: true, message: 'Solicitud recibida' });

	} catch (error) {
		logger.error('requestPasswordReset error', error);
		// Incluso en error, responder con éxito para evitar enumeración
		return res.status(200).json({ success: true, message: 'Solicitud recibida' });
	}
});
