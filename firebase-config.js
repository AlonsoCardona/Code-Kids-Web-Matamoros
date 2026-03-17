import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

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
const analytics = getAnalytics(app);

export { app, analytics };