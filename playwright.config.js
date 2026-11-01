const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',

    use: {
        browserName: 'chromium',
        headless: true,
        baseURL: 'http://localhost:3000',
        permissions: ['microphone'],
        launchOptions: {
            args: [
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream'
            ]
        }
    },

    expect: {
        timeout: 10000
    },

    webServer: {
        command: 'node mock-service.js',
        url: 'http://127.0.0.1:3000/api/exam/active',
        reuseExistingServer: !process.env.CI,
        timeout: 25000,
    },

    reporter: 'list'
});
