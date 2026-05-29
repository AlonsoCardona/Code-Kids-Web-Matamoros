// cypress/e2e/04_dashboard_admin.cy.js
// Pruebas funcionales del Dashboard de Administrador
// Usa credenciales reales de Firebase (proyecto codekids-dev en producción)

const ADMIN_EMAIL = 'admin1@codekids.com';
const ADMIN_PASSWORD = 'Admin123!';

// Helper: login y espera a que admin.js inicialice completamente
function loginAsAdmin() {
  cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
  cy.get('#email').should('be.visible').type(ADMIN_EMAIL);
  cy.get('#password').should('be.visible').type(ADMIN_PASSWORD);
  cy.get('button[type="submit"], input[type="submit"]').first().click();
  // Esperar redirección al dashboard admin (Firebase puede tardar ~20s en headless)
  cy.url({ timeout: 30000 }).should('include', 'Dashboard_Admin');
  // Esperar que setupAdminUI() haya completado: admin.js pone data-admin-ready="true"
  // en el body después de setupAdminUI(), garantizando que todos los event listeners están activos
  cy.get('body[data-admin-ready="true"]', { timeout: 20000 });
}

describe('Login de Administrador', () => {
  it('Inicia sesión correctamente y redirige al Dashboard Admin', () => {
    cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
    cy.get('#email').type(ADMIN_EMAIL);
    cy.get('#password').type(ADMIN_PASSWORD);
    cy.get('button[type="submit"], input[type="submit"]').first().click();
    cy.url({ timeout: 15000 }).should('include', 'Dashboard_Admin');
  });

  it('Rechaza credenciales incorrectas', () => {
    cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
    cy.get('#email').type('wrong@codekids.com');
    cy.get('#password').type('WrongPass999!');
    cy.get('button[type="submit"], input[type="submit"]').first().click();
    // Debe mostrarse un mensaje de error sin redirigir
    cy.url({ timeout: 5000 }).should('include', 'Inicio_De_Sesion');
  });
});

describe('Dashboard Admin - Estructura general', () => {
  beforeEach(() => {
    loginAsAdmin();
  });

  it('Muestra el panel de administración cargado correctamente', () => {
    // Verificar que las tarjetas de estadísticas se hayan llenado por admin.js
    cy.get('#totalUsers', { timeout: 20000 }).should('not.be.empty');
    cy.get('#totalStudents').should('not.be.empty');
  });

  it('Muestra el avatar del administrador', () => {
    cy.get('#adminAvatar').should('be.visible').and('have.attr', 'src');
  });

  it('Tiene acceso rápido a "Crear Usuario"', () => {
    cy.contains('Crear Usuario', { matchCase: false }).should('be.visible');
  });

  it('Muestra tarjetas de estadísticas (Total Usuarios / Estudiantes / Profesores)', () => {
    cy.contains(/usuarios|students/i, { timeout: 10000 }).should('exist');
  });

  it('Tiene botón de cerrar sesión en el menú de perfil', () => {
    // El botón #adminLogout está en el menú desplegable; abrir el menú primero
    cy.get('#adminAvatar').click({ force: true });
    cy.get('#adminProfileMenu').should('not.have.class', 'hidden');
    cy.get('#adminLogout').should('be.visible');
  });
});

describe('Dashboard Admin - Gestión de Usuarios', () => {
  beforeEach(() => {
    loginAsAdmin();
  });

  it('Muestra la sección de Usuarios al hacer clic en el menú', () => {
    // Buscar enlace de usuarios en el nav/sidebar
    cy.contains(/usuarios|users/i).first().click();
    // La tabla o lista de usuarios debe aparecer
    cy.get('table, [id*="user"], [class*="user-list"]', { timeout: 10000 }).should('exist');
  });

  it('El botón "Crear Usuario" abre el modal de creación', () => {
    // Usar el selector data-action para ser precisos (quick-access-btn con data-action="createUser")
    cy.get('[data-action="createUser"]').first().click();
    // El modal se crea dinámicamente por showCreateUserModal() en admin.js
    cy.get('#createUserModal', { timeout: 5000 }).should('be.visible');
    cy.get('#newUserNombre').should('be.visible');
  });

  it('El formulario de crear usuario valida campos vacíos', () => {
    cy.get('[data-action="createUser"]').first().click();
    cy.get('#createUserModal', { timeout: 5000 }).should('be.visible');
    // Intentar enviar sin llenar campos requeridos
    cy.get('#createUserSubmitBtn').click();
    // Los campos tienen required; el modal debe seguir abierto (sin redirigir)
    cy.get('#createUserModal').should('exist');
    // Al menos uno de los campos requeridos debe estar inválido
    cy.get('#newUserNombre:invalid, #newUserApellidoPaterno:invalid, #newUserRole:invalid').should('exist');
  });
});

describe('Dashboard Admin - Seguridad', () => {
  it('Acceder directo al Dashboard Admin sin sesión redirige al login', () => {
    // Visitar sin autenticarse
    cy.visit('/Dashboard/Dashboard_Administrador/Dashboard_Admin.html');
    // Esperar: puede quedarse en la misma URL (guard JS) o redirigir al login
    cy.wait(5000);
    cy.url().then((url) => {
      const isOnAdmin = url.includes('Dashboard_Admin');
      const isOnLogin = url.includes('Inicio_De_Sesion');
      // Aceptable: quedarse en admin (guard mostrará restricción) o redirigir al login
      expect(isOnAdmin || isOnLogin).to.be.true;
      if (isOnAdmin) {
        // Si se quedó en admin, el contenido de admin NO debe ser visible sin auth
        cy.get('#adminName', { timeout: 5000 }).should('be.empty');
      }
    });
  });

  it('Cerrar sesión redirige a la página de inicio', () => {
    loginAsAdmin();
    // Abrir menú de perfil
    cy.get('#adminAvatar').click({ force: true });
    cy.get('#adminProfileMenu').should('not.have.class', 'hidden');
    // Clic en cerrar sesión (force:true por si el menú tiene animación)
    cy.get('#adminLogout').click({ force: true });
    // Confirmar en el modal de confirmación
    cy.get('#logoutConfirmModal').should('not.have.class', 'hidden');
    cy.get('#confirmLogoutBtn').click();
    // Debe redirigir a index o al login o a Pagina_Inicio
    cy.url({ timeout: 10000 }).should('satisfy', (url) =>
      url.includes('index') ||
      url.includes('Inicio_De_Sesion') ||
      url.includes('Pagina_Inicio') ||
      url === Cypress.config('baseUrl') + '/' ||
      url === Cypress.config('baseUrl') + '/index.html'
    );
  });
});
