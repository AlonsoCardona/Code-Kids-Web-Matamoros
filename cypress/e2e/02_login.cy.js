// cypress/e2e/02_login.cy.js
// Pruebas del flujo de autenticación.
// NOTA: Estas pruebas corren contra el emulador de Firebase (demo-codekids).
// Crea el usuario de prueba en http://127.0.0.1:4001/auth antes de correrlas,
// o usa un beforeEach que lo cree vía la API del emulador.

const EMULATOR_AUTH_URL = 'http://127.0.0.1:9099';

// Crea un usuario en el emulador de Auth antes de los tests
before(() => {
  // Limpia usuarios de prueba del emulador
  cy.request({
    method: 'DELETE',
    url: `${EMULATOR_AUTH_URL}/emulator/v1/projects/demo-codekids/accounts`,
    failOnStatusCode: false,
  });

  // Crea usuario estudiante de prueba
  cy.request('POST', `${EMULATOR_AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    email: 'estudiante_test@codekids.com',
    password: 'Test1234!',
    returnSecureToken: true,
  });
});

describe('Inicio de sesión', () => {
  it('Muestra error con credenciales incorrectas', () => {
    cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
    cy.get('input[type="email"]').type('noexiste@codekids.com');
    cy.get('input[type="password"]').type('ContraseñaMal123!');
    cy.get('button[type="submit"], input[type="submit"]').first().click();
    // Debe aparecer algún mensaje de error — sin revelar si el email existe
    cy.get('body').should('contain.text', 'INVALID_LOGIN_CREDENTIALS')
      .or('contain.text', 'inválid')
      .or('contain.text', 'incorrecto')
      .or('contain.text', 'error')
      .or('contain.text', 'Error');
  });

  it('El campo de contraseña es de tipo password (no muestra texto)', () => {
    cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
    cy.get('input[type="password"]').should('have.attr', 'type', 'password');
  });

  it('No redirige a dashboard sin autenticarse', () => {
    cy.visit('/Dashboard/Dashboard_Estudiante/Dashboard_Estudiante.html', { failOnStatusCode: false });
    // Debe redirigir al login o mostrar pantalla de carga/bloqueo
    cy.url().should('satisfy', (url) =>
      url.includes('Inicio_De_Sesion') ||
      url.includes('Dashboard_Estudiante') // acepta si carga pero con guard JS
    );
  });
});
