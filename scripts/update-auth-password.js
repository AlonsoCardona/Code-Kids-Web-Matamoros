const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function updatePassword() {
  try {
    const db = admin.firestore();
    
    // Buscar la solicitud más reciente aprobada
    const snapshot = await db.collection('passwordResetRequests')
      .where('email', '==', 'm2025e1@codekids.com')
      .get();
    
    let approvedRequest = null;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'approved' && data.tempPassword) {
        approvedRequest = data;
      }
    });
    
    if (!approvedRequest) {
      console.log('❌ No se encontró solicitud aprobada con contraseña temporal');
      process.exit(1);
    }
    
    console.log('📧 Email:', approvedRequest.email);
    console.log('🔑 Contraseña temporal:', approvedRequest.tempPassword);
    console.log('👤 User ID:', approvedRequest.userId);
    
    // Actualizar contraseña en Firebase Auth
    await admin.auth().updateUser(approvedRequest.userId, {
      password: approvedRequest.tempPassword
    });
    
    console.log('✅ Contraseña actualizada exitosamente en Firebase Auth');
    console.log('✅ Ahora puedes iniciar sesión con:');
    console.log('   Email:', approvedRequest.email);
    console.log('   Password:', approvedRequest.tempPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updatePassword();
