const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD3Xf9rj_Zn8wVYeeFI2c5svCg33JNTf6Q",
  authDomain: "codekids-dev.firebaseapp.com",
  projectId: "codekids-dev",
  storageBucket: "codekids-dev.firebasestorage.app",
  messagingSenderId: "562409032066",
  appId: "1:562409032066:web:5e962b33c4f3df1c4c3906",
  measurementId: "G-DQS2BFDQQ0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixProfesor() {
  const uid = 'b2DhnOyiEJgsllO88dP8uE7puJ03'; // UID del profesor
  const userRef = doc(db, 'users', uid);
  
  try {
    // Verificar si existe
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      console.log('✅ Documento actual:');
      console.log(JSON.stringify(snap.data(), null, 2));
    } else {
      console.log('❌ No existe documento en Firestore');
    }
    
    // Crear/actualizar documento correcto
    const correctData = {
      uid: uid,
      email: 'j2025p1@codekids.com',
      displayName: 'Juan Pérez',
      nombre: 'Juan Pérez',
      photoURL: null,
      rol: 'Profesor', // campo legacy
      role: 'Profesor', // campo estandarizado
      createdAt: new Date(),
      lastLogin: new Date(),
      passwordChangeRequired: false, // No forzar cambio
      passwordValidUntil: null,
      xp: 0,
      nivel: 1,
      racha: 0,
      leccionesCompletadas: [],
      insignias: [],
      configuracion: { 
        notificaciones: true, 
        sonido: true, 
        tema: 'claro' 
      }
    };
    
    await setDoc(userRef, correctData, { merge: true });
    
    console.log('\n✅ Documento actualizado correctamente');
    console.log('📧 Email: j2025p1@codekids.com');
    console.log('🔑 Password: Temp123!');
    console.log('🎭 Rol: Profesor');
    console.log('🚪 Debe redirigir a: ../app/panel-alumnos.html');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

fixProfesor();
