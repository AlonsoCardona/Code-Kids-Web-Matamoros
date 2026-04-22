const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createPasswordResetRequest() {
  try {
    const db = admin.firestore();
    
    // Crear una solicitud de prueba
    const docRef = await db.collection('passwordResetRequests').add({
      email: 'm2025e1@codekids.com',
      userId: 'bplbxWpP16QV45N9RaA4aKUvB993',
      userName: 'María González',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      resolvedAt: null,
      resolvedBy: null,
      tempPassword: null
    });
    
    console.log('✅ Solicitud creada con ID:', docRef.id);
    console.log('✅ Ahora verifica en el dashboard de admin en el tab "Solicitudes"');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createPasswordResetRequest();
