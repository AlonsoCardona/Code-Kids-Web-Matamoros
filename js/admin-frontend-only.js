/**
 * ========================================
 * CODEKIDS - PANEL DE ADMINISTRACIÓN
 * ========================================
 * 
 * CONTROL TOTAL DEL SISTEMA:
 * - Solo Admins pueden acceder a este panel
 * - Gestión completa de usuarios (CRUD)
 * - Gestión de escuelas con mapa interactivo (Leaflet)
 * - Gestión de contenidos (cursos, lecciones, minijuegos, insignias)
 * 
 * SEGURIDAD:
 * - NO existe registro público
 * - Admins crean usuarios manualmente
 * - Se generan contraseñas aleatorias seguras
 * - Los usuarios DEBEN cambiar la contraseña en su primer login
 * 
 * FIRESTORE STRUCTURE:
 * - /users/{userId}: Todos los usuarios del sistema
 * - /schools/{schoolId}: Escuelas participantes
 * - /courses/{courseId}: Cursos y lecciones
 * - /labGames/{gameId}: Minijuegos del laboratorio
 * - /badges/{badgeId}: Insignias/logros
 */

// Lógica para admin.html
import { auth, db } from './firebase-config.js';
import { initAuth, logout } from './auth.js';
import { collection, getDocs, getDoc, query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUserData = null;

// Permitir definir un endpoint local persistente para desarrollo
try {
  if (!window.CODEKIDS_LOCAL_ADMIN_ENDPOINT) {
    const saved = localStorage.getItem('CODEKIDS_LOCAL_ADMIN_ENDPOINT');
    if (saved) window.CODEKIDS_LOCAL_ADMIN_ENDPOINT = saved;
  }
} catch (_) {}

// ====================================
// INICIALIZACIÓN DEL PANEL DE ADMIN
// ====================================
initAuth((user, userData) => {
  currentUserData = userData;
  // Advertencia si falta campo "rol" para compatibilidad con funciones antiguas
  try {
    if ((!userData.rol || userData.rol.toLowerCase() !== 'admin') && userData.role === 'Admin') {
      console.warn('[ADMIN PANEL] Falta campo "rol: \"admin\"" en el documento del usuario. Agrega "rol" para evitar rechazos 403 en funciones antiguas.');
      const warn = document.createElement('div');
      warn.className = 'bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded mb-4';
      warn.textContent = 'Aviso: agrega campo rol="admin" al documento del usuario en Firestore para habilitar creación de usuarios.';
      const dashboardEl = document.getElementById('dashboard');
      if (dashboardEl) dashboardEl.prepend(warn);
    }
  } catch(_) {}
  
  // SEGURIDAD: Solo Admins pueden acceder
  // Si no es Admin, redirigir a app.html
  if (userData.role !== 'Admin' && userData.rol !== 'admin') {
    window.location.href = 'app.html';
    return;
  }
  
  document.getElementById('adminName').textContent = userData.displayName;
  const avatarEl = document.getElementById('adminAvatar');
  if (avatarEl) {
    const src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'Admin')}&background=ff4757&color=fff`;
    avatarEl.src = src;
  }
  
  setupAdminUI();
  loadDashboard();
});

// Configurar UI del admin
function setupAdminUI() {
  // Tabs
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      // Actualizar estilos de tabs
      tabButtons.forEach(b => {
        b.classList.remove('border-indigo-600', 'text-indigo-600', 'border-green-600', 'text-green-600', 'border-purple-600', 'text-purple-600', 'border-orange-600', 'text-orange-600');
        b.classList.add('border-transparent', 'text-gray-600');
      });
      
      btn.classList.remove('border-transparent', 'text-gray-600');
      btn.classList.add('border-indigo-600', 'text-indigo-600');
      
      // Mostrar contenido correspondiente
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      
      const tabElement = document.getElementById(tab);
      if (tabElement) {
        tabElement.classList.remove('hidden');
      }
      
      // Cargar datos según tab
      switch(tab) {
        case 'dashboard':
          loadDashboard();
          break;
        case 'users':
          // Inicializar filtros y búsqueda
          try { initUsersFilters(); } catch(_) {}
          loadUsers();
          break;
        case 'schools':
          loadSchools();
          break;
        case 'content':
          loadContent();
          break;
        case 'requests':
          loadRequests();
          break;
      }
    });
  });
  
  // Logout
  document.getElementById('adminLogout')?.addEventListener('click', async () => {
    await logout();
  });
  
  // Menú perfil
  document.getElementById('adminGotoProfile')?.addEventListener('click', () => {
    window.location.href = 'app/dashboard.html';
  });
  
  // Abrir Configuración desde menú de perfil
  const btnSettings = document.getElementById('adminGotoSettings');
  if (btnSettings) {
    btnSettings.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.openGlobalSettings) window.openGlobalSettings(btnSettings);
    });
  }
  
  // Botones de acceso rápido (usan data-tab)
  const quickAccessButtons = document.querySelectorAll('.quick-access-btn');
  quickAccessButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      if (targetTab) {
        // Simular clic en la tab correspondiente
        const targetTabButton = document.querySelector(`.tab-button[data-tab="${targetTab}"]`);
        if (targetTabButton) {
          targetTabButton.click();
        }
      }
    });
  });
  
  // Botón crear usuario (si existe con ID específico)
  const createUserBtn = document.getElementById('createUserBtn');
  if (createUserBtn) {
    createUserBtn.addEventListener('click', () => {
      showCreateUserModal();
    });
  }

  // Botón exportar usuarios a PDF
  const exportBtn = document.getElementById('exportUsersBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => showExportUsersModal());
  }
  
  // Menú desplegable del avatar
  const adminAvatar = document.getElementById('adminAvatar');
  const adminProfileMenu = document.getElementById('adminProfileMenu');
  
  if (adminAvatar && adminProfileMenu) {
    adminAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      adminProfileMenu.classList.toggle('hidden');
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!adminProfileMenu.contains(e.target) && e.target !== adminAvatar) {
        adminProfileMenu.classList.add('hidden');
      }
    });
  }
}

// Cargar Dashboard
async function loadDashboard() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const schoolsSnapshot = await getDocs(query(collection(db, 'schools'), where('isActive', '==', true)));
    
    let totalStudents = 0;
    let totalTeachers = 0;
    
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (user.role === 'Estudiante' || user.rol === 'estudiante') totalStudents++;
      if (user.role === 'Profesor' || user.rol === 'profesor') totalTeachers++;
    });
    
    document.getElementById('totalUsers').textContent = usersSnapshot.size;
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('totalTeachers').textContent = totalTeachers;
    document.getElementById('totalSchools').textContent = schoolsSnapshot.size;
    
    // Actividad reciente (placeholder)
    document.getElementById('recentActivity').innerHTML = `
      <div class="text-sm text-gray-600 space-y-2">
        <p>✅ Sistema iniciado correctamente</p>
        <p>📊 Estadísticas actualizadas</p>
        <p>👥 ${usersSnapshot.size} usuarios activos en el sistema</p>
      </div>
    `;
  } catch (error) {
    console.error('Error cargando dashboard:', error);
  }
}

// Cargar Usuarios
// Estado de filtros (rol, escuela, búsqueda)
let __usersSearchTerm = '';
let __usersRoleFilter = '';
let __usersSchoolFilter = '';

function debounce(fn, wait=300) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }

function getAdminBase() {
  const ep = window.CODEKIDS_LOCAL_ADMIN_ENDPOINT;
  if (!ep) return '';
  try {
    const u = new URL(ep);
    return u.origin;
  } catch { return ''; }
}

function buildAdminEndpoint(path) {
  let base = getAdminBase();
  if (!base) {
    try {
      const { protocol, hostname } = window.location;
      if ((hostname === '127.0.0.1' || hostname === 'localhost')) {
        base = `${protocol}//127.0.0.1:5055`;
      }
    } catch (_) {}
  }
  if (base) return base + path;
  return path; // fallback a Hosting rewrite
}

function initUsersFilters() {
  const roleSel = document.getElementById('roleFilter');
  const schoolSel = document.getElementById('schoolFilter');
  const searchInp = document.getElementById('userSearch');
  // Cargar escuelas al filtro
  populateSchoolFilter();
  roleSel?.addEventListener('change', () => { __usersRoleFilter = roleSel.value || ''; loadUsers(); });
  schoolSel?.addEventListener('change', () => { __usersSchoolFilter = schoolSel.value || ''; loadUsers(); });
  if (searchInp) {
    const handler = debounce((e) => { __usersSearchTerm = searchInp.value.trim().toLowerCase(); loadUsers(); }, 300);
    searchInp.addEventListener('input', handler);
  }
}

async function populateSchoolFilter() {
  try {
    const sel = document.getElementById('schoolFilter');
    if (!sel) return;
    // limpiar opciones excepto la primera
    sel.querySelectorAll('option:not(:first-child)')?.forEach(o => o.remove());
    const schoolsSnapshot = await getDocs(collection(db, 'schools'));
    schoolsSnapshot.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id; opt.textContent = d.data().name || d.id;
      sel.appendChild(opt);
    });
  } catch (e) { console.warn('[UsersFilter] No se pudo cargar escuelas', e); }
}

async function loadUsers() {
  const usersTableBody = document.getElementById('usersTableBody');
  if (!usersTableBody) return;
  usersTableBody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">Cargando usuarios...</td></tr>';

  try {
    // Construir query por rol si aplica (usar campo 'rol' normalizado)
    const baseRef = collection(db, 'users');
    let qRef = null;
    if (__usersRoleFilter) {
      const roleLower = __usersRoleFilter.toString().toLowerCase();
      qRef = query(baseRef, where('rol', '==', roleLower));
    }
    const [usersSnapshot, schoolsSnapshot] = await Promise.all([
      qRef ? getDocs(qRef) : getDocs(baseRef),
      getDocs(collection(db, 'schools'))
    ]);
    const schoolsMap = {};
    schoolsSnapshot.forEach(d => { schoolsMap[d.id] = d.data().name; });

    if (usersSnapshot.empty) {
      usersTableBody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">No hay usuarios</td></tr>';
      return;
    }

    // Filtrado adicional por escuela y búsqueda en cliente
    const rows = usersSnapshot.docs
      .map(d => ({ id: d.id, data: d.data() }))
      .filter(({ data }) => {
        if (__usersSchoolFilter && data.schoolId !== __usersSchoolFilter) return false;
        if (__usersSearchTerm) {
          const name = (data.displayName || '').toString().toLowerCase();
          const email = (data.email || '').toString().toLowerCase();
          if (!name.includes(__usersSearchTerm) && !email.includes(__usersSearchTerm)) return false;
        }
        return true;
      });

    if (!rows.length) {
      usersTableBody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">Sin resultados con los filtros actuales</td></tr>';
      return;
    }

    usersTableBody.innerHTML = rows.map(({ id, data: user }, idx) => {
      const roleRaw = user.role || user.rol || 'Desconocido';
      const roleLower = roleRaw.toString().toLowerCase();
      const roleBadge = (roleLower === 'admin') ? 'bg-red-100 text-red-800' : (roleLower === 'profesor') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
      const needsPwChange = user.passwordChangeRequired === true ? '<span class="ml-2 px-2 py-0.5 text-[10px] rounded bg-yellow-100 text-yellow-800">PW Cambio</span>' : '';
      const uidShort = user.uid ? (user.uid.slice(0,8) + '…') : (id.slice(0,8) + '…');
      const tempPw = user.tempPassword ? `<span class="font-mono">${user.tempPassword}</span>` : '<span class="text-gray-400">—</span>';
      return `
        <tr class="border-b border-gray-200 hover:bg-gray-50" data-user-id="${id}">
          <td class="px-4 py-3 text-sm text-gray-500">${idx + 1}</td>
          <td class="px-4 py-3">${user.displayName || 'Sin nombre'}${needsPwChange}</td>
          <td class="px-4 py-3 text-sm text-gray-600">${user.email || ''}</td>
          <td class="px-4 py-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${roleBadge}">${roleRaw}</span></td>
          <td class="px-4 py-3 text-sm text-gray-600">${schoolsMap[user.schoolId] || 'N/A'}</td>
          <td class="px-4 py-3 text-sm">${tempPw}</td>
          <td class="px-4 py-3 text-xs text-gray-500">
            <div>${uidShort}</div>
            <div class="mt-1">
              <button class="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-3" data-action="edit" data-id="${id}">Editar</button>
              <button class="text-red-600 hover:text-red-800 text-xs font-semibold" data-action="delete" data-id="${id}">Eliminar</button>
            </div>
          </td>
          <td class="px-4 py-3 text-sm">
            <button class="px-3 py-1 rounded bg-green-600 text-white opacity-70 cursor-not-allowed" title="Ajustar en módulo 'Grupos'" disabled>Calificaciones</button>
          </td>
        </tr>`;
    }).join('');

    // Wire Edit/Delete actions
    usersTableBody.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => showEditUserModal(btn.getAttribute('data-id')));
    });
    usersTableBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => deleteUser(btn.getAttribute('data-id')));
    });
    // La administración de contraseña ahora vive dentro del modal "Editar Usuario"
  } catch (error) {
    console.error('[Usuarios] Error cargando usuarios:', error);
    usersTableBody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-red-500">Error al cargar usuarios</td></tr>';
  }
}

