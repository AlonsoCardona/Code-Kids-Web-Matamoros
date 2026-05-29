// cypress/e2e/05_dashboard_profesor.cy.js
// Pruebas funcionales del Dashboard de Profesor
// Profesora de prueba: Graciela Salazar

const PROF_EMAIL        = 'graciela.salazar70@codekids.com';
const PROF_PASSWORD     = '4J62dqUuZX';            // contraseña inicial (temporal del admin)
const PROF_PASSWORD_NEW = 'CodeKidsP26#Gracia!';   // contraseña tras el cambio obligatorio (>= 12 chars)
const DASHBOARD_URL     = '/Dashboard/Dashboard_Profesor/Dashboard_Profesor.html';

/**
 * Inicia sesión como profesora usando cy.session() para cachear el estado de auth
 * (cookies, localStorage, sessionStorage e IndexedDB donde Firebase guarda el token).
 * El login real solo ocurre UNA VEZ; las llamadas siguientes restauran la sesión sin
 * hacer peticiones a Firebase, evitando el bloqueo por "demasiados intentos".
 */
function loginAsProfesor() {
    cy.session(PROF_EMAIL, () => {
        // ── Setup: corre SOLO la primera vez (o si validate() falla) ────────
        cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
        cy.get('#email').should('be.visible').type(PROF_EMAIL);
        cy.get('#password').type(PROF_PASSWORD);
        cy.get('button[type="submit"], input[type="submit"]').first().click();

        cy.get('body', { timeout: 30000 }).should($body => {
            const forceModal = $body.find('#forceChangeModal:not(.hidden)').length > 0;
            const errorMsg   = $body.find('#errorMessage:not(.hidden)').length > 0;
            const formGone   = $body.find('#email').length === 0;
            expect(forceModal || errorMsg || formGone, 'esperando respuesta de Firebase').to.be.true;
        }).then($body => {
            if ($body.find('#forceChangeModal:not(.hidden)').length) {
                // Caso 1: primera sesión con contraseña temporal
                cy.log('⚠ forceChangeModal detectado → redirigiendo al dashboard');
                cy.get('#btnGoChange').click();
                cy.url({ timeout: 30000 }).should('include', 'Dashboard_Profesor');
                cy.get('#changePasswordForm', { timeout: 20000 }).should('exist');
                cy.get('#newPassword').type(PROF_PASSWORD_NEW, { force: true });
                cy.get('#confirmPassword').type(PROF_PASSWORD_NEW, { force: true });
                cy.get('#changePasswordForm [type="submit"]').click({ force: true });
                cy.url({ timeout: 25000 }).should('include', 'Inicio_De_Sesion');
                cy.get('#email').should('be.visible').type(PROF_EMAIL);
                cy.get('#password').type(PROF_PASSWORD_NEW);
                cy.get('button[type="submit"], input[type="submit"]').first().click();
                cy.url({ timeout: 30000 }).should('include', 'Dashboard_Profesor');
            } else if ($body.find('#errorMessage:not(.hidden)').length) {
                // Caso 2: contraseña ya fue cambiada en una ejecución anterior
                cy.log('⚠ Error de credenciales → probando PROF_PASSWORD_NEW');
                cy.get('#password').clear().type(PROF_PASSWORD_NEW);
                cy.get('button[type="submit"], input[type="submit"]').first().click();
                cy.url({ timeout: 30000 }).should('include', 'Dashboard_Profesor');
            }
            // Caso 3: formGone → redirect ya en curso, sin modal
        });

        cy.url({ timeout: 30000 }).should('include', 'Dashboard_Profesor');
        cy.get('#userName', { timeout: 20000 }).should('not.contain', 'Cargando');
    }, {
        // ── Validate: comprueba que la sesión restaurada sigue siendo válida ─
        validate() {
            cy.visit(DASHBOARD_URL);
            cy.url({ timeout: 15000 }).should('include', 'Dashboard_Profesor');
        }
    });

    // Después de restaurar/crear la sesión, navegar al dashboard para el test
    cy.visit(DASHBOARD_URL);
    cy.get('#userName', { timeout: 20000 }).should('not.contain', 'Cargando');
}

// ═══════════════════════════════════════════════════════════════
describe('Login de Profesor', () => {
    it('Inicia sesión y redirige al Dashboard Profesor', () => {
        loginAsProfesor();
        cy.url().should('include', 'Dashboard_Profesor');
    });

    it('Rechaza credenciales incorrectas', () => {
        cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
        cy.get('#email').type('impostor@codekids.com');
        cy.get('#password').type('WrongPass999!');
        cy.get('button[type="submit"], input[type="submit"]').first().click();
        cy.get('#errorMessage', { timeout: 8000 }).should('not.have.class', 'hidden');
        cy.url().should('include', 'Inicio_De_Sesion');
    });
});

// ═══════════════════════════════════════════════════════════════
describe('Dashboard Profesor - Estructura general', () => {
    beforeEach(() => loginAsProfesor());

    it('Muestra el nombre del profesor en el header', () => {
        cy.get('#userName').should('not.be.empty').and('not.contain', 'Cargando');
    });

    it('Muestra el rol como Profesor', () => {
        cy.get('#userRole').should('contain.text', 'Profesor');
    });

    it('Muestra el avatar del usuario con src válido', () => {
        cy.get('#userAvatar').should('be.visible').and('have.attr', 'src');
    });

    it('Muestra las cuatro estadísticas de inicio', () => {
        cy.get('#section-inicio').should('not.have.class', 'hidden');
        cy.get('#statsGroups').should('exist');
        cy.get('#statsStudents').should('exist');
        cy.get('#statsTasks').should('exist');
        cy.get('#statsAverage').should('exist');
    });

    it('Muestra el nombre de bienvenida personalizado', () => {
        cy.get('#welcomeName', { timeout: 15000 }).should('not.be.empty');
    });

    it('Tiene botones de notificaciones y configuración visibles en el header', () => {
        cy.get('#notificationBtn').should('be.visible');
        cy.get('#settingsBtn').should('be.visible');
    });
});

// ═══════════════════════════════════════════════════════════════
describe('Dashboard Profesor - Navegación por secciones', () => {
    beforeEach(() => loginAsProfesor());

    it('Navega a la sección Calificaciones', () => {
        cy.get('[data-route="calificaciones"]').click();
        cy.get('#section-calificaciones', { timeout: 10000 }).should('not.have.class', 'hidden');
    });

    it('Navega a la sección Estadísticas', () => {
        cy.get('[data-route="estadisticas"]').click();
        cy.get('#section-estadisticas', { timeout: 10000 }).should('not.have.class', 'hidden');
    });

    it('Navega a la sección Grupos', () => {
        cy.get('[data-route="grupos"]').click();
        cy.get('#section-grupos', { timeout: 10000 }).should('not.have.class', 'hidden');
    });

    it('Navega a la sección Tareas', () => {
        cy.get('[data-route="tareas"]').click();
        cy.get('#section-tareas', { timeout: 10000 }).should('not.have.class', 'hidden');
    });

    it('Regresa a Inicio desde otra sección', () => {
        cy.get('[data-route="grupos"]').click();
        cy.get('[data-route="inicio"]').click();
        cy.get('#section-inicio', { timeout: 10000 }).should('not.have.class', 'hidden');
    });
});

// ═══════════════════════════════════════════════════════════════
describe('Dashboard Profesor - Gestión de Grupos', () => {
    beforeEach(() => loginAsProfesor());

    it('Muestra el botón "Crear Grupo" en la sección Grupos', () => {
        cy.get('[data-route="grupos"]').click();
        cy.get('#section-grupos', { timeout: 10000 }).should('not.have.class', 'hidden');
        cy.get('#btnCreateGroup').should('be.visible');
    });

    it('El botón "Crear Grupo" abre el modal con los campos correctos', () => {
        cy.get('[data-route="grupos"]').click();
        cy.get('#section-grupos', { timeout: 10000 }).should('not.have.class', 'hidden');
        cy.get('#btnCreateGroup').click();
        cy.get('#groupModal', { timeout: 5000 }).should('not.have.class', 'hidden');
        cy.get('#groupName').should('be.visible');
        cy.get('#groupSubject').should('be.visible');
        cy.get('#groupLevel').should('be.visible');
    });

    it('El formulario de grupo valida campos requeridos vacíos', () => {
        cy.get('[data-route="grupos"]').click();
        cy.get('#section-grupos', { timeout: 10000 }).should('not.have.class', 'hidden');
        cy.get('#btnCreateGroup').click();
        cy.get('#groupModal', { timeout: 5000 }).should('not.have.class', 'hidden');
        // Intentar enviar sin llenar campos requeridos
        cy.get('#groupSubmitText').closest('button[type="submit"]').click();
        cy.get('#groupName:invalid').should('exist');
        // El modal sigue abierto (no se cerró por validación)
        cy.get('#groupModal').should('not.have.class', 'hidden');
    });

    it('El modal de grupo se cierra al hacer clic en Cancelar', () => {
        cy.get('[data-route="grupos"]').click();
        cy.get('#section-grupos', { timeout: 10000 }).should('not.have.class', 'hidden');
        cy.get('#btnCreateGroup').click();
        cy.get('#groupModal', { timeout: 5000 }).should('not.have.class', 'hidden');
        cy.get('#cancelGroupModal').click();
        cy.get('#groupModal').should('have.class', 'hidden');
    });
});

// ═══════════════════════════════════════════════════════════════
describe('Dashboard Profesor - Seguridad', () => {
    it('Acceder directo al Dashboard Profesor sin sesión no expone datos privados de inmediato', () => {
        cy.visit('/Dashboard/Dashboard_Profesor/Dashboard_Profesor.html');
        cy.wait(5000);
        cy.url().then(url => {
            if (url.includes('Inicio_De_Sesion')) {
                // El guard redirigió al login → correcto
                expect(url).to.include('Inicio_De_Sesion');
            } else {
                // Página cargada pero sin datos privados (auth.js aún no completó)
                cy.get('#userName').should($el => {
                    const text = $el.text().trim();
                    expect(text === '' || text.includes('Cargando')).to.be.true;
                });
            }
        });
    });

    it('Cerrar sesión desde Configuración redirige fuera del dashboard', () => {
        loginAsProfesor();
        cy.get('#settingsBtn').click({ force: true });
        cy.get('#settingsDropdown', { timeout: 5000 }).should('not.have.class', 'hidden');
        cy.get('#logoutBtnSettings').click({ force: true });
        cy.url({ timeout: 10000 }).should('satisfy', url =>
            url.includes('index') ||
            url.includes('Inicio_De_Sesion') ||
            url.includes('Pagina_Inicio') ||
            url === Cypress.config('baseUrl') + '/' ||
            url === Cypress.config('baseUrl') + '/index.html'
        );
    });
});
