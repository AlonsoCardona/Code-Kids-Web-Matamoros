// ========== MÓDULO DE LECCIONES EN DASHBOARD ==========

// Extrae el ID de YouTube de una URL completa
function extractYouTubeId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

// Catálogo de cursos (puede ser extendido con datos de Firestore)
let COURSES_DASH = [
  {
    id: 'python_basico',
    title: '¡Misión Python: Tu Primera Aventura Programando!',
    description: '¿Te gustaría saber cómo hablan las computadoras? ¡En este video súper divertido aprenderás a crear tus primeros hechizos tecnológicos usando Python! No necesitas saber nada de antes, solo muchas ganas de divertirte, explorar y escribir tu primer "¡Hola Mundo!".',
    thumbnail: '/images/Cursos/FondoCurso.PNG',
    level: 'Principiante',
    duration: '~30 min',
    videos: [
      { id:'v1', title:'¡Introduccion a Programacion! | Python | Parte 1', ytId:'g8q4teQ2BN4', duration: 300 },
      { id:'v2', title:'¡Introduccion a Programacion! | Python | Parte 2', ytId:'StBHsV-GGA8', duration: 300 },
      { id:'v3', title:'¡Introduccion a Programacion! | Python | Parte 3', ytId:'67db0eerTKE', duration: 300 }
    ]
  },
  {
    id: 'javascript_intro',
    title: 'JavaScript para Principiantes',
    description: 'Descubre el lenguaje que hace las páginas web interactivas. Aprenderás a manipular el DOM, crear funciones y trabajar con eventos. Ideal para quien quiere crear sus primeras páginas dinámicas.',
    thumbnail: 'https://img.youtube.com/vi/z95mZVUcJ-E/maxresdefault.jpg',
    level: 'Principiante',
    duration: '1 hora',
    videos: [
      { id:'js1', title:'Introducción a JavaScript', ytId:'z95mZVUcJ-E', duration: 600 },
      { id:'js2', title:'Variables y Operadores', ytId:'Zlr5rNSpPBo', duration: 480 },
      { id:'js3', title:'Funciones', ytId:'N8ap4k_1QEQ', duration: 540 }
    ]
  },
  {
    id: 'html_css_basico',
    title: 'HTML & CSS Básico',
    description: 'Crea tus primeras páginas web. Aprenderás la estructura de HTML y cómo darle estilo con CSS. Al final del curso, podrás crear sitios web simples pero atractivos.',
    thumbnail: 'https://img.youtube.com/vi/kN1XP-Bef7w/maxresdefault.jpg',
    level: 'Principiante',
    duration: '50 min',
    videos: [
      { id:'html1', title:'Estructura HTML', ytId:'kN1XP-Bef7w', duration: 400 },
      { id:'html2', title:'CSS Básico', ytId:'wRNinF7YQqQ', duration: 480 },
      { id:'html3', title:'Flexbox y Grid', ytId:'tXIhdp5R7sc', duration: 520 }
    ]
  }
];

let currentCourseDash = null;
let currentVideoIndexDash = 0;
let ytPlayerDash = null;
let progressIntervalDash = null;
let userProgressDash = {};

export async function initLecciones() {
  // Cargar API de YouTube
  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }

  // Cargar cursos desde Firestore y añadirlos al frente del catálogo
  try {
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const snap = await getDocs(collection(window.db, 'courses'));
    if (!snap.empty) {
      const firestoreCourses = [];
      snap.forEach(d => {
        const c = d.data();
        const videos = (c.steps || []).map((s, i) => {
          const ytId = extractYouTubeId(s.videoUrl || '');
          return { id: `s${i + 1}`, title: s.title || `Paso ${i + 1}`, ytId, duration: 300 };
        }).filter(v => v.ytId);
        if (c.name && videos.length > 0) {
          const firstYtId = videos[0].ytId;
          firestoreCourses.push({
            id: d.id,
            title: c.name,
            description: c.description || '',
            thumbnail: c.imageUrl || `https://img.youtube.com/vi/${firstYtId}/maxresdefault.jpg`,
            level: c.level ? (c.level.charAt(0).toUpperCase() + c.level.slice(1)) : 'Principiante',
            duration: c.duration || '',
            videos
          });
        }
      });
      if (firestoreCourses.length > 0) {
        COURSES_DASH = [...firestoreCourses, ...COURSES_DASH];
      }
    }
  } catch (err) {
    console.error('[Lecciones] Error cargando cursos de Firestore:', err);
  }
  
  // Cargar progreso del usuario
  await loadUserProgressDash();
  
  // Renderizar catálogo
  renderCatalogDash();
  
  // Event listeners
  document.getElementById('btnBackToCatalogDash')?.addEventListener('click', showCatalogDash);
}

async function loadUserProgressDash() {
  const user = window.auth?.currentUser;
  if (!user) return;
  
  try {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const progressDoc = await getDoc(doc(window.db, `users/${user.uid}/progress/lessons`));
    if (progressDoc.exists()) {
      userProgressDash = progressDoc.data().courses || {};
    }
  } catch (error) {
    console.error('Error cargando progreso:', error);
  }
}

async function saveProgressDash() {
  const user = window.auth?.currentUser;
  if (!user) return;
  
  try {
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    await setDoc(doc(window.db, `users/${user.uid}/progress/lessons`), {
      courses: userProgressDash,
      lastUpdated: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Error guardando progreso:', error);
  }
}

function renderCatalogDash() {
  const grid = document.getElementById('coursesGridDash');
  if (!grid) return;
  
  grid.innerHTML = COURSES_DASH.map(course => {
    const courseProgress = userProgressDash[course.id] || {};
    const completedVideos = Object.values(courseProgress).filter(v => v.completed).length;
    const totalVideos = course.videos.length;
    const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    return `
      <div class="course-card bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition" data-course-id="${course.id}">
        <div class="aspect-video bg-gray-200 overflow-hidden">
          <img src="${course.thumbnail}" alt="${course.title}" class="w-full h-full object-cover">
        </div>
        <div class="p-5">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">${course.level}</span>
            <span class="text-xs text-gray-500">⏱️ ${course.duration}</span>
          </div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">${course.title}</h3>
          <p class="text-sm text-gray-600 mb-4 line-clamp-2">${course.description.substring(0, 100)}...</p>
          
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>${completedVideos} de ${totalVideos} videos</span>
              <span>${progressPercent}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-indigo-600 h-2 rounded-full transition-all" style="width: ${progressPercent}%"></div>
            </div>
          </div>
          
          <button class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-semibold">
            ${progressPercent > 0 ? 'Continuar' : 'Comenzar'} →
          </button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.course-card').forEach(card => {
    card.addEventListener('click', () => {
      const courseId = card.getAttribute('data-course-id');
      openCourseDash(courseId);
    });
  });
}

function openCourseDash(courseId) {
  currentCourseDash = COURSES_DASH.find(c => c.id === courseId);
  if (!currentCourseDash) return;

  if (!userProgressDash[courseId]) {
    userProgressDash[courseId] = {};
  }

  renderCourseDetailDash();
  showDetailDash();
  
  const firstIncomplete = currentCourseDash.videos.findIndex((v) => {
    return !userProgressDash[courseId][v.id]?.completed;
  });
  loadVideoDash(firstIncomplete >= 0 ? firstIncomplete : 0);
}

function renderCourseDetailDash() {
  document.getElementById('courseTitleDash').textContent = currentCourseDash.title;
  document.getElementById('courseDescriptionDash').textContent = currentCourseDash.description;
  
  updateCourseProgressDash();
  renderVideosListDash();
}

function updateCourseProgressDash() {
  const courseProgress = userProgressDash[currentCourseDash.id] || {};
  const completedCount = Object.values(courseProgress).filter(v => v.completed).length;
  const totalCount = currentCourseDash.videos.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  document.getElementById('courseProgressDash').textContent = `${percent}% completado`;
  document.getElementById('courseProgressBarDash').style.width = `${percent}%`;
}

function renderVideosListDash() {
  const list = document.getElementById('videosListDash');
  const courseProgress = userProgressDash[currentCourseDash.id] || {};
  
  list.innerHTML = currentCourseDash.videos.map((video, index) => {
    const isCompleted = courseProgress[video.id]?.completed || false;
    const isLocked = index > 0 && !courseProgress[currentCourseDash.videos[index - 1].id]?.completed;
    const isCurrent = index === currentVideoIndexDash;
    
    return `
      <div class="video-item ${isCompleted ? 'bg-green-50' : ''} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${isCurrent ? 'border-2 border-indigo-500' : 'border border-gray-200'} rounded-lg p-3 transition" data-video-index="${index}">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            ${isCompleted ? '✅' : isLocked ? '🔒' : isCurrent ? '▶️' : '⭕'}
          </div>
          <div class="flex-1">
            <div class="text-sm font-semibold text-gray-800">${video.title}</div>
            <div class="text-xs text-gray-500">${Math.floor(video.duration / 60)} min</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.video-item').forEach((item, index) => {
    const isLocked = index > 0 && !courseProgress[currentCourseDash.videos[index - 1].id]?.completed;
    if (!isLocked) {
      item.addEventListener('click', () => loadVideoDash(index));
    }
  });
}

function loadVideoDash(index) {
  currentVideoIndexDash = index;
  const video = currentCourseDash.videos[index];
  
  document.getElementById('currentVideoTitleDash').textContent = video.title;
  document.getElementById('videoProgressDash').textContent = 'Progreso: 0%';
  document.getElementById('btnMarkCompleteDash').classList.add('hidden');
  
  renderVideosListDash();
  
  if (ytPlayerDash) {
    ytPlayerDash.destroy();
  }

  const container = document.getElementById('ytPlayerContainerDash');
  container.innerHTML = '<div id="ytPlayerDash"></div>';
  
  if (window.YT && window.YT.Player) {
    createPlayerDash(video.ytId);
  } else {
    window.onYouTubeIframeAPIReady = () => {
      createPlayerDash(video.ytId);
    };
  }
}

function createPlayerDash(videoId) {
  ytPlayerDash = new YT.Player('ytPlayerDash', {
    width: '100%',
    height: '100%',
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: onPlayerReadyDash,
      onStateChange: onPlayerStateChangeDash
    }
  });
}

function onPlayerReadyDash(event) {
  document.getElementById('videoLoadingDash').classList.add('hidden');
  startProgressTrackingDash();
}

function onPlayerStateChangeDash(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    startProgressTrackingDash();
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    stopProgressTrackingDash();
  }
}

function startProgressTrackingDash() {
  stopProgressTrackingDash();
  progressIntervalDash = setInterval(() => {
    if (!ytPlayerDash || !ytPlayerDash.getDuration) return;
    
    const currentTime = ytPlayerDash.getCurrentTime();
    const duration = ytPlayerDash.getDuration();
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    document.getElementById('videoProgressDash').textContent = `Progreso: ${Math.round(progress)}%`;
    
    if (progress >= 90) {
      const video = currentCourseDash.videos[currentVideoIndexDash];
      const courseProgress = userProgressDash[currentCourseDash.id] || {};
      
      if (!courseProgress[video.id]?.completed) {
        document.getElementById('btnMarkCompleteDash').classList.remove('hidden');
        stopProgressTrackingDash();
      }
    }
  }, 1000);
}

function stopProgressTrackingDash() {
  if (progressIntervalDash) {
    clearInterval(progressIntervalDash);
    progressIntervalDash = null;
  }
}

document.getElementById('btnMarkCompleteDash')?.addEventListener('click', async () => {
  const video = currentCourseDash.videos[currentVideoIndexDash];
  
  if (!userProgressDash[currentCourseDash.id]) {
    userProgressDash[currentCourseDash.id] = {};
  }
  userProgressDash[currentCourseDash.id][video.id] = {
    completed: true,
    completedAt: new Date(),
    progress: 100
  };
  
  await saveProgressDash();
  
  if (window.addXP) {
    await window.addXP(50);
  }
  
  alert(`¡Felicitaciones! 🎉\n\nHas completado: ${video.title}\n+50 XP`);
  
  updateCourseProgressDash();
  renderVideosListDash();
  document.getElementById('btnMarkCompleteDash').classList.add('hidden');
  
  if (currentVideoIndexDash < currentCourseDash.videos.length - 1) {
    setTimeout(() => {
      if (confirm('¿Quieres continuar con el siguiente video?')) {
        loadVideoDash(currentVideoIndexDash + 1);
      }
    }, 500);
  } else {
    alert('🎊 ¡Felicitaciones!\n\nHas completado todo el curso.');
  }
});

function showCatalogDash() {
  document.getElementById('catalogViewDash').classList.remove('hidden');
  document.getElementById('detailViewDash').classList.add('hidden');
  stopProgressTrackingDash();
  if (ytPlayerDash) {
    ytPlayerDash.destroy();
    ytPlayerDash = null;
  }
  renderCatalogDash();
}

function showDetailDash() {
  document.getElementById('catalogViewDash').classList.add('hidden');
  document.getElementById('detailViewDash').classList.remove('hidden');
}
