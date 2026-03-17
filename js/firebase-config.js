// Configuración de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Configuración de Firebase - codekids-dev
const firebaseConfig = {
  apiKey: "AIzaSyCkOCtAdstBEoR_8ljgydwahFDadLJxFEg",
  authDomain: "codekids-dev.firebaseapp.com",
  projectId: "codekids-dev",
  storageBucket: "codekids-dev.firebasestorage.app",
  messagingSenderId: "1069273608068",
  appId: "1:1069273608068:web:07743eaecf8b1a5a8237d1",
  measurementId: "G-Y0ZFWXLRYY"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Exponer referencias en window para acceso desde consola / scripts no módulos
try {
  window.firebaseApp = app;
  window.auth = auth;
  window.db = db;
  window.storage = storage;
} catch(_) {}

export { app, auth, db, storage };