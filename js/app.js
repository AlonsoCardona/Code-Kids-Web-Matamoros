/**
 * ========================================
 * CODEKIDS - APLICACIÓN INTERNA
 * ========================================
 * 
 * ARQUITECTURA: Entorno Amurallado (Walled Garden)
 * - No existe registro público
 * - Solo Admins pueden crear usuarios
 * - Usuarios deben cambiar contraseña en primer login
 * - Estudiantes solo pueden chatear con Profesores
 * - Profesores moderan sus grupos
 * 
 * FILOSOFÍA UI/UX:
 * - Inspirado en Microsoft Teams (3 paneles)
 * - Gamificación (puntos, insignias, minijuegos)
 * - Visual y atractivo para 8-14 años
 * - Interacciones positivas y controladas
 */

// Lógica principal para app.html
import { auth, db, storage } from './firebase-config.js';
import { initAuth, logout, getCurrentUserData } from './auth.js';
import { 
  onSnapshot, collection, query, where, orderBy, limit, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc,
  increment, getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUserData = null;

// ====================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ====================================
initAuth((user, userData) => {
  currentUserData = userData;
  
  // SEGURIDAD: Verificar que NO sea Admin (ellos van a admin.html)
  if (userData.role === 'Admin') {
    window.location.href = 'admin.html';
    return;
  }
  
  setupUI();
  loadNotifications();
  setupNavigation();
  
  // Cargar vista inicial (Grupos)
  loadSection('groups');
});

// ====================================
// CONFIGURACIÓN DE LA UI
// ====================================
// Configura el avatar, nombre y opciones según el rol del usuario
function setupUI() {
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  
  // Avatar: Si no tiene foto, genera uno con iniciales
  if (currentUserData.photoURL) {
    userAvatar.src = currentUserData.photoURL;
  } else {
    userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserData.displayName)}&background=4f46e5&color=fff&size=128`;
  }
  
  userName.textContent = currentUserData.displayName;
  
  // CONTROL DE ACCESO: Mostrar/ocultar botones según rol
  if (currentUserData.role === 'Estudiante') {
    // Estudiantes ven: Tareas, Grupos, Lecciones, Laboratorio, Chats
    document.querySelector('[data-section="tasks"]').classList.remove('hidden');
    document.querySelector('[data-section="dashboard"]').classList.add('hidden');
  } else if (currentUserData.role === 'Profesor') {
    // Profesores ven: Grupos, Lecciones, Laboratorio, Chats, Panel de Control
    document.querySelector('[data-section="dashboard"]').classList.remove('hidden');
    document.querySelector('[data-section="tasks"]').classList.add('hidden');
  }
}

// ====================================
// SISTEMA DE NOTIFICACIONES EN TIEMPO REAL
// ====================================
// Lee notificaciones de la subcolección /users/{userId}/notifications
// Firestore Structure: { text, link, isRead, createdAt }
function loadNotifications() {
  const notifQuery = query(
    collection(db, `users/${currentUserData.id}/notifications`),
    where('isRead', '==', false),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  
  onSnapshot(notifQuery, (snapshot) => {
    const count = snapshot.size;
    const badge = document.getElementById('notificationBadge');
    
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });
}

// Configurar navegación
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-item');
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      
      // Actualizar estilos de navegación
      navButtons.forEach(b => {
        b.classList.remove('bg-indigo-50');
        b.querySelector('svg').classList.remove('text-indigo-600');
        b.querySelector('svg').classList.add('text-gray-600');
      });
      
      btn.classList.add('bg-indigo-50');
      btn.querySelector('svg').classList.remove('text-gray-600');
      btn.querySelector('svg').classList.add('text-indigo-600');
      
      loadSection(section);
    });
  });
  
  // Menú de perfil
  const profileButton = document.getElementById('profileButton');
  const profileMenu = document.getElementById('profileMenu');
  
  profileButton.addEventListener('click', () => {
    profileMenu.classList.toggle('hidden');
  });
  
  // Cerrar menú al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!profileButton.contains(e.target) && !profileMenu.contains(e.target)) {
      profileMenu.classList.add('hidden');
    }
  });
  
  // Botón de logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await logout();
  });
}

// Cargar sección
async function loadSection(section) {
  const appContent = document.getElementById('appContent');
  
  appContent.innerHTML = '<div class="flex items-center justify-center h-full"><div class="text-center"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div><p class="text-gray-600">Cargando...</p></div></div>';
  
  try {
    switch(section) {
      case 'groups':
        await loadGroupsSection();
        break;
      case 'lessons':
        await loadLessonsSection();
        break;
      case 'lab':
        await loadLabSection();
        break;
      case 'chats':
        await loadChatsSection();
        break;
      case 'tasks':
        await loadTasksSection();
        break;
      case 'dashboard':
        await loadDashboardSection();
        break;
      default:
        appContent.innerHTML = '<div class="p-8"><h2 class="text-2xl font-bold">Sección no encontrada</h2></div>';
    }
  } catch (error) {
    console.error('Error cargando sección:', error);
    appContent.innerHTML = `<div class="p-8 text-center"><h2 class="text-2xl font-bold text-red-600 mb-4">Error al cargar contenido</h2><p class="text-gray-600">${error.message}</p></div>`;
  }
}

// ====================================
// SECCIÓN: GRUPOS (Estilo Microsoft Teams)
// ====================================
// Layout: 3 Paneles
// 1. Lista de Grupos (izquierda)
// 2. Pestañas del Grupo (centro) - Publicaciones, Archivos, Tareas, Miembros, etc.
// 3. Contenido Seleccionado (derecha)
//
// Firestore Structure:
// - /groups/{groupId}
//   - name, description, ownerId, schoolId, joinCode, memberCount
//   - members: { userId: "Profesor" | "Estudiante" }
//   - settings: { allowStudentPosts, moderatePosts, allowStudentReactions, allowedReactions }
//   - Subcollections: posts, assignments
async function loadGroupsSection() {
  const appContent = document.getElementById('appContent');
  appContent.innerHTML = `
    <div class="flex h-full">
      <!-- Panel 1: Lista de Grupos -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-800 mb-4">📚 Mis Grupos</h2>
          ${currentUserData.role === 'Profesor' ? `
            <button id="createGroupBtn" class="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mb-2 font-semibold transition shadow-md hover:shadow-lg">
              ➕ Crear Grupo
            </button>
          ` : ''}
          <button id="joinGroupBtn" class="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold transition shadow-md hover:shadow-lg">
            🔗 Unirse a Grupo
          </button>
        </div>
        <div id="groupsList" class="flex-1 overflow-y-auto p-4">
          <p class="text-gray-500 text-center">Cargando grupos...</p>
        </div>
      </div>
      
      <!-- Panel 2: Contenido del Grupo -->
      <div id="groupContent" class="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div class="text-center text-gray-500">
          <svg class="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <p class="text-lg font-semibold">Selecciona un grupo</p>
          <p class="text-sm">O crea/únete a uno nuevo para comenzar</p>
        </div>
      </div>
    </div>
  `;
  
  // Event listeners para botones
  const createGroupBtn = document.getElementById('createGroupBtn');
  const joinGroupBtn = document.getElementById('joinGroupBtn');
  
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', showCreateGroupModal);
  }
  
  if (joinGroupBtn) {
    joinGroupBtn.addEventListener('click', showJoinGroupModal);
  }
  
  // Cargar grupos del usuario
  loadUserGroups();
}

// Cargar grupos del usuario (con onSnapshot para tiempo real)
async function loadUserGroups() {
  const groupsQuery = query(
    collection(db, 'groups'),
    where(`members.${currentUserData.id}`, 'in', ['Estudiante', 'Profesor'])
  );
  
  onSnapshot(groupsQuery, (snapshot) => {
    const groupsList = document.getElementById('groupsList');
    
    if (snapshot.empty) {
      groupsList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-2">No tienes grupos aún</p>
          <p class="text-sm text-gray-400">Únete a uno usando un código</p>
        </div>
      `;
      return;
    }
    
    groupsList.innerHTML = snapshot.docs.map(doc => {
      const group = doc.data();
      const isOwner = group.ownerId === currentUserData.id;
      return `
        <div class="group-item p-4 hover:bg-indigo-50 rounded-xl cursor-pointer border-2 border-gray-200 hover:border-indigo-400 mb-3 transition-all duration-200 shadow-sm hover:shadow-md" data-group-id="${doc.id}">
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-bold text-gray-800 flex-1">${group.name}</h3>
            ${isOwner ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">Dueño</span>' : ''}
          </div>
          <p class="text-sm text-gray-600 line-clamp-2 mb-2">${group.description || 'Sin descripción'}</p>
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>👥 ${group.memberCount || 0} miembros</span>
            <span class="font-mono bg-gray-100 px-2 py-1 rounded">📋 ${group.joinCode || ''}</span>
          </div>
        </div>
      `;
    }).join('');
    
    // Event listeners para grupos
    document.querySelectorAll('.group-item').forEach(item => {
      item.addEventListener('click', () => {
        const groupId = item.dataset.groupId;
        loadGroupDetails(groupId);
      });
    });
  });
}

