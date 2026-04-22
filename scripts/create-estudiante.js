const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'codekids-dev'
});

async function createEstudiante() {
  const nombre = 'María';
  const apellidoPaterno = 'González';
  const email = `m2025e1@codekids.com`;  // Formato: inicial + año + e (estudiante) + número
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
      role: 'Estudiante',
      rol: 'estudiante',
      schoolId: 'escuela 1',
      passwordChangeRequired: true,
      tempPassword: password,
      createdAt: new Date(),
      emailVerified: false,
      puntos: 0,
      nivel: 1
    });
    
    console.log('✅ Documento creado en Firestore');
    console.log('\n🎉 Estudiante creado:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Debe cambiar contraseña en primer login\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createEstudiante();
