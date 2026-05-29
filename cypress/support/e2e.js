// Archivo de soporte de Cypress — se ejecuta antes de cada spec.
// Aquí se pueden agregar comandos personalizados globales.

// Ejemplo: cy.login(email, password)
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/Vistas_Publicas/Inicio_De_Sesion.html');
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('button[type="submit"], input[type="submit"]').first().click();
});
