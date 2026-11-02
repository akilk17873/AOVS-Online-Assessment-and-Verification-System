import { test, expect } from '@playwright/test';

/**
 * SCRUM-17: Handle Unavailable Microphone
 * Acceptance Criteria & SRS FR 3.3.3 Verification
 *
 * 1. Detect unavailable microphone (device missing, hardware busy, or denied permission).
 * 2. Display non-blocking warning banner assuring student written response is valid.
 * 3. Log oral verification status as 'Unverifiable - Microphone unavailable'.
 * 4. Ensure exam submission remains completely unblocked.
 * 5. Surface Unverifiable Case flag on Instructor Review Dashboard for manual grading.
 */
test.describe('SCRUM-17: Handle Unavailable Microphone (FR 3.3.3)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => sessionStorage.clear());
    });

    test('TC-SCRUM17-01: Displays explicit notification banner when microphone is unavailable', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Simulate unavailable microphone hardware
        await page.evaluate(() => {
            window.simulateMicrophoneAccess(false);
        });

        // Trigger oral follow-up verification
        await page.evaluate(async () => {
            await window.triggerOralVerification('q-1', 30);
        });

        const modal = page.locator('#oralVerificationModal');
        await expect(modal).toBeVisible();

        // Warning banner is displayed
        const deniedBanner = page.locator('#oralPermissionDeniedBox');
        await expect(deniedBanner).toBeVisible();
        await expect(deniedBanner).toContainText(/Microphone Access Unavailable/i);
        await expect(deniedBanner).toContainText(/Unverifiable/i);
        await expect(deniedBanner).toContainText(/not blocked/i);

        // Status heading reflects flagged / unavailable state
        await expect(page.locator('#oralMicStatusHeading')).toContainText(/Microphone Unavailable/i);
    });

    test('TC-SCRUM17-02: Auto-closes or finishes cleanly without blocking subsequent exam navigation', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Simulate unavailable mic
        await page.evaluate(() => {
            window.simulateMicrophoneAccess(false);
        });

        // Trigger with short 2s timer
        await page.evaluate(async () => {
            await window.triggerOralVerification('q-1', 2);
        });

        const modal = page.locator('#oralVerificationModal');
        await expect(modal).toBeVisible();

        // Waits for timeout auto-close
        await expect(modal).toBeHidden({ timeout: 8000 });

        // Verify oral verification is recorded as Unverifiable
        const oralData = await page.evaluate(() => window.getOralVerificationData('q-1'));
        expect(oralData).not.toBeNull();
        expect(oralData.microphoneStatus).toMatch(/unavailable|denied/);
        expect(oralData.status).toContain('Unverifiable - Microphone unavailable');

        // Navigation to next question works normally
        await expect(page.locator('#nextBtn')).toBeEnabled();
        await page.locator('#nextBtn').click();
        await expect(page.locator('#questionHeading')).toBeVisible();
    });

    test('TC-SCRUM17-03: Exam submission retains Unverifiable metadata and reaches backend successfully', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Simulate unavailable mic and trigger verification
        await page.evaluate(async () => {
            window.simulateMicrophoneAccess(false);
            await window.triggerOralVerification('q-1', 30);
        });

        // Close oral modal early
        await page.locator('#finishOralSpeakingBtn').click();
        await expect(page.locator('#oralVerificationModal')).toBeHidden({ timeout: 6000 });

        // Intercept exam submit request
        await page.locator('#submitExamBtn').click();
        await expect(page.locator('#submitConfirmModal')).toBeVisible();

        const [submitRequest] = await Promise.all([
            page.waitForRequest(req => req.url().includes('/submit') && req.method() === 'POST'),
            page.locator('#finalConfirmSubmitBtn').click()
        ]);

        const body = JSON.parse(submitRequest.postData());
        expect(body.oralVerifications).toBeDefined();
        const q1Oral = body.oralVerifications['q-1'];
        expect(q1Oral).toBeDefined();
        expect(q1Oral.microphoneStatus).toMatch(/unavailable|denied/);
        expect(q1Oral.status).toContain('Unverifiable - Microphone unavailable');
    });

    test('TC-SCRUM17-04: Instructor review drawer highlights Unverifiable case with manual review alert', async ({ page }) => {
        // Authenticate instructor
        await page.goto('http://127.0.0.1:3000/Instructor/login.html');
        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.getByLabel(/security password/i).fill('Instructor@123');
        await page.locator('#submitLoginBtn').click();
        await page.waitForURL('**/dashboard.html**');

        // Open review drawer for Priya Sharma (SUB-CS301-102) who has unverified oral follow-up
        const reviewBtn = page.locator('button.open-review-btn[data-id="SUB-CS301-102"]');
        await expect(reviewBtn).toBeVisible({ timeout: 10000 });
        await reviewBtn.click();

        const modal = page.locator('#reviewModal');
        await expect(modal).toBeVisible();

        // Check for Unverifiable warning alert or status tag
        const warning = modal.locator('.oral-unverifiable-warning, .oral-status-tag');
        await expect(warning.first()).toBeVisible({ timeout: 8000 });
        await expect(modal).toContainText(/Unverifiable/i);
    });
});
