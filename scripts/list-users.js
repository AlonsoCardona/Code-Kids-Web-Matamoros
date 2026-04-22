const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async () => {
  try {
    const users = await db.collection('users').get();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          USUARIOS DISPONIBLES EN CODEKIDS-DEV            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    users.forEach(doc => {
      const data = doc.data();
      console.log(`👤 ${data.displayName || data.nombre || 'Sin nombre'}`);
      console.log(`   📧 Email: ${data.email || 'N/A'}`);
      console.log(`   🎭 Rol: ${data.role || data.rol || 'N/A'}`);
      console.log(`   ⚡ XP: ${data.xp || 0}`);
      console.log(`   🆔 UID: ${doc.id}`);
      console.log(`   🔒 Cambio requerido: ${data.passwordChangeRequired || false}`);
      console.log('   ─────────────────────────────────────────────────────');
    });
    
    console.log('\n💡 Contraseña por defecto: Temp123!\n');
    
    // Verificar específicamente el profesor
    const profesorUid = 'b2DhnOyiEJgsllO88dP8uE7puJ03';
    const profesorDoc = await db.collection('users').doc(profesorUid).get();
    
    if (!profesorDoc.exists()) {
      console.log('❌ PROBLEMA: El profesor NO tiene documento en Firestore');
      console.log('   Creando documento...\n');
      
      await db.collection('users').doc(profesorUid).set({
        uid: profesorUid,
        email: 'j2025p1@codekids.com',
        displayName: 'Juan Pérez',
        nombre: 'Juan Pérez',
        photoURL: null,
        rol: 'Profesor',
        role: 'Profesor',
        passwordChangeRequired: false,
        passwordValidUntil: null,
        xp: 0,
        nivel: 1,
        racha: 0,
        leccionesCompletadas: [],
        insignias: [],
        configuracion: {
          notificaciones: true,
          sonido: true,
          tema: 'claro'
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Documento del profesor creado exitosamente');
    } else {
      const data = profesorDoc.data();
      console.log('\n📋 Datos detallados del profesor:');
      console.log(JSON.stringify(data, null, 2));
      
      // Actualizar si falta algo
      if (!data.role || !data.rol || data.passwordChangeRequired !== false) {
        console.log('\n🔧 Actualizando campos del profesor...');
        await db.collection('users').doc(profesorUid).update({
          rol: 'Profesor',
          role: 'Profesor',
          nombre: 'Juan Pérez',
          displayName: 'Juan Pérez',
          passwordChangeRequired: false
        });
        console.log('✅ Profesor actualizado');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