// Cargar Escuelas
async function loadSchools() {
  const schoolsTableBody = document.getElementById('schoolsTableBody');
  schoolsTableBody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">Cargando escuelas...</td></tr>';
  
  try {
    console.log('[Escuelas] Iniciando carga de escuelas...');
    // Inicializar mapa centrado en Heroica Matamoros (si existe container)
    if (document.getElementById('schoolsMap')) {
      const center = [25.869, -97.504];
        const mapContainer = document.getElementById('schoolsMap');
        if (window.__schoolsMap && typeof window.__schoolsMap.remove === 'function') {
          try { window.__schoolsMap.remove(); } catch (_) {}
          window.__schoolsMap = null;
        }
        const map = L.map('schoolsMap', { zoomControl: true }).setView(center, 12);
      window.__schoolsMap = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 18
      }).addTo(map);
      
      const schoolsSnapshot = await getDocs(collection(db, 'schools'));
      console.log('[Escuelas] Total docs:', schoolsSnapshot.size);
      
      schoolsSnapshot.forEach(doc => {
        const school = doc.data();
        if (school.coords) {
          L.marker([school.coords.latitude, school.coords.longitude])
            .addTo(map)
            .bindPopup(`<strong>${school.name}</strong><br>${school.address || ''}`);
        }
      });
      // Wire botón crear escuela
        const btn = document.getElementById('createSchoolBtn');
        if (btn) {
          btn.onclick = () => startCreateSchoolMode(map);
        }
      
      // Tabla
      if (schoolsSnapshot.empty) {
        schoolsTableBody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No hay escuelas</td></tr>';
        return;
      }
      
      schoolsTableBody.innerHTML = schoolsSnapshot.docs.map(doc => {
        const school = doc.data();
        return `
          <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="px-4 py-3 font-semibold">${school.name}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${school.address}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 text-xs font-semibold rounded-full ${school.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                ${school.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </td>
            <td class="px-4 py-3">
              <button class="text-blue-600 hover:text-blue-800 text-sm font-semibold mr-3" data-action="edit" data-id="${doc.id}">Editar</button>
              <button class="text-red-600 hover:text-red-800 text-sm font-semibold" data-action="delete" data-id="${doc.id}">Eliminar</button>
            </td>
          </tr>
        `;
      }).join('');

      // Wire actions
      schoolsTableBody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openEditSchoolModal(btn.getAttribute('data-id')));
      });
      schoolsTableBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!confirm('¿Eliminar esta escuela?')) return;
          try {
            await deleteDoc(doc(db, 'schools', id));
            loadSchools();
            try { await loadSchoolsIntoSelect(); } catch(_) {}
          } catch (e) {
            console.error('Eliminar escuela falló', e);
            alert('No se pudo eliminar la escuela');
          }
        });
      });
    }
  } catch (error) {
    console.error('Error cargando escuelas:', error);
    const msg = (error && error.message) ? error.message : 'Error al cargar escuelas';
    schoolsTableBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-red-500">${msg}</td></tr>`;
  }
}

// Cargar Contenidos
function loadContent() {
  console.log('Cargando contenidos...');
  // Implementación pendiente
}

