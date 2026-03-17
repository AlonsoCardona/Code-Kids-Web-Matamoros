// One-off script to set custom claim { admin: true } for a user
// Usage (PowerShell):
//   node tools/setAdminClaim.js --email AdminSis1@CodeKids.com
//   node tools/setAdminClaim.js --uid <USER_UID>
// Requires GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON with permissions.

const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') out.email = args[++i];
    if (args[i] === '--uid') out.uid = args[++i];
    if (args[i] === '--key') out.key = args[++i];
  }
  return out;
}

async function main() {
  const { email, uid, key } = parseArgs();
  if (!email && !uid) {
    console.error('Provide --email or --uid');
    process.exit(1);
  }
  try {
    if (key) {
      const svc = require(require('path').resolve(key));
      admin.initializeApp({ credential: admin.credential.cert(svc) });
    } else if (!admin.apps.length) {
      admin.initializeApp();
    }
    const auth = admin.auth();
    let userRecord;
    if (uid) {
      userRecord = await auth.getUser(uid);
    } else {
      userRecord = await auth.getUserByEmail(email);
    }
    const current = userRecord.customClaims || {};
    const next = { ...current, admin: true };
    await auth.setCustomUserClaims(userRecord.uid, next);
    console.log('✅ Set admin claim for', userRecord.uid, 'email:', userRecord.email);
    process.exit(0);
  } catch (e) {
    console.error('Failed to set admin claim:', e);
    process.exit(2);
  }
}

main();
