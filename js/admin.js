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
import { collection, getDocs, getDoc, query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
        b.classList.remove('border-red-600', 'text-red-600');
        b.classList.add('border-transparent', 'text-gray-600');
      });
      
      btn.classList.remove('border-transparent', 'text-gray-600');
      btn.classList.add('border-red-600', 'text-red-600');
      
      // Mostrar contenido correspondiente
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      
      document.getElementById(tab).classList.remove('hidden');
      
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
  
  // Logout - Mostrar modal de confirmación
  const logoutBtn = document.getElementById('adminLogout');
  const logoutModal = document.getElementById('logoutConfirmModal');
  const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
  const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
  
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logoutModal.classList.remove('hidden');
  });
  
  cancelLogoutBtn.addEventListener('click', () => {
    logoutModal.classList.add('hidden');
  });
  
  confirmLogoutBtn.addEventListener('click', async () => {
    logoutModal.classList.add('hidden');
    await logout();
  });
  
  // Cerrar modal con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !logoutModal.classList.contains('hidden')) {
      logoutModal.classList.add('hidden');
    }
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
  
  // Botón crear usuario
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

  // Event listeners para botones de acceso rápido
  const quickAccessButtons = document.querySelectorAll('.quick-access-btn');
  quickAccessButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      const targetAction = btn.dataset.action;
      
      // Si es una acción directa
      if (targetAction === 'createUser') {
        showCreateUserModal();
      } else if (targetAction === 'createSchool') {
        // Navegar a la pestaña de escuelas primero
        const schoolsTabButton = document.querySelector('.tab-button[data-tab="schools"]');
        if (schoolsTabButton) {
          schoolsTabButton.click();
        }
        // Esperar un momento para que se cargue la pestaña y luego abrir el modal
        setTimeout(() => {
          const createSchoolBtn = document.getElementById('createSchoolBtn');
          if (createSchoolBtn) {
            createSchoolBtn.click();
          }
        }, 100);
      } else if (targetTab) {
        // Si es navegación a pestaña
        const targetTabButton = document.querySelector(`.tab-button[data-tab="${targetTab}"]`);
        if (targetTabButton) {
          targetTabButton.click();
        }
      }
    });
  });
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
    
    // Iniciar listeners en tiempo real para actividad
    startActivityListeners();
    
  } catch (error) {
    console.error('Error cargando dashboard:', error);
  }
}

// ==============================
// ACTIVIDAD EN TIEMPO REAL
// ==============================
let activeUsersUnsubscribe = null;
let recentLoginsUnsubscribe = null;
let groupsUnsubscribe = null;
let securityUnsubscribe = null;

function startActivityListeners() {
  // Cancelar listeners anteriores si existen
  if (activeUsersUnsubscribe) activeUsersUnsubscribe();
  if (recentLoginsUnsubscribe) recentLoginsUnsubscribe();
  if (groupsUnsubscribe) groupsUnsubscribe();
  if (securityUnsubscribe) securityUnsubscribe();
  
  loadActiveUsers();
  loadRecentLogins();
  loadGroupsCreatedToday();
  loadSecurityAlerts();
}

// 1. Usuarios Activos Ahora (última actividad < 5 minutos)
function loadActiveUsers() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const q = query(
    collection(db, 'users'),
    where('lastLogin', '>=', fiveMinutesAgo),
    orderBy('lastLogin', 'desc')
  );
  
  activeUsersUnsubscribe = onSnapshot(q, (snapshot) => {
    const activeUsersList = document.getElementById('activeUsersList');
    const activeUsersCount = document.getElementById('activeUsersCount');
    
    if (!snapshot || snapshot.empty) {
      activeUsersList.innerHTML = '<p class="text-sm text-gray-500">Sin usuarios activos ahora</p>';
      activeUsersCount.textContent = '0';
      return;
    }
    
    activeUsersCount.textContent = snapshot.size;
    
    const users = [];
    snapshot.forEach(doc => {
      const user = doc.data();
      const lastLogin = user.lastLogin?.toDate?.() || new Date();
      users.push({ ...user, id: doc.id, lastLogin });
    });
    
    activeUsersList.innerHTML = users.map(u => {
      const timeAgo = getTimeAgo(u.lastLogin);
      const roleColor = u.role === 'Admin' ? 'text-red-600' : u.role === 'Profesor' ? 'text-purple-600' : 'text-blue-600';
      const roleIcon = u.role === 'Admin' ? '👑' : u.role === 'Profesor' ? '👨‍🏫' : '👨‍🎓';
      
      return `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
          <div class="flex items-center gap-2">
            <span>${roleIcon}</span>
            <div>
              <p class="text-sm font-semibold text-gray-800">${u.displayName || u.email}</p>
              <p class="text-xs ${roleColor}">${u.role || 'Usuario'}</p>
            </div>
          </div>
          <span class="text-xs text-gray-500">${timeAgo}</span>
        </div>
      `;
    }).join('');
  }, (error) => {
    console.error('Error en listener de usuarios activos:', error);
  });
}

// 2. Últimos 5 Inicios de Sesión
function loadRecentLogins() {
  const q = query(
    collection(db, 'users'),
    orderBy('lastLogin', 'desc'),
    limit(5)
  );
  
  recentLoginsUnsubscribe = onSnapshot(q, (snapshot) => {
    const recentLogins = document.getElementById('recentLogins');
    
    if (!snapshot || snapshot.empty) {
      recentLogins.innerHTML = '<p class="text-sm text-gray-500">Sin actividad reciente...</p>';
      return;
    }
    
    const logins = [];
    snapshot.forEach(doc => {
      const user = doc.data();
      if (user.lastLogin) {
        const lastLogin = user.lastLogin?.toDate?.() || new Date();
        logins.push({ ...user, id: doc.id, lastLogin });
      }
    });
    
    recentLogins.innerHTML = logins.map(u => {
      const timeAgo = getTimeAgo(u.lastLogin);
      // Role badge colors (solid for better contrast on dark backgrounds)
      const roleBadge = u.role === 'Admin' ? 'bg-red-600 text-white' : u.role === 'Profesor' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white';

      return `
        <div class="flex items-center justify-between p-2 rounded bg-white hover:bg-gray-50 transition border border-gray-200">
          <div>
            <p class="text-sm font-semibold text-gray-800">${u.displayName || u.email}</p>
            <span class="text-xs px-2 py-0.5 rounded ${roleBadge}">${u.role || 'Usuario'}</span>
          </div>
          <span class="text-xs text-gray-500">${timeAgo}</span>
        </div>
      `;
    }).join('');
  });
}

