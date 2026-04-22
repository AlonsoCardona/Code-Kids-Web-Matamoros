/**
 * ========================================
 * CODEKIDS - GESTIÓN DE AUTENTICACIÓN
 * ========================================
 * 
 * PRINCIPIOS DE SEGURIDAD:
 * - NO existe registro público (signUp bloqueado)
 * - Solo Admins pueden crear usuarios
 * - Contraseñas temporales generadas automáticamente
 * - Forzar cambio de contraseña en primer login
 * - Redirección automática según rol (Admin -> admin.html, otros -> app.html)
 * 
 * FLUJO DE AUTENTICACIÓN:
 * 1. Usuario inicia sesión con email/contraseña (creados por Admin)
 * 2. onAuthStateChanged detecta el login
 * 3. Se consulta el documento del usuario en Firestore (/users/{uid})
 * 4. Se verifica forcePasswordChange
 * 5. Si es true, se bloquea la UI con modal de cambio de contraseña
 * 6. Una vez cambiada, se actualiza forcePasswordChange: false
 * 7. Se redirige según rol
 * 
 * FIRESTORE STRUCTURE:
 * - /users/{userId}
 *   - email, displayName, searchableDisplayName
 *   - role: "Admin" | "Profesor" | "Estudiante"
 *   - schoolId, photoURL
 *   - createdAt, lastLogin
 *   - forcePasswordChange: boolean
 *   - studentProfile (si es Estudiante)
 *   - teacherProfile (si es Profesor)
 */

// Gestión de Autenticación
import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let currentUserData = null;
let __ckAuthRedirectTimer = null;

// ====================================
// INICIALIZAR AUTENTICACIÓN
// ====================================
// Listener global de onAuthStateChanged
// Maneja redirección, carga de datos y cambio de contraseña
export function initAuth(onUserLoaded) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Cancel any pending redirect-to-login timers set when user was initially null
      if (__ckAuthRedirectTimer) { try { clearTimeout(__ckAuthRedirectTimer); } catch(_) {} __ckAuthRedirectTimer = null; }
      try {
        currentUser = user;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // No forzar cierre de sesión: permitir navegación mientras se corrige el perfil en Firestore
          try { showNotification('⚠️ Tu perfil no está completo en el sistema. Algunas funciones pueden no estar disponibles.', 'warning'); } catch(_) {}
          currentUserData = { id: user.uid, email: user.email, role: 'Estudiante' };
        } else {
          currentUserData = { id: user.uid, ...userDoc.data() };
        }
        
        // Actualizar último login en Firestore
        await updateDoc(doc(db, 'users', user.uid), {
          lastLogin: serverTimestamp()
        });
        
        // SEGURIDAD: Verificar cambio de contraseña obligatorio
        // Aceptar ambos nombres de campo por compatibilidad: passwordChangeRequired | forcePasswordChange
        if (currentUserData.passwordChangeRequired === true || currentUserData.forcePasswordChange === true) {
          await promptPasswordChange();
        }
        
        if (onUserLoaded) {
          onUserLoaded(currentUser, currentUserData);
        }
      } catch (error) {
        console.error('Error cargando usuario (no forzar logout):', error);
        // No redirigir ni cerrar sesión para evitar expulsiones por fallos transitorios.
        // Exponer datos mínimos del auth user para que la app pueda continuar.
        try {
          currentUserData = { id: user.uid, email: user.email, role: currentUserData?.role || 'Estudiante' };
          if (onUserLoaded) onUserLoaded(currentUser, currentUserData);
        } catch(_) {}
      }
    } else {
      // No redirecciones automáticas desde páginas de la app.
      // Dejamos que cada vista decida si necesita forzar login (evita expulsión temprana del dashboard).
      try { if (__ckAuthRedirectTimer) { clearTimeout(__ckAuthRedirectTimer); __ckAuthRedirectTimer = null; } } catch(_) {}
    }
  });
}

