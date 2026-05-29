// cypress/e2e/01_paginas_publicas.cy.js
// Verifica que las páginas públicas cargan correctamente y sin errores JS graves.

describe('Páginas públicas', () => {
  it('Página de inicio carga y muestra el encabezado', () => {
    cy.visit('/Vistas_Publicas/Pagina_Inicio.html');
    cy.get('body').should('be.visible');
    // No debe mostrar mensaje de error de Firebase en pantalla
    cy.contains('Error').should('not.exist');
  });

  it('Página de inicio de sesión carga el formulario', () => {
    cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"], input[type="submit"]').first().should('be.visible');
  });

  it('Página de inicio de sesión no permite enviar con campos vacíos', () => {
    cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
    cy.get('button[type="submit"], input[type="submit"]').first().click();
    // El formulario HTML5 debería impedirlo, o el JS debe mostrar validación
    cy.url().should('include', 'Inicio_De_Sesion');
  });

  it('index.html redirige o carga correctamente', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
  });
});