// 3. Grupos Creados Hoy
function loadGroupsCreatedToday() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const q = query(
    collection(db, 'groups'),
    where('createdAt', '>=', todayStart),
    orderBy('createdAt', 'desc')
  );
  
  groupsUnsubscribe = onSnapshot(q, (snapshot) => {
    const groupsCreatedToday = document.getElementById('groupsCreatedToday');
    
    if (!snapshot || snapshot.empty) {
      groupsCreatedToday.innerHTML = '<p class="text-sm text-gray-500">Sin grupos nuevos hoy...</p>';
      return;
    }
    
    const groups = [];
    snapshot.forEach(doc => {
      const group = doc.data();
      const createdAt = group.createdAt?.toDate?.() || new Date();
      groups.push({ ...group, id: doc.id, createdAt });
    });
    
    groupsCreatedToday.innerHTML = groups.map(g => {
      const timeAgo = getTimeAgo(g.createdAt);
      const membersCount = Object.keys(g.members || {}).length;
      
      return `
        <div class="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
          <div class="flex items-start justify-between">
            <div>
              <p class="font-semibold text-gray-800">${g.nombre || 'Grupo sin nombre'}</p>
              <p class="text-xs text-gray-600">👥 ${membersCount} miembros</p>
            </div>
            <span class="text-xs text-gray-500">${timeAgo}</span>
          </div>
        </div>
      `;
    }).join('');
  });
}

// 5. Alertas de Seguridad (intentos fallidos, cambios de contraseña)
function loadSecurityAlerts() {
  // Escuchar cambios de contraseña recientes (últimas 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const q = query(
    collection(db, 'users'),
    where('lastPasswordResetByUserAt', '>=', oneDayAgo),
    orderBy('lastPasswordResetByUserAt', 'desc'),
    limit(5)
  );
  
  securityUnsubscribe = onSnapshot(q, (snapshot) => {
    const securityAlerts = document.getElementById('securityAlerts');
    
    if (!snapshot || snapshot.empty) {
      securityAlerts.innerHTML = '<p class="text-sm text-gray-500">✅ Sin alertas</p>';
      return;
    }
    
    const alerts = [];
    snapshot.forEach(doc => {
      const user = doc.data();
      const resetAt = user.lastPasswordResetByUserAt?.toDate?.() || new Date();
      alerts.push({ ...user, id: doc.id, resetAt });
    });
    
    securityAlerts.innerHTML = alerts.map(u => {
      const timeAgo = getTimeAgo(u.resetAt);
      
      return `
        <div class="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <div class="flex items-center gap-2">
            <span class="text-yellow-600">🔐</span>
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-800">${u.displayName || u.email}</p>
              <p class="text-xs text-gray-600">Cambió su contraseña hace ${timeAgo}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  });
}

// Helper: Calcular tiempo transcurrido
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'ahora mismo';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
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
    
    // Obtener contraseñas de la colección userPasswords
    const passwordsSnapshot = await getDocs(collection(db, 'userPasswords'));
    const passwordsMap = {};
    passwordsSnapshot.forEach(d => {
      passwordsMap[d.id] = d.data().currentPassword;
    });

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
          const displayName = data.displayName || 
                             (data.nombre ? `${data.nombre} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim() : '');
          const name = displayName.toLowerCase();
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
      
      // Construir nombre completo desde Firestore
      const displayName = user.displayName || 
                         (user.nombre ? `${user.nombre} ${user.apellidoPaterno || ''} ${user.apellidoMaterno || ''}`.trim() : null) ||
                         'Sin nombre';
      
      // Mostrar contraseña actual desde userPasswords, o temporal/current de fallback
      let passwordDisplay = '<span class="text-gray-400">—</span>';
      if (passwordsMap[id]) {
        passwordDisplay = `<span class="font-mono text-green-700">${passwordsMap[id]}</span>`;
      } else if (user.currentPassword) {
        passwordDisplay = `<span class="font-mono text-blue-600">${user.currentPassword}</span>`;
      } else if (user.tempPassword) {
        passwordDisplay = `<span class="font-mono text-orange-600">${user.tempPassword}</span>`;
      }
      
      return `
        <tr class="border-b border-gray-200 hover:bg-gray-50" data-user-id="${id}">
          <td class="px-4 py-3 text-sm text-gray-500">${idx + 1}</td>
          <td class="px-4 py-3">${displayName}${needsPwChange}</td>
          <td class="px-4 py-3 text-sm text-gray-600">${user.email || ''}</td>
          <td class="px-4 py-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${roleBadge}">${roleRaw}</span></td>
          <td class="px-4 py-3 text-sm text-gray-600">${schoolsMap[user.schoolId] || 'N/A'}</td>
          <td class="px-4 py-3 text-sm">${passwordDisplay}</td>
          <td class="px-4 py-3 text-xs text-gray-500">
            <div>${uidShort}</div>
            <div class="mt-1">
              <button class="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-3" data-action="edit" data-id="${id}">Editar</button>
              <button class="text-red-600 hover:text-red-800 text-xs font-semibold" data-action="delete" data-id="${id}">Eliminar</button>
            </div>
          </td>
          <td class="px-4 py-3 text-sm">
            ${roleRaw === 'Estudiante' ? 
              `<button class="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white transition font-semibold" onclick="openGradesModal('${id}', '${user.displayName || user.email}')">Calificaciones</button>` :
              `<span class="text-gray-400 text-sm">—</span>`
            }
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
          
          // Modal de confirmación
          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 transition-opacity opacity-0';
          modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform scale-95 transition-transform">
              <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 class="text-lg font-bold text-center text-gray-900 mb-2">¿Eliminar esta escuela?</h3>
              <p class="text-center text-gray-500 text-sm mb-6">Esta acción es permanente y no se puede deshacer.</p>
              <div class="flex gap-3">
                <button id="cancelDelSchool" class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition">Cancelar</button>
                <button id="confirmDelSchool" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition">Sí, eliminar</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
          
          requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.firstElementChild.classList.remove('scale-95');
            modal.firstElementChild.classList.add('scale-100');
          });

          const close = () => {
            modal.classList.add('opacity-0');
            setTimeout(() => modal.remove(), 200);
          };

          modal.querySelector('#cancelDelSchool').addEventListener('click', close);
          modal.querySelector('#confirmDelSchool').addEventListener('click', async () => {
            close();
            try {
              await deleteDoc(doc(db, 'schools', id));
              loadSchools();
              try { await loadSchoolsIntoSelect(); } catch(_) {}
              showToast('Escuela eliminada correctamente');
            } catch (e) {
              console.error('Eliminar escuela falló', e);
              showToast('No se pudo eliminar la escuela', 'error');
            }
          });
        });
      });
    }
  } catch (error) {
    console.error('Error cargando escuelas:', error);
    const msg = (error && error.message) ? error.message : 'Error al cargar escuelas';
    schoolsTableBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-red-500">${msg}</td></tr>`;
  }
}

// ==========================================
// GESTIÓN DE CURSOS AVANZADA
// ==========================================
let allCoursesData = []; // Cache local para filtrado sin recargar DB
let currentPage = 1;
const coursesPerPage = 2;

// Notificaciones Toast
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  toast.className = `fixed bottom-5 right-5 ${bgClass} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-y-10 opacity-0 z-[10000] flex items-center gap-2`;
  toast.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${type === 'success' ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}"></path></svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cargar Contenidos
function loadContent() {
  console.log('Cargando contenidos...');
  loadCourses();
  
  // Event listeners para botones de crear curso
  const createCourseBtns = [document.getElementById('createCourseBtn'), document.getElementById('createFirstCourseBtn')];
  createCourseBtns.forEach(btn => {
    if (btn) {
      btn.replaceWith(btn.cloneNode(true));
      document.getElementById(btn.id).addEventListener('click', () => openCourseModal());
    }
  });

  // Inicializar búsqueda
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => filterCourses(e.target.value));
  }
}

// Cargar cursos desde Firestore
async function loadCourses() {
  const coursesList = document.getElementById('coursesList');
  if (!coursesList) return;

  // Skeleton Loading
  coursesList.innerHTML = `
    <div class="animate-pulse space-y-4">
      ${[1,2,3].map(() => `<div class="h-32 bg-gray-200 rounded-lg"></div>`).join('')}
    </div>
  `;

  try {
    const snapshot = await getDocs(collection(db, 'courses'));
    allCoursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCoursesList(allCoursesData);
  } catch (error) {
    console.error('Error cargando cursos:', error);
    coursesList.innerHTML = `
      <div class="bg-red-50 text-red-600 p-4 rounded-lg text-center">
        Error al conectar con la base de datos.
      </div>`;
  }
}

// Renderizar lista de cursos con paginación
function renderCoursesList(courses) {
  const coursesList = document.getElementById('coursesList');
  
  if (courses.length === 0) {
    coursesList.innerHTML = `
      <div class="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-white">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
        </div>
        <h4 class="text-lg font-semibold text-gray-800">No se encontraron cursos</h4>
        <p class="text-gray-500 text-sm mt-1">Intenta con otros filtros o crea uno nuevo.</p>
      </div>
    `;
    return;
  }

  // Calcular paginación
  const totalPages = Math.ceil(courses.length / coursesPerPage);
  const startIndex = (currentPage - 1) * coursesPerPage;
  const endIndex = startIndex + coursesPerPage;
  const paginatedCourses = courses.slice(startIndex, endIndex);

  coursesList.innerHTML = `
    <div class="space-y-4">
      ${paginatedCourses.map(course => `
        <div class="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
          <div class="absolute left-0 top-0 bottom-0 w-1 ${course.isActive ? 'bg-green-500' : 'bg-gray-300'}"></div>
          
          <div class="flex flex-col md:flex-row gap-5">
            <div class="w-full md:w-32 h-32 flex-shrink-0 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg overflow-hidden flex items-center justify-center">
              ${course.image ? 
                `<img src="${course.image}" alt="Cover" class="w-full h-full object-cover">` :
                `<svg class="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`
              }
            </div>

            <div class="flex-1">
              <div class="flex justify-between items-start">
                <div>
                  <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 mb-2">
                    ${course.category || 'General'}
                  </span>
                  <h4 class="text-xl font-bold text-gray-800 mb-1 leading-tight">${course.name}</h4>
                  <p class="text-sm text-gray-600 line-clamp-2 mb-3">${course.description}</p>
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onclick="openCourseModal('${course.id}')" class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <button onclick="confirmDeleteCourse('${course.id}')" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-2 border-t pt-3 border-gray-100">
                <span class="flex items-center gap-1.5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  ${course.duration || 'N/A'}
                </span>
                <span class="flex items-center gap-1.5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  ${course.lessonsCount || 0} Lecciones
                </span>
                <span class="flex items-center gap-1.5 text-purple-600 font-medium">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  ${course.level || 'Principiante'}
                </span>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <!-- Paginación -->
    ${totalPages > 1 ? `
      <div class="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200 mt-6">
        <div class="text-sm text-gray-600">
          Mostrando <span class="font-semibold">${startIndex + 1}</span> a <span class="font-semibold">${Math.min(endIndex, courses.length)}</span> de <span class="font-semibold">${courses.length}</span> cursos
        </div>
        
        <div class="flex gap-2">
          <button 
            onclick="changePage(${currentPage - 1})" 
            ${currentPage === 1 ? 'disabled' : ''}
            class="px-4 py-2 rounded-lg border transition ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          
          ${Array.from({length: totalPages}, (_, i) => i + 1).map(page => `
            <button 
              onclick="changePage(${page})"
              class="px-4 py-2 rounded-lg transition ${page === currentPage ? 'bg-purple-700 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}"
            >
              ${page}
            </button>
          `).join('')}
          
          <button 
            onclick="changePage(${currentPage + 1})" 
            ${currentPage === totalPages ? 'disabled' : ''}
            class="px-4 py-2 rounded-lg border transition ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>
    ` : ''}
  `;
}

// Cambiar de página
function changePage(page) {
  const totalPages = Math.ceil(allCoursesData.length / coursesPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderCoursesList(allCoursesData);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Búsqueda local
function filterCourses(query) {
  currentPage = 1; // Resetear a página 1 al buscar
  const term = query.toLowerCase();
  const filtered = allCoursesData.filter(c => 
    c.name.toLowerCase().includes(term) || 
    c.description.toLowerCase().includes(term)
  );
  renderCoursesList(filtered);
}

// Modal unificado (Crear y Editar)
async function openCourseModal(courseId = null) {
  let courseData = {
    name: '', description: '', duration: '', lessonsCount: 0, 
    isActive: true, category: 'Python', level: 'Principiante', 
    image: ''
  };
  let isEdit = false;

  if (courseId) {
    isEdit = true;
    const found = allCoursesData.find(c => c.id === courseId);
    if (found) courseData = found;
  }

  const existingModal = document.getElementById('courseModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'courseModal';
  modal.className = 'fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] transition-opacity opacity-0';
  
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform scale-95 transition-transform" id="modalContent">
      <div class="sticky top-0 bg-purple-700 px-8 py-5 flex items-center justify-between z-10 rounded-t-2xl">
        <div>
          <h3 class="text-2xl font-bold text-white">${isEdit ? 'Editar Curso' : 'Crear Nuevo Curso'}</h3>
          <p class="text-purple-100 text-sm">Configura los detalles del contenido educativo</p>
        </div>
        <button data-close class="p-2 rounded-full hover:bg-purple-600 text-white transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <form id="courseForm" class="p-8 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso</label>
            <input type="text" name="name" value="${courseData.name}" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition" placeholder="Ej: Máster en JavaScript">
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Descripción Corta</label>
            <textarea name="description" rows="3" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition" placeholder="¿De qué trata este curso?">${courseData.description}</textarea>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Categoría</label>
            <select name="category" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              ${['Python', 'JavaScript', 'Java', 'C++', 'Scratch', 'HTML/CSS', 'Robótica', 'Desarrollo Web', 'Desarrollo de Juegos', 'Inteligencia Artificial'].map(opt => `<option value="${opt}" ${courseData.category === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nivel</label>
            <select name="level" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              ${['Principiante', 'Intermedio', 'Avanzado'].map(opt => `<option value="${opt}" ${courseData.level === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Duración (texto)</label>
            <input type="text" name="duration" value="${courseData.duration}" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="Ej: 10 horas">
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Lecciones Totales</label>
            <input type="number" name="lessonsCount" min="0" value="${courseData.lessonsCount}" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">URL Imagen Portada</label>
            <input type="url" name="image" value="${courseData.image || ''}" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="https://...">
          </div>
        </div>

        <div class="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
           <div class="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
              <input type="checkbox" name="isActive" id="toggleActive" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" ${courseData.isActive ? 'checked' : ''}/>
              <label for="toggleActive" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
           </div>
           <label for="toggleActive" class="text-gray-700 font-medium cursor-pointer">El curso está visible para estudiantes</label>
        </div>

        <div class="flex gap-4 pt-4 border-t border-gray-100">
          <button type="button" data-close class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-lg transition">Cancelar</button>
          <button type="submit" id="saveBtn" class="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2">
            <span>${isEdit ? 'Guardar Cambios' : 'Crear Curso'}</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  
  // Animación entrada
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.querySelector('#modalContent').classList.remove('scale-95');
    modal.querySelector('#modalContent').classList.add('scale-100');
  });

  const close = () => {
    modal.classList.add('opacity-0');
    modal.querySelector('#modalContent').classList.add('scale-95');
    setTimeout(() => modal.remove(), 200);
  };
  
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));

  const form = modal.querySelector('#courseForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = modal.querySelector('#saveBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Guardando...`;

    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      level: formData.get('level'),
      duration: formData.get('duration'),
      image: formData.get('image'),
      lessonsCount: parseInt(formData.get('lessonsCount')) || 0,
      isActive: modal.querySelector('#toggleActive').checked,
      updatedAt: serverTimestamp()
    };

    try {
      if (isEdit) {
        await updateDoc(doc(db, 'courses', courseId), payload);
        showToast('Curso actualizado correctamente');
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = auth.currentUser?.uid || 'unknown';
        await addDoc(collection(db, 'courses'), payload);
        showToast('Curso creado exitosamente');
      }
      close();
      loadCourses();
    } catch (error) {
      console.error(error);
      showToast('Error al guardar. Intenta de nuevo.', 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  });
}

// Confirmar eliminación
function confirmDeleteCourse(courseId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 transition-opacity opacity-0';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform scale-95 transition-transform">
      <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h3 class="text-lg font-bold text-center text-gray-900 mb-2">¿Eliminar curso?</h3>
      <p class="text-center text-gray-500 text-sm mb-6">Esta acción es permanente y no se puede deshacer. Se perderá todo el contenido asociado.</p>
      <div class="flex gap-3">
        <button id="cancelDel" class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition">Cancelar</button>
        <button id="confirmDel" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition">Sí, eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.firstElementChild.classList.remove('scale-95');
    modal.firstElementChild.classList.add('scale-100');
  });

  const close = () => {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.remove(), 200);
  };

  modal.querySelector('#cancelDel').addEventListener('click', close);
  modal.querySelector('#confirmDel').addEventListener('click', async () => {
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      close();
      showToast('Curso eliminado correctamente');
      loadCourses();
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar', 'error');
    }
  });
}

// Exponer funciones
window.loadCourses = loadCourses;
window.openCourseModal = openCourseModal;
window.confirmDeleteCourse = confirmDeleteCourse;
window.changePage = changePage;

// ==============================
// Solicitudes de restablecimiento de contraseña
// ==============================
let requestsUnsubscribe = null; // Variable para guardar el unsubscribe

async function loadRequests() {
  const tbody = document.getElementById('requestsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">Cargando solicitudes...</td></tr>';
  
  try {
    // Cancelar listener anterior si existe
    if (requestsUnsubscribe) {
      requestsUnsubscribe();
    }
    
    // Cargar desde passwordResetRequests
    const q = query(
      collection(db, 'passwordResetRequests'),
      where('status', '==', 'pending')
    );
    
    requestsUnsubscribe = onSnapshot(q, (snapshot) => {
      const rows = [];
      snapshot.forEach(d => {
        const n = d.data();
        const requestedAt = n.requestedAt?.toDate?.() || new Date();
        rows.push({ id: d.id, ...n, requestedAt });
      });
      
      // Ordenar en cliente (más recientes primero)
      rows.sort((a, b) => b.requestedAt - a.requestedAt);
      
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">No hay solicitudes pendientes</td></tr>';
        return;
      }
      
      tbody.innerHTML = rows.map(r => `
        <tr class="border-b border-gray-200 hover:bg-gray-50">
          <td class="px-4 py-3 text-sm text-gray-700">${r.userName || 'Usuario'}</td>
          <td class="px-4 py-3 text-sm text-gray-600">${r.email || ''}</td>
          <td class="px-4 py-3 text-xs text-gray-500">${r.userId ? (r.userId.slice(0,8) + '…') : 'N/A'}</td>
          <td class="px-4 py-3 text-sm text-gray-600">${r.requestedAt.toLocaleString()}</td>
          <td class="px-4 py-3">
            <button class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition" 
                    data-action="approve" 
                    data-id="${r.id}" 
                    data-email="${r.email || ''}"
                    data-userid="${r.userId || ''}"
                    data-username="${r.userName || 'Usuario'}">
              Aprobar
            </button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-action="approve"]').forEach(btn => {
        btn.addEventListener('click', () => approvePasswordReset(btn.dataset.id, btn.dataset.email, btn.dataset.userid, btn.dataset.username));
      });
      
      // Mostrar notificación visual cuando llegue nueva solicitud
      if (rows.length > 0 && window.loadRequestsFirstRun !== true) {
        try {
          showNotification('🔔 Nueva solicitud de recuperación de contraseña', 'info');
        } catch (e) { /* Ignore if notification function doesn't exist */ }
      }
      window.loadRequestsFirstRun = true;
    }, (error) => {
      console.error('Error en listener de solicitudes:', error);
      tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-red-500">Error al cargar solicitudes en tiempo real</td></tr>';
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

// Aprobar solicitud de restablecimiento de contraseña
async function approvePasswordReset(requestId, email, userId, userName) {
  if (!userId) {
    alert('No se puede aprobar: usuario no encontrado en el sistema.');
    return;
  }
  
  if (!confirm(`¿Aprobar solicitud de ${userName} (${email})?\n\nSe generará una contraseña temporal y se enviará al usuario.`)) {
    return;
  }
  
  try {
    // Generar contraseña temporal
    const tempPassword = generatePassword(12);
    
    // Mostrar modal de carga
    const loadingModal = document.createElement('div');
    loadingModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    loadingModal.innerHTML = `
      <div class="bg-white rounded-xl p-6 max-w-sm">
        <div class="flex items-center gap-3">
          <div class="spinner"></div>
          <span class="text-gray-700">Procesando solicitud...</span>
        </div>
      </div>
    `;
    document.body.appendChild(loadingModal);
    
    // Actualizar documento del usuario en Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      tempPassword: tempPassword,
      passwordChangeRequired: true,
      forcePasswordChange: false,
      lastPasswordResetByAdminAt: serverTimestamp()
    });
    
    // Actualizar estado de la solicitud
    const requestRef = doc(db, 'passwordResetRequests', requestId);
    await updateDoc(requestRef, {
      status: 'approved',
      resolvedAt: serverTimestamp(),
      resolvedBy: auth.currentUser?.uid || 'admin',
      tempPassword: tempPassword
    });
    
    // Cerrar modal de carga
    loadingModal.remove();
    
    // Mostrar modal con la contraseña temporal
    showPasswordResultModal(userName, email, tempPassword);
    
  } catch (error) {
    console.error('Error aprobando solicitud:', error);
    alert('Error al procesar la solicitud: ' + (error.message || 'Error desconocido'));
  }
}

// Mostrar modal con la contraseña temporal generada
function showPasswordResultModal(userName, email, tempPassword) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-bold text-green-600">✅ Solicitud Aprobada</h3>
          <p class="text-sm text-gray-600 mt-1">Contraseña temporal generada</p>
        </div>
        <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">✕</button>
      </div>
      
      <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <p class="text-sm text-gray-600"><strong>Usuario:</strong> ${userName}</p>
        <p class="text-sm text-gray-600"><strong>Email:</strong> ${email}</p>
      </div>
      
      <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
        <label class="block text-sm font-semibold text-indigo-900 mb-2">Contraseña Temporal:</label>
        <div class="flex items-center gap-2">
          <input 
            type="text" 
            value="${tempPassword}" 
            readonly 
            class="flex-1 px-3 py-2 bg-white border border-indigo-300 rounded font-mono text-sm"
            id="tempPasswordField"
          />
          <button 
            onclick="navigator.clipboard.writeText('${tempPassword}').then(() => { this.innerHTML = '✓'; setTimeout(() => this.innerHTML = '📋', 1000); })"
            class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold transition"
            title="Copiar"
          >
            📋
          </button>
        </div>
        <p class="text-xs text-indigo-700 mt-2">
          ⚠️ El usuario deberá cambiar esta contraseña en su próximo inicio de sesión.
        </p>
      </div>
      
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <p class="text-xs text-yellow-800">
          <strong>⚠️ Paso adicional requerido:</strong><br>
          Para que el usuario pueda iniciar sesión con esta contraseña, debes ejecutar en la terminal:<br>
          <code class="bg-yellow-100 px-2 py-1 rounded font-mono text-xs block mt-1">node sync-password-resets.js</code>
          <br>
          Esto sincronizará la contraseña con Firebase Authentication.
        </p>
      </div>
      
      <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
        <p class="text-xs text-indigo-800">
          Esta contraseña también está visible en el tab "Usuarios" del panel de administración.
        </p>
      </div>
      
      <button 
        onclick="this.closest('.fixed').remove()"
        class="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition"
      >
        Cerrar
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Seleccionar el texto automáticamente
  const field = modal.querySelector('#tempPasswordField');
  field.select();
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
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
      <div class="bg-purple-700 px-6 py-4 flex items-center justify-between">
        <h2 class="text-xl font-bold text-white">Crear Nuevo Usuario</h2>
        <button onclick="closeCreateUserModal()" class="text-white hover:text-purple-200 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <form id="createUserForm" class="space-y-4 max-h-96 overflow-y-auto pr-2 p-6">
        <div>
          <label class="block text-gray-700 font-semibold mb-2">Nombre(s) *</label>
          <input 
            type="text" 
            id="newUserNombre" 
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="Ej: Juan Carlos"
          >
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2">Apellido Paterno *</label>
          <input 
            type="text" 
            id="newUserApellidoPaterno" 
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="Ej: Pérez"
          >
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2">Apellido Materno *</label>
          <input 
            type="text" 
            id="newUserApellidoMaterno" 
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
            class="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2.5 rounded-lg transition"
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
  
  // Determinar endpoint: producción (Hosting rewrite) o servidor local Node (solo desarrollo)
  let endpoint = (typeof window.CODEKIDS_LOCAL_ADMIN_ENDPOINT === 'string' && window.CODEKIDS_LOCAL_ADMIN_ENDPOINT.length > 0)
    ? window.CODEKIDS_LOCAL_ADMIN_ENDPOINT
    : '/adminCreateUser';
  
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
    
    // Guardar contraseña en userPasswords, passwordRecords y actualizar usuario
    try {
      if (data.uid && data.email && data.tempPassword) {
        // Guardar en la nueva colección userPasswords
        await setDoc(doc(db, 'userPasswords', data.uid), {
          email: data.email,
          currentPassword: data.tempPassword,
          updatedAt: serverTimestamp()
        });
        
        // Guardar en passwordRecords (colección legacy)
        await setDoc(doc(db, 'passwordRecords', data.uid), {
          email: data.email,
          password: data.tempPassword,
          updatedAt: serverTimestamp()
        });
        
        await updateDoc(doc(db, 'users', data.uid), {
          currentPassword: data.tempPassword
        });
      }
    } catch (pwErr) {
      console.error('Error guardando contraseña:', pwErr);
    }

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
  
  // Mostrar notificación moderna
  const notification = document.createElement('div');
  notification.className = 'fixed top-24 left-1/2 transform -translate-x-1/2 z-[9999] animate-bounce';
  notification.innerHTML = `
    <div class="bg-purple-700 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-md">
      <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      <div>
        <p class="font-semibold">Modo creación activado</p>
        <p class="text-sm text-purple-100">Haz clic en el mapa para ubicar la escuela</p>
      </div>
      <button onclick="this.closest('.fixed').remove()" class="ml-2 hover:bg-purple-600 rounded-lg p-1 transition">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
  
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
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden" style="z-index:21000;">
      <div class="bg-purple-700 px-6 py-4 flex items-center justify-between">
        <h3 class="text-xl font-bold text-white">Nueva Escuela</h3>
        <button class="text-white hover:text-purple-200 transition" data-close>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-6">
        <p class="text-sm text-gray-600 mb-4">Coordenadas: <span class="font-mono">${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}</span></p>
        <form id="schoolForm" class="space-y-3">
        <div>
          <label class="form-label">Nombre de la escuela *</label>
          <input id="schoolName" class="form-input" placeholder="Ej. Sec. Gral. No.1" required />
        </div>
        <div>
          <label class="form-label">Dirección (opcional)</label>
          <input id="schoolAddress" class="form-input" placeholder="Calle, colonia, ciudad" />
        </div>
        <div id="schoolErr" class="alert alert-danger hidden"><span>⚠️</span><span id="schoolErrText"></span></div>
        <div class="flex gap-3">
          <button type="button" id="schoolCancel" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-lg transition">Cancelar</button>
          <button type="submit" id="schoolSubmit" class="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2.5 rounded-lg transition">Guardar Escuela</button>
        </div>
      </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => { modal.remove(); if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; } };
  modal.querySelector('[data-close]').addEventListener('click', close);
  modal.querySelector('#schoolCancel').addEventListener('click', close);
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
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div class="bg-purple-700 px-6 py-4 flex items-center justify-between">
          <h3 class="text-xl font-bold text-white">Editar Escuela</h3>
          <button class="text-white hover:text-purple-200 transition" data-close>
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form id="editSchoolForm" class="space-y-3 p-6">
          <div>
            <label class="form-label">Nombre *</label>
            <input id="editSchoolName" class="form-input" value="${data.name || ''}" required />
          </div>
          <div>
            <label class="form-label">Dirección</label>
            <input id="editSchoolAddress" class="form-input" value="${data.address || ''}" />
          </div>
          <div class="flex gap-3">
            <button type="button" data-close class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-lg transition">Cancelar</button>
            <button type="submit" class="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2.5 rounded-lg transition">Guardar</button>
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
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div class="bg-purple-700 px-6 py-4 flex items-center justify-between">
          <h3 class="text-xl font-bold text-white">Editar Usuario</h3>
          <button class="text-white hover:text-purple-200 transition" data-close>
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form id="editUserForm" class="space-y-4 max-h-[70vh] overflow-y-auto pr-1 p-6">
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
            <button type="button" data-close class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-lg transition">Cancelar</button>
            <button type="submit" id="editUserSubmit" class="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2.5 rounded-lg transition">Guardar Cambios</button>
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
        <button id="btnGenNewPw" class="px-3 py-2 rounded bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold w-full transition">Generar nueva contraseña temporal</button>
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
          const userDoc = await getDoc(doc(db, 'users', uid));
          const userEmail = userDoc.data()?.email || '';
          
          await updateDoc(doc(db, 'users', uid), {
            tempPassword,
            currentPassword: tempPassword,
            passwordChangeRequired: true,
            forcePasswordChange: true,
            lastTempPasswordFallbackAt: serverTimestamp(),
          });
          
          // Guardar en passwordRecords
          await setDoc(doc(db, 'passwordRecords', uid), {
            email: userEmail,
            password: tempPassword,
            updatedAt: serverTimestamp()
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
  
  // Modal de confirmación
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 transition-opacity opacity-0';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform scale-95 transition-transform">
      <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h3 class="text-lg font-bold text-center text-gray-900 mb-2">¿Eliminar este usuario?</h3>
      <p class="text-center text-gray-500 text-sm mb-6">Esta acción es irreversible.</p>
      <div class="flex gap-3">
        <button id="cancelDelUser" class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition">Cancelar</button>
        <button id="confirmDelUser" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition">Sí, eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.firstElementChild.classList.remove('scale-95');
    modal.firstElementChild.classList.add('scale-100');
  });

  const close = () => {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.remove(), 200);
  };

  modal.querySelector('#cancelDelUser').addEventListener('click', close);
  modal.querySelector('#confirmDelUser').addEventListener('click', async () => {
    close();
    
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
      showToast('Usuario eliminado correctamente');
    } catch (err) {
      console.warn('[EliminarUsuario] Endpoint falló, intentando eliminar solo el documento en Firestore…', err);
      try {
        await deleteDoc(doc(db, 'users', uid));
        loadUsers();
        showToast('Usuario eliminado del panel (documento). Nota: La cuenta de autenticación no se eliminó.');
      } catch (err2) {
        console.error('[EliminarUsuario] Fallback Firestore también falló', err2);
        showToast('No se pudo eliminar: ' + (err?.message || 'Error endpoint') + ' • ' + (err2?.message || 'Error Firestore'), 'error');
      }
    }
  });
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
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
      <div class="bg-purple-700 px-6 py-4 flex items-center justify-between">
        <h3 class="text-xl font-bold text-white">Exportar Usuarios (PDF)</h3>
        <button class="text-white hover:text-purple-200 transition" data-close>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <form id="exportForm" class="space-y-3 p-6">
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
        <div class="flex gap-3 pt-2">
          <button type="button" id="expCancel" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-lg transition">Cancelar</button>
          <button type="submit" id="expSubmit" class="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2.5 rounded-lg transition">Generar PDF</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('[data-close]').addEventListener('click', close);
  modal.querySelector('#expCancel').addEventListener('click', close);
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
      const docPdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const pageWidth = docPdf.internal.pageSize.getWidth();
      const pageHeight = docPdf.internal.pageSize.getHeight();
      const margin = 30;
      const contentWidth = pageWidth - (margin * 2);
      
      // Header morado con estilo de la imagen
      docPdf.setFillColor(124, 58, 237); // purple-600
      docPdf.rect(0, 0, pageWidth, 100, 'F');
      
      // Logo/Título "Code Kids" en blanco
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFont('helvetica','bold');
      docPdf.setFontSize(28);
      docPdf.text('Code Kids', margin, 45);
      
      // Subtítulo del sistema
      docPdf.setFontSize(11);
      docPdf.setFont('helvetica','normal');
      docPdf.text('Sistema de Gestión Educativa', margin, 65);
      
      // Número de página (derecha)
      docPdf.setFontSize(10);
      docPdf.text(`Página 1`, pageWidth - margin - 50, 65);
      
      // Título del reporte (debajo del header morado)
      let y = 130;
      docPdf.setTextColor(30, 41, 59); // gray-800
      docPdf.setFont('helvetica','bold');
      docPdf.setFontSize(18);
      docPdf.text('Reporte de Usuarios', margin, y);
      y += 30;
      
      // Caja de filtros/resumen con borde
      docPdf.setDrawColor(229, 231, 235); // gray-200
      docPdf.setFillColor(249, 250, 251); // gray-50
      docPdf.roundedRect(margin, y, contentWidth, 50, 3, 3, 'FD');
      
      docPdf.setFontSize(9);
      docPdf.setFont('helvetica','bold');
      docPdf.text(`Roles: Todos`, margin + 10, y + 18);
      docPdf.text(`Escuela: Todas`, margin + 10, y + 33);
      
      docPdf.text(`Fecha: Todas`, pageWidth / 2, y + 18);
      
      // Total en caja destacada (derecha)
      const totalBoxX = pageWidth - margin - 120;
      docPdf.setDrawColor(30, 41, 59);
      docPdf.setLineWidth(2);
      docPdf.roundedRect(totalBoxX, y + 5, 110, 35, 3, 3);
      docPdf.setFontSize(11);
      docPdf.text(`Total: ${users.length}`, totalBoxX + 10, y + 27);
      
      y += 70;

      // Configuración de tabla optimizada
      const headers = ['#','Nombre','Email','Rol','Escuela','Contraseña','Creación'];
      const columnWidths = [0.02, 0.22, 0.30, 0.08, 0.18, 0.15, 0.09];
      const actualWidths = columnWidths.map(w => w * contentWidth);
      const rowHeight = 16;
      
      // Función para cortar texto según ancho
      const fitText = (text, width) => {
        const maxChars = Math.floor(width / 3.8);
        return text.length > maxChars ? text.substring(0, maxChars - 2) + '..' : text;
      };
      
      // Función para dibujar footer en cada página
      const drawFooter = () => {
        const footerY = pageHeight - 20;
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(8);
        docPdf.setTextColor(128, 128, 128);
        
        // Fecha de generación (izquierda)
        const now = new Date();
        const dateStr = `Generado el ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}, ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        docPdf.text(dateStr, margin, footerY);
        
        // Copyright (derecha)
        docPdf.text('CodeKids © 2025', pageWidth - margin - 70, footerY);
      };
      
      // Función para dibujar header de tabla
      const drawTableHeader = () => {
        let x = margin;
        
        docPdf.setDrawColor(0, 0, 0);
        docPdf.setLineWidth(0.5);
        docPdf.setFillColor(255, 255, 255);
        docPdf.setTextColor(0, 0, 0);
        
        // Celdas del header
        headers.forEach((h, i) => {
          docPdf.rect(x, y, actualWidths[i], rowHeight, 'FD');
          x += actualWidths[i];
        });
        
        // Texto del header
        x = margin;
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(9);
        headers.forEach((h, i) => {
          docPdf.text(h, x + 3, y + 11);
          x += actualWidths[i];
        });
        
        y += rowHeight;
      };
      
      // Función para redibujar página completa con header morado
      const redrawPageHeader = () => {
        docPdf.addPage();
        
        // Header morado
        docPdf.setFillColor(124, 58, 237);
        docPdf.rect(0, 0, pageWidth, 100, 'F');
        docPdf.setTextColor(255, 255, 255);
        docPdf.setFont('helvetica','bold');
        docPdf.setFontSize(28);
        docPdf.text('Code Kids', margin, 45);
        docPdf.setFontSize(11);
        docPdf.setFont('helvetica','normal');
        docPdf.text('Sistema de Gestión Educativa', margin, 65);
        
        y = 130;
        drawTableHeader();
        drawFooter();
      };
      
      // Dibujar encabezado inicial
      drawTableHeader();
      
      // Dibujar footer en primera página
      drawFooter();
      
      // Configurar fuente para datos
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(8);
      docPdf.setTextColor(0, 0, 0);
      
      // Recorrer usuarios
      users.forEach((u, idx) => {
        // Nueva página si se acaba el espacio (dejar 50pt para footer)
        if (y > pageHeight - 50) {
          redrawPageHeader();
          docPdf.setFont('helvetica', 'normal');
          docPdf.setFontSize(8);
          docPdf.setTextColor(0, 0, 0);
        }
        
        // Dibujar celdas de la fila
        let x = margin;
        docPdf.setFillColor(255, 255, 255);
        headers.forEach((h, i) => {
          docPdf.rect(x, y, actualWidths[i], rowHeight, 'FD');
          x += actualWidths[i];
        });
        
        // Preparar datos
        const created = u.createdAt?.toDate ? u.createdAt.toDate() : (u.createdAt ? new Date(u.createdAt) : null);
        const createdStr = created ? created.toLocaleDateString('es-ES') : '-';
        
        const row = [
          String(idx + 1),
          fitText(u.displayName || '-', actualWidths[1]),
          fitText(u.email || '-', actualWidths[2]),
          u.role || u.rol || '-',
          fitText(schoolsMap[u.schoolId] || u.schoolId || '-', actualWidths[4]),
          fitText(u.tempPassword || '(no registrada)', actualWidths[5]),
          createdStr
        ];
        
        // Pintar texto
        x = margin;
        row.forEach((val, i) => {
          docPdf.text(String(val), x + 3, y + 11);
          x += actualWidths[i];
        });
        
        y += rowHeight;
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

// ==============================
// MODAL DE CALIFICACIONES POR USUARIO
// ==============================

let currentModalStudentId = null;
let currentModalStudentName = null;
let currentModalGrades = [];

// Abrir modal de calificaciones
window.openGradesModal = async function(studentId, studentName) {
  currentModalStudentId = studentId;
  currentModalStudentName = studentName;
  
  document.getElementById('modalStudentName').textContent = studentName;
  document.getElementById('gradesModal').classList.remove('hidden');
  
  // Resetear formulario
  document.getElementById('modalGroupSelect').value = '';
  document.getElementById('modalUnitName').value = '';
  document.getElementById('modalScore').value = '';
  document.getElementById('modalGradeError').classList.add('hidden');
  document.getElementById('modalGradeSuccess').classList.add('hidden');
  
  // Cargar grupos para el selector
  await loadModalGroups();
  
  // Cargar calificaciones del estudiante
  await loadStudentGrades();
};

// Cerrar modal
document.getElementById('closeGradesModal')?.addEventListener('click', () => {
  document.getElementById('gradesModal').classList.add('hidden');
});

// Cargar grupos para el selector del modal
async function loadModalGroups() {
  const selector = document.getElementById('modalGroupSelect');
  selector.innerHTML = '<option value="">Cargando grupos...</option>';
  
  try {
    const groupsSnap = await getDocs(collection(db, 'groups'));
    selector.innerHTML = '<option value="">Seleccionar grupo...</option>';
    
    groupsSnap.forEach(d => {
      const g = d.data();
      selector.innerHTML += `<option value="${d.id}" data-group-name="${g.nombre || 'Sin nombre'}" data-teacher-id="${g.teacherUid || ''}" data-teacher-name="${g.teacherName || 'Sin profesor'}">${g.nombre || 'Sin nombre'}</option>`;
    });
  } catch (error) {
    console.error('Error cargando grupos:', error);
    selector.innerHTML = '<option value="">Error al cargar grupos</option>';
  }
}

// Cargar calificaciones del estudiante
async function loadStudentGrades() {
  const tbody = document.getElementById('modalGradesTable');
  tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-4 text-center text-gray-500">Cargando...</td></tr>';
  
  try {
    const q = query(
      collection(db, 'grades'),
      where('studentId', '==', currentModalStudentId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    currentModalGrades = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    renderModalGradesTable();
    updateModalStats();
    
  } catch (error) {
    console.error('Error cargando calificaciones:', error);
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-4 text-center text-red-500">Error al cargar calificaciones</td></tr>';
  }
}

// Renderizar tabla de calificaciones en el modal
function renderModalGradesTable() {
  const tbody = document.getElementById('modalGradesTable');
  
  if (currentModalGrades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No hay calificaciones registradas</td></tr>';
    return;
  }
  
  tbody.innerHTML = currentModalGrades.map((grade, idx) => {
    const date = grade.createdAt?.toDate?.() || new Date();
    const scoreColor = grade.score >= 70 ? 'text-green-600' : grade.score >= 60 ? 'text-yellow-600' : 'text-red-600';
    
    return `
      <tr class="border-b border-gray-200 hover:bg-gray-50">
        <td class="px-4 py-3 text-sm text-gray-500">${idx + 1}</td>
        <td class="px-4 py-3 text-sm font-semibold">${grade.groupName || 'N/A'}</td>
        <td class="px-4 py-3 text-sm text-gray-700">${grade.unitName}</td>
        <td class="px-4 py-3">
          <span class="text-lg font-bold ${scoreColor}">${grade.score}/100</span>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${grade.teacherName || 'N/A'}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${date.toLocaleDateString('es-ES')}</td>
        <td class="px-4 py-3">
          <button onclick="editModalGrade('${grade.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-semibold mr-2">Editar</button>
          <button onclick="deleteModalGrade('${grade.id}')" class="text-red-600 hover:text-red-800 text-sm font-semibold">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Actualizar estadísticas del modal
function updateModalStats() {
  const total = currentModalGrades.length;
  const average = total > 0 ? (currentModalGrades.reduce((sum, g) => sum + g.score, 0) / total).toFixed(1) : 0;
  const uniqueGroups = new Set(currentModalGrades.map(g => g.groupId)).size;
  
  document.getElementById('modalTotalGrades').textContent = total;
  document.getElementById('modalAverageGrade').textContent = average;
  document.getElementById('modalGroupsCount').textContent = uniqueGroups;
}

// Agregar calificación
document.getElementById('addGradeBtn')?.addEventListener('click', async () => {
  const groupSelect = document.getElementById('modalGroupSelect');
  const unitName = document.getElementById('modalUnitName').value.trim();
  const score = parseInt(document.getElementById('modalScore').value);
  
  const errorDiv = document.getElementById('modalGradeError');
  const successDiv = document.getElementById('modalGradeSuccess');
  errorDiv.classList.add('hidden');
  successDiv.classList.add('hidden');
  
  // Validaciones
  if (!groupSelect.value) {
    errorDiv.textContent = 'Selecciona un grupo';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  if (!unitName) {
    errorDiv.textContent = 'Ingresa el nombre de la unidad';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  if (isNaN(score) || score < 0 || score > 100) {
    errorDiv.textContent = 'La calificación debe estar entre 0 y 100';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  const selectedOption = groupSelect.options[groupSelect.selectedIndex];
  const groupName = selectedOption.getAttribute('data-group-name');
  const teacherId = selectedOption.getAttribute('data-teacher-id');
  const teacherName = selectedOption.getAttribute('data-teacher-name');
  
  const btn = document.getElementById('addGradeBtn');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  
  try {
    await addDoc(collection(db, 'grades'), {
      studentId: currentModalStudentId,
      studentName: currentModalStudentName,
      groupId: groupSelect.value,
      groupName: groupName,
      teacherId: teacherId,
      teacherName: teacherName,
      unitName: unitName,
      score: score,
      maxScore: 100,
      createdAt: serverTimestamp(),
      lastModifiedBy: currentUserData?.uid || 'admin',
      lastModifiedByRole: 'Admin',
      lastModifiedAt: serverTimestamp()
    });
    
    successDiv.textContent = '✓ Calificación agregada correctamente';
    successDiv.classList.remove('hidden');
    
    // Limpiar formulario
    groupSelect.value = '';
    document.getElementById('modalUnitName').value = '';
    document.getElementById('modalScore').value = '';
    
    // Recargar tabla
    await loadStudentGrades();
    
  } catch (error) {
    console.error('Error agregando calificación:', error);
    errorDiv.textContent = 'Error al agregar la calificación';
    errorDiv.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Agregar';
  }
});

// Editar calificación del modal
window.editModalGrade = async function(gradeId) {
  const grade = currentModalGrades.find(g => g.id === gradeId);
  if (!grade) return;
  
  const newScore = prompt(`Editar calificación de "${grade.unitName}"\nCalificación actual: ${grade.score}\n\nNueva calificación (0-100):`, grade.score);
  
  if (newScore === null) return;
  
  const score = parseInt(newScore);
  if (isNaN(score) || score < 0 || score > 100) {
    alert('Calificación inválida. Debe estar entre 0 y 100');
    return;
  }
  
  try {
    await updateDoc(doc(db, 'grades', gradeId), {
      score: score,
      lastModifiedBy: currentUserData?.uid || 'admin',
      lastModifiedByRole: 'Admin',
      lastModifiedAt: serverTimestamp()
    });
    
    await loadStudentGrades();
    
    document.getElementById('modalGradeSuccess').textContent = '✓ Calificación actualizada';
    document.getElementById('modalGradeSuccess').classList.remove('hidden');
    
  } catch (error) {
    console.error('Error actualizando calificación:', error);
    alert('Error al actualizar la calificación');
  }
};

// Eliminar calificación del modal
window.deleteModalGrade = async function(gradeId) {
  if (!confirm('¿Eliminar esta calificación?')) return;
  
  try {
    await deleteDoc(doc(db, 'grades', gradeId));
    await loadStudentGrades();
    
    document.getElementById('modalGradeSuccess').textContent = '✓ Calificación eliminada';
    document.getElementById('modalGradeSuccess').classList.remove('hidden');
    
  } catch (error) {
    console.error('Error eliminando calificación:', error);
    alert('Error al eliminar la calificación');
  }
};