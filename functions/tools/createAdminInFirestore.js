#!/usr/bin/env node
/**
 * Script para crear/actualizar el documento de admin en Firestore
 * Usage: node tools/createAdminInFirestore.js --email admin@codekids.com
 */

const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') out.email = args[++i];
    if (args[i] === '--uid') out.uid = args[++i];
  }
  return out;
}

async function main() {
  const { email, uid } = parseArgs();
  if (!email && !uid) {
    console.error('❌ Proporciona --email o --uid');
    process.exit(1);
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const auth = admin.auth();
    const db = admin.firestore();

    // Obtener el usuario
    let userRecord;
    if (uid) {
      userRecord = await auth.getUser(uid);
    } else {
      userRecord = await auth.getUserByEmail(email);
    }

    console.log(`✅ Usuario encontrado: ${userRecord.email} (${userRecord.uid})`);

    // Crear/actualizar documento en Firestore
    const userDoc = {
      email: userRecord.email,
      displayName: userRecord.displayName || 'Administrador',
      role: 'Admin',
      rol: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
    console.log(`✅ Documento creado/actualizado en Firestore: /users/${userRecord.uid}`);
    console.log('   role: "Admin"');
    console.log('   rol: "admin"');

    // Verificar que tenga el custom claim
    const claims = userRecord.customClaims || {};
    if (!claims.admin) {
      console.log('⚠️  El usuario NO tiene el custom claim admin:true');
      console.log('   Ejecuta: node tools/setAdminClaim.js --email ' + userRecord.email);
    } else {
      console.log('✅ El usuario tiene el custom claim admin:true');
    }

    console.log('\n🎉 ¡Listo! Ahora debes:');
    console.log('1. Cerrar sesión y volver a iniciar sesión en el navegador');
    console.log('2. Configurar el endpoint local en la consola:');
    console.log('   window.CODEKIDS_LOCAL_ADMIN_ENDPOINT = "http://127.0.0.1:5055/adminCreateUser"');
    console.log('3. Usar el panel de admin normalmente');

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(2);
  }
}

main();
