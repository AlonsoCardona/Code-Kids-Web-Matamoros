/**
 * ========================================
 * FIREBASE INITIALIZATION - CodeKids
 * ========================================
 * 
 * Inicializa Firebase Authentication, Firestore y Storage
 * Importar este archivo en todas las páginas que usen Firebase
 */

// Importar Firebase SDK
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Configuración de Firebase - codekids-dev (proyecto backend)
const firebaseConfig = {
  apiKey: "AIzaSyCkOCtAdstBEoR_8ljgydwahFDadLJxFEg",
  authDomain: "codekids-dev.firebaseapp.com",
  projectId: "codekids-dev",
  storageBucket: "codekids-dev.firebasestorage.app",
  messagingSenderId: "1069273608068",
  appId: "1:1069273608068:web:07743eaecf8b1a5a8237d1",
  measurementId: "G-Y0ZFWXLRYY"
};

// Inicializar Firebase (guard: evitar re-init si ya existe)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);
const functions = getFunctions(app);

// Exportar para uso global
window.firebaseApp = app;
window.auth = auth;
window.db = db;
window.storage = storage;
window.functions = functions;
window.analytics = analytics;

// Estado de autenticación global
window.currentUser = null;

// Listener de autenticación
onAuthStateChanged(auth, (user) => {
    window.currentUser = user;
    
    if (user) {
        console.log('✅ Usuario autenticado:', user.email);
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
    } else {
        console.log('❌ Usuario no autenticado');
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }
});

// Función helper para verificar autenticación
window.requireAuth = function() {
    if (!window.currentUser) {
        window.location.href = '/Vistas_Publicas/Inicio_De_Sesion.html';
        return false;
    }
    return true;
};

// Función helper para obtener datos del usuario desde Firestore
window.getUserData = async function(uid) {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
};

console.log('🔥 Firebase inicializado correctamente');

export { app, auth, db, storage, analytics, functions };
