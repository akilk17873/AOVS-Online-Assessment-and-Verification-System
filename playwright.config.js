const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',

    use: {
        browserName: 'chromium',
        headless: true
    },

    workers: 2,

    webServer: {
        command: 'node mock-service.js',
        url: 'http://127.0.0.1:3000/api/exam/active',
        reuseExistingServer: true,
        timeout: 15000
    },

    reporter: [['list'], ['html', { open: 'never' }]]
});