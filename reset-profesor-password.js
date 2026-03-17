const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'j2025p1@codekids.com';
const newPassword = 'Temp123!';

(async () => {
  try {
    // Actualizar la contraseña del usuario
    const user = await admin.auth().getUserByEmail(email);
    
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
      emailVerified: true // También verificar el email
    });
    
    console.log('✅ Contraseña actualizada exitosamente');
    console.log('📧 Email:', email);
    console.log('🔑 Nueva contraseña:', newPassword);
    console.log('✅ Email verificado: true');
    console.log('\n🚀 Intenta iniciar sesión nuevamente en: https://codekids-dev.web.app');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