// ====================================
// MODAL DE CAMBIO DE CONTRASEÑA OBLIGATORIO
// ====================================
// Se muestra automáticamente si forcePasswordChange es true
// Bloquea toda la UI hasta que el usuario cambie su contraseña temporal
// Una vez cambiada, actualiza forcePasswordChange: false en Firestore
async function promptPasswordChange() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-gray-800">Cambio de Contraseña Obligatorio</h3>
          <p class="text-gray-600 mt-2">Por seguridad, debes cambiar tu contraseña temporal antes de continuar. Dispones de 2 días para realizar este cambio.</p>
        </div>
        <form id="changePasswordForm" class="space-y-4">
          <div>
            <label class="block text-gray-700 font-semibold mb-2">Nueva Contraseña</label>
            <input type="text" id="newPassword" required minlength="8"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Mínimo 8 caracteres">
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2">Confirmar Contraseña</label>
            <input type="text" id="confirmPassword" required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Repite tu contraseña">
          </div>
          <div class="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-gray-700 ck-pw-logout-note">Al guardar, se cerrará tu sesión para que inicies con tu nueva contraseña.</div>
          <div id="passwordError" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm"></div>
          <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition duration-200">
            Cambiar Contraseña
          </button>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  const form = modal.querySelector('#changePasswordForm');
  const errorDiv = modal.querySelector('#passwordError');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  const newPass = document.getElementById('newPassword').value;
      const confirmPass = document.getElementById('confirmPassword').value;
      
      if (newPass !== confirmPass) {
        errorDiv.textContent = 'Las contraseñas no coinciden';
        errorDiv.classList.remove('hidden');
        return;
      }
      
      // Validación básica de complejidad (longitud, mayúscula, minúscula, dígito, símbolo)
      const hasLen = newPass.length >= 12;
      const hasUpper = /[A-Z]/.test(newPass);
      const hasLower = /[a-z]/.test(newPass);
      const hasDigit = /\d/.test(newPass);
      const hasSymbol = /[^A-Za-z0-9]/.test(newPass);
      if (!(hasLen && hasUpper && hasLower && hasDigit && hasSymbol)) {
        errorDiv.textContent = 'La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas, números y símbolos';
        errorDiv.classList.remove('hidden');
        return;
      }
      
      try {
        await updatePassword(currentUser, newPass);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          passwordChangeRequired: false,
          forcePasswordChange: false,
          tempPassword: null,
          lastPasswordResetByUserAt: serverTimestamp()
        });
        currentUserData.passwordChangeRequired = false;
        currentUserData.forcePasswordChange = false;
        modal.remove();
        showNotification('✅ Contraseña actualizada. Cerrando sesión…', 'success');
        // Cerrar sesión para que el siguiente login sea con la nueva contraseña
        try { await signOut(auth); } catch(_) {}
        try { window.location.href = window.location.origin + '/auth/login.html'; } catch(_) {}
        resolve();
      } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        const code = error?.code || '';
        if (code === 'auth/requires-recent-login') {
          errorDiv.textContent = 'Por seguridad de Firebase, cierra sesión e inicia sesión de nuevo con tu contraseña temporal y vuelve a intentar el cambio.';
        } else if (code === 'auth/weak-password') {
          errorDiv.textContent = 'La contraseña no cumple los requisitos de seguridad.';
        } else {
          errorDiv.textContent = 'Error al cambiar contraseña. Intenta de nuevo.';
        }
        errorDiv.classList.remove('hidden');
      }
    });
  });
}

// Login
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error('Credenciales incorrectas');
  }
}

// Logout
export async function logout() {
  try { window.__CK_LOGOUT_INTENT = true; } catch(_) {}
  
  // GUARDAR ESTADO ANTES DE CERRAR SESIÓN
  try {
    if (window.userState) {
      window.userState.saveState();
      console.log('💾 Estado guardado en localStorage antes de logout');
    }
    
    // GUARDAR XP Y NIVEL EN FIRESTORE ANTES DE LOGOUT
    const user = auth.currentUser;
    if (user && window.db) {
      const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const userRef = doc(window.db, 'users', user.uid);
      
      const xp = window.userState?.state?.xp || parseInt(localStorage.getItem('codekids_xp')) || 0;
      const nivel = window.userState?.state?.nivel || parseInt(localStorage.getItem('codekids_level')) || 1;
      
      await updateDoc(userRef, {
        xp: xp,
        nivel: nivel,
        lastLogout: new Date().toISOString()
      });
      
      console.log('💾 XP y Nivel guardados en Firestore antes de logout:', { xp, nivel });
    }
  } catch (error) {
    console.error('⚠️ Error guardando estado antes de logout:', error);
  }
  
  await signOut(auth);
  // Detectar si estamos en /app/ o en raíz
  const isInAppFolder = window.location.pathname.includes('/app/');
  window.location.href = isInAppFolder ? '../index.html' : 'index.html';
}

// Obtener usuario actual
export function getCurrentUser() {
  return currentUser;
}

export function getCurrentUserData() {
  return currentUserData;
}

// Actualizar perfil
export async function updateUserProfile(displayName, photoURL) {
  try {
    await updateProfile(currentUser, { displayName, photoURL });
    await updateDoc(doc(db, 'users', currentUser.uid), {
      displayName,
      photoURL,
      searchableDisplayName: displayName.toLowerCase()
    });
    currentUserData.displayName = displayName;
    currentUserData.photoURL = photoURL;
    showNotification('✅ Perfil actualizado exitosamente', 'success');
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    showNotification('❌ Error al actualizar perfil', 'error');
  }
}

// Helper para mostrar notificaciones
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    type === 'warning' ? 'bg-yellow-500' :
    'bg-blue-500'
  } text-white font-semibold`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Expose logout globally for non-module callers (e.g., student-shell)
try { window.logout = logout; } catch(_) {}