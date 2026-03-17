const admin = require('firebase-admin');
const serviceAccount = require('./service-account-dev.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

(async () => {
  try {
    const groups = await db.collection('groups').get();
    const tasks = await db.collection('tasks').get();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            DATOS EN LA BASE DE DATOS                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📚 GRUPOS CREADOS: ${groups.size}`);
    if (groups.size > 0) {
      groups.forEach(doc => {
        const g = doc.data();
        console.log(`   ✓ ${g.name} - ${g.subject} (${g.studentIds?.length || 0} estudiantes)`);
      });
    } else {
      console.log('   ⚠️  No hay grupos creados aún');
    }
    
    console.log(`\n📝 TAREAS CREADAS: ${tasks.size}`);
    if (tasks.size > 0) {
      tasks.forEach(doc => {
        const t = doc.data();
        console.log(`   ✓ ${t.title} - ${t.groupId}`);
      });
    } else {
      console.log('   ⚠️  No hay tareas creadas aún');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
