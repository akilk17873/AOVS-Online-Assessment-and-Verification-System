import { test, expect } from '@playwright/test';

test.describe('Student Login UI', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:5500/Student%20Login/Creating%20Login_UI/index.html');
    });

    // TC01 - Check whether all login UI elements are displayed
    test('TC01 - Login page displays required elements', async ({ page }) => {

        await expect(
            page.getByRole('heading', { name: /student login/i })
        ).toBeVisible();

        await expect(
            page.getByLabel(/student id/i)
        ).toBeVisible();

        await expect(
            page.getByLabel(/password/i)
        ).toBeVisible();

        await expect(
            page.getByRole('button', { name: /login/i })
        ).toBeVisible();
    });


    // TC02 - Student ID left empty
    test('TC02 - Empty Student ID shows validation', async ({ page }) => {

        await page.getByLabel(/password/i).fill('Test@123');

        await page.getByRole('button', { name: /login/i }).click();

        await expect(
            page.locator('#studentIdError')
        ).toBeVisible();
    });


    // TC03 - Password left empty
    test('TC03 - Empty Password shows validation', async ({ page }) => {

        await page.getByLabel(/student id/i).fill('STU001');
        await page.getByRole('button', { name: /login/i }).click();
        await expect(
            page.locator('#passwordError')
        ).toBeVisible();
    });


    // TC04 - Both fields empty
    test('TC04 - Empty fields show validation', async ({ page }) => {

        await page.getByRole('button', { name: /login/i }).click();

        await expect(
            page.locator('#studentIdError')
        ).toBeVisible();

        await expect(
            page.locator('#passwordError')
        ).toBeVisible();
    });


    // TC05 - Valid values can be entered
    test('TC05 - Valid Student ID and Password are accepted by UI', async ({ page }) => {

        await page.getByLabel(/student id/i).fill('STU001');
        await page.getByLabel(/password/i).fill('Test@123');

        await expect(
            page.getByLabel(/student id/i)
        ).toHaveValue('STU001');

        await expect(
            page.getByLabel(/password/i)
        ).toHaveValue('Test@123');
    });
});