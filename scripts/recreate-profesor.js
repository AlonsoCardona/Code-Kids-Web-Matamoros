const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async () => {
  try {
    const email = 'j2025p1@codekids.com';
    const password = 'Temp123!';
    
    console.log('🔍 Verificando usuario actual...');
    
    try {
      // Intentar obtener el usuario
      const existingUser = await admin.auth().getUserByEmail(email);
      console.log('✅ Usuario encontrado:', existingUser.uid);
      console.log('   Provider:', existingUser.providerData);
      
      // Eliminar el usuario existente
      console.log('\n🗑️  Eliminando usuario existente...');
      await admin.auth().deleteUser(existingUser.uid);
      
      // Eliminar documento de Firestore
      await db.collection('users').doc(existingUser.uid).delete();
      console.log('✅ Usuario eliminado');
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('ℹ️  Usuario no existe, creando nuevo...');
      } else {
        throw error;
      }
    }
    
    // Crear nuevo usuario
    console.log('\n➕ Creando nuevo usuario profesor...');
    const newUser = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: 'Juan Pérez',
      emailVerified: true
    });
    
    console.log('✅ Usuario creado en Authentication');
    console.log('   UID:', newUser.uid);
    
    // Crear documento en Firestore
    await db.collection('users').doc(newUser.uid).set({
      uid: newUser.uid,
      email: email,
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
    
    console.log('✅ Documento creado en Firestore');
    
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║        NUEVO USUARIO PROFESOR CREADO             ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Nombre: Juan Pérez');
    console.log('🎭 Rol: Profesor');
    console.log('🆔 UID:', newUser.uid);
    console.log('\n🚀 Inicia sesión en: https://codekids-dev.web.app');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
