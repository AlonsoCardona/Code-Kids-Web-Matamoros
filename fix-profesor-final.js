const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async () => {
  try {
    const profesorUid = 'b2DhnOyiEJgsllO88dP8uE7puJ03';
    const profesorRef = db.collection('users').doc(profesorUid);
    
    // Obtener documento actual
    const snap = await profesorRef.get();
    
    if (!snap.exists) {
      console.log('❌ El profesor NO existe en Firestore. Creando...');
      
      await profesorRef.set({
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
      
      console.log('✅ Profesor creado');
    } else {
      const data = snap.data();
      console.log('\n📋 Datos actuales del profesor:');
      console.log('   Email:', data.email);
      console.log('   DisplayName:', data.displayName);
      console.log('   Nombre:', data.nombre);
      console.log('   Rol (rol):', data.rol);
      console.log('   Rol (role):', data.role);
      console.log('   passwordChangeRequired:', data.passwordChangeRequired);
      
      // Actualizar para asegurar valores correctos
      console.log('\n🔧 Actualizando campos...');
      await profesorRef.update({
        displayName: 'Juan Pérez',
        nombre: 'Juan Pérez',
        rol: 'Profesor',
        role: 'Profesor',
        passwordChangeRequired: false,
        passwordValidUntil: null
      });
      
      console.log('✅ Profesor actualizado correctamente');
    }
    
    // Verificar después de la actualización
    const updated = await profesorRef.get();
    const final = updated.data();
    
    console.log('\n✅ DATOS FINALES:');
    console.log('   📧 Email: j2025p1@codekids.com');
    console.log('   🔑 Password: Temp123!');
    console.log('   👤 Nombre:', final.displayName || final.nombre);
    console.log('   🎭 Rol:', final.role || final.rol);
    console.log('   🔒 Cambio requerido:', final.passwordChangeRequired);
    console.log('\n🚪 Redirección esperada: ../app/panel-alumnos.html');
    console.log('\n✅ Ahora intenta iniciar sesión en: https://codekids-dev.web.app');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