// ====================================
// SECCIÓN: LECCIONES (Aprendizaje Progresivo)
// ====================================
// Layout: 2 Paneles
// 1. Temario (izquierda) - Árbol de Módulos y Lecciones con lógica de desbloqueo
// 2. Contenido (derecha) - Video, artículo, comentarios
//
// Firestore Structure:
// - /courses/{courseId}/modules/{moduleId}/lessons/{lessonId}
// - user.studentProfile.completedLessons: ["lesson_id_01_01", ...]
// - user.studentProfile.currentLessonRef: referencia a la lección actual
//
// Lógica de Desbloqueo:
// - ✔ Check Verde: Lección completada
// - ▶ Resaltado Azul: Lección actual
// - 🔒 Candado: Lección bloqueada (completar la anterior primero)
async function loadLessonsSection() {
  const appContent = document.getElementById('appContent');
  appContent.innerHTML = `
    <div class="flex h-full">
      <!-- Panel 1: Temario -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-800 mb-2">📚 Lecciones</h2>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Tu progreso</span>
            <span id="progressPercent" class="font-bold text-indigo-600">0%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div id="progressBar" class="bg-indigo-600 h-2 rounded-full transition-all" style="width: 0%"></div>
          </div>
        </div>
        <div id="lessonsList" class="flex-1 overflow-y-auto p-4">
          <p class="text-gray-500 text-center">Cargando lecciones...</p>
        </div>
      </div>
      
      <!-- Panel 2: Contenido de la Lección -->
      <div id="lessonContent" class="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 overflow-y-auto">
        <div class="text-center text-gray-500">
          <svg class="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
          <p class="text-lg font-semibold">Selecciona una lección</p>
          <p class="text-sm">Aprende a tu propio ritmo 🚀</p>
        </div>
      </div>
    </div>
  `;
  
  await loadLessonsTree();
}

/**
 * Carga el árbol de lecciones con lógica de desbloqueo progresivo
 * - ✅ Verde: Completada
 * - ▶️ Azul: Actual (desbloqueada, no completada)
 * - 🔒 Gris: Bloqueada (requiere completar anterior)
 */
