// Gamification engine: levels, XP, and frame unlocks
// Usage: import { LEVEL_THRESHOLDS, computeLevel, addXP, renderGamificationBadges } from './gamification.js'

import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export const LEVEL_THRESHOLDS = [100,150,250,350,500,650,800,1000,1200]; // L1->L2 ... L9->L10

export function computeLevel(totalXp = 0) {
  let level = 1;
  let remaining = totalXp;
  for (let i=0;i<LEVEL_THRESHOLDS.length;i++) {
    if (remaining >= LEVEL_THRESHOLDS[i]) { remaining -= LEVEL_THRESHOLDS[i]; level++; }
    else break;
  }
  const nextIdx = Math.min(level-1, LEVEL_THRESHOLDS.length-1);
  const nextLevelXp = level >= 10 ? 0 : LEVEL_THRESHOLDS[nextIdx];
  const progressPct = level >= 10 ? 100 : Math.floor((remaining / (nextLevelXp||1)) * 100);
  return { level, currentXpTowardsNext: remaining, nextLevelXp, progressPct };
}

const FRAMES = [
  { id:'marco_bronce', name:'Marco Bronce', unlockLevel: 2 },
  { id:'marco_plata', name:'Marco Plata', unlockLevel: 5 },
  { id:'marco_oro', name:'Marco Oro', unlockLevel: 8 },
  { id:'marco_diamante', name:'Marco Diamante', unlockLevel: 10 }
];

export async function addXP(amount, source = 'generic') {
  // Si existe el sistema de estado, usarlo
  if (window.userState) {
    const result = window.userState.addXP(amount, source);
    
    // PERSISTIR EN LOCALSTORAGE
    if (result && result.newXP !== undefined) {
      localStorage.setItem('codekids_xp', result.newXP.toString());
    }
    if (result && result.newLevel !== undefined) {
      localStorage.setItem('codekids_level', result.newLevel.toString());
    }
    
    // CRÍTICO: GUARDAR EN FIRESTORE INMEDIATAMENTE
    try {
      const auth = window.auth;
      const db = window.db;
      const user = auth?.currentUser;
      
      console.log('🔄 Guardando XP en Firestore...', { 
        hasAuth: !!auth, 
        hasDb: !!db, 
        hasUser: !!user,
        xp: result.newXP,
        nivel: result.newLevel,
        amount: amount,
        source: source
      });
      
      if (user && db) {
        const ref = doc(db, 'users', user.uid);
        const unlocked = new Set(window.userState.state.unlockedFrames || []);
        FRAMES.forEach(f => { if (result.newLevel >= f.unlockLevel) unlocked.add(f.id); });
        
        const payload = {
          xp: result.newXP,
          nivel: result.newLevel,
          unlockedFrames: Array.from(unlocked),
          lastXPUpdate: new Date().toISOString()
        };
        
        console.log('📦 Payload a guardar en Firestore:', payload);
        await updateDoc(ref, payload);
        console.log('✅ XP guardado exitosamente en Firestore:', result.newXP, 'Nivel:', result.newLevel);
      } else {
        console.warn('⚠️ No se puede guardar en Firestore:', { hasAuth: !!auth, hasDb: !!db, hasUser: !!user });
      }
    } catch (err) {
      console.error('❌ Error guardando XP en Firestore:', err);
      console.error('Detalles del error:', err.message, err.code);
    }
    
    updateGamificationHeader(window.userState.state.xp);
    showXPToast(amount, source);
    
    // NO MOSTRAR MODAL AUTOMÁTICAMENTE AL CARGAR LA PÁGINA
    // El usuario debe hacer clic en el badge de nivel para verlo
    // if (result.leveledUp) {
    //   showLevelUpModal(result.newLevel);
    // }
    
    return result;
  }

  // Fallback a Firebase
  const auth = window.auth; const db = window.db;
  const user = auth.currentUser; if (!user) throw new Error('No auth');
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const prevXp = data.xp || 0;
  const newXp = prevXp + amount;
  const { level } = computeLevel(newXp);
  const prevLevel = data.nivel || 1;
  
  // PERSISTIR EN LOCALSTORAGE
  localStorage.setItem('codekids_xp', newXp.toString());
  localStorage.setItem('codekids_level', level.toString());
  
  // Unlock frames
  const unlocked = new Set(data.unlockedFrames || []);
  FRAMES.forEach(f => { if (level >= f.unlockLevel) unlocked.add(f.id); });
  const payload = { xp: newXp, nivel: level, unlockedFrames: Array.from(unlocked) };
  await updateDoc(ref, payload);
  try { updateGamificationHeader(newXp); } catch(_) {}
  return { xp: newXp, nivel: level, unlockedFrames: payload.unlockedFrames, prevLevel, source };
}

export async function updateGamificationHeader(totalXp = 0) {
  const { level, progressPct, nextLevelXp, currentXpTowardsNext } = computeLevel(totalXp);
  
  // Actualizar nivel
  const levelEl = document.getElementById('userLevel');
  if (levelEl) levelEl.textContent = `Nivel ${level}`;
  
  // Actualizar XP actual y siguiente
  const currentXPEl = document.getElementById('currentXP');
  const nextLevelXPEl = document.getElementById('nextLevelXP');
  if (currentXPEl) currentXPEl.textContent = currentXpTowardsNext;
  if (nextLevelXPEl) nextLevelXPEl.textContent = level >= 10 ? 'Max' : nextLevelXp;
  
  // Actualizar barra de progreso
  const bar = document.getElementById('xpProgressBar');
  if (bar) {
    bar.style.width = `${progressPct}%`;
    bar.ariaValueNow = progressPct;
  }
  
  console.log('📊 Header actualizado:', { totalXp, level, currentXpTowardsNext, nextLevelXp, progressPct });
}

export async function loadXPFromFirestore(userId) {
  if (!userId) {
    console.warn('⚠️ loadXPFromFirestore: No userId provided');
    return 0;
  }
  
  try {
    const db = window.db;
    if (!db) {
      console.error('❌ window.db no está disponible');
      return 0;
    }
    
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      const data = snap.data();
      const xp = data.xp || 0;
      console.log('✅ XP cargado desde Firestore:', xp, 'Nivel:', data.nivel);
      await updateGamificationHeader(xp);
      return xp;
    } else {
      console.warn('⚠️ No se encontró documento de usuario en Firestore');
      return 0;
    }
  } catch (error) {
    console.error('❌ Error cargando XP desde Firestore:', error);
    console.error('Error completo:', error.message, error.code);
    return 0;
  }
}

// Expose to window for non-module callers
try { 
  window.addXP = addXP; 
  window.updateGamificationHeader = updateGamificationHeader;
  window.loadXPFromFirestore = loadXPFromFirestore;
} catch(_) {}

// Utilidades adicionales de gamificación
export async function completeLesson(lessonId) {
  return await addXP(100, 'lesson_complete');
}

export async function submitTask(taskId) {
  return await addXP(50, 'task_submit');
}

export async function completeGame(gameId, score = 0) {
  return await addXP(25, 'game_complete');
}

// Toast de notificación para XP ganado
export function showXPToast(amount, source = 'generic') {
  const toast = document.createElement('div');
  toast.className = 'fixed top-20 right-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-4 rounded-lg shadow-2xl z-50 animate-slide-in-right';
  toast.innerHTML = `
    <div class="flex items-center space-x-3">
      <div class="text-3xl">⭐</div>
      <div>
        <p class="font-bold">+${amount} XP</p>
        <p class="text-sm opacity-90">${getXPSourceText(source)}</p>
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slide-out-right 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getXPSourceText(source) {
  const sources = {
    'lesson_complete': '¡Lección completada!',
    'task_submit': '¡Tarea entregada!',
    'game_complete': '¡Juego completado!',
    'generic': '¡Buen trabajo!'
  };
  return sources[source] || sources.generic;
}

// Actualizar estadísticas de racha
export function updateStreakDisplay(streakDays = 0) {
  const streakEl = document.getElementById('streakDays');
  const progressEl = document.getElementById('streakProgress');
  
  if (streakEl) streakEl.textContent = streakDays;
  if (progressEl) {
    const progress = (streakDays % 7) * 14.28; // 7 días = 100%
    progressEl.style.width = `${progress}%`;
  }
}

// Obtener marcos desbloqueados
export function getUnlockedFrames(level) {
  return FRAMES.filter(f => level >= f.unlockLevel);
}

// Verificar si un marco está desbloqueado
export function isFrameUnlocked(frameId, level) {
  const frame = FRAMES.find(f => f.id === frameId);
  return frame && level >= frame.unlockLevel;
}

// Exportar FRAMES para uso externo
export { FRAMES };

// Modal de subida de nivel
function showLevelUpModal(newLevel) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in';
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-8 max-w-md text-center shadow-2xl animate-scale-in">
      <div class="text-6xl mb-4">🎉</div>
      <h2 class="text-3xl font-bold text-gray-800 mb-2">¡Subiste de Nivel!</h2>
      <div class="text-5xl font-bold text-indigo-600 mb-4">Nivel ${newLevel}</div>
      <p class="text-gray-600 mb-6">¡Sigue así! Cada vez estás más cerca de ser un maestro del código.</p>
      <button onclick="this.closest('.fixed').remove()" class="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-semibold">
        ¡Genial!
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  
  setTimeout(() => {
    if (modal.parentElement) {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => modal.remove(), 300);
    }
  }, 5000);
}

// Exponer función globalmente
window.showLevelUpModal = showLevelUpModal;
