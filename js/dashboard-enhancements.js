/**
 * DASHBOARD ENHANCEMENTS JAVASCRIPT
 * Interactividad y efectos especiales para el dashboard infantil
 */

(function() {
    'use strict';

    // ============ SISTEMA DE CONFETI ============
    function createConfetti(x, y, count = 30) {
        const colors = ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
        
        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = x + 'px';
            confetti.style.top = y + 'px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            confetti.style.animationDelay = `${Math.random() * 0.5}s`;
            confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 4000);
        }
    }

    // ============ ANIMACIÓN DE XP ============
    function animateXPGain(amount) {
        const xpBar = document.getElementById('userXP');
        if (!xpBar) return;

        const currentWidth = parseFloat(xpBar.style.width) || 0;
        const newWidth = Math.min(100, currentWidth + amount);
        
        xpBar.style.width = newWidth + '%';
        
        // Si llega al 100%, activar confeti
        if (newWidth >= 100) {
            const rect = xpBar.getBoundingClientRect();
            createConfetti(rect.left + rect.width / 2, rect.top, 50);
        }
    }

    // ============ INTERACCIÓN CON TARJETAS DE PROGRESO ============
    function setupStatCards() {
        const statCards = document.querySelectorAll('.stat-card-enhanced');
        
        statCards.forEach(card => {
            card.addEventListener('click', function() {
                const cardType = this.classList.contains('stat-card-lecciones') ? 'lecciones' :
                                this.classList.contains('stat-card-juegos') ? 'juegos' :
                                this.classList.contains('stat-card-marcos') ? 'marcos' : 'tiempo';
                
                // Crear efecto de clic
                const rect = this.getBoundingClientRect();
                createCoinEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
            });

            // Efecto hover con sonido (opcional)
            card.addEventListener('mouseenter', function() {
                this.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            });
        });
    }

    // ============ EFECTO DE MONEDAS ============
    function createCoinEffect(x, y) {
        for (let i = 0; i < 5; i++) {
            const coin = document.createElement('div');
            coin.textContent = '⭐';
            coin.style.position = 'fixed';
            coin.style.left = x + 'px';
            coin.style.top = y + 'px';
            coin.style.fontSize = '1.5rem';
            coin.style.zIndex = '9999';
            coin.style.pointerEvents = 'none';
            coin.style.animation = 'coin-bounce 1s ease-out forwards';
            
            const angle = (Math.PI * 2 * i) / 5;
            const distance = 50;
            coin.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
            
            document.body.appendChild(coin);
            setTimeout(() => coin.remove(), 1000);
        }
    }

    // ============ ACTUALIZACIÓN DE RACHA ============
    function updateStreak(days) {
        const streakDays = document.getElementById('streakDays');
        const streakProgress = document.getElementById('streakProgress');
        
        if (streakDays) {
            streakDays.textContent = days;
        }
        
        if (streakProgress) {
            const progress = (days % 7) * (100 / 7); // Ciclo semanal
            streakProgress.style.width = progress + '%';
        }
        
        // Mensaje motivacional cada 7 días
        if (days > 0 && days % 7 === 0) {
            const rect = document.querySelector('.streak-widget-enhanced')?.getBoundingClientRect();
            if (rect) {
                createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
            }
        }
    }

    // ============ INTERACCIÓN CON MASCOTA ================
    function smoothProgressUpdate(elementId, targetPercentage, duration = 1000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const start = parseFloat(element.style.width) || 0;
        const end = targetPercentage;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (easeOutCubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = start + (end - start) * easeProgress;
            
            element.style.width = currentValue + '%';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }

    // ============ NOTIFICACIONES DE LOGROS ============
    function showAchievementNotification(title, description, icon = '🏆') {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
            z-index: 10000;
            max-width: 300px;
            animation: slideInRight 0.5s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2rem;">${icon}</div>
                <div>
                    <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 5px;">${title}</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">${description}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    // Agregar animaciones CSS necesarias
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // ============ TOGGLE HEADER ============
    function setupHeaderToggle() {
        const header = document.getElementById('mainHeader');
        const toggleBtn = document.getElementById('toggleHeaderBtn');
        const arrowIcon = document.getElementById('headerArrowIcon');
        const mainContent = document.querySelector('main');
        
        if (!header || !toggleBtn || !arrowIcon) return;
        
        let isMinimized = false;
        
        toggleBtn.addEventListener('click', function() {
            isMinimized = !isMinimized;
            
            if (isMinimized) {
                // Minimizar header
                header.style.transform = 'translateY(-100%)';
                toggleBtn.style.top = '0';
                arrowIcon.style.transform = 'rotate(180deg)';
                
                // Ajustar contenido principal
                if (mainContent) {
                    mainContent.style.paddingTop = '2rem';
                }
            } else {
                // Expandir header
                header.style.transform = 'translateY(0)';
                toggleBtn.style.top = '';
                arrowIcon.style.transform = 'rotate(0deg)';
                
                // Restaurar padding del contenido
                if (mainContent) {
                    mainContent.style.paddingTop = '';
                }
            }
        });
    }

    // ============ INICIALIZACIÓN ============
    function init() {
        console.log('🎨 Dashboard Enhancements iniciado');
        
        setupStatCards();
        setupHeaderToggle();
        
        // Simular carga de datos iniciales
        setTimeout(() => {
            const userLevel = document.getElementById('userLevel');
            if (userLevel) {
                const level = parseInt(userLevel.textContent.replace('Nivel ', '')) || 1;
                updateStreak(3); // Ejemplo: 3 días de racha
            }
        }, 500);
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exportar funciones para uso externo
    window.dashboardEnhancements = {
        createConfetti,
        animateXPGain,
        createCoinEffect,
        updateStreak,
        smoothProgressUpdate,
        showAchievementNotification
    };

})();
