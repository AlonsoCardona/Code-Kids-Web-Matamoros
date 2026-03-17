const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function updateDisplayName() {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('users').where('email', '==', 'm2025e1@codekids.com').get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      const displayName = `${data.nombre} ${data.apellidoPaterno || ''}`.trim();
      
      await doc.ref.update({
        displayName: displayName,
        searchableDisplayName: displayName.toLowerCase()
      });
      
      console.log('✅ DisplayName actualizado a:', displayName);
      console.log('✅ SearchableDisplayName:', displayName.toLowerCase());
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateDisplayName();
