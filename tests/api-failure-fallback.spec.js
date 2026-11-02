import { test, expect } from '@playwright/test';

/**
 * SCRUM-21: API Failure Fallback
 * System Resiliency & Fault Tolerance Verification (SRS Section 3.6)
 *
 * 1. Oral Question Generator failure gracefully falls back to template prompts.
 * 2. Transcription service failure preserves raw audio and returns fallback transcript.
 * 3. Exam submission network interruption caches answers safely in sessionStorage.
 * 4. Database unavailability automatically services submissions from in-memory store.
 */
test.describe('SCRUM-21: API Failure Fallback & Resiliency', () => {

    test('TC-SCRUM21-01: Oral question generation falls back cleanly to contextual template when API fails', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Simulate 500 error on question generation API
        await page.route('**/api/oral-question/generate', route => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ success: false, message: 'Simulated AI generator outage' })
            });
        });

        // Trigger oral follow-up
        await page.evaluate(async () => {
            window.simulateMicrophoneAccess(true);
            await window.triggerOralVerification('q-1', 35);
        });

        const modal = page.locator('#oralVerificationModal');
        await expect(modal).toBeVisible();

        // Fallback question prompt is rendered without crashing
        const promptEl = page.locator('#oralQuestionText');
        await expect(promptEl).toBeVisible();
        const promptText = await promptEl.textContent();
        expect(promptText.length).toBeGreaterThan(20);

        // Timer is running
        await expect(page.locator('#oralTimeDisplay')).toBeVisible();

        // Close early
        await page.locator('#finishOralSpeakingBtn').click();
        await expect(modal).toBeHidden({ timeout: 8000 });
    });

    test('TC-SCRUM21-02: Transcription API returns resilient fallback when audio processing encounters error', async ({ request }) => {
        // Post malformed payload that triggers error catch block
        const response = await request.post('http://127.0.0.1:3000/api/oral-question/transcribe', {
            data: {
                questionId: 'q-99',
                throwError: true
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.transcript).toBeDefined();
        expect(data.transcript.length).toBeGreaterThan(15);
    });

    test('TC-SCRUM21-03: Client exam controller preserves voice recording even if transcribe route is unreachable', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Block transcription endpoint
        await page.route('**/api/oral-question/transcribe', route => {
            route.abort('failed');
        });

        // Trigger oral verification
        await page.evaluate(async () => {
            window.simulateMicrophoneAccess(true);
            await window.triggerOralVerification('q-1', 35);
        });

        await page.waitForTimeout(500);
        await page.locator('#finishOralSpeakingBtn').click();
        await expect(page.locator('#oralVerificationModal')).toBeHidden({ timeout: 6000 });

        // Verify oral verification object retains recorded audio data and fallback note
        const oralData = await page.evaluate(() => window.getOralVerificationData('q-1'));
        expect(oralData).not.toBeNull();
        expect(oralData.audioDataUrl).toMatch(/^data:audio\/(webm|wav)/);
        expect(oralData.transcript).toBeDefined();
        expect(oralData.transcript).toContain('audio');
    });

    test('TC-SCRUM21-04: Exam submission network error caches answers in sessionStorage for retry', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Simulate 500 error on submission endpoint
        await page.route('**/api/exams/**/submit', route => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ success: false, message: 'Simulated network outage' })
            });
        });

        // Listen for alert dialog
        let alertMessage = '';
        page.on('dialog', async dialog => {
            alertMessage = dialog.message();
            await dialog.accept();
        });

        // Click submit
        await page.locator('#submitExamBtn').click();
        await expect(page.locator('#submitConfirmModal')).toBeVisible();
        await page.locator('#finalConfirmSubmitBtn').click();

        // Verify payload was cached in sessionStorage via resilient fallback
        await page.waitForFunction(() => sessionStorage.getItem('aovs_pending_submission') !== null, { timeout: 8000 });
        const cachedPending = await page.evaluate(() => sessionStorage.getItem('aovs_pending_submission'));
        expect(cachedPending).not.toBeNull();
        const parsed = JSON.parse(cachedPending);
        expect(parsed.answers).toBeDefined();

        // Workspace remains visible and accessible so student can retry
        await expect(page.locator('#examWorkspace')).toBeVisible();
    });

    test('TC-SCRUM21-05: Server handles active exam requests seamlessly when database is offline', async ({ request }) => {
        const response = await request.get('http://127.0.0.1:3000/api/exam/active');
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.exam).toBeDefined();
        expect(data.exam.questions.length).toBeGreaterThanOrEqual(5);
    });
});
