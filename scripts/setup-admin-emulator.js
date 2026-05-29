// ⚠️  WARNING: DESPITE THE FILE NAME, THIS SCRIPT TARGETS PRODUCTION (codekids-dev).
// The emulator connection lines below are intentionally commented out.
// Running this script WILL create/modify real users in the live Firebase project.
// If you intend to target the local emulator, uncomment those two lines before running.
//
// Script para crear usuario admin en Firebase
const admin = require('firebase-admin');

// Conectar a Firebase en producción (codekids-dev)
// NO conectar al emulador - comentamos estas líneas
// process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8082';
// process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({
  projectId: 'codekids-dev'
});

const auth = admin.auth();
const db = admin.firestore();

async function setupAdmin() {
  try {
    console.log('Creando usuario admin en codekids-dev...');
    
    // Verificar si ya existe el usuario
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail('admin@codekids.com');
      console.log('✅ Usuario ya existe:', userRecord.uid);
    } catch (error) {
      // Si no existe, crearlo
      userRecord = await auth.createUser({
        email: 'admin@codekids.com',
        password: 'Admin123!',
        emailVerified: true,
        displayName: 'Administrador De Sistemas Dev'
      });
      console.log('✅ Usuario creado en Auth:', userRecord.uid);
    }
    
    // Establecer custom claim
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });
    console.log('✅ Custom claim "admin" establecido');
    
    // Crear/actualizar documento en Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: 'admin@codekids.com',
      nombre: 'Administrador',
      apellidoPaterno: 'Dev',
      apellidoMaterno: '',
      role: 'Admin',
      rol: 'admin',
      createdAt: new Date(),
      emailVerified: true
    }, { merge: true });
    
    console.log('✅ Documento creado/actualizado en Firestore');
    console.log('\n🎉 ¡Listo! Ahora puedes iniciar sesión con:');
    console.log('   Email: admin@codekids.com');
    console.log('   Password: Admin123!');
    console.log('   URL: https://codekids-dev.web.app/auth/login.html\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupAdmin();
