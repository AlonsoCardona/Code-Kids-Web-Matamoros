// Script para crear admin usando Firebase CLI
// Ejecutar con: firebase functions:shell < create-admin.js

const admin = require('firebase-admin');
admin.initializeApp();

async function createAdmin() {
  const email = 'admin@codekids.com';
  const password = 'Admin123!';
  
  try {
    // Crear usuario
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('Usuario ya existe:', userRecord.uid);
    } catch (e) {
      userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        emailVerified: true,
        displayName: 'Administrador Dev'
      });
      console.log('Usuario creado:', userRecord.uid);
    }
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    console.log('Custom claims establecidos');
    
    // Crear documento
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: email,
      nombre: 'Administrador',
      apellidoPaterno: 'Dev',
      role: 'Admin',
      rol: 'admin',
      emailVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('¡Listo! Puedes iniciar sesión con:', email);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();
