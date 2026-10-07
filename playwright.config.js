const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',

    use: {
        browserName: 'chromium',
        headless: true,
        baseURL: 'http://localhost:3000'
    },

    reporter: 'html'
});