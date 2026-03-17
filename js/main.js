// Lógica para index.html (Landing Page)
import { auth, db } from './firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Eliminado: lógica de modal de login y autenticación en landing (se usa página dedicada auth/login.html)

// Cargar mapa de escuelas
async function loadSchoolsMap() {
  try {
    const map = L.map('map').setView([23.6345, -102.5528], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);
    
    const schoolsQuery = query(collection(db, 'schools'), where('isActive', '==', true));
    const schoolsSnapshot = await getDocs(schoolsQuery);
    
    schoolsSnapshot.forEach(doc => {
      const school = doc.data();
      if (school.coords) {
        const marker = L.marker([school.coords.latitude, school.coords.longitude])
          .addTo(map)
          .bindPopup(`
            <div class="text-center">
              <strong class="text-lg">${school.name}</strong><br>
              <span class="text-gray-600">${school.address}</span>
            </div>
          `);
      }
    });
  } catch (error) {
    console.error('Error cargando mapa de escuelas:', error);
  }
}

// Inicializar mapa de la sección vieja si existe
if (document.getElementById('map')) {
  loadSchoolsMap();
}

// Hero Map: Matamoros con puntos fijos
function loadHeroMatamorosMap() {
  try {
    const el = document.getElementById('hero-map');
    if (!el) return;

    const center = [25.869, -97.504]; // Centro aproximado de H. Matamoros
    const map = L.map('hero-map', { scrollWheelZoom: false }).setView(center, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    const schools = [
      { name: 'Colegio San Juan Siglo XXI', coords: [25.870, -97.510] },
      { name: 'Liceo de Matamoros', coords: [25.862, -97.498] },
      { name: 'Primaria Josefa Ortiz de Domínguez', coords: [25.876, -97.495] },
      { name: 'Sec. Gral. No.1 Adolfo López Mateos', coords: [25.880, -97.505] },
      { name: 'Colegio Don Bosco', coords: [25.865, -97.515] }
    ];

    schools.forEach(s => {
      L.marker(s.coords).addTo(map).bindTooltip(s.name, { direction: 'top' });
    });
  } catch (e) {
    console.error('Error cargando mapa de Matamoros:', e);
  }
}

if (document.getElementById('hero-map')) {
  loadHeroMatamorosMap();
}

// -------- Modales --------
function openModal(id) {
  const overlay = document.getElementById('overlay');
  const m = document.getElementById(id);
  if (!m || !overlay) return;
  overlay.classList.remove('hidden');
  m.classList.remove('hidden');
  m.classList.add('grid');
  // focus first focusable input for accessibility if present
  const input = m.querySelector('input, button, textarea, select');
  input?.focus();
}

function closeModal(id) {
  const overlay = document.getElementById('overlay');
  const m = document.getElementById(id);
  if (!m || !overlay) return;
  overlay.classList.add('hidden');
  m.classList.add('hidden');
  m.classList.remove('grid');
}

function wireModalLink(btnId, modalId) {
  const el = document.getElementById(btnId);
  if (!el) return;
  el.addEventListener('click', () => openModal(modalId));
}

// Header links
// SPA navigation instead of modals
function showView(id) {
  const principal = document.getElementById('pantalla-principal');
  const views = ['pantalla-sobre-nosotros','pantalla-caracteristicas','pantalla-profesores'];
  if (id === 'pantalla-principal') {
    principal.classList.remove('hidden');
    views.forEach(v => document.getElementById(v)?.classList.add('hidden'));
    return;
  }
  principal.classList.add('hidden');
  views.forEach(v => {
    const el = document.getElementById(v);
    if (!el) return;
    if (v === id) el.classList.remove('hidden'); else el.classList.add('hidden');
  });
  // scroll to top for new view
  window.scrollTo({top:0,behavior:'smooth'});
}

document.getElementById('nav-sobre')?.addEventListener('click', () => showView('pantalla-sobre-nosotros'));
document.getElementById('nav-caracteristicas')?.addEventListener('click', () => showView('pantalla-caracteristicas'));
document.getElementById('nav-profesores')?.addEventListener('click', () => showView('pantalla-profesores'));
document.getElementById('ft-sobre')?.addEventListener('click', () => showView('pantalla-sobre-nosotros'));
document.getElementById('ft-caract')?.addEventListener('click', () => showView('pantalla-caracteristicas'));
document.getElementById('ft-prof')?.addEventListener('click', () => showView('pantalla-profesores'));

// Back buttons
document.querySelectorAll('[data-back]')?.forEach(btn => btn.addEventListener('click', () => showView('pantalla-principal')));

// Login CTA routing: prefer dedicated auth page if available
document.getElementById('nav-login')?.addEventListener('click', () => { window.location.href = 'auth/login.html'; });
document.querySelector('[data-btn-login-header]')?.addEventListener('click', () => { window.location.href = 'auth/login.html'; });
// Hero CTAs (also route to auth page; professor adds a query param)
document.getElementById('btn-comenzar-aventura')?.addEventListener('click', () => { window.location.href = 'auth/login.html'; });
// Botón profesor debe mostrar página de onboarding primero (marketing + beneficios)
document.getElementById('btn-acceder-profesor')?.addEventListener('click', (e) => { 
  e.preventDefault();
  window.location.href = 'profesores/bienvenida/'; 
});


// Footer modal links (only for items that should open a modal)
wireModalLink('ft-terminos', 'modal-terminos');
wireModalLink('ft-priv', 'modal-priv');
wireModalLink('ft-faq', 'modal-faq');
wireModalLink('ft-contacto', 'modal-contacto');
wireModalLink('ft-ayuda', 'modal-ayuda');

// Cerrar por botón X
document.querySelectorAll('[data-close]')?.forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
});

// Cerrar haciendo clic en overlay
document.getElementById('overlay')?.addEventListener('click', () => {
  document.querySelectorAll('[id^="modal-"]')?.forEach(el => {
    if (!el.classList.contains('hidden')) {
      closeModal(el.id);
    }
  });
});

// Cerrar modales con ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('[id^="modal-"]')?.forEach(el => {
      if (!el.classList.contains('hidden')) closeModal(el.id);
    });
  }
});

// Expose openLoginModal for CTA buttons if needed
window.openLoginModal = function(prefTab) { 
  openModal('modal-login');
  if (prefTab) activateLoginTab(prefTab);
};

// Tabs inside login modal
function activateLoginTab(tab) {
  document.querySelectorAll('.tab-login')?.forEach(b => {
    const active = b.getAttribute('data-login-tab') === tab;
    b.classList.toggle('bg-indigo-600', active);
    b.classList.toggle('text-white', active);
    b.classList.toggle('border-indigo-600', active);
  });
}
document.querySelectorAll('.tab-login')?.forEach(btn => btn.addEventListener('click', () => activateLoginTab(btn.getAttribute('data-login-tab'))));
activateLoginTab('estudiante');

// Footer modals
wireModalLink('ft-faq', 'modal-faq');
wireModalLink('ft-contacto', 'modal-contacto');
wireModalLink('ft-terminos', 'modal-terminos');
wireModalLink('ft-priv', 'modal-priv');
wireModalLink('ft-ayuda', 'modal-ayuda');

// Footer subscribe button is now a direct link to the auth page (handled inline in HTML)

// root reference (used by toggles)
const htmlRoot = document.documentElement;

// -------- Settings dropdown --------
const btnSettings = document.getElementById('btn-settings');
const settingsMenu = document.getElementById('settingsMenu');
let isSettingsOpen = false;

// Add a simple 'High Contrast' toggle into the settings menu (created after settingsMenu exists)
const contrastToggle = document.createElement('div');
contrastToggle.innerHTML = '<div class="flex items-center justify-between mt-4"><span class="font-semibold text-gray-700">Alto Contraste</span><label class="inline-flex items-center cursor-pointer"><input id="toggle-contrast" type="checkbox" class="sr-only"><span class="w-10 h-5 bg-gray-300 rounded-full p-1 transition"><span class="block w-4 h-4 bg-white rounded-full shadow transform transition"></span></span></label></div>';
settingsMenu?.appendChild(contrastToggle);
document.getElementById('toggle-contrast')?.addEventListener('change', (e) => {
  if (e.target.checked) {
    htmlRoot.classList.add('high-contrast');
  } else {
    htmlRoot.classList.remove('high-contrast');
  }
});
btnSettings?.addEventListener('click', (e) => {
  e.stopPropagation();
  isSettingsOpen = !isSettingsOpen;
  if (isSettingsOpen) {
    settingsMenu?.classList.remove('hidden');
    btnSettings?.setAttribute('aria-expanded', 'true');
  } else {
    settingsMenu?.classList.add('hidden');
    btnSettings?.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('click', (e) => {
  if (!settingsMenu || !isSettingsOpen) return;
  const path = e.composedPath();
  if (!path.includes(settingsMenu) && !path.includes(btnSettings)) {
    settingsMenu.classList.add('hidden');
    isSettingsOpen = false;
    btnSettings?.setAttribute('aria-expanded', 'false');
  }
});

// Dark mode toggle (simple)
// THEME TOGGLE (refactored to design tokens with persistence)
const darkToggle = document.getElementById('toggle-dark');
const applyTheme = (mode) => {
  if (mode === 'dark') {
    document.documentElement.classList.add('theme-dark');
  } else {
    document.documentElement.classList.remove('theme-dark');
  }
};
try {
  const persisted = localStorage.getItem('app-theme');
  if (persisted) {
    applyTheme(persisted);
    if (darkToggle) darkToggle.checked = persisted === 'dark';
  }
} catch (e) { /* ignore */ }
if (darkToggle) {
  darkToggle.addEventListener('change', (e) => {
    const mode = e.target.checked ? 'dark' : 'light';
    applyTheme(mode);
    try { localStorage.setItem('app-theme', mode); } catch (e) { /* ignore */ }
  });
}

// Font size controls
document.querySelectorAll('[data-font]')?.forEach(btn => {
  btn.addEventListener('click', () => {
    const size = btn.getAttribute('data-font');
    const root = document.documentElement;
    if (size === 'sm') root.style.fontSize = '14px';
    if (size === 'md') root.style.fontSize = '16px';
    if (size === 'lg') root.style.fontSize = '18px';
  });
});