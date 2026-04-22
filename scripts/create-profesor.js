const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'codekids-dev'
});

async function createProfesor() {
  const nombre = 'Juan';
  const apellidoPaterno = 'Pérez';
  const email = `j2025p1@codekids.com`;  // Formato: inicial + año + letra de rol + número
  const password = 'Temp123!';
  
  try {
    // Crear usuario en Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: false,
      displayName: `${nombre} ${apellidoPaterno}`
    });
    
    console.log('✅ Usuario creado en Auth:', userRecord.uid);
    
    // Crear documento en Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: email,
      nombre: nombre,
      apellidoPaterno: apellidoPaterno,
      apellidoMaterno: '',
      role: 'Profesor',
      rol: 'profesor',
      schoolId: 'escuela 1',
      passwordChangeRequired: true,
      tempPassword: password,
      createdAt: new Date(),
      emailVerified: false
    });
    
    console.log('✅ Documento creado en Firestore');
    console.log('\n🎉 Profesor creado:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Debe cambiar contraseña en primer login\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createProfesor();
