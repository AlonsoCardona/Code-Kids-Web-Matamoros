const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function syncPasswordResetRequests() {
  try {
    const db = admin.firestore();
    
    // Buscar todas las solicitudes aprobadas que necesitan sincronización
    const snapshot = await db.collection('passwordResetRequests')
      .where('status', '==', 'approved')
      .get();
    
    if (snapshot.empty) {
      console.log('✅ No hay solicitudes aprobadas pendientes de sincronizar');
      process.exit(0);
    }
    
    console.log(`📋 Encontradas ${snapshot.size} solicitudes aprobadas`);
    console.log('');
    
    let synced = 0;
    let errors = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      if (!data.userId || !data.tempPassword) {
        console.log(`⚠️  Omitida: ${data.email} (sin userId o tempPassword)`);
        continue;
      }
      
      try {
        // Actualizar contraseña en Firebase Auth
        await admin.auth().updateUser(data.userId, {
          password: data.tempPassword
        });
        
        console.log(`✅ Sincronizada: ${data.userName} (${data.email})`);
        console.log(`   Password: ${data.tempPassword}`);
        synced++;
        
      } catch (error) {
        console.error(`❌ Error en ${data.email}:`, error.message);
        errors++;
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Sincronizadas: ${synced}`);
    if (errors > 0) console.log(`❌ Errores: ${errors}`);
    console.log('═══════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncPasswordResetRequests();
