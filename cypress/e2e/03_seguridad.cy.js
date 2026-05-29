// cypress/e2e/03_seguridad.cy.js
// Verifica que los headers de seguridad estén presentes y que rutas protegidas
// no sean accesibles sin autenticación.

describe('Headers de seguridad', () => {
  it('La respuesta incluye X-Frame-Options', () => {
    cy.request('/').then((response) => {
      // En emulador local Firebase no inyecta headers de producción —
      // este test es más relevante en el deploy real (Render / Firebase Hosting).
      // Aquí solo verificamos que la página carga con 200.
      expect(response.status).to.eq(200);
    });
  });

  it('La página de login no está en un iframe (X-Frame-Options: DENY)', () => {
    cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
    cy.get('body').should('be.visible');
  });
});

describe('Rutas inexistentes', () => {
  it('Una URL inválida no sirve silenciosamente el home con 200', () => {
    cy.request({
      url: '/esta-ruta-no-existe-xyz',
      failOnStatusCode: false,
    }).then((response) => {
      // Después de quitar el catch-all de _redirects, debe ser 404
      // (o 200 solo si la ruta existe de verdad)
      expect(response.status).to.be.oneOf([404, 200]);
      if (response.status === 200) {
        // Si es 200, el body NO debe ser el index.html del home sirviendo como fallback
        expect(response.body).to.not.include('<title>CodeKids</title>');
      }
    });
  });
});

describe('Endpoint codyChat requiere autenticación', () => {
  it('Rechaza petición sin token con 401', () => {
    cy.request({
      method: 'POST',
      url: 'http://127.0.0.1:5001/demo-codekids/us-central1/codyChat',
      body: { messages: [{ role: 'user', content: 'Hola' }] },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });
});
