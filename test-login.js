const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'j2025p1@codekids.com';
const password = 'Temp123!';

async function testLogin() {
  try {
    // Obtener usuario de Auth
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('✅ Usuario encontrado en Authentication:');
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Disabled: ${userRecord.disabled}`);
    console.log(`   Email verified: ${userRecord.emailVerified}`);
    
    // Verificar en Firestore
    const userDoc = await admin.firestore().collection('users').doc(userRecord.uid).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('\n✅ Usuario encontrado en Firestore:');
      console.log(`   Nombre: ${userData.nombre || userData.displayName || 'Sin nombre'}`);
      console.log(`   Rol: ${userData.rol || 'Sin rol'}`);
      console.log(`   XP: ${userData.xp || 0}`);
    } else {
      console.log('\n❌ Usuario NO existe en Firestore');
      console.log('   Creando documento en Firestore...');
      
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        email: userRecord.email,
        nombre: userRecord.displayName || 'Juan Pérez',
        rol: 'Profesor',
        xp: 0,
        nivel: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('   ✅ Documento creado en Firestore');
    }
    
    // Verificar si puede autenticarse (simulación)
    console.log('\n📝 Nota: La contraseña es: Temp123!');
    console.log('   Si no puede iniciar sesión desde la web, puede ser:');
    console.log('   1. Problema con el emailVerified (false)');
    console.log('   2. Firestore rules bloqueando el acceso');
    console.log('   3. Error en el formulario de login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

testLogin();
