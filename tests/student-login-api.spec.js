import { test, expect } from '@playwright/test';

test.describe('Student Login Authentication API Integration', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:5500/Student%20Login/Creating%20Login_UI/index.html');
    });

    test('TC01 - successful authentication', async ({ page }) => {
        await page.getByLabel(/student id/i).fill('TEST001');
        await page.getByLabel(/password/i).fill('Test@123');
        
        // Wait for the response to verify API is hit and succeeds
        const responsePromise = page.waitForResponse('**/api/college/login');
        await page.getByRole('button', { name: /login/i }).click();
        
        const response = await responsePromise;
        expect(response.status()).toBe(200);

        await expect(page.locator('#successMessage')).toHaveText('Authentication successful');
        await expect(page.locator('#successMessage')).toBeVisible();
    });

    test('TC02 - invalid credentials', async ({ page }) => {
        await page.getByLabel(/student id/i).fill('WRONG');
        await page.getByLabel(/password/i).fill('WRONG');
        
        const responsePromise = page.waitForResponse('**/api/college/login');
        await page.getByRole('button', { name: /login/i }).click();
        
        const response = await responsePromise;
        expect(response.status()).toBe(401);

        await expect(page.locator('#successMessage')).toHaveText('Invalid student ID or password');
        await expect(page.locator('#successMessage')).toBeVisible();
    });

    test('TC03 - empty student ID', async ({ page }) => {
        // Intercept network requests to ensure API is NOT called
        let apiCalled = false;
        await page.route('**/api/college/login', route => {
            apiCalled = true;
            route.continue();
        });

        await page.getByLabel(/password/i).fill('Test@123');
        await page.getByRole('button', { name: /login/i }).click();

        await expect(page.locator('#studentIdError')).toBeVisible();
        await expect(page.locator('#studentIdError')).not.toBeEmpty();
        expect(apiCalled).toBe(false);
    });

    test('TC04 - empty password', async ({ page }) => {
        let apiCalled = false;
        await page.route('**/api/college/login', route => {
            apiCalled = true;
            route.continue();
        });

        await page.getByLabel(/student id/i).fill('TEST001');
        await page.getByRole('button', { name: /login/i }).click();

        await expect(page.locator('#passwordError')).toBeVisible();
        await expect(page.locator('#passwordError')).not.toBeEmpty();
        expect(apiCalled).toBe(false);
    });

    test('TC05 - authentication service unavailable', async ({ page }) => {
        // Use page.route to mock a network failure (simulate backend down)
        await page.route('**/api/college/login', route => route.abort('failed'));

        await page.getByLabel(/student id/i).fill('TEST001');
        await page.getByLabel(/password/i).fill('Test@123');
        await page.getByRole('button', { name: /login/i }).click();

        await expect(page.locator('#successMessage')).toHaveText('Authentication service is unavailable. Please try again later.');
        await expect(page.locator('#successMessage')).toBeVisible();
    });

});
