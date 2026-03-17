// Global UI utilities for authenticated and public layouts
// Handles: dark mode persistence, avatar menu toggle (admin + app), and shared helpers.

const THEME_KEY = 'app-theme';

function applyTheme(mode) {
  if (mode === 'dark') {
    document.documentElement.classList.add('theme-dark');
  } else {
    document.documentElement.classList.remove('theme-dark');
  }
}

// Settings popover (Global) similar al homepage
function createSettingsPopoverIfNeeded() {
  if (document.getElementById('ckSettingsPopover')) return;
  const pop = document.createElement('div');
  pop.id = 'ckSettingsPopover';
  pop.className = 'hidden fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-64';
  pop.style.zIndex = '10000';
  pop.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold text-gray-800">Configuración</h3>
      <button id="ckSettingsClose" class="text-gray-500 hover:text-gray-700">✕</button>
    </div>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="font-semibold text-gray-700">Modo oscuro</span>
        <label class="inline-flex items-center cursor-pointer">
          <input id="ckDarkToggle" type="checkbox" class="sr-only">
          <span class="w-10 h-5 bg-gray-300 rounded-full p-1 transition">
            <span class="block w-4 h-4 bg-white rounded-full shadow transform transition"></span>
          </span>
        </label>
      </div>
      <div>
        <span class="font-semibold text-gray-700">Tamaño de fuente</span>
        <div class="mt-2 flex gap-2">
          <button data-font="sm" class="px-3 py-1 border rounded">A-</button>
          <button data-font="md" class="px-3 py-1 border rounded">A</button>
          <button data-font="lg" class="px-3 py-1 border rounded">A+</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(pop);

  const closeBtn = pop.querySelector('#ckSettingsClose');
  const darkToggle = pop.querySelector('#ckDarkToggle');

  // Initialize persisted theme
  try {
    const persisted = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(persisted);
    darkToggle.checked = persisted === 'dark';
  } catch (_) {}

  const setVisible = (v) => {
    pop.classList.toggle('hidden', !v);
  };
  const close = () => setVisible(false);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.addEventListener('click', (e) => {
    if (pop.classList.contains('hidden')) return;
    if (!pop.contains(e.target)) close();
  });

  darkToggle.addEventListener('change', (e) => {
    const mode = e.target.checked ? 'dark' : 'light';
    applyTheme(mode);
    try { localStorage.setItem(THEME_KEY, mode); } catch (_) {}
  });

  pop.querySelectorAll('[data-font]')?.forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.getAttribute('data-font');
      const root = document.documentElement;
      if (size === 'sm') root.style.fontSize = '14px';
      if (size === 'md') root.style.fontSize = '16px';
      if (size === 'lg') root.style.fontSize = '18px';
    });
  });

  // API: abrir popover anclado a un elemento (por ejemplo, botón Configuración del menú de perfil)
  window.openGlobalSettings = (anchorEl) => {
    try {
      const rect = anchorEl?.getBoundingClientRect?.();
      const top = (rect?.bottom || 56) + 8 + window.scrollY;
      const left = (rect?.left || (window.innerWidth - 280)) + window.scrollX - 160;
      pop.style.top = `${top}px`;
      pop.style.left = `${Math.max(8, left)}px`;
    } catch (_) {}
    setVisible(true);
  };
}

function initAvatarMenu(idAvatar, idMenu) {
  const avatar = document.getElementById(idAvatar);
  const menu = document.getElementById(idMenu);
  if (!avatar || !menu) return;
  avatar.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden', open);
    avatar.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== avatar) {
      menu.classList.add('hidden');
      avatar.setAttribute('aria-expanded', 'false');
    }
  });
}

function initGlobalUI() {
  createSettingsPopoverIfNeeded();
  initAvatarMenu('adminAvatar', 'adminProfileMenu');
  initAvatarMenu('userAvatar', 'profileMenu');
}

// Run after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalUI);
} else {
  initGlobalUI();
}

// Expose manual theme switch if needed elsewhere
window.ckSetTheme = (mode) => {
  applyTheme(mode);
  try { localStorage.setItem(THEME_KEY, mode); } catch (_) {}
  const toggle = document.getElementById('globalDarkToggle');
  const icon = document.getElementById('darkToggleIcon');
  if (toggle) toggle.checked = mode === 'dark';
  if (icon) icon.textContent = mode === 'dark' ? '☀️' : '🌙';
};