// ==============================
// Solicitudes de restablecimiento de contraseña
// ==============================
async function loadRequests() {
  const tbody = document.getElementById('requestsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">Cargando solicitudes...</td></tr>';
  try {
    const qSnap = await getDocs(collection(db, 'adminNotifications'));
    const rows = [];
    qSnap.forEach(d => {
      const n = d.data();
      if (n.type === 'PASSWORD_RESET_REQUEST' && n.status === 'PENDING') {
        const createdAt = n.createdAt?.toDate?.() || new Date();
        rows.push({ id: d.id, ...n, createdAt });
      }
    });
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No hay solicitudes pendientes</td></tr>';
      return;
    }
    rows.sort((a,b) => b.createdAt - a.createdAt);
    tbody.innerHTML = rows.map(r => `
      <tr class="border-b border-gray-200 hover:bg-gray-50">
        <td class="px-4 py-3 text-sm text-gray-700">${r.userEmail || ''}</td>
        <td class="px-4 py-3 text-xs text-gray-500">${r.userUid || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${r.createdAt.toLocaleString()}</td>
        <td class="px-4 py-3">
          <button class="text-indigo-600 hover:text-indigo-800 text-sm font-semibold" data-action="resolve" data-id="${r.id}" data-email="${r.userEmail || ''}">Resolver</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-action="resolve"]').forEach(btn => {
      btn.addEventListener('click', () => showResolveModal(btn.dataset.id, btn.dataset.email));
    });
  } catch (e) {
    console.error('Error cargando solicitudes', e);
    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-red-500">Error al cargar solicitudes</td></tr>';
  }
}

function passwordMeetsPolicy(pw, email) {
  const local = (email || '').split('@')[0] || '';
  return pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw) && (local ? !pw.toLowerCase().includes(local.toLowerCase()) : true);
}

function showResolveModal(notificationId, email) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
      <div class="flex justify-between items-start">
        <h3 class="text-xl font-bold">Resolver solicitud</h3>
        <button class="text-gray-500 hover:text-gray-700" data-close>✕</button>
      </div>
      <p class="text-sm text-gray-600 mt-2">Usuario: <span class="font-mono">${email}</span></p>
      <form class="mt-4 space-y-3" id="resolveForm">
        <label class="form-label">Nueva contraseña temporal</label>
        <input type="text" id="newTempPw" class="form-input" placeholder="Contraseña segura" required />
        <div class="text-xs text-gray-500">Mínimo 12, mayúscula, minúscula, número y símbolo. No incluir usuario del correo.</div>
        <div id="rErr" class="alert alert-danger hidden"><span>⚠️</span><span id="rErrText"></span></div>
        <div id="rOk" class="alert alert-success hidden"><span>✅</span><span id="rOkText"></span></div>
        <button id="rSubmit" class="btn btn-primary w-full flex items-center justify-center gap-2" type="submit">
          <span id="rText">Actualizar y marcar RESUELTA</span>
          <div id="rSpin" class="spinner spinner-sm hidden"></div>
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('[data-close]').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });

  const form = modal.querySelector('#resolveForm');
  const newTempPw = modal.querySelector('#newTempPw');
  const rSubmit = modal.querySelector('#rSubmit');
  const rText = modal.querySelector('#rText');
  const rSpin = modal.querySelector('#rSpin');
  const rErr = modal.querySelector('#rErr');
  const rErrText = modal.querySelector('#rErrText');
  const rOk = modal.querySelector('#rOk');
  const rOkText = modal.querySelector('#rOkText');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    rErr.classList.add('hidden');
    rOk.classList.add('hidden');
    const pw = newTempPw.value;
    if (!passwordMeetsPolicy(pw, email)) {
      rErrText.textContent = 'La contraseña no cumple con la política de seguridad.';
      rErr.classList.remove('hidden');
      return;
    }
    rSubmit.disabled = true; rText.textContent = 'Procesando…'; rSpin.classList.remove('hidden');
    try {
      const token = await getAdminToken();
      const res = await fetch('/resolveAdminPasswordReset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ notificationId, newPassword: pw })
      });
      if (!res.ok) throw new Error('Request failed');
      rOkText.textContent = 'Solicitud resuelta correctamente.';
      rOk.classList.remove('hidden');
      setTimeout(() => {
        close();
        loadRequests();
      }, 800);
    } catch (err) {
      console.error(err);
      rErrText.textContent = 'No se pudo resolver la solicitud.';
      rErr.classList.remove('hidden');
    } finally {
      rSubmit.disabled = false; rText.textContent = 'Actualizar y marcar RESUELTA'; rSpin.classList.add('hidden');
    }
  });
}

// Generar contraseña aleatoria
function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Mostrar modal de creación de usuario
function showCreateUserModal() {
  const modal = document.createElement('div');
  modal.id = 'createUserModal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">➕ Crear Nuevo Usuario</h2>
        <button onclick="closeCreateUserModal()" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <form id="createUserForm" class="space-y-4 max-h-96 overflow-y-auto pr-2">
        <div>
          <label class="block text-gray-700 font-semibold mb-2">Nombre(s) *</label>
          <input 
            type="text" 
            id="newUserNombre" 
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: Juan Carlos"
          >
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2">Apellido Paterno *</label>
          <input 
            type="text" 
            id="newUserApellidoPaterno" 
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: Pérez"
          >
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2">Apellido Materno *</label>
          <input 
            type="text" 
            id="newUserApellidoMaterno" 
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: García"
          >
        </div>

        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
          El correo institucional y la contraseña temporal se generarán automáticamente.
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2">Rol *</label>
          <select 
            id="newUserRole" 
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecciona un rol</option>
            <option value="Estudiante">👨‍🎓 Estudiante</option>
            <option value="Profesor">👨‍🏫 Profesor</option>
            <option value="Admin">⚙️ Administrador</option>
          </select>
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2">Escuela (Opcional)</label>
          <select 
            id="newUserSchool"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Ninguna</option>
          </select>
        </div>

        <div id="createUserError" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        </div>

        <div class="flex gap-3">
          <button 
            type="button"
            onclick="closeCreateUserModal()" 
            class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg transition"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            id="createUserSubmitBtn"
            class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Crear Usuario
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Cargar escuelas en el select
  loadSchoolsIntoSelect();
  
  // Manejar submit del formulario
  document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
}

// Cerrar modal de creación
window.closeCreateUserModal = function() {
  const modal = document.getElementById('createUserModal');
  if (modal) {
    modal.remove();
  }
}

// Cargar escuelas en el select
async function loadSchoolsIntoSelect() {
  try {
    const schoolsSnapshot = await getDocs(collection(db, 'schools'));
    const select = document.getElementById('newUserSchool');
    
    schoolsSnapshot.forEach(doc => {
      const school = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = school.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando escuelas:', error);
  }
}

// Manejar creación de usuario
async function handleCreateUser(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('createUserSubmitBtn');
  const errorDiv = document.getElementById('createUserError');
  
  const nombre = document.getElementById('newUserNombre').value.trim();
  const apellidoPaterno = document.getElementById('newUserApellidoPaterno').value.trim();
  const apellidoMaterno = document.getElementById('newUserApellidoMaterno').value.trim();
  const role = document.getElementById('newUserRole').value;
  const schoolId = document.getElementById('newUserSchool').value || null;
  
  // Crear displayName completo
  const displayName = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`;
  
  // Validaciones
  if (!nombre || !apellidoPaterno || !apellidoMaterno || !role) {
    errorDiv.textContent = 'Por favor completa todos los campos obligatorios.';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creando usuario...';
  errorDiv.classList.add('hidden');
  
  try {
    // Asegurar sesión inicializada antes de pedir token; evitar fetch sin token válido
    const token = await getAdminToken().catch(() => null);
    if (!token) {
      throw new Error('Sesión no inicializada o expirada. Por favor inicia sesión nuevamente antes de crear usuarios.');
    }
    // DEBUG extra: rol del usuario administrador actual
    try {
      console.log('[CrearUsuario] currentUserData.role:', currentUserData?.role, 'currentUserData.rol:', currentUserData?.rol);
    } catch (_) {}
    // DEBUG: Log token length (no el token completo) para verificar obtención
    console.log('[CrearUsuario] Token obtenido, longitud:', token.length);
    // Determinar endpoint: producción (Hosting rewrite) o servidor local Node (solo desarrollo)
    const endpoint = (typeof window.CODEKIDS_LOCAL_ADMIN_ENDPOINT === 'string' && window.CODEKIDS_LOCAL_ADMIN_ENDPOINT.length > 0)
      ? window.CODEKIDS_LOCAL_ADMIN_ENDPOINT
      : '/adminCreateUser';
    console.log('[CrearUsuario] Endpoint destino:', endpoint);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, apellidoPaterno, apellidoMaterno, role, schoolId })
    });
    console.log('[CrearUsuario] Respuesta status:', res.status);
    let data = {};
    try { data = await res.json(); } catch (_) {}
    console.log('[CrearUsuario] Payload recibido:', data);
    if (!res.ok) {
      const msg = data?.error || data?.message || 'No se pudo crear el usuario.';
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }

    // Mostrar modal de éxito con credenciales generadas
    showSuccessModal(data.email, data.tempPassword);

    // Cerrar modal y refrescar lista
    closeCreateUserModal();
    loadUsers();

  } catch (error) {
    console.error('Error creando usuario:', error);
    
    // Mostrar detalle del backend si existe
    let errorMessage = 'Error al crear usuario. ';
    if (error?.payload?.error || error?.payload?.message) {
      errorMessage += (error.payload.error || error.payload.message);
    } else {
      errorMessage += (error.message || '');
    }
    // Sugerencia si parece endpoint no disponible (404)
    if (error?.status === 404) {
      errorMessage += ' Verifica que estás abriendo la app desde el Hosting (emulador en http://127.0.0.1:5002 o sitio desplegado) para que funcione /adminCreateUser.';
    }
    if (error?.status === 403) {
      errorMessage += ' Revisa que tu documento en /users tenga role:"Admin" o rol:"admin" y que el token no esté expirado.';
    }
    // Fallback sugerido: si seguimos obteniendo 500 del endpoint original y existe endpoint local
    if (error?.status === 500 && endpoint === '/adminCreateUser' && window.CODEKIDS_LOCAL_ADMIN_ENDPOINT) {
      errorMessage += ' Se intentará usar el servidor local de administración. Vuelve a dar clic en Crear Usuario.';
      // Cambiar endpoint para siguiente intento
      window.CODEKIDS_FORCE_LOCAL_ADMIN = true;
    }
    
    errorDiv.textContent = errorMessage;
    errorDiv.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear Usuario';
  }
}

// Mostrar modal de éxito con credenciales
function showSuccessModal(email, password) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800">¡Usuario Creado Exitosamente!</h2>
        <p class="text-gray-600 mt-2">Guarda estas credenciales. La contraseña solo se muestra una vez.</p>
      </div>
      
      <div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
        <div class="mb-3">
          <label class="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico:</label>
          <div class="bg-white px-3 py-2 rounded border border-gray-300 font-mono text-sm">
            ${email}
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Contraseña Temporal:</label>
          <div class="bg-white px-3 py-2 rounded border border-gray-300 font-mono text-sm font-bold text-indigo-600">
            ${password}
          </div>
        </div>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p class="text-sm text-blue-800">
          ⚠️ <strong>Importante:</strong> El usuario deberá cambiar esta contraseña en su primer inicio de sesión.
        </p>
      </div>
      
      <button 
        onclick="this.closest('.fixed').remove()" 
        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition"
      >
        Entendido
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ===== Creación interactiva de escuelas =====
let createSchoolModeActive = false;
let tempMarker = null;
function startCreateSchoolMode(map) {
  if (!map) map = window.__schoolsMap;
  if (!map) return;
  if (createSchoolModeActive) return;
  createSchoolModeActive = true;
  alert('Modo creación: haz clic en el mapa para ubicar la escuela.');
  const handler = (e) => {
    if (!createSchoolModeActive) return;
    const { lat, lng } = e.latlng;
    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
    tempMarker = L.marker([lat, lng]).addTo(map);
    createSchoolModeActive = false;
    map.off('click', handler);
    showCreateSchoolModal({ lat, lng }, map);
  };
  map.on('click', handler);
}

function showCreateSchoolModal(coords, map) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4';
  modal.style.zIndex = '20000';
  modal.style.pointerEvents = 'auto';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative" style="z-index:21000;">
      <div class="flex items-start justify-between">
        <h3 class="text-xl font-bold">Nueva Escuela</h3>
        <button class="text-gray-500 hover:text-gray-700" data-close>✕</button>
      </div>
      <p class="text-sm text-gray-600 mt-1">Coordenadas: <span class="font-mono">${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}</span></p>
      <form id="schoolForm" class="mt-4 space-y-3">
        <div>
          <label class="form-label">Nombre de la escuela *</label>
          <input id="schoolName" class="form-input" placeholder="Ej. Sec. Gral. No.1" required />
        </div>
        <div>
          <label class="form-label">Dirección (opcional)</label>
          <input id="schoolAddress" class="form-input" placeholder="Calle, colonia, ciudad" />
        </div>
        <div id="schoolErr" class="alert alert-danger hidden"><span>⚠️</span><span id="schoolErrText"></span></div>
        <button id="schoolSubmit" class="btn btn-primary w-full">Guardar Escuela</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => { modal.remove(); if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; } };
  modal.querySelector('[data-close]').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  const form = modal.querySelector('#schoolForm');
  const err = modal.querySelector('#schoolErr');
  const errText = modal.querySelector('#schoolErrText');
  const submitBtn = modal.querySelector('#schoolSubmit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.add('hidden');
    const name = modal.querySelector('#schoolName').value.trim();
    const address = modal.querySelector('#schoolAddress').value.trim();
    if (!name) {
      errText.textContent = 'Ingresa un nombre válido';
      err.classList.remove('hidden');
      return;
    }
    submitBtn.disabled = true; submitBtn.textContent = 'Guardando…';
    try {
      await addDoc(collection(db, 'schools'), {
        name,
        address: address || '',
        coords: { latitude: coords.lat, longitude: coords.lng },
        isActive: true,
        createdAt: serverTimestamp(),
      });
      close();
      loadSchools();
      try { await loadSchoolsIntoSelect(); } catch(_) {}
    } catch (e) {
      console.error('Error guardando escuela', e);
      errText.textContent = 'No se pudo guardar la escuela.';
      err.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Guardar Escuela';
    }
  });
}

async function getAdminToken() {
  if (auth.currentUser) return auth.currentUser.getIdToken();
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        unsub();
        if (!u) return reject(new Error('Sesión no inicializada. Inicia sesión nuevamente.'));
        const t = await u.getIdToken();
        resolve(t);
      } catch (e) { reject(e); }
    });
    setTimeout(() => {
      try { unsub(); } catch(_) {}
      if (!auth.currentUser) reject(new Error('Timeout esperando autenticación. Recarga la página.'));
    }, 3000);
  });
}

async function openEditSchoolModal(id) {
  try {
    const ref = doc(db, 'schools', id);
    const snap = await getDocs(query(collection(db, 'schools'), where('__name__','==', id), limit(1)));
    const d = snap.docs[0];
    const data = d?.data();
    if (!data) return alert('No se encontró la escuela');
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4';
    modal.style.zIndex = '20000';
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        <div class="flex items-start justify-between">
          <h3 class="text-xl font-bold">Editar Escuela</h3>
          <button class="text-gray-500 hover:text-gray-700" data-close>✕</button>
        </div>
        <form id="editSchoolForm" class="mt-4 space-y-3">
          <div>
            <label class="form-label">Nombre *</label>
            <input id="editSchoolName" class="form-input" value="${data.name || ''}" required />
          </div>
          <div>
            <label class="form-label">Dirección</label>
            <input id="editSchoolAddress" class="form-input" value="${data.address || ''}" />
          </div>
          <div class="flex gap-2">
            <button type="button" data-close class="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" class="btn btn-primary flex-1">Guardar</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('#editSchoolForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = modal.querySelector('#editSchoolName').value.trim();
      const address = modal.querySelector('#editSchoolAddress').value.trim();
      try {
        await updateDoc(ref, { name, address });
        close();
        loadSchools();
        try { await loadSchoolsIntoSelect(); } catch(_) {}
      } catch (err) {
        console.error('Editar escuela falló', err);
        alert('No se pudo guardar cambios');
      }
    });
  } catch (e) {
    console.error('openEditSchoolModal error', e);
  }
}

// Modal para editar usuario existente
async function showEditUserModal(uid) {
  try {
    // Obtener datos del usuario
    const ref = doc(db, 'users', uid);
    let snap;
    try { snap = await getDoc(ref); } catch (_) {}
    if (!snap || !snap.exists()) {
      // Fallback por compatibilidad (similar a escuelas)
      const qSnap = await getDocs(query(collection(db, 'users'), where('__name__','==', uid), limit(1)));
      snap = qSnap.docs[0];
    }
    if (!snap || !snap.exists()) return alert('Usuario no encontrado');
    const user = snap.data();

    // Cargar escuelas para select
    const schoolsSnapshot = await getDocs(collection(db, 'schools'));
    const schoolsOptions = schoolsSnapshot.docs.map(d => {
      const s = d.data();
      const selected = (user.schoolId === d.id) ? 'selected' : '';
      return `<option value="${d.id}" ${selected}>${s.name}</option>`;
    }).join('');

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-xl font-bold">Editar Usuario</h3>
          <button class="text-gray-500 hover:text-gray-700" data-close>✕</button>
        </div>
        <form id="editUserForm" class="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="form-label">Nombre *</label>
              <input id="editNombre" class="form-input" value="${user.nombre || ''}" required />
            </div>
            <div>
              <label class="form-label">Apellido Paterno *</label>
              <input id="editApellidoPaterno" class="form-input" value="${user.apellidoPaterno || ''}" required />
            </div>
            <div>
              <label class="form-label">Apellido Materno *</label>
              <input id="editApellidoMaterno" class="form-input" value="${user.apellidoMaterno || ''}" required />
            </div>
          </div>
          <div>
            <label class="form-label">Rol *</label>
            <select id="editRole" class="form-select" required>
              <option value="Admin" ${ (user.role==='Admin'||user.rol==='admin') ? 'selected' : '' }>Administrador</option>
              <option value="Profesor" ${ (user.role==='Profesor'||user.rol==='profesor') ? 'selected' : '' }>Profesor</option>
              <option value="Estudiante" ${ (user.role==='Estudiante'||user.rol==='estudiante') ? 'selected' : '' }>Estudiante</option>
            </select>
          </div>
          <div>
            <label class="form-label">Escuela</label>
            <select id="editSchool" class="form-select">
              <option value="">Ninguna</option>
              ${schoolsOptions}
            </select>
          </div>
          <div class="text-xs text-gray-500">UID: <span class="font-mono">${uid}</span></div>
          <div id="editUserErr" class="hidden bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm"></div>
          <div class="flex gap-3 pt-2">
            <button type="button" data-close class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg">Cancelar</button>
            <button type="submit" id="editUserSubmit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">Guardar Cambios</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    modal.querySelector('#editUserForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errDiv = modal.querySelector('#editUserErr');
      errDiv.classList.add('hidden'); errDiv.textContent='';
      const submitBtn = modal.querySelector('#editUserSubmit');
      submitBtn.disabled = true; submitBtn.textContent = 'Guardando…';
      const nombre = modal.querySelector('#editNombre').value.trim();
      const apellidoPaterno = modal.querySelector('#editApellidoPaterno').value.trim();
      const apellidoMaterno = modal.querySelector('#editApellidoMaterno').value.trim();
      const role = modal.querySelector('#editRole').value;
      const schoolIdVal = modal.querySelector('#editSchool').value;
      const schoolId = schoolIdVal === '' ? null : schoolIdVal;
      if (!nombre || !apellidoPaterno || !apellidoMaterno || !role) {
        errDiv.textContent = 'Completa todos los campos obligatorios.';
        errDiv.classList.remove('hidden');
        submitBtn.disabled = false; submitBtn.textContent = 'Guardar Cambios';
        return;
      }
      try {
        const token = await getAdminToken().catch(() => null);
        if (!token) throw new Error('Token no disponible. Inicia sesión nuevamente.');
        const endpoint = buildAdminEndpoint('/adminUpdateUser');
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ uid, nombre, apellidoPaterno, apellidoMaterno, role, schoolId })
        });
        let payload = {};
        try { payload = await res.json(); } catch(_) {}
        if (!res.ok) {
          throw new Error(payload?.error || payload?.message || 'Error al actualizar (endpoint)');
        }
        close();
        loadUsers();
      } catch (err) {
        console.warn('[EditarUsuario] Endpoint falló, intentando actualizar en Firestore directamente…', err);
        // Fallback: actualizar documento en Firestore para no bloquear el flujo
        try {
          const displayName = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim();
          const roleLower = (role || '').toLowerCase();
          await updateDoc(doc(db, 'users', uid), {
            nombre, apellidoPaterno, apellidoMaterno,
            role: role,
            rol: roleLower,
            schoolId: schoolId || null,
            displayName,
            searchableDisplayName: displayName.toLowerCase(),
          });
          close();
          loadUsers();
        } catch (err2) {
          console.error('[EditarUsuario] Fallback Firestore también falló', err2);
          errDiv.textContent = (err?.message || 'Error en endpoint') + ' • ' + (err2?.message || 'No se pudo guardar en Firestore');
          errDiv.classList.remove('hidden');
        }
      } finally {
        submitBtn.disabled = false; submitBtn.textContent = 'Guardar Cambios';
      }
    });

    // Botón para regenerar contraseña
    const pwBlock = document.createElement('div');
    pwBlock.className = 'mt-4 border-t pt-4';
    pwBlock.innerHTML = `
      <h4 class="text-sm font-semibold mb-2">Administrar Contraseña</h4>
      <div class="flex flex-col gap-2">
        <button id="btnGenNewPw" class="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-semibold w-full">Generar nueva contraseña temporal</button>
        <div id="pwResult" class="hidden bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-xs"></div>
      </div>
    `;
    modal.querySelector('#editUserForm').appendChild(pwBlock);
    const btnGenNewPw = pwBlock.querySelector('#btnGenNewPw');
    const pwResult = pwBlock.querySelector('#pwResult');
    btnGenNewPw.addEventListener('click', async () => {
      btnGenNewPw.disabled = true; btnGenNewPw.textContent = 'Generando…'; pwResult.classList.add('hidden');
      try {
        const token = await getAdminToken();
        const endpoint = buildAdminEndpoint('/adminSetUserPassword');
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ uid, generateRandom: true })
        });
        let payload = {}; try { payload = await res.json(); } catch(_) {}
        if (!res.ok) throw new Error(payload?.error || payload?.message || 'Error al actualizar contraseña');
        // Asegurar reemplazo inmediato en Firestore para reflejar en tabla
        try {
          await updateDoc(doc(db, 'users', uid), {
            tempPassword: payload.newPassword,
            passwordChangeRequired: true,
            forcePasswordChange: true,
          });
        } catch(_) {}
        pwResult.innerHTML = `Nueva contraseña temporal: <span class="font-mono font-semibold">${payload.newPassword}</span><br><span class="text-[11px]">El usuario deberá cambiarla en su siguiente inicio de sesión.</span>`;
        pwResult.classList.remove('hidden');
        loadUsers();
      } catch (err) {
        console.warn('[adminSetUserPassword] Endpoint falló, aplicando fallback solo Firestore tempPassword…', err);
        // Fallback: escribir tempPassword en Firestore para mostrarla aunque Auth no se actualice
        try {
          const tempPassword = generatePassword(12);
          await updateDoc(doc(db, 'users', uid), {
            tempPassword,
            passwordChangeRequired: true,
            forcePasswordChange: true,
            lastTempPasswordFallbackAt: serverTimestamp(),
          });
          pwResult.innerHTML = `Contraseña temporal (Fallback): <span class="font-mono font-semibold">${tempPassword}</span><br><span class="text-[11px] text-red-700">Auth no actualizada. Generar de nuevo cuando el servidor esté disponible.</span>`;
          pwResult.classList.remove('hidden');
          pwResult.classList.add('bg-red-50','border-red-200','text-red-700');
          loadUsers();
        } catch (e2) {
          pwResult.textContent = 'Fallo total: ' + (e2.message || 'Error desconocido');
          pwResult.classList.remove('hidden');
          pwResult.classList.add('bg-red-50','border-red-200','text-red-700');
        }
      } finally {
        btnGenNewPw.disabled = false; btnGenNewPw.textContent = 'Generar nueva contraseña temporal';
      }
    });
  } catch (e) {
    console.error('showEditUserModal error', e);
    alert('No se pudo abrir el editor de usuario');
  }
}

// Eliminar usuario
async function deleteUser(uid) {
  if (!uid) return;
  if (!confirm('¿Eliminar este usuario? Esta acción es irreversible.')) return;
  try {
    const token = await getAdminToken().catch(() => null);
    if (!token) throw new Error('Token no disponible. Inicia sesión nuevamente.');
    const endpoint = buildAdminEndpoint('/adminDeleteUser');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ uid })
    });
    let payload = {};
    try { payload = await res.json(); } catch(_) {}
    if (!res.ok) {
      throw new Error(payload?.error || payload?.message || 'Error al eliminar (endpoint)');
    }
    loadUsers();
  } catch (err) {
    console.warn('[EliminarUsuario] Endpoint falló, intentando eliminar solo el documento en Firestore…', err);
    try {
      await deleteDoc(doc(db, 'users', uid));
      loadUsers();
      alert('Usuario eliminado del panel (documento). Nota: La cuenta de autenticación no se eliminó.');
    } catch (err2) {
      console.error('[EliminarUsuario] Fallback Firestore también falló', err2);
      alert('No se pudo eliminar: ' + (err?.message || 'Error endpoint') + ' • ' + (err2?.message || 'Error Firestore'));
    }
  }
}

// Modal rápido para administrar la contraseña desde el botón "Editar" en la columna
async function quickPasswordModal(uid) {
  try {
    const ref = doc(db, 'users', uid);
    let snap = await getDoc(ref).catch(() => null);
    if (!snap || !snap.exists()) {
      const qSnap = await getDocs(query(collection(db, 'users'), where('__name__','==', uid), limit(1)));
      snap = qSnap.docs[0];
    }
    if (!snap || !snap.exists()) return alert('Usuario no encontrado');
    const user = snap.data();

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
        <div class="flex items-start justify-between mb-3">
          <h3 class="text-lg font-bold">Administrar Contraseña</h3>
          <button class="text-gray-500 hover:text-gray-700" data-close>✕</button>
        </div>
        <p class="text-xs text-gray-500 mb-3">Usuario: <span class="font-mono">${user.email || '(sin correo)'}</span><br>UID: <span class="font-mono">${uid}</span></p>
        <div class="mb-4 text-sm">
          <div class="mb-2 font-semibold">Contraseña temporal actual:</div>
          <div class="px-3 py-2 rounded border text-sm font-mono ${user.tempPassword ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-gray-50 border-gray-200 text-gray-400'}">
            ${user.tempPassword || '— (no registrada)'}
          </div>
        </div>
        <form id="quickPwForm" class="space-y-3">
          <div>
            <label class="form-label">Establecer contraseña manual (opcional)</label>
            <input id="manualPw" type="text" class="form-input" placeholder="Contraseña segura" />
            <div class="text-[11px] text-gray-500 mt-1">Mínimo 12 caracteres, mayúscula, minúscula, número y símbolo. No incluir la parte antes de @ del correo.</div>
          </div>
          <div class="flex flex-col gap-2">
            <button type="button" id="btnGenerateRandom" class="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-semibold w-full">Generar aleatoria & forzar cambio</button>
            <button type="submit" id="btnSetManual" class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold w-full">Guardar manual & forzar cambio</button>
            <button type="button" data-close class="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold w-full">Cancelar</button>
          </div>
          <div id="quickPwErr" class="hidden bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs"></div>
          <div id="quickPwOk" class="hidden bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-xs"></div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    const manualPwEl = modal.querySelector('#manualPw');
    const errEl = modal.querySelector('#quickPwErr');
    const okEl = modal.querySelector('#quickPwOk');
    const btnGenerate = modal.querySelector('#btnGenerateRandom');
    const btnSetManual = modal.querySelector('#btnSetManual');

    async function callEndpoint(payload) {
      const token = await getAdminToken().catch(() => null);
      if (!token) throw new Error('Token no disponible');
      const endpoint = buildAdminEndpoint('/adminSetUserPassword');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      let data = {}; try { data = await res.json(); } catch(_) {}
      if (!res.ok) throw new Error(data?.error || data?.message || 'Error en la operación');
      return data;
    }

    btnGenerate.addEventListener('click', async () => {
      errEl.classList.add('hidden'); okEl.classList.add('hidden');
      btnGenerate.disabled = true; btnGenerate.textContent = 'Generando…';
      try {
        const data = await callEndpoint({ uid, generateRandom: true });
        okEl.innerHTML = `Nueva contraseña temporal: <span class="font-mono font-semibold">${data.newPassword}</span>`;
        okEl.classList.remove('hidden');
        loadUsers();
      } catch (e) {
        errEl.textContent = e.message || 'Error desconocido';
        errEl.classList.remove('hidden');
      } finally {
        btnGenerate.disabled = false; btnGenerate.textContent = 'Generar aleatoria & forzar cambio';
      }
    });

    modal.querySelector('#quickPwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.classList.add('hidden'); okEl.classList.add('hidden');
      const pw = manualPwEl.value.trim();
      if (!pw) {
        errEl.textContent = 'Ingresa una contraseña o usa Generar.';
        errEl.classList.remove('hidden');
        return;
      }
      if (!passwordMeetsPolicy(pw, user.email)) {
        errEl.textContent = 'La contraseña no cumple con la política.';
        errEl.classList.remove('hidden');
        return;
      }
      btnSetManual.disabled = true; btnSetManual.textContent = 'Guardando…';
      try {
        const data = await callEndpoint({ uid, newPassword: pw });
        // Escribir también en Firestore para reflejar de inmediato
        try {
          await updateDoc(doc(db, 'users', uid), {
            tempPassword: data.newPassword,
            passwordChangeRequired: true,
            forcePasswordChange: true,
          });
        } catch(_) {}
        okEl.innerHTML = `Contraseña establecida: <span class="font-mono font-semibold">${data.newPassword}</span>`;
        okEl.classList.remove('hidden');
        manualPwEl.value = '';
        loadUsers();
      } catch (e2) {
        errEl.textContent = e2.message || 'Error desconocido';
        errEl.classList.remove('hidden');
      } finally {
        btnSetManual.disabled = false; btnSetManual.textContent = 'Guardar manual & forzar cambio';
      }
    });
  } catch (e) {
    console.error('quickPasswordModal error', e);
    alert('No se pudo abrir el administrador de contraseña');
  }
}

// Carga dinámica de jsPDF desde CDN cuando sea necesario
async function ensureJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = resolve; s.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
    document.head.appendChild(s);
  });
  return window.jspdf.jsPDF;
}

// Modal para exportar usuarios a PDF con filtros básicos
async function showExportUsersModal() {
  // Cargar escuelas para filtro
  let schoolOptions = '<option value="">Todas</option>';
  try {
    const snap = await getDocs(collection(db, 'schools'));
    snap.forEach(d => { const s = d.data(); schoolOptions += `<option value="${d.id}">${s.name || d.id}</option>`; });
  } catch(_) {}
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
      <div class="flex items-start justify-between mb-3">
        <h3 class="text-xl font-bold">Exportar Usuarios (PDF)</h3>
        <button class="text-gray-500 hover:text-gray-700" data-close>✕</button>
      </div>
      <form id="exportForm" class="space-y-3">
        <div>
          <label class="form-label">Roles</label>
          <div class="grid grid-cols-3 gap-2 text-sm">
            <label class="inline-flex items-center gap-2"><input type="checkbox" value="admin" checked> Admin</label>
            <label class="inline-flex items-center gap-2"><input type="checkbox" value="profesor" checked> Profesor</label>
            <label class="inline-flex items-center gap-2"><input type="checkbox" value="estudiante" checked> Estudiante</label>
          </div>
        </div>
        <div>
          <label class="form-label">Escuela</label>
          <select id="expSchool" class="form-select">${schoolOptions}</select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Últimos N</label>
            <input id="expLast" class="form-input" type="number" min="0" placeholder="0 = sin límite">
          </div>
          <div>
            <label class="form-label">Por día (YYYY-MM-DD)</label>
            <input id="expDay" class="form-input" type="date">
          </div>
        </div>
        <div id="expErr" class="hidden alert alert-danger"><span>⚠️</span><span id="expErrText"></span></div>
        <button id="expSubmit" class="btn btn-primary w-full">Generar PDF</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('[data-close]').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  const form = modal.querySelector('#exportForm');
  const expErr = modal.querySelector('#expErr');
  const expErrText = modal.querySelector('#expErrText');
  const expSubmit = modal.querySelector('#expSubmit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    expErr.classList.add('hidden');
    expSubmit.disabled = true; expSubmit.textContent = 'Generando…';
    try {
      const roles = Array.from(form.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
      const schoolId = form.querySelector('#expSchool').value || '';
      const lastN = parseInt(form.querySelector('#expLast').value || '0', 10) || 0;
      const dayStr = form.querySelector('#expDay').value || '';

      // Cargar usuarios
      const uSnap = await getDocs(collection(db, 'users'));
      let users = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filtros
      if (roles.length && roles.length < 3) {
        users = users.filter(u => (u.rol || (u.role||'').toLowerCase()) && roles.includes((u.rol || (u.role||'').toLowerCase())));
      }
      if (schoolId) users = users.filter(u => (u.schoolId || '') === schoolId);
      if (dayStr) {
        const start = new Date(dayStr + 'T00:00:00');
        const end = new Date(dayStr + 'T23:59:59');
        users = users.filter(u => {
          const ts = u.createdAt?.toMillis ? u.createdAt.toMillis() : (u.createdAt ? new Date(u.createdAt).getTime() : 0);
          return ts >= start.getTime() && ts <= end.getTime();
        });
      }
      // Orden por createdAt desc
      users.sort((a,b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return tb - ta;
      });
      if (lastN > 0) users = users.slice(0, lastN);

      // Generar PDF
      const jsPDF = await ensureJsPDF();
      const docPdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      let y = margin;
      docPdf.setFont('helvetica','bold');
      docPdf.setFontSize(14);
      docPdf.text('CodeKids - Reporte de Usuarios', margin, y); y += 18;
      docPdf.setFont('helvetica','normal');
      docPdf.setFontSize(10);
      const subtitle = `Roles: ${roles.join(', ')}  Escuela: ${schoolId || 'Todas'}  Fecha: ${dayStr || 'Todas'}  Total: ${users.length}`;
      docPdf.text(subtitle, margin, y); y += 14;

      // Encabezados
      const headers = ['#','Nombre','Email','Rol','Escuela','Creación'];
      const widths = [24, 160, 160, 70, 100, 80];
      let x = margin;
      docPdf.setFont('helvetica','bold');
      headers.forEach((h,i)=>{ docPdf.text(h, x, y); x += widths[i]; }); y += 12;
      docPdf.setFont('helvetica','normal');
      // Filas
      users.forEach((u, idx) => {
        x = margin;
        const created = u.createdAt?.toDate ? u.createdAt.toDate() : (u.createdAt ? new Date(u.createdAt) : null);
        const createdStr = created ? created.toLocaleDateString() : '';
        const row = [String(idx+1), (u.displayName||'-').slice(0,40), (u.email||'-').slice(0,40), (u.role||u.rol||'-'), (u.schoolId||'-'), createdStr];
        row.forEach((val,i)=>{ docPdf.text(String(val), x, y); x += widths[i]; });
        y += 12;
        if (y > 780) { docPdf.addPage(); y = margin; }
      });

      docPdf.save('usuarios.pdf');
      close();
    } catch (e) {
      console.error('Export PDF error', e);
      expErrText.textContent = e.message || 'No se pudo generar el PDF.';
      expErr.classList.remove('hidden');
    } finally {
      expSubmit.disabled = false; expSubmit.textContent = 'Generar PDF';
    }
  });
}