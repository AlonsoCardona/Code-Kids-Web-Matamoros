/**
 * LECCIONES ENHANCEMENTS JAVASCRIPT
 * Sistema de misiones gamificadas para lecciones
 */

(function() {
    'use strict';

    // ============ CONFIGURACIÓN DE MISIONES ============
    const missionThemes = {
        'Python': {
            icon: '🐍',
            gradient: 'mission-image-python',
            difficulty: 1
        },
        'JavaScript': {
            icon: '⚡',
            gradient: 'mission-image-javascript',
            difficulty: 2
        },
        'HTML': {
            icon: '🏗️',
            gradient: 'mission-image-html',
            difficulty: 1
        },
        'CSS': {
            icon: '🎨',
            gradient: 'mission-image-css',
            difficulty: 1
        }
    };

    // ============ CREAR TARJETA DE MISIÓN ============
    function createMissionCard(course) {
        const theme = getMissionTheme(course.title);
        const progress = calculateProgress(course);
        const isCompleted = progress === 100;
        
        const card = document.createElement('div');
        card.className = `mission-card ${isCompleted ? 'completed' : ''}`;
        card.dataset.courseId = course.id;
        
        card.innerHTML = `
            <div class="mission-image ${theme.gradient}">
                <div class="mission-icon">${theme.icon}</div>
                ${isCompleted ? `
                    <div class="mission-badge-completed">
                        <span>🏆</span>
                        <span>¡Completado!</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="mission-content">
                <div class="mission-title-container">
                    <h3 class="mission-title">${course.title}</h3>
                    <div class="mission-difficulty">
                        ${getDifficultyStars(theme.difficulty)}
                        <span>${getDifficultyText(theme.difficulty)}</span>
                    </div>
                </div>
                
                <p class="mission-description">${getMissionDescription(course)}</p>
                
                <div class="mission-stats">
                    <div class="mission-stat">
                        <span class="mission-stat-icon">⏱️</span>
                        <span>${course.duration || '45 min'}</span>
                    </div>
                    <div class="mission-stat">
                        <span class="mission-stat-icon">🎯</span>
                        <span>${course.videos?.length || 0} Etapas</span>
                    </div>
                    <div class="mission-stat">
                        <span class="mission-stat-icon">⭐</span>
                        <span>+${calculateXP(course)} XP</span>
                    </div>
                </div>
                
                <div class="mission-progress">
                    <div class="mission-progress-label">
                        <span class="mission-progress-text">
                            ${isCompleted ? '¡Misión Completa!' : 'Progreso de Misión'}
                        </span>
                        <span class="mission-progress-percentage">${progress}%</span>
                    </div>
                    <div class="mission-progress-bar-container">
                        <div class="mission-progress-bar ${isCompleted ? 'complete' : ''}" 
                             style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <button class="mission-action-btn ${isCompleted ? 'review' : 'continue'}" 
                        onclick="window.openCourseDash('${course.id}')">
                    <span class="mission-action-icon">${isCompleted ? '🏆' : '🚀'}</span>
                    <span>${isCompleted ? '¡Revisar Logros!' : '¡Continuar Misión!'}</span>
                </button>
            </div>
        `;
        
        // Agregar animación de entrada
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100);
        
        // Agregar hover effects
        card.addEventListener('mouseenter', () => {
            if (window.dashboardEnhancements) {
                const rect = card.getBoundingClientRect();
                // Pequeño efecto visual
            }
        });
        
        return card;
    }

    // ============ OBTENER TEMA DE MISIÓN ============
    function getMissionTheme(title) {
        for (const [key, theme] of Object.entries(missionThemes)) {
            if (title.toLowerCase().includes(key.toLowerCase())) {
                return theme;
            }
        }
        return {
            icon: '💻',
            gradient: 'mission-image',
            difficulty: 1
        };
    }

    // ============ CALCULAR PROGRESO ============
    function calculateProgress(course) {
        if (!course.videos || course.videos.length === 0) return 0;
        
        const completed = course.videos.filter(v => v.completed).length;
        return Math.round((completed / course.videos.length) * 100);
    }

    // ============ OBTENER ESTRELLAS DE DIFICULTAD ============
    function getDifficultyStars(level) {
        const stars = [];
        for (let i = 0; i < level; i++) {
            stars.push('<span class="difficulty-star">⭐</span>');
        }
        return stars.join('');
    }

    // ============ OBTENER TEXTO DE DIFICULTAD ============
    function getDifficultyText(level) {
        const texts = {
            1: 'Misión Fácil',
            2: 'Reto Medio',
            3: 'Desafío Difícil'
        };
        return texts[level] || 'Misión Fácil';
    }

    // ============ OBTENER DESCRIPCIÓN DE MISIÓN ============
    function getMissionDescription(course) {
        const descriptions = {
            'Python': '¡Controla al robot con el poder de Python! Aprende los comandos básicos y crea programas increíbles. 🐍',
            'JavaScript': '¡Domina la magia de JavaScript! Haz que las páginas web cobren vida con interactividad. ⚡',
            'HTML': '¡Construye tu castillo digital! Aprende a crear estructuras web con bloques de código. 🏗️',
            'CSS': '¡Pinta tu mundo web! Aprende a dar estilo y color a tus creaciones digitales. 🎨'
        };
        
        for (const [key, desc] of Object.entries(descriptions)) {
            if (course.title.toLowerCase().includes(key.toLowerCase())) {
                return desc;
            }
        }
        
        return course.description || '¡Embárcate en esta emocionante aventura de programación! 🚀';
    }

    // ============ CALCULAR XP ============
    function calculateXP(course) {
        const baseXP = 50;
        const videosCount = course.videos?.length || 5;
        return baseXP + (videosCount * 10);
    }

    // ============ RENDERIZAR MISIONES ============
    function renderMissions(courses) {
        const container = document.getElementById('coursesGridDash');
        if (!container) return;
        
        container.innerHTML = '';
        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        
        courses.forEach((course, index) => {
            const card = createMissionCard(course);
            container.appendChild(card);
            
            // Animación escalonada
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }

    // ============ MOSTRAR RECOMPENSA AL COMPLETAR ============
    function showCompletionReward(courseName) {
        if (!window.dashboardEnhancements) return;
        
        // Confeti
        window.dashboardEnhancements.createConfetti(
            window.innerWidth / 2,
            window.innerHeight / 2,
            50
        );
        
        // Notificación de logro
        window.dashboardEnhancements.showAchievementNotification(
            '¡Misión Completada! 🎉',
            `Has completado ${courseName}. ¡Eres increíble!`,
            '🏆'
        );
        
        // Mensaje de la mascota
        window.dashboardEnhancements.showMascotMessage(
            '¡WOW! ¡Eres un verdadero maestro del código! 🌟',
            4000
        );
        
        // Animar XP ganado
        const xp = 100; // XP base por completar curso
        window.dashboardEnhancements.animateXPGain(xp / 10);
    }

    // ============ ACTUALIZAR HEADER DE LECCIONES ============
    function updateLeccionesHeader() {
        const catalogView = document.getElementById('catalogViewDash');
        if (!catalogView) return;
        
        const existingHeader = catalogView.querySelector('.missions-header');
        if (existingHeader) return; // Ya existe
        
        const headerHTML = `
            <div class="missions-header">
                <h1 class="missions-title">¡Tus Misiones de Código! 🚀</h1>
                <p class="missions-subtitle">¡Elige con qué lenguaje mágico quieres programar!</p>
            </div>
        `;
        
        const currentHeader = catalogView.querySelector('div.mb-6');
        if (currentHeader) {
            currentHeader.outerHTML = headerHTML;
        }
    }

    // ============ INTERCEPTAR CARGA DE CURSOS ============
    function interceptCoursesLoad() {
        // Observar cambios en el grid de cursos
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.classList && node.classList.contains('card')) {
                            // Transformar tarjeta antigua en tarjeta de misión
                            transformOldCard(node);
                        }
                    });
                }
            });
        });
        
        const coursesGrid = document.getElementById('coursesGridDash');
        if (coursesGrid) {
            observer.observe(coursesGrid, { childList: true, subtree: true });
        }
    }

    // ============ TRANSFORMAR TARJETA ANTIGUA ============
    function transformOldCard(oldCard) {
        // Extraer datos de la tarjeta antigua
        const courseData = extractCourseData(oldCard);
        
        // Crear nueva tarjeta de misión
        const newCard = createMissionCard(courseData);
        
        // Reemplazar
        oldCard.replaceWith(newCard);
    }

    // ============ EXTRAER DATOS DE CURSO ============
    function extractCourseData(card) {
        const title = card.querySelector('h3')?.textContent || 'Curso';
        const description = card.querySelector('p')?.textContent || '';
        const progress = card.querySelector('.bg-indigo-600')?.style.width || '0%';
        
        return {
            id: card.dataset.courseId || Math.random().toString(36),
            title: title,
            description: description,
            progress: parseInt(progress),
            videos: [],
            duration: '45 min'
        };
    }

    // ============ INICIALIZACIÓN ============
    function init() {
        console.log('🎮 Lecciones Enhancements iniciado');
        
        // Actualizar header
        updateLeccionesHeader();
        
        // Interceptar carga de cursos
        interceptCoursesLoad();
        
        // Observar cambio de sección
        const observer = new MutationObserver(() => {
            const leccionesSection = document.getElementById('section-lecciones');
            if (leccionesSection && !leccionesSection.classList.contains('hidden')) {
                updateLeccionesHeader();
            }
        });
        
        const mainContent = document.querySelector('main');
        if (mainContent) {
            observer.observe(mainContent, { attributes: true, subtree: true });
        }
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exportar funciones
    window.leccionesEnhancements = {
        renderMissions,
        createMissionCard,
        showCompletionReward
    };

})();
