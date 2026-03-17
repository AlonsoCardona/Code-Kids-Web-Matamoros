// ============================================
// Sistema de Persistencia de Estado Global
// ============================================

// Clase para manejar el estado del usuario
class UserStateManager {
    constructor() {
        this.STORAGE_KEY = 'codekids_user_state';
        this.state = this.loadState();
    }

    // Cargar estado desde localStorage
    loadState() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsedState = JSON.parse(stored);
                
                // SOBRESCRIBIR CON VALORES DE LOCALSTORAGE SI EXISTEN
                const savedXP = localStorage.getItem('codekids_xp');
                const savedLevel = localStorage.getItem('codekids_level');
                
                if (savedXP) parsedState.xp = parseInt(savedXP) || 0;
                if (savedLevel) parsedState.nivel = parseInt(savedLevel) || 1;
                
                return parsedState;
            }
        } catch (error) {
            console.error('Error cargando estado:', error);
        }

        // Estado por defecto
        // INTENTAR CARGAR XP Y NIVEL DE LOCALSTORAGE
        const savedXP = localStorage.getItem('codekids_xp');
        const savedLevel = localStorage.getItem('codekids_level');
        
        return {
            xp: savedXP ? parseInt(savedXP) : 0,
            nivel: savedLevel ? parseInt(savedLevel) : 1,
            racha: 0,
            maxStreak: 0,
            unlockedFrames: [],
            selectedFrame: null,
            photoURL: null,
            stats: {
                lessonsCompleted: 0,
                gamesPlayed: 0,
                tasksSubmitted: 0,
                studyTimeMinutes: 0
            },
            completedLessons: [],
            completedGames: [],
            lastLesson: null,
            activityLog: [],
            loginDates: [],
            groupPosts: [],
            chatHistory: {}
        };
    }

    // Guardar estado en localStorage
    saveState() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
            return true;
        } catch (error) {
            console.error('Error guardando estado:', error);
            return false;
        }
    }

    // Obtener estado actual
    getState() {
        return { ...this.state };
    }

    // Actualizar estado
    updateState(updates) {
        this.state = { ...this.state, ...updates };
        this.saveState();
        this.notifyListeners();
    }

    // Sistema de listeners para notificar cambios
    listeners = [];
    
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback(this.state));
    }

    // Métodos específicos de gamificación
    addXP(amount, source = 'generic') {
        const oldXP = this.state.xp;
        const newXP = oldXP + amount;
        const oldLevel = this.state.nivel;
        const newLevel = this.calculateLevel(newXP);

        this.state.xp = newXP;
        this.state.nivel = newLevel;

        // Desbloquear marcos según nivel
        this.unlockFramesForLevel(newLevel);

        // Registrar actividad
        this.addActivity({
            type: 'xp_earned',
            amount,
            source,
            timestamp: Date.now()
        });

        this.saveState();
        this.notifyListeners();

        // Retornar info del cambio
        return {
            oldXP,
            newXP,
            oldLevel,
            newLevel,
            leveledUp: newLevel > oldLevel,
            source
        };
    }

    calculateLevel(totalXP) {
        const thresholds = [100, 150, 250, 350, 500, 650, 800, 1000, 1200];
        let level = 1;
        let remaining = totalXP;

        for (let i = 0; i < thresholds.length; i++) {
            if (remaining >= thresholds[i]) {
                remaining -= thresholds[i];
                level++;
            } else {
                break;
            }
        }

        return Math.min(level, 10); // Máximo nivel 10
    }

    getLevelProgress() {
        const thresholds = [100, 150, 250, 350, 500, 650, 800, 1000, 1200];
        const level = this.state.nivel;
        
        if (level >= 10) {
            return {
                level: 10,
                currentXP: 0,
                nextLevelXP: 0,
                progress: 100
            };
        }

        let totalNeeded = 0;
        for (let i = 0; i < level - 1; i++) {
            totalNeeded += thresholds[i];
        }

        const currentXP = this.state.xp - totalNeeded;
        const nextLevelXP = thresholds[level - 1];
        const progress = Math.floor((currentXP / nextLevelXP) * 100);

        return {
            level,
            currentXP,
            nextLevelXP,
            progress
        };
    }

    unlockFramesForLevel(level) {
        const frames = [
            { id: 'marco_bronce', unlockLevel: 2 },
            { id: 'marco_plata', unlockLevel: 5 },
            { id: 'marco_oro', unlockLevel: 8 },
            { id: 'marco_diamante', unlockLevel: 10 }
        ];

        const unlocked = new Set(this.state.unlockedFrames);
        frames.forEach(frame => {
            if (level >= frame.unlockLevel) {
                unlocked.add(frame.id);
            }
        });

        this.state.unlockedFrames = Array.from(unlocked);
    }

    // Gestión de racha
    updateStreak() {
        const today = new Date().toDateString();
        const loginDates = this.state.loginDates || [];

        // Si ya hay login hoy, no hacer nada
        if (loginDates.includes(today)) {
            return;
        }

        // Agregar fecha de hoy
        loginDates.push(today);

        // Verificar si la racha continúa
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (loginDates.includes(yesterdayStr) || this.state.racha === 0) {
            // Continúa la racha
            this.state.racha++;
            if (this.state.racha > this.state.maxStreak) {
                this.state.maxStreak = this.state.racha;
            }
        } else {
            // Se rompió la racha
            this.state.racha = 1;
        }

        // Mantener solo últimos 30 días
        if (loginDates.length > 30) {
            loginDates.shift();
        }

        this.state.loginDates = loginDates;
        this.saveState();
        this.notifyListeners();
    }

    // Gestión de actividades
    addActivity(activity) {
        const activities = this.state.activityLog || [];
        activities.unshift({
            ...activity,
            id: Date.now() + Math.random(),
            timestamp: activity.timestamp || Date.now()
        });

        // Mantener solo últimas 50 actividades
        if (activities.length > 50) {
            activities.pop();
        }

        this.state.activityLog = activities;
    }

    // Marcar lección como completada
    completeLesson(lessonId) {
        if (!this.state.completedLessons.includes(lessonId)) {
            this.state.completedLessons.push(lessonId);
            this.state.stats.lessonsCompleted++;
            this.addActivity({
                type: 'lesson_completed',
                lessonId,
                timestamp: Date.now()
            });
            this.saveState();
            this.notifyListeners();
        }
    }

    // Guardar última lección vista
    setLastLesson(lessonData) {
        this.state.lastLesson = lessonData;
        this.saveState();
    }

    // Completar juego
    completeGame(gameId, score = 0) {
        const gameRecord = {
            gameId,
            score,
            timestamp: Date.now()
        };

        this.state.completedGames.push(gameRecord);
        this.state.stats.gamesPlayed++;
        this.addActivity({
            type: 'game_completed',
            gameId,
            score,
            timestamp: Date.now()
        });
        this.saveState();
        this.notifyListeners();
    }

    // Gestión de foto de perfil con blob
    setProfilePhoto(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            try {
                const blobURL = URL.createObjectURL(file);
                
                // Leer archivo como base64 para persistencia
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = e.target.result;
                    this.state.photoURL = base64;
                    this.saveState();
                    this.notifyListeners();
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Seleccionar marco
    selectFrame(frameId) {
        this.state.selectedFrame = frameId;
        this.saveState();
        this.notifyListeners();
    }

    // Gestión de posts de grupo
    addGroupPost(post) {
        const posts = this.state.groupPosts || [];
        posts.unshift({
            ...post,
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            comments: []
        });
        this.state.groupPosts = posts;
        this.saveState();
        this.notifyListeners();
    }

    addCommentToPost(postId, comment) {
        const posts = this.state.groupPosts || [];
        const post = posts.find(p => p.id === postId);
        if (post) {
            post.comments.push({
                ...comment,
                id: Date.now() + Math.random(),
                timestamp: Date.now()
            });
            this.saveState();
            this.notifyListeners();
        }
    }

    // Gestión de chat
    addChatMessage(userId, message, isMine = true) {
        if (!this.state.chatHistory[userId]) {
            this.state.chatHistory[userId] = [];
        }

        this.state.chatHistory[userId].push({
            text: message,
            isMine,
            timestamp: Date.now()
        });

        this.saveState();
        this.notifyListeners();

        // Simular respuesta del bot si no es mío
        if (isMine) {
            setTimeout(() => {
                this.addChatMessage(userId, `Mensaje recibido: ${message}`, false);
            }, 1500);
        }
    }

    getChatHistory(userId) {
        return this.state.chatHistory[userId] || [];
    }

    // Resetear estado (para testing)
    reset() {
        this.state = this.loadState();
        localStorage.removeItem(this.STORAGE_KEY);
        this.saveState();
        this.notifyListeners();
    }
}

// Crear instancia global
const userState = new UserStateManager();

// Actualizar racha al cargar
userState.updateStreak();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserStateManager, userState };
}

// Exponer globalmente
window.userState = userState;
window.UserStateManager = UserStateManager;

console.log('✅ Sistema de persistencia de estado inicializado');
