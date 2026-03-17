// Student Shell injection (Header + Sidebar) and basic global UI behaviors
// Usage: import { initStudentShell } from './student-shell.js'; then call initStudentShell('dashboard'|'lecciones'|'tareas'|'laboratorio'|'grupos'|'chat'|'racha'|'perfil')

import { onSnapshot, collection, query, where, orderBy, limit, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { updateGamificationHeader } from './gamification.js';

export function initStudentShell(active = 'dashboard') {
  // Apply theme early if not already
  try { const t = localStorage.getItem('app-theme'); if (t==='dark') document.documentElement.classList.add('theme-dark','dark'); } catch(_) {}

  // Create header
  const header = document.createElement('header');
  header.className = 'bg-white shadow-md fixed top-0 left-0 right-0 z-50';
  header.innerHTML = `
    <div class="flex items-center justify-between px-6 py-3">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
          <span class="text-white font-bold text-xl">CK</span>
        </div>
        <span class="text-2xl font-bold gradient-text">CodeKids</span>
      </div>
      <div class="flex-1 max-w-xl mx-6">
        <div class="relative">
          <input id="globalSearch" type="search" placeholder="🔍 Buscar lecciones, juegos, profesores..." class="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition"/>
          <div id="globalSearchResults" class="hidden absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl p-2 text-sm"></div>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <div class="hidden md:flex items-center space-x-2">
          <div>
            <div class="level-badge" id="userLevelShell">Nivel 1</div>
            <div class="w-32 bg-gray-200 rounded-full h-1 mt-1"><div id="xpProgressBar" class="bg-indigo-500 h-1 rounded-full" style="width: 0%"></div></div>
          </div>
          <div class="xp-badge" id="userXPShell">0/100 XP</div>
        </div>
        <button id="notifBtn" class="relative p-2 hover:bg-gray-100 rounded-lg transition">
          <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          <span id="notifDot" class="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full hidden"></span>
        </button>
        <div id="notifDropdown" class="hidden absolute right-16 top-14 w-80 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-50 max-h-96 overflow-y-auto"></div>
        <div class="relative" id="profileWrap">
          <img id="userAvatarShell" src="https://ui-avatars.com/api/?name=Usuario&background=667eea&color=fff" class="w-10 h-10 rounded-full cursor-pointer"/>
          <div id="profileMenuShell" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            <a href="./perfil.html" class="block px-4 py-2 hover:bg-gray-100 text-sm">👤 Mi Perfil</a>
            <button id="openSettingsShell" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">🔧 Configuración</button>
            <hr class="my-2"/>
            <button id="logoutShell" class="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm">🚪 Cerrar Sesión</button>
          </div>
        </div>
      </div>
    </div>`;

  // Create sidebar
  const aside = document.createElement('aside');
  aside.className = 'sidebar w-64 fixed left-0 h-full overflow-y-auto hidden md:block';
  aside.style.top = '4rem';
  aside.innerHTML = `
    <div class="p-4">
      <nav class="space-y-1">
        ${navLink('dashboard.html','Inicio','dashboard',active)}
        ${navLink('lecciones.html','Lecciones','lecciones',active)}
        ${navLink('tareas.html','Tareas','tareas',active)}
        ${navLink('laboratorio.html','Laboratorio','laboratorio',active)}
        ${navLink('grupos.html','Mis Grupos','grupos',active)}
        ${navLink('chats.html','Chats','chat',active)}
        ${navLink('racha.html','Racha','racha',active)}
      </nav>
    </div>`;

  // Insert into DOM if not present
  if (!document.querySelector('header')) document.body.prepend(header);
  else document.querySelector('header').replaceWith(header);
  if (!document.querySelector('aside.sidebar')) document.body.appendChild(aside);
  else document.querySelector('aside.sidebar').replaceWith(aside);

  // Wire profile menu
  const profileWrap = document.getElementById('profileWrap');
  const profileMenu = document.getElementById('profileMenuShell');
  profileWrap.addEventListener('click', (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => { if (!profileMenu.classList.contains('hidden')) profileMenu.classList.add('hidden'); });

  // Unified logout: use exported logout() from auth.js if available to avoid duplicate signOut logic
  document.getElementById('logoutShell').addEventListener('click', async () => {
    try {
      if (window.__CK_DEBUG_AUTH) console.log('[CK][Shell] Logout click');
      // Prefer global logout() if present
      if (window.logout) {
        await window.logout();
        return; // logout() handles redirect
      }
      // Fallback direct signOut
      if (window.auth?.signOut) await window.auth.signOut();
      window.location.href = '../index.html';
    } catch(e) {
      console.warn('Logout error (shell):', e);
    }
  });
  document.getElementById('openSettingsShell').addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); if (window.openGlobalSettings) window.openGlobalSettings(e.currentTarget);
  });

  // Global search debounce + mock
  const searchInput = document.getElementById('globalSearch');
  const resultsBox = document.getElementById('globalSearchResults');
  let t;
  searchInput.addEventListener('input', () => {
    clearTimeout(t); const q = searchInput.value.trim();
    if (!q) { resultsBox.classList.add('hidden'); resultsBox.innerHTML=''; return; }
    t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = res.ok ? await res.json() : { lessons: [], games: [], teachers: [] };
        resultsBox.innerHTML = renderSearchResults(data);
        resultsBox.classList.remove('hidden');
      } catch (e) { resultsBox.innerHTML = '<div class="p-2 text-red-600">Error de búsqueda</div>'; resultsBox.classList.remove('hidden'); }
    }, 300);
  });

  // Notification placeholder
  const notifBtn = document.getElementById('notifBtn');
  const notifDot = document.getElementById('notifDot');
  const notifDropdown = document.getElementById('notifDropdown');
  notifBtn.addEventListener('click', () => {
    notifDropdown.classList.toggle('hidden');
    notifDot.classList.add('hidden');
  });

  // Wire notifications in real-time from Firestore
  try {
    const user = window.auth.currentUser;
    if (user) {
      const q = query(
        collection(window.db, `users/${user.uid}/notifications`),
        where('isRead','==',false),
        orderBy('createdAt','desc'),
        limit(20)
      );
      onSnapshot(q, (snap) => {
        const items = [];
        snap.forEach(d => {
          const n = d.data();
          items.push(`<a href="${n.link||'#'}" class="block px-3 py-2 hover:bg-gray-50 text-sm">${n.text||'Notificación'}</a>`);
        });
        notifDropdown.innerHTML = items.length ? items.join('') : '<div class="px-3 py-2 text-sm text-gray-500">Sin notificaciones</div>';
        if (snap.size > 0) notifDot.classList.remove('hidden');
      });
    }
  } catch(_) {}

  // Initialize gamification header from current user doc
  try {
    const user = window.auth.currentUser;
    if (user) {
      getDoc(doc(window.db, 'users', user.uid)).then(s => { const xp = s.exists()? (s.data().xp||0) : 0; updateGamificationHeader(xp); });
    }
  } catch(_) {}
}

function navLink(href, text, key, active) {
  const act = (key === active) ? 'active' : '';
  return `<a href="${href}" class="sidebar-item ${act}"><span>${text}</span></a>`;
}

function renderSearchResults(data) {
  const toLi = (arr, icon) => arr.map(x => `<div class="px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">${icon} ${x.title || x.name}</div>`).join('') || '<div class="px-2 py-1 text-gray-400">Sin resultados</div>';
  return `
    <div>
      <div class="font-semibold text-gray-700 mb-1">Lecciones</div>
      ${toLi(data.lessons||[], '📘')}
      <div class="font-semibold text-gray-700 mt-2 mb-1">Juegos</div>
      ${toLi(data.games||[], '🎮')}
      <div class="font-semibold text-gray-700 mt-2 mb-1">Profesores</div>
      ${toLi(data.teachers||[], '👨‍🏫')}
    </div>`;
}
