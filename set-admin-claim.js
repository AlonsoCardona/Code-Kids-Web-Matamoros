const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

// Inicializar con service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'codekids-dev'
});

const UID = 'UvJnqvZWqdTj17VbJmVmbyjen6K2';

async function setAdminClaim() {
  try {
    console.log('Estableciendo custom claim para UID:', UID);
    
    // Establecer custom claim
    await admin.auth().setCustomUserClaims(UID, { admin: true });
    console.log('✅ Custom claim "admin" establecido correctamente');
    
    // Verificar
    const user = await admin.auth().getUser(UID);
    console.log('✅ Claims del usuario:', user.customClaims);
    
    console.log('\n🎉 ¡Listo! Ahora puedes iniciar sesión con:');
    console.log('   Email: admin@codekids.com');
    console.log('   Password: Admin123! (o la que configuraste)');
    console.log('   URL: https://codekids-dev.web.app/auth/login.html\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setAdminClaim();