async function loadLessonsTree() {
  const lessonsList = document.getElementById('lessonsList');
  
  try {
    // Obtener todas las lecciones del curso
    const lessonsQuery = query(
      collection(db, 'courses'),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(lessonsQuery);
    
    if (snapshot.empty) {
      lessonsList.innerHTML = `
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          <p class="font-semibold mb-2">📚 No hay lecciones disponibles</p>
          <p>Contacta a tu profesor para que asigne un curso.</p>
        </div>
      `;
      return;
    }
    
    // Obtener lecciones completadas del estudiante
    const completedLessons = currentUserData.studentProfile?.completedLessons || [];
    
    // Determinar cuál es la primera lección no completada (la actual)
    let currentLessonId = null;
    const lessons = [];
    snapshot.forEach(doc => {
      const lesson = { id: doc.id, ...doc.data() };
      lessons.push(lesson);
      
      if (!currentLessonId && !completedLessons.includes(doc.id)) {
        currentLessonId = doc.id;
      }
    });
    
    // Calcular progreso
    const progress = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0;
    document.getElementById('progressPercent').textContent = `${progress}%`;
    document.getElementById('progressBar').style.width = `${progress}%`;
    
    // Renderizar lecciones
    const lessonsHTML = lessons.map(lesson => {
      const isCompleted = completedLessons.includes(lesson.id);
      const isCurrent = lesson.id === currentLessonId;
      const isLocked = !isCompleted && !isCurrent;
      
      return `
        <div 
          class="mb-3 p-4 rounded-lg border-2 cursor-pointer transition ${
            isCompleted ? 'bg-green-50 border-green-300 hover:shadow-md' :
            isCurrent ? 'bg-blue-50 border-blue-400 hover:shadow-md' :
            'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
          }"
          onclick="${!isLocked ? `loadLessonContent('${lesson.id}')` : 'void(0)'}"
        >
          <div class="flex items-start space-x-3">
            <div class="text-2xl">
              ${isCompleted ? '✅' : isCurrent ? '▶️' : '�'}
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-gray-800 mb-1">${lesson.title}</h3>
              <p class="text-xs text-gray-600">${lesson.description || ''}</p>
              ${isCompleted ? `
                <div class="mt-2 flex items-center space-x-2 text-xs">
                  <span class="bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                    +${lesson.points || 50} puntos
                  </span>
                </div>
              ` : isCurrent ? `
                <div class="mt-2 text-xs text-blue-700 font-semibold">
                  📖 Disponible ahora
                </div>
              ` : `
                <div class="mt-2 text-xs text-gray-500">
                  Completa la lección anterior
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    lessonsList.innerHTML = lessonsHTML;
  } catch (error) {
    console.error('Error cargando lecciones:', error);
    lessonsList.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        <p class="font-semibold mb-2">❌ Error cargando lecciones</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/**
 * Muestra el contenido completo de una lección
 * Incluye: video, artículo, y botón de completar
 */
window.loadLessonContent = async function(lessonId) {
  const lessonContent = document.getElementById('lessonContent');
  
  try {
    const lessonDoc = await getDoc(doc(db, 'courses', lessonId));
    
    if (!lessonDoc.exists()) {
      showNotification('❌ Lección no encontrada', 'error');
      return;
    }
    
    const lesson = lessonDoc.data();
    const isCompleted = currentUserData.studentProfile?.completedLessons?.includes(lessonId) || false;
    
    lessonContent.innerHTML = `
      <div class="w-full max-w-4xl p-8">
        <!-- Header -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-800 mb-2">${lesson.title}</h1>
              <p class="text-gray-600">${lesson.description || ''}</p>
            </div>
            ${isCompleted ? `
              <span class="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm">
                ✅ Completada
              </span>
            ` : ''}
          </div>
        </div>
        
        <!-- Video (si existe) -->
        ${lesson.videoUrl ? `
          <div class="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
            <div class="aspect-video bg-gray-900">
              <iframe 
                src="${lesson.videoUrl}" 
                class="w-full h-full"
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
              </iframe>
            </div>
          </div>
        ` : ''}
        
        <!-- Contenido del artículo -->
        <div class="bg-white rounded-xl shadow-lg p-8 mb-6 prose prose-lg max-w-none">
          ${lesson.content ? `
            <div class="text-gray-700 leading-relaxed">
              ${lesson.content}
            </div>
          ` : `
            <div class="text-center py-12 text-gray-400">
              <p>Esta lección no tiene contenido de texto aún.</p>
            </div>
          `}
        </div>
        
        <!-- Botón de completar -->
        ${!isCompleted ? `
          <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-xl p-6 text-center text-white">
            <h3 class="text-xl font-bold mb-2">🎯 ¿Completaste esta lección?</h3>
            <p class="mb-4 opacity-90">Ganarás <strong>${lesson.points || 50} puntos</strong> y desbloquearás la siguiente lección</p>
            <button 
              onclick="completeLesson('${lessonId}', ${lesson.points || 50})" 
              class="bg-white text-indigo-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg">
              ✓ Completar y Continuar
            </button>
          </div>
        ` : `
          <div class="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center">
            <p class="text-green-700 font-semibold text-lg">
              ✅ Ya completaste esta lección y ganaste ${lesson.points || 50} puntos
            </p>
          </div>
        `}
      </div>
    `;
  } catch (error) {
    console.error('Error cargando contenido de lección:', error);
    showNotification('❌ Error al cargar la lección', 'error');
  }
}

/**
 * Marca una lección como completada
 * - Agrega la lección al array de completedLessons del estudiante
 * - Suma los puntos ganados
 * - Verifica si se deben otorgar insignias
 */
window.completeLesson = async function(lessonId, points) {
  if (!confirm(`¿Estás seguro de que completaste esta lección?\n\nGanarás ${points} puntos y se desbloqueará la siguiente lección.`)) {
    return;
  }
  
  try {
    const userRef = doc(db, 'users', currentUserData.id);
    
    // Actualizar perfil del estudiante
    await updateDoc(userRef, {
      'studentProfile.completedLessons': [...(currentUserData.studentProfile?.completedLessons || []), lessonId],
      'studentProfile.totalPoints': increment(points)
    });
    
    // Actualizar datos locales
    currentUserData.studentProfile = currentUserData.studentProfile || {};
    currentUserData.studentProfile.completedLessons = [...(currentUserData.studentProfile.completedLessons || []), lessonId];
    currentUserData.studentProfile.totalPoints = (currentUserData.studentProfile.totalPoints || 0) + points;
    
    showNotification(`🎉 ¡Felicidades! Ganaste ${points} puntos`, 'success');
    
    // Verificar insignias automáticas
    await checkAndAwardBadges();
    
    // Recargar árbol de lecciones y contenido
    await loadLessonsTree();
    await loadLessonContent(lessonId);
  } catch (error) {
    console.error('Error completando lección:', error);
    showNotification('❌ Error al completar la lección', 'error');
  }
}

/**
 * Verifica y otorga insignias automáticas basadas en logros
 * Ejemplos:
 * - Primera lección completada
 * - 100 puntos alcanzados
 * - 10 lecciones completadas
 */
async function checkAndAwardBadges() {
  try {
    const completedLessons = currentUserData.studentProfile?.completedLessons || [];
    const totalPoints = currentUserData.studentProfile?.totalPoints || 0;
    const earnedBadges = currentUserData.studentProfile?.badges || [];
    
    const badgesToAward = [];
    
    // Insignia: Primera Lección
    if (completedLessons.length === 1 && !earnedBadges.includes('first-lesson')) {
      badgesToAward.push({
        id: 'first-lesson',
        name: '🌟 Primera Lección',
        description: 'Completaste tu primera lección'
      });
    }
    
    // Insignia: 100 Puntos
    if (totalPoints >= 100 && !earnedBadges.includes('points-100')) {
      badgesToAward.push({
        id: 'points-100',
        name: '💯 Centenario',
        description: 'Alcanzaste 100 puntos'
      });
    }
    
    // Insignia: 10 Lecciones
    if (completedLessons.length >= 10 && !earnedBadges.includes('lessons-10')) {
      badgesToAward.push({
        id: 'lessons-10',
        name: '📚 Estudiante Dedicado',
        description: 'Completaste 10 lecciones'
      });
    }
    
    // Otorgar insignias nuevas
    if (badgesToAward.length > 0) {
      const userRef = doc(db, 'users', currentUserData.id);
      const newBadgeIds = badgesToAward.map(b => b.id);
      
      await updateDoc(userRef, {
        'studentProfile.badges': [...earnedBadges, ...newBadgeIds]
      });
      
      currentUserData.studentProfile.badges = [...earnedBadges, ...newBadgeIds];
      
      // Mostrar notificación especial
      badgesToAward.forEach(badge => {
        setTimeout(() => {
          showNotification(`🏆 ¡Nueva insignia! ${badge.name}`, 'success');
        }, 500);
      });
    }
  } catch (error) {
    console.error('Error verificando insignias:', error);
  }
}

// ====================================
// SECCIÓN: LABORATORIO (Minijuegos)
// ====================================
// Grid de tarjetas de juegos con lógica de candado
// - Los minijuegos se desbloquean al completar lecciones específicas
// - Cada juego tiene su propio leaderboard
//
// Firestore Structure:
// - /labGames/{gameId}
//   - title, description, icon, gameUrl, unlocksOnLesson
//   - highScoreLeaderboard: [{ userId, displayName, score }]
//
// Comunicación Iframe <-> App:
// - El juego envía: window.parent.postMessage({ type: 'gameEvent', event: 'levelComplete', score: 100 }, '*')
// - La app escucha y actualiza user.studentProfile.gameScores
async function loadLabSection() {
  const appContent = document.getElementById('appContent');
  appContent.innerHTML = `
    <div class="p-8 bg-gradient-to-br from-purple-50 to-pink-50 h-full overflow-y-auto">
      <div class="max-w-6xl mx-auto">
        <div class="mb-8">
          <h2 class="text-4xl font-bold text-gray-800 mb-2">🎮 Laboratorio de Minijuegos</h2>
          <p class="text-gray-600">¡Aprende jugando! Desbloquea minijuegos completando lecciones.</p>
        </div>
        
        ${currentUserData.role === 'Estudiante' && currentUserData.studentProfile ? `
          <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div class="grid grid-cols-3 gap-6">
              <div class="text-center">
                <p class="text-sm text-gray-600 font-semibold">Puntos Totales</p>
                <p class="text-3xl font-bold text-indigo-600">${currentUserData.studentProfile.totalPoints || 0} pts</p>
              </div>
              <div class="text-center">
                <p class="text-sm text-gray-600 font-semibold">Lecciones Completadas</p>
                <p class="text-3xl font-bold text-green-600">${(currentUserData.studentProfile.completedLessons || []).length}</p>
              </div>
              <div class="text-center">
                <p class="text-sm text-gray-600 font-semibold">Mejor Puntaje</p>
                <p class="text-3xl font-bold text-purple-600">${currentUserData.studentProfile.highestGameScore || 0}</p>
              </div>
            </div>
          </div>
        ` : ''}
        
        <div id="gamesList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <p class="text-gray-500 text-center col-span-full">Cargando minijuegos...</p>
        </div>
      </div>
    </div>
  `;
  
  await loadGamesList();
}

/**
 * Carga la lista de minijuegos desde Firestore
 * Los juegos se desbloquean basándose en lecciones completadas
 */
async function loadGamesList() {
  const gamesList = document.getElementById('gamesList');
  
  try {
    const gamesQuery = query(
      collection(db, 'labGames'),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(gamesQuery);
    
    if (snapshot.empty) {
      gamesList.innerHTML = `
        <div class="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-6 text-center text-blue-800">
          <p class="font-semibold mb-2">🎮 No hay minijuegos disponibles</p>
          <p>Los administradores agregarán juegos próximamente.</p>
        </div>
      `;
      return;
    }
    
    const completedLessons = currentUserData.studentProfile?.completedLessons || [];
    
    const gamesHTML = [];
    snapshot.forEach(gameDoc => {
      const game = gameDoc.data();
      const isUnlocked = !game.unlocksOnLesson || completedLessons.includes(game.unlocksOnLesson);
      
      // Obtener mejor puntaje del estudiante en este juego
      const gameScores = currentUserData.studentProfile?.gameScores || {};
      const highScore = gameScores[gameDoc.id] || 0;
      
      gamesHTML.push(`
        <div class="bg-white rounded-xl shadow-lg overflow-hidden transition hover:shadow-2xl ${!isUnlocked ? 'opacity-60' : ''}">
          <!-- Imagen o icono del juego -->
          <div class="h-40 bg-gradient-to-br ${
            isUnlocked ? 'from-purple-400 to-pink-500' : 'from-gray-300 to-gray-400'
          } flex items-center justify-center">
            <div class="text-6xl">${isUnlocked ? game.icon || '🎮' : '🔒'}</div>
          </div>
          
          <!-- Info del juego -->
          <div class="p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-2">${game.title}</h3>
            <p class="text-sm text-gray-600 mb-4">${game.description || ''}</p>
            
            ${isUnlocked ? `
              <div class="flex items-center justify-between mb-4 text-sm">
                <span class="text-gray-600">Tu mejor: <strong class="text-purple-600">${highScore} pts</strong></span>
              </div>
              <button 
                onclick="launchGame('${gameDoc.id}', '${game.gameUrl}')" 
                class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition shadow-md hover:shadow-lg"
              >
                🚀 Jugar Ahora
              </button>
            ` : `
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center text-sm text-yellow-800">
                <p class="font-semibold">🔒 Bloqueado</p>
                <p class="text-xs mt-1">Completa la lección "${game.unlocksOnLessonTitle || 'requerida'}" para desbloquear</p>
              </div>
            `}
          </div>
        </div>
      `);
    });
    
    gamesList.innerHTML = gamesHTML.join('');
  } catch (error) {
    console.error('Error cargando minijuegos:', error);
    gamesList.innerHTML = `
      <div class="col-span-full bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-800">
        <p class="font-semibold mb-2">❌ Error cargando minijuegos</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/**
 * Lanza un minijuego en modal con iframe
 * Implementa comunicación postMessage para recibir puntajes
 */
window.launchGame = function(gameId, gameUrl) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="w-full h-full max-w-7xl max-h-[90vh] flex flex-col p-4">
      <!-- Header del juego -->
      <div class="bg-white rounded-t-xl p-4 flex items-center justify-between">
        <h3 class="text-xl font-bold text-gray-800">🎮 Minijuego</h3>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-600">Puntaje: <strong id="currentScore" class="text-purple-600">0</strong></span>
          <button onclick="closeGame('${gameId}')" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold">
            ✕ Cerrar
          </button>
        </div>
      </div>
      
      <!-- Iframe del juego -->
      <div class="flex-1 bg-white rounded-b-xl overflow-hidden">
        <iframe 
          id="gameIframe" 
          src="${gameUrl}" 
          class="w-full h-full border-0"
          allow="fullscreen; accelerometer; gyroscope"
        ></iframe>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Configurar comunicación postMessage
  window.currentGameId = gameId;
  window.currentGameScore = 0;
  
  window.addEventListener('message', handleGameMessage);
}

/**
 * Maneja mensajes postMessage del iframe del juego
 * Protocolo esperado:
 * { type: 'score', value: number } - Actualizar puntaje
 * { type: 'complete', score: number } - Juego completado
 */
function handleGameMessage(event) {
  // SEGURIDAD: Verificar origen si es necesario
  // if (event.origin !== 'https://tudominio.com') return;
  
  const data = event.data;
  
  if (data.type === 'score') {
    // Actualizar puntaje en tiempo real
    window.currentGameScore = data.value;
    const scoreDisplay = document.getElementById('currentScore');
    if (scoreDisplay) {
      scoreDisplay.textContent = data.value;
    }
  } else if (data.type === 'complete') {
    // Juego completado
    const finalScore = data.score || window.currentGameScore;
    saveGameScore(window.currentGameId, finalScore);
  } else if (data.type === 'ready') {
    // El juego está listo, enviar info del usuario
    const iframe = document.getElementById('gameIframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'userInfo',
        userId: currentUserData.id,
        displayName: currentUserData.displayName
      }, '*');
    }
  }
}

/**
 * Cierra el juego y guarda el puntaje final
 */
window.closeGame = function(gameId) {
  const finalScore = window.currentGameScore || 0;
  
  if (finalScore > 0) {
    saveGameScore(gameId, finalScore);
  }
  
  // Limpiar
  window.removeEventListener('message', handleGameMessage);
  window.currentGameId = null;
  window.currentGameScore = 0;
  
  // Cerrar modal
  const modal = document.querySelector('.fixed.inset-0');
  if (modal) modal.remove();
}

/**
 * Guarda el puntaje del juego si es mayor que el anterior
 */
async function saveGameScore(gameId, score) {
  try {
    const gameScores = currentUserData.studentProfile?.gameScores || {};
    const previousHighScore = gameScores[gameId] || 0;
    
    if (score > previousHighScore) {
      // Actualizar puntaje en Firestore
      await updateDoc(doc(db, 'users', currentUserData.id), {
        [`studentProfile.gameScores.${gameId}`]: score,
        'studentProfile.highestGameScore': Math.max(
          currentUserData.studentProfile?.highestGameScore || 0,
          score
        )
      });
      
      // Actualizar datos locales
      currentUserData.studentProfile = currentUserData.studentProfile || {};
      currentUserData.studentProfile.gameScores = gameScores;
      currentUserData.studentProfile.gameScores[gameId] = score;
      currentUserData.studentProfile.highestGameScore = Math.max(
        currentUserData.studentProfile.highestGameScore || 0,
        score
      );
      
      showNotification(`🎉 ¡Nuevo récord! ${score} puntos`, 'success');
      
      // Verificar si se desbloquean insignias
      await checkAndAwardBadges();
    } else {
      showNotification(`Tu puntaje: ${score} pts (Récord: ${previousHighScore} pts)`, 'info');
    }
  } catch (error) {
    console.error('Error guardando puntaje:', error);
    showNotification('❌ Error al guardar puntaje', 'error');
  }
}

// ====================================
// SECCIÓN: CHATS (Seguros y Controlados)
// ====================================
// Layout: 2 Paneles
// 1. Lista de Contactos (izquierda)
// 2. Ventana de Chat (derecha)
//
// SEGURIDAD CRÍTICA:
// - Estudiantes SOLO pueden ver y chatear con Profesores de su escuela
// - Profesores pueden chatear con Estudiantes y otros Profesores de su escuela
// - NO es posible chatear entre Estudiantes
//
// Firestore Structure:
// - /chats/{chatId} (chatId = combinación alfabética de los dos userId)
//   - members: ["userId1", "userId2"]
//   - lastMessage, lastMessageAt, lastMessageSenderId
//   - memberReadStatus: { userId1: true, userId2: false }
// - /chats/{chatId}/messages/{messageId}
//   - senderId, createdAt, type: "text" | "image"
//   - textContent (si es texto)
//   - imageUrl, imageMetadata (si es imagen)
async function loadChatsSection() {
  const appContent = document.getElementById('appContent');
  appContent.innerHTML = `
    <div class="flex h-full">
      <!-- Panel 1: Contactos -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-800 mb-2">💬 Chats</h2>
          <p class="text-sm text-gray-600">
            ${currentUserData.role === 'Estudiante' ? 'Solo puedes chatear con profesores' : 'Chatea con tu equipo'}
          </p>
        </div>
        <div id="contactsList" class="flex-1 overflow-y-auto p-4">
          <p class="text-gray-500 text-center">Cargando contactos...</p>
        </div>
      </div>
      
      <!-- Panel 2: Ventana de Chat -->
      <div id="chatWindow" class="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div class="text-center text-gray-500">
          <svg class="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <p class="text-lg font-semibold">Selecciona un contacto</p>
          <p class="text-sm">Para iniciar una conversación</p>
        </div>
      </div>
    </div>
  `;
  
  await loadContactsList();
}

/**
 * Carga la lista de contactos según el rol del usuario
 * - Estudiantes: Solo ven a sus profesores
 * - Profesores: Ven a todos los estudiantes de sus grupos
 */
async function loadContactsList() {
  const contactsList = document.getElementById('contactsList');
  
  try {
    let contacts = [];
    
    if (currentUserData.role === 'Estudiante') {
      // Obtener profesores de los grupos del estudiante
      const groupsQuery = query(
        collection(db, 'groups'),
        where(`members.${currentUserData.id}`, '!=', null)
      );
      
      const groupsSnapshot = await getDocs(groupsQuery);
      const teacherIds = new Set();
      
      groupsSnapshot.forEach(groupDoc => {
        const group = groupDoc.data();
        Object.entries(group.members).forEach(([userId, memberData]) => {
          if (memberData.role === 'teacher') {
            teacherIds.add(userId);
          }
        });
      });
      
      // Obtener datos de los profesores
      for (const teacherId of teacherIds) {
        const teacherDoc = await getDoc(doc(db, 'users', teacherId));
        if (teacherDoc.exists()) {
          contacts.push({ id: teacherId, ...teacherDoc.data() });
        }
      }
    } else if (currentUserData.role === 'Profesor') {
      // Obtener estudiantes de los grupos del profesor
      const groupsQuery = query(
        collection(db, 'groups'),
        where(`members.${currentUserData.id}`, '!=', null)
      );
      
      const groupsSnapshot = await getDocs(groupsQuery);
      const studentIds = new Set();
      
      groupsSnapshot.forEach(groupDoc => {
        const group = groupDoc.data();
        Object.entries(group.members).forEach(([userId, memberData]) => {
          if (memberData.role === 'student') {
            studentIds.add(userId);
          }
        });
      });
      
      // Obtener datos de los estudiantes
      for (const studentId of studentIds) {
        const studentDoc = await getDoc(doc(db, 'users', studentId));
        if (studentDoc.exists()) {
          contacts.push({ id: studentId, ...studentDoc.data() });
        }
      }
    }
    
    if (contacts.length === 0) {
      contactsList.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p class="font-semibold mb-2">👥 No hay contactos</p>
          <p>${currentUserData.role === 'Estudiante' ? 'Únete a un grupo para chatear con profesores' : 'Aún no tienes estudiantes en tus grupos'}</p>
        </div>
      `;
      return;
    }
    
    // Ordenar alfabéticamente
    contacts.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    const contactsHTML = contacts.map(contact => `
      <div 
        onclick="openChat('${contact.id}')" 
        class="flex items-center space-x-3 p-3 rounded-lg hover:bg-indigo-50 cursor-pointer transition border border-transparent hover:border-indigo-200 mb-2"
      >
        <img 
          src="${contact.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.displayName)}&background=6366f1&color=fff`}" 
          class="w-12 h-12 rounded-full border-2 border-indigo-200"
        >
        <div class="flex-1">
          <p class="font-semibold text-gray-800">${contact.displayName}</p>
          <p class="text-xs text-gray-500">${contact.role === 'Profesor' ? '👨‍🏫 Profesor' : '👨‍🎓 Estudiante'}</p>
        </div>
      </div>
    `).join('');
    
    contactsList.innerHTML = contactsHTML;
  } catch (error) {
    console.error('Error cargando contactos:', error);
    contactsList.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        <p class="font-semibold mb-2">❌ Error cargando contactos</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/**
 * Abre la ventana de chat con un contacto específico
 * chatId se genera alfabéticamente combinando los dos userIds para garantizar consistencia
 */
window.openChat = async function(contactId) {
  const chatWindow = document.getElementById('chatWindow');
  
  try {
    // Obtener datos del contacto
    const contactDoc = await getDoc(doc(db, 'users', contactId));
    if (!contactDoc.exists()) {
      showNotification('❌ Contacto no encontrado', 'error');
      return;
    }
    
    const contact = contactDoc.data();
    
    // Generar chatId (alfabéticamente)
    const chatId = [currentUserData.id, contactId].sort().join('_');
    
    chatWindow.innerHTML = `
      <div class="flex flex-col h-full w-full">
        <!-- Header del chat -->
        <div class="bg-white border-b border-gray-200 p-4 flex items-center space-x-3 shadow-sm">
          <img 
            src="${contact.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.displayName)}&background=6366f1&color=fff`}" 
            class="w-10 h-10 rounded-full border-2 border-indigo-200"
          >
          <div class="flex-1">
            <h3 class="font-bold text-gray-800">${contact.displayName}</h3>
            <p class="text-xs text-gray-500">${contact.role === 'Profesor' ? '👨‍🏫 Profesor' : '👨‍🎓 Estudiante'}</p>
          </div>
        </div>
        
        <!-- Mensajes -->
        <div id="messagesList" class="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-blue-50 to-purple-50">
          <div class="text-center py-8 text-gray-400">
            <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Cargando mensajes...</p>
          </div>
        </div>
        
        <!-- Input de mensaje -->
        <div class="bg-white border-t border-gray-200 p-4">
          <div class="flex space-x-2">
            <button onclick="showEmojiPicker()" class="text-2xl hover:scale-110 transition">�</button>
            <textarea 
              id="messageInput" 
              rows="1" 
              placeholder="Escribe un mensaje..."
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage('${chatId}','${contactId}');}"
            ></textarea>
            <button 
              onclick="sendMessage('${chatId}','${contactId}')" 
              class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold transition"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Cargar mensajes en tiempo real
    loadChatMessages(chatId);
  } catch (error) {
    console.error('Error abriendo chat:', error);
    showNotification('❌ Error al abrir el chat', 'error');
  }
}

/**
 * Carga mensajes del chat en tiempo real
 */
function loadChatMessages(chatId) {
  const messagesList = document.getElementById('messagesList');
  
  const messagesQuery = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  
  onSnapshot(messagesQuery, (snapshot) => {
    if (snapshot.empty) {
      messagesList.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <p class="font-semibold">No hay mensajes aún</p>
          <p class="text-sm">¡Envía el primer mensaje!</p>
        </div>
      `;
      return;
    }
    
    const messagesHTML = [];
    snapshot.forEach(msgDoc => {
      const msg = msgDoc.data();
      const isMine = msg.senderId === currentUserData.id;
      const time = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
      
      messagesHTML.push(`
        <div class="mb-4 flex ${isMine ? 'justify-end' : 'justify-start'}">
          <div class="max-w-md">
            ${msg.type === 'text' ? `
              <div class="${isMine ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'} rounded-2xl px-4 py-2 shadow-sm">
                <p class="whitespace-pre-wrap">${msg.content}</p>
              </div>
            ` : msg.type === 'image' ? `
              <div class="bg-white rounded-2xl overflow-hidden shadow-md">
                <img src="${msg.imageUrl}" class="max-w-xs">
              </div>
            ` : ''}
            <p class="text-xs text-gray-400 mt-1 ${isMine ? 'text-right' : 'text-left'}">${time}</p>
          </div>
        </div>
      `);
    });
    
    messagesList.innerHTML = messagesHTML.join('');
    
    // Scroll al final
    messagesList.scrollTop = messagesList.scrollHeight;
  });
}

/**
 * Envía un mensaje de texto
 */
window.sendMessage = async function(chatId, recipientId) {
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  
  if (!content) return;
  
  try {
    // Crear documento de chat si no existe
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      await addDoc(collection(db, 'chats'), {
        participants: [currentUserData.id, recipientId],
        lastMessage: content,
        lastMessageAt: serverTimestamp()
      });
    }
    
    // Agregar mensaje
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: currentUserData.id,
      recipientId: recipientId,
      type: 'text',
      content: content,
      createdAt: serverTimestamp()
    });
    
    // Actualizar último mensaje del chat
    await updateDoc(chatRef, {
      lastMessage: content,
      lastMessageAt: serverTimestamp()
    });
    
    input.value = '';
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    showNotification('❌ Error al enviar mensaje', 'error');
  }
}

/**
 * Mostrar picker de emojis (placeholder)
 */
window.showEmojiPicker = function() {
  showNotification('😊 Selector de emojis próximamente', 'info');
}

// ====================================
// SECCIÓN: TAREAS (Solo Estudiantes)
// ====================================
// Vista consolidada de todas las tareas del estudiante en todos sus grupos
// Con filtros por estado (pendiente, entregada, calificada) y fecha límite
async function loadTasksSection() {
  const appContent = document.getElementById('appContent');
  appContent.innerHTML = `
    <div class="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 h-full overflow-y-auto">
      <div class="max-w-6xl mx-auto">
        <div class="mb-8">
          <h2 class="text-4xl font-bold text-gray-800 mb-2">📝 Mis Tareas</h2>
          <p class="text-gray-600">Organiza y completa tus tareas a tiempo</p>
        </div>
        
        <div id="tasksList">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center text-yellow-800">
            <p class="font-semibold mb-2">🚧 Tareas en Construcción</p>
            <p>Sistema de tareas próximamente.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ====================================
// SECCIÓN: PANEL DE PROFESOR
// ====================================
// Dashboard con estadísticas, gestión de alumnos, calificaciones
// Solo visible para Profesores
async function loadDashboardSection() {
  const appContent = document.getElementById('appContent');
  appContent.innerHTML = `
    <div class="p-8 bg-gradient-to-br from-orange-50 to-red-50 h-full overflow-y-auto">
      <div class="max-w-6xl mx-auto">
        <div class="mb-8">
          <h2 class="text-4xl font-bold text-gray-800 mb-2">📊 Panel de Profesor</h2>
          <p class="text-gray-600">Gestiona tus grupos y alumnos</p>
        </div>
        
        <div id="dashboardContent">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center text-yellow-800">
            <p class="font-semibold mb-2">🚧 Panel en Construcción</p>
            <p>Dashboard de profesor próximamente.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ====================================
// LÓGICA COMPLETA DE GRUPOS
// ====================================

let currentGroupId = null;
let currentGroupData = null;

// Cargar detalles del grupo con pestañas
async function loadGroupDetails(groupId) {
  currentGroupId = groupId;
  
  // Obtener datos del grupo
  const groupDoc = await getDoc(doc(db, 'groups', groupId));
  if (!groupDoc.exists()) {
    showNotification('❌ Grupo no encontrado', 'error');
    return;
  }
  
  currentGroupData = { id: groupId, ...groupDoc.data() };
  const isOwner = currentGroupData.ownerId === currentUserData.id;
  const isProfesor = currentUserData.role === 'Profesor';
  
  const groupContent = document.getElementById('groupContent');
  groupContent.innerHTML = `
    <div class="w-full h-full flex flex-col bg-white">
      <!-- Header del Grupo -->
      <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <h2 class="text-2xl font-bold text-gray-800 mb-2">${currentGroupData.name}</h2>
        <p class="text-gray-600 mb-3">${currentGroupData.description || 'Sin descripción'}</p>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4 text-sm text-gray-600">
            <span>👥 ${currentGroupData.memberCount || 0} miembros</span>
            <span>📋 Código: <code class="bg-white px-2 py-1 rounded font-mono font-semibold">${currentGroupData.joinCode || 'N/A'}</code></span>
          </div>
          ${isOwner ? '<span class="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">Dueño</span>' : ''}
        </div>
      </div>
      
      <!-- Pestañas -->
      <div class="flex border-b border-gray-200 bg-gray-50 px-6">
        <button data-tab="posts" class="group-tab px-4 py-3 border-b-2 border-indigo-600 text-indigo-600 font-semibold transition">
          💬 Publicaciones
        </button>
        <button data-tab="assignments" class="group-tab px-4 py-3 border-b-2 border-transparent text-gray-600 hover:text-gray-800 transition">
          📝 Tareas
        </button>
        ${isProfesor ? `
          <button data-tab="grades" class="group-tab px-4 py-3 border-b-2 border-transparent text-gray-600 hover:text-gray-800 transition">
            📊 Calificaciones
          </button>
        ` : ''}
        <button data-tab="members" class="group-tab px-4 py-3 border-b-2 border-transparent text-gray-600 hover:text-gray-800 transition">
          👥 Miembros
        </button>
      </div>
      
      <!-- Contenido de las pestañas -->
      <div id="groupTabContent" class="flex-1 overflow-y-auto p-6">
        <p class="text-gray-500 text-center">Cargando...</p>
      </div>
    </div>
  `;
  
  // Event listeners para pestañas
  document.querySelectorAll('.group-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Actualizar estilos
      document.querySelectorAll('.group-tab').forEach(t => {
        t.classList.remove('border-indigo-600', 'text-indigo-600');
        t.classList.add('border-transparent', 'text-gray-600');
      });
      tab.classList.remove('border-transparent', 'text-gray-600');
      tab.classList.add('border-indigo-600', 'text-indigo-600');
      
      // Cargar contenido
      const tabName = tab.dataset.tab;
      loadGroupTab(tabName);
    });
  });
  
  // Cargar primera pestaña
  loadGroupTab('posts');
}

// Cargar contenido de pestaña
async function loadGroupTab(tabName) {
  const tabContent = document.getElementById('groupTabContent');
  
  switch(tabName) {
    case 'posts':
      await loadGroupPosts();
      break;
    case 'assignments':
      await loadGroupAssignments();
      break;
    case 'grades':
      await loadGroupGrades();
      break;
    case 'members':
      await loadGroupMembers();
      break;
  }
}

// Cargar publicaciones del grupo
async function loadGroupPosts() {
  const tabContent = document.getElementById('groupTabContent');
  const canPost = currentGroupData.settings?.allowStudentPosts || currentUserData.role === 'Profesor';
  
  tabContent.innerHTML = `
    ${canPost ? `
      <div class="mb-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <textarea 
          id="newPostContent" 
          placeholder="Escribe una publicación..." 
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          rows="3"
        ></textarea>
        <div class="flex justify-end mt-3">
          <button id="createPostBtn" class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold transition shadow-md hover:shadow-lg">
            📤 Publicar
          </button>
        </div>
      </div>
    ` : ''}
    
    <div id="postsList">
      <div class="text-center text-gray-500">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
        <p>Cargando publicaciones...</p>
      </div>
    </div>
  `;
  
  if (canPost) {
    document.getElementById('createPostBtn').addEventListener('click', createPost);
  }
  
  // Cargar posts en tiempo real
  const postsQuery = query(
    collection(db, 'groups', currentGroupId, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  onSnapshot(postsQuery, async (snapshot) => {
    const postsList = document.getElementById('postsList');
    
    if (snapshot.empty) {
      postsList.innerHTML = `
        <div class="text-center py-12">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <p class="text-gray-500 font-semibold">No hay publicaciones aún</p>
          <p class="text-sm text-gray-400">¡Sé el primero en publicar!</p>
        </div>
      `;
      return;
    }
    
    const postsHTML = [];
    for (const docSnap of snapshot.docs) {
      const post = docSnap.data();
      const authorDoc = await getDoc(doc(db, 'users', post.authorId));
      const author = authorDoc.exists() ? authorDoc.data() : { displayName: 'Usuario desconocido' };
      
      postsHTML.push(`
        <div class="bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm hover:shadow-md transition">
          <!-- Autor y fecha -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <img src="${author.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.displayName)}&background=4f46e5&color=fff`}" 
                   class="w-10 h-10 rounded-full border-2 border-indigo-200">
              <div>
                <p class="font-semibold text-gray-800">${author.displayName}</p>
                <p class="text-xs text-gray-500">${post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString('es-MX') : 'Ahora'}</p>
              </div>
            </div>
            ${post.isPinned ? '<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">📌 Fijado</span>' : ''}
          </div>
          
          <!-- Contenido -->
          ${post.title ? `<h3 class="text-lg font-bold text-gray-800 mb-2">${post.title}</h3>` : ''}
          <p class="text-gray-700 whitespace-pre-wrap">${post.content}</p>
          
          <!-- Reacciones y respuestas -->
          <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2" id="reactions-${docSnap.id}">
                ${renderReactions(post.reactions || {}, docSnap.id)}
              </div>
              <button onclick="loadPostReplies('${docSnap.id}')" class="text-sm text-gray-600 hover:text-indigo-600 font-semibold transition">
                💬 ${post.replyCount || 0} respuestas
              </button>
            </div>
            ${post.authorId === currentUserData.id || currentUserData.role === 'Profesor' ? `
              <button onclick="deletePost('${docSnap.id}')" class="text-sm text-red-600 hover:text-red-700 font-semibold">
                🗑️ Eliminar
              </button>
            ` : ''}
          </div>
        </div>
      `);
    }
    
    postsList.innerHTML = postsHTML.join('');
  });
}

// Renderizar reacciones
function renderReactions(reactions, postId) {
  const allowedReactions = currentGroupData.settings?.allowedReactions || ['👍', '💡', '🎉', '❤️', '🤔'];
  let html = '';
  
  // Mostrar reacciones existentes
  for (const [emoji, users] of Object.entries(reactions)) {
    const count = users.length;
    const hasReacted = users.includes(currentUserData.id);
    html += `
      <button 
        onclick="toggleReaction('${postId}', '${emoji}')" 
        class="px-2 py-1 rounded-full text-sm font-semibold transition ${hasReacted ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
      >
        ${emoji} ${count}
      </button>
    `;
  }
  
  // Botón para agregar reacción
  if (currentGroupData.settings?.allowStudentReactions !== false) {
    html += `
      <div class="relative inline-block">
        <button onclick="showReactionPicker('${postId}')" class="px-2 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-semibold transition">
          ➕
        </button>
        <div id="picker-${postId}" class="hidden absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 flex space-x-1 z-10">
          ${allowedReactions.map(emoji => `
            <button onclick="toggleReaction('${postId}', '${emoji}')" class="hover:bg-gray-100 rounded p-1 text-xl transition">
              ${emoji}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  return html;
}

// Crear publicación
async function createPost() {
  const content = document.getElementById('newPostContent').value.trim();
  if (!content) {
    showNotification('⚠️ Escribe algo antes de publicar', 'warning');
    return;
  }
  
  try {
    await addDoc(collection(db, 'groups', currentGroupId, 'posts'), {
      title: null,
      content: content,
      authorId: currentUserData.id,
      createdAt: serverTimestamp(),
      isPinned: false,
      isResolved: false,
      replyCount: 0,
      reactions: {}
    });
    
    document.getElementById('newPostContent').value = '';
    showNotification('✅ Publicación creada', 'success');
  } catch (error) {
    console.error('Error creando publicación:', error);
    showNotification('❌ Error al publicar', 'error');
  }
}

// Toggle reacción
window.toggleReaction = async function(postId, emoji) {
  try {
    const postRef = doc(db, 'groups', currentGroupId, 'posts', postId);
    const postDoc = await getDoc(postRef);
    const post = postDoc.data();
    const reactions = post.reactions || {};
    const users = reactions[emoji] || [];
    
    if (users.includes(currentUserData.id)) {
      // Quitar reacción
      reactions[emoji] = users.filter(id => id !== currentUserData.id);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Agregar reacción
      reactions[emoji] = [...users, currentUserData.id];
    }
    
    await updateDoc(postRef, { reactions });
    
    // Ocultar picker
    const picker = document.getElementById(`picker-${postId}`);
    if (picker) picker.classList.add('hidden');
  } catch (error) {
    console.error('Error con reacción:', error);
    showNotification('❌ Error al reaccionar', 'error');
  }
}

// Mostrar picker de reacciones
window.showReactionPicker = function(postId) {
  const picker = document.getElementById(`picker-${postId}`);
  if (picker) {
    picker.classList.toggle('hidden');
  }
}

// Eliminar post
window.deletePost = async function(postId) {
  if (!confirm('¿Eliminar esta publicación?')) return;
  
  try {
    await deleteDoc(doc(db, 'groups', currentGroupId, 'posts', postId));
    showNotification('✅ Publicación eliminada', 'success');
  } catch (error) {
    console.error('Error eliminando publicación:', error);
    showNotification('❌ Error al eliminar', 'error');
  }
}

// Cargar respuestas de un post
window.loadPostReplies = async function(postId) {
  // Crear modal para mostrar el post completo y sus respuestas
  const postRef = doc(db, 'groups', currentGroupId, 'posts', postId);
  const postDoc = await getDoc(postRef);
  
  if (!postDoc.exists()) {
    showNotification('❌ Publicación no encontrada', 'error');
    return;
  }
  
  const post = postDoc.data();
  const authorDoc = await getDoc(doc(db, 'users', post.authorId));
  const author = authorDoc.exists() ? authorDoc.data() : { displayName: 'Usuario desconocido' };
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center space-x-3">
            <img src="${author.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.displayName)}&background=4f46e5&color=fff`}" 
                 class="w-12 h-12 rounded-full border-2 border-indigo-200">
            <div>
              <p class="font-semibold text-gray-800">${author.displayName}</p>
              <p class="text-xs text-gray-500">${post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString('es-MX') : 'Ahora'}</p>
            </div>
          </div>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
        </div>
        ${post.title ? `<h3 class="text-xl font-bold text-gray-800 mb-2">${post.title}</h3>` : ''}
        <p class="text-gray-700 whitespace-pre-wrap">${post.content}</p>
      </div>
      
      <!-- Respuestas -->
      <div class="flex-1 overflow-y-auto p-6" id="repliesList">
        <div class="text-center py-8 text-gray-500">
          <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
          <p class="mt-2">Cargando respuestas...</p>
        </div>
      </div>
      
      <!-- Input para nueva respuesta -->
      <div class="p-4 border-t border-gray-200 bg-gray-50">
        <div class="flex space-x-2">
          <textarea id="newReplyContent" rows="2" 
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Escribe una respuesta..."></textarea>
          <button onclick="submitReply('${postId}')" 
            class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold transition whitespace-nowrap">
            Enviar
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Cargar respuestas en tiempo real
  const repliesQuery = query(
    collection(db, 'groups', currentGroupId, 'posts', postId, 'replies'),
    orderBy('createdAt', 'asc')
  );
  
  onSnapshot(repliesQuery, async (snapshot) => {
    const repliesList = document.getElementById('repliesList');
    
    if (snapshot.empty) {
      repliesList.innerHTML = `
        <div class="text-center py-8 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <p>No hay respuestas aún</p>
          <p class="text-sm">¡Sé el primero en responder!</p>
        </div>
      `;
      return;
    }
    
    const repliesHTML = [];
    for (const replyDoc of snapshot.docs) {
      const reply = replyDoc.data();
      const replyAuthorDoc = await getDoc(doc(db, 'users', reply.authorId));
      const replyAuthor = replyAuthorDoc.exists() ? replyAuthorDoc.data() : { displayName: 'Usuario desconocido' };
      
      repliesHTML.push(`
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center space-x-2">
              <img src="${replyAuthor.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(replyAuthor.displayName)}&background=10b981&color=fff`}" 
                   class="w-8 h-8 rounded-full border-2 border-green-200">
              <div>
                <p class="font-semibold text-sm text-gray-800">${replyAuthor.displayName}</p>
                <p class="text-xs text-gray-500">${reply.createdAt ? new Date(reply.createdAt.toDate()).toLocaleString('es-MX') : 'Ahora'}</p>
              </div>
            </div>
            ${reply.authorId === currentUserData.id || currentUserData.role === 'Profesor' ? `
              <button onclick="deleteReply('${postId}', '${replyDoc.id}')" class="text-xs text-red-500 hover:text-red-600 font-semibold">
                �️
              </button>
            ` : ''}
          </div>
          <p class="text-gray-700 text-sm whitespace-pre-wrap ml-10">${reply.content}</p>
        </div>
      `);
    }
    
    repliesList.innerHTML = repliesHTML.join('');
    
    // Scroll al final
    repliesList.scrollTop = repliesList.scrollHeight;
  });
}

// Enviar respuesta a un post
window.submitReply = async function(postId) {
  const content = document.getElementById('newReplyContent').value.trim();
  if (!content) {
    showNotification('⚠️ Escribe algo antes de responder', 'warning');
    return;
  }
  
  try {
    // Agregar respuesta
    await addDoc(collection(db, 'groups', currentGroupId, 'posts', postId, 'replies'), {
      content: content,
      authorId: currentUserData.id,
      createdAt: serverTimestamp()
    });
    
    // Incrementar contador de respuestas en el post principal
    await updateDoc(doc(db, 'groups', currentGroupId, 'posts', postId), {
      replyCount: increment(1)
    });
    
    document.getElementById('newReplyContent').value = '';
    showNotification('✅ Respuesta enviada', 'success');
  } catch (error) {
    console.error('Error enviando respuesta:', error);
    showNotification('❌ Error al responder', 'error');
  }
}

// Eliminar respuesta
window.deleteReply = async function(postId, replyId) {
  if (!confirm('¿Eliminar esta respuesta?')) return;
  
  try {
    await deleteDoc(doc(db, 'groups', currentGroupId, 'posts', postId, 'replies', replyId));
    
    // Decrementar contador
    await updateDoc(doc(db, 'groups', currentGroupId, 'posts', postId), {
      replyCount: increment(-1)
    });
    
    showNotification('✅ Respuesta eliminada', 'success');
  } catch (error) {
    console.error('Error eliminando respuesta:', error);
    showNotification('❌ Error al eliminar', 'error');
  }
}

// Cargar tareas del grupo
async function loadGroupAssignments() {
  const tabContent = document.getElementById('groupTabContent');
  
  // Solo profesores pueden ver este tab completo
  const isTeacher = currentUserData.role === 'Profesor';
  
  tabContent.innerHTML = `
    <div class="space-y-4">
      ${isTeacher ? `
        <div class="flex justify-end">
          <button onclick="showCreateAssignmentModal()" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold transition shadow-md">
            ➕ Crear Tarea
          </button>
        </div>
      ` : ''}
      <div id="assignmentsList"></div>
    </div>
  `;
  
  // Cargar tareas en tiempo real
  const assignmentsQuery = query(
    collection(db, 'groups', currentGroupId, 'assignments'),
    orderBy('createdAt', 'desc')
  );
  
  onSnapshot(assignmentsQuery, async (snapshot) => {
    const assignmentsList = document.getElementById('assignmentsList');
    
    if (snapshot.empty) {
      assignmentsList.innerHTML = `
        <div class="text-center py-12">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-gray-500 font-semibold">No hay tareas asignadas</p>
        </div>
      `;
      return;
    }
    
    const assignmentsHTML = [];
    const now = new Date();
    
    for (const assignmentDoc of snapshot.docs) {
      const assignment = assignmentDoc.data();
      const dueDate = assignment.dueDate ? assignment.dueDate.toDate() : null;
      const isPastDue = dueDate && dueDate < now;
      
      // Si es estudiante, verificar si ya entregó
      let submission = null;
      if (!isTeacher) {
        const submissionDoc = await getDoc(doc(db, 'groups', currentGroupId, 'assignments', assignmentDoc.id, 'submissions', currentUserData.id));
        if (submissionDoc.exists()) {
          submission = submissionDoc.data();
        }
      }
      
      assignmentsHTML.push(`
        <div class="bg-white border-2 ${isPastDue && !submission ? 'border-red-300' : 'border-gray-200'} rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800">${assignment.title}</h3>
              <p class="text-sm text-gray-600 mt-1">${assignment.description}</p>
            </div>
            ${isTeacher ? `
              <div class="flex space-x-2">
                <button onclick="viewAssignmentSubmissions('${assignmentDoc.id}')" class="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                  � Ver entregas
                </button>
                <button onclick="deleteAssignment('${assignmentDoc.id}')" class="text-sm text-red-600 hover:text-red-700 font-semibold">
                  🗑️
                </button>
              </div>
            ` : ''}
          </div>
          
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center space-x-4 text-gray-600">
              <span>📅 ${dueDate ? dueDate.toLocaleDateString('es-MX') : 'Sin fecha límite'}</span>
              <span>⭐ ${assignment.points || 0} puntos</span>
            </div>
            
            ${!isTeacher ? `
              <div>
                ${submission ? `
                  <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                    submission.graded ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }">
                    ${submission.graded ? `✅ Calificada: ${submission.grade}/${assignment.points}` : '📤 Entregada'}
                  </span>
                ` : `
                  <button onclick="showSubmitAssignmentModal('${assignmentDoc.id}')" 
                    class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition">
                    📝 Entregar
                  </button>
                `}
              </div>
            ` : `
              <span class="text-xs text-gray-500">${assignment.submissionCount || 0} entregas</span>
            `}
          </div>
        </div>
      `);
    }
    
    assignmentsList.innerHTML = assignmentsHTML.join('');
  });
}

// Mostrar modal para crear tarea (solo profesores)
window.showCreateAssignmentModal = function() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-lg">
      <h3 class="text-xl font-bold mb-4">Crear Nueva Tarea</h3>
      <form id="createAssignmentForm">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Título</label>
          <input type="text" id="assignmentTitle" required
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500">
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Descripción</label>
          <textarea id="assignmentDescription" rows="3" required
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"></textarea>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-2">Puntos</label>
            <input type="number" id="assignmentPoints" value="100" min="1" required
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Fecha límite</label>
            <input type="date" id="assignmentDueDate" required
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500">
          </div>
        </div>
        
        <div class="flex justify-end gap-2">
          <button type="button" onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button type="submit"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Crear Tarea
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('#createAssignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('assignmentTitle').value.trim();
    const description = document.getElementById('assignmentDescription').value.trim();
    const points = parseInt(document.getElementById('assignmentPoints').value);
    const dueDateStr = document.getElementById('assignmentDueDate').value;
    
    try {
      const dueDate = new Date(dueDateStr + 'T23:59:59');
      
      await addDoc(collection(db, 'groups', currentGroupId, 'assignments'), {
        title,
        description,
        points,
        dueDate: dueDate,
        createdBy: currentUserData.id,
        createdAt: serverTimestamp(),
        submissionCount: 0
      });
      
      showNotification('✅ Tarea creada exitosamente', 'success');
      modal.remove();
    } catch (error) {
      console.error('Error creando tarea:', error);
      showNotification('❌ Error al crear la tarea', 'error');
    }
  });
}

// Mostrar modal para entregar tarea (estudiantes)
window.showSubmitAssignmentModal = function(assignmentId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-lg">
      <h3 class="text-xl font-bold mb-4">Entregar Tarea</h3>
      <form id="submitAssignmentForm">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Comentarios (opcional)</label>
          <textarea id="submissionComments" rows="4"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Agrega comentarios sobre tu entrega..."></textarea>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Archivo adjunto (opcional)</label>
          <input type="file" id="submissionFile"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
          <p class="text-xs text-gray-500 mt-1">Máximo 10 MB</p>
        </div>
        
        <div class="flex justify-end gap-2">
          <button type="button" onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button type="submit"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Entregar
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('#submitAssignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const comments = document.getElementById('submissionComments').value.trim();
    const fileInput = document.getElementById('submissionFile');
    
    try {
      const submissionData = {
        studentId: currentUserData.id,
        comments: comments || null,
        submittedAt: serverTimestamp(),
        graded: false,
        grade: null,
        feedback: null
      };
      
      // Si hay archivo, subirlo a Storage (implementar después)
      if (fileInput.files.length > 0) {
        // TODO: Implementar subida a Firebase Storage
        showNotification('⚠️ Subida de archivos próximamente', 'warning');
      }
      
      // Guardar entrega
      await addDoc(
        collection(db, 'groups', currentGroupId, 'assignments', assignmentId, 'submissions'),
        submissionData
      );
      
      // Incrementar contador
      await updateDoc(doc(db, 'groups', currentGroupId, 'assignments', assignmentId), {
        submissionCount: increment(1)
      });
      
      showNotification('✅ Tarea entregada exitosamente', 'success');
      modal.remove();
      loadGroupAssignments(); // Recargar para mostrar estado actualizado
    } catch (error) {
      console.error('Error entregando tarea:', error);
      showNotification('❌ Error al entregar la tarea', 'error');
    }
  });
}

// Ver entregas de una tarea (profesores)
window.viewAssignmentSubmissions = async function(assignmentId) {
  showNotification('🚧 Vista de entregas próximamente', 'info');
  // TODO: Implementar vista completa de entregas con calificación
}

// Eliminar tarea (profesores)
window.deleteAssignment = async function(assignmentId) {
  if (!confirm('¿Eliminar esta tarea y todas sus entregas?')) return;
  
  try {
    await deleteDoc(doc(db, 'groups', currentGroupId, 'assignments', assignmentId));
    showNotification('✅ Tarea eliminada', 'success');
  } catch (error) {
    console.error('Error eliminando tarea:', error);
    showNotification('❌ Error al eliminar', 'error');
  }
}

// Cargar calificaciones
async function loadGroupGrades() {
  const tabContent = document.getElementById('groupTabContent');
  showNotification('🚧 Cuaderno de calificaciones próximamente', 'info');
  tabContent.innerHTML = `
    <div class="text-center py-12">
      <p class="text-gray-500 font-semibold">Cuaderno de calificaciones en construcción</p>
    </div>
  `;
}

// Cargar miembros del grupo
async function loadGroupMembers() {
  const tabContent = document.getElementById('groupTabContent');
  
  tabContent.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <p class="col-span-full text-gray-500 text-center">Cargando miembros...</p>
    </div>
  `;
  
  const members = currentGroupData.members || {};
  const memberIds = Object.keys(members);
  
  if (memberIds.length === 0) {
    tabContent.innerHTML = `
      <div class="text-center py-12">
        <p class="text-gray-500 font-semibold">No hay miembros aún</p>
      </div>
    `;
    return;
  }
  
  const membersHTML = [];
  for (const userId of memberIds) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) continue;
    
    const user = userDoc.data();
    const role = members[userId];
    
    membersHTML.push(`
      <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-3 shadow-sm hover:shadow-md transition">
        <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=4f46e5&color=fff`}" 
             class="w-12 h-12 rounded-full border-2 border-indigo-200">
        <div class="flex-1">
          <p class="font-semibold text-gray-800">${user.displayName}</p>
          <p class="text-sm text-gray-600">${role === 'Profesor' ? '👨‍🏫 Profesor' : '👨‍🎓 Estudiante'}</p>
        </div>
        ${userId === currentGroupData.ownerId ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">Dueño</span>' : ''}
      </div>
    `);
  }
  
  tabContent.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${membersHTML.join('')}
    </div>
  `;
}

// Helper para mostrar notificaciones
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-20 right-4 px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in ${
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

// ===== MODALES DE GRUPOS =====

/**
 * Muestra modal para crear un nuevo grupo
 * Solo disponible para profesores
 */
function showCreateGroupModal() {
  if (currentUser.role !== 'Profesor') {
    showNotification('Solo los profesores pueden crear grupos', 'error');
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 class="text-xl font-bold mb-4">Crear Nuevo Grupo</h3>
      <form id="createGroupForm">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Nombre del Grupo</label>
          <input type="text" id="groupName" required
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Programación Básica 2024">
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Descripción</label>
          <textarea id="groupDescription" rows="3" required
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Breve descripción del grupo"></textarea>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Escuela (opcional)</label>
          <select id="groupSchool" class="w-full px-3 py-2 border rounded-lg">
            <option value="">Ninguna</option>
          </select>
        </div>
        
        <div class="flex justify-end gap-2">
          <button type="button" onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Crear Grupo
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Cargar escuelas disponibles
  loadSchoolsForGroup();
  
  // Manejar submit
  const form = modal.querySelector('#createGroupForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleCreateGroup();
    modal.remove();
  });
}

/**
 * Muestra modal para unirse a un grupo existente mediante código
 */
function showJoinGroupModal() {
  if (currentUser.role !== 'Estudiante') {
    showNotification('Esta función es solo para estudiantes', 'error');
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 class="text-xl font-bold mb-4">Unirse a un Grupo</h3>
      <form id="joinGroupForm">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Código de Grupo</label>
          <input type="text" id="joinCode" required
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono uppercase"
            placeholder="Ej: ABC123"
            maxlength="6"
            style="text-transform: uppercase;">
          <p class="text-sm text-gray-500 mt-1">
            Ingresa el código de 6 caracteres que te proporcionó tu profesor
          </p>
        </div>
        
        <div class="flex justify-end gap-2">
          <button type="button" onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button type="submit"
            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            Unirse
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Auto-uppercase en el input
  const joinCodeInput = modal.querySelector('#joinCode');
  joinCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });
  
  // Manejar submit
  const form = modal.querySelector('#joinGroupForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleJoinGroup();
    modal.remove();
  });
}

/**
 * Carga las escuelas disponibles en el selector del modal de crear grupo
 */
async function loadSchoolsForGroup() {
  try {
    const schoolsQuery = query(collection(db, 'schools'), orderBy('name'));
    const snapshot = await getDocs(schoolsQuery);
    
    const select = document.getElementById('groupSchool');
    if (!select) return;
    
    snapshot.forEach(doc => {
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

/**
 * Crea un nuevo grupo en Firestore
 */
async function handleCreateGroup() {
  const name = document.getElementById('groupName').value.trim();
  const description = document.getElementById('groupDescription').value.trim();
  const schoolId = document.getElementById('groupSchool').value;
  
  if (!name || !description) {
    showNotification('Por favor completa todos los campos', 'error');
    return;
  }
  
  try {
    // Generar código único de 6 caracteres
    const joinCode = generateJoinCode();
    
    // Crear el grupo
    const groupData = {
      name,
      description,
      schoolId: schoolId || null,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      members: {
        [currentUser.uid]: {
          role: 'teacher',
          joinedAt: serverTimestamp()
        }
      },
      settings: {
        joinCode,
        allowStudentPosts: true,
        allowAnonymous: false
      }
    };
    
    const groupRef = await addDoc(collection(db, 'groups'), groupData);
    
    showNotification(`Grupo creado exitosamente. Código: ${joinCode}`, 'success');
    
    // Recargar grupos
    loadUserGroups();
  } catch (error) {
    console.error('Error creando grupo:', error);
    showNotification('Error al crear el grupo', 'error');
  }
}

/**
 * Une al estudiante actual a un grupo mediante código
 */
async function handleJoinGroup() {
  const joinCode = document.getElementById('joinCode').value.trim().toUpperCase();
  
  if (!joinCode || joinCode.length !== 6) {
    showNotification('Por favor ingresa un código válido de 6 caracteres', 'error');
    return;
  }
  
  try {
    // Buscar grupo por joinCode
    const groupsQuery = query(
      collection(db, 'groups'),
      where('settings.joinCode', '==', joinCode),
      limit(1)
    );
    
    const snapshot = await getDocs(groupsQuery);
    
    if (snapshot.empty) {
      showNotification('Código inválido. Verifica con tu profesor.', 'error');
      return;
    }
    
    const groupDoc = snapshot.docs[0];
    const groupData = groupDoc.data();
    
    // Verificar si ya es miembro
    if (groupData.members && groupData.members[currentUser.uid]) {
      showNotification('Ya eres miembro de este grupo', 'error');
      return;
    }
    
    // Agregar al estudiante como miembro
    await updateDoc(doc(db, 'groups', groupDoc.id), {
      [`members.${currentUser.uid}`]: {
        role: 'student',
        joinedAt: serverTimestamp()
      }
    });
    
    showNotification(`¡Te uniste exitosamente a "${groupData.name}"!`, 'success');
    
    // Recargar grupos
    loadUserGroups();
  } catch (error) {
    console.error('Error uniéndose al grupo:', error);
    showNotification('Error al unirse al grupo', 'error');
  }
}

/**
 * Genera un código alfanumérico único de 6 caracteres
 */
function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}