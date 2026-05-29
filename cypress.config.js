const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Apunta al servidor local
    baseUrl: 'http://127.0.0.1:5000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
  },
});
