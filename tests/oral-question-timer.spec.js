import { test, expect } from '@playwright/test';

/**
 * SCRUM-15: Display Oral Question with Timer
 * Automated Verification Suite
 *
 * Acceptance Criteria:
 * 1. Question displayed clearly on screen.
 * 2. Countdown timer visible (30–45 second range).
 * 3. Window auto-closes at timeout.
 */

test.describe('SCRUM-15: Display Oral Question with Timer', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Clear any previous state before each test
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => sessionStorage.clear());
    });

    test('TC-SCRUM15-01: Backend API generates follow-up question within 30-45s duration range', async ({ request }) => {
        const response = await request.post('http://127.0.0.1:3000/api/oral-question/generate', {
            data: {
                questionId: 'q-1',
                questionNumber: 1,
                questionTitle: 'Hash Tables Collision Resolution',
                studentAnswer: 'Hash tables use hash functions to index buckets. When collisions happen, separate chaining links elements.'
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.oralQuestion).toBeDefined();

        // AC #1 & SRS FR 3.2.1: Prompt generated
        expect(typeof data.oralQuestion.questionPrompt).toBe('string');
        expect(data.oralQuestion.questionPrompt.length).toBeGreaterThan(20);
        expect(data.oralQuestion.questionPrompt).toContain('collision');

        // AC #2 & SRS FR 3.2.2: Timer within 30-45 seconds
        expect(data.oralQuestion.durationSeconds).toBeGreaterThanOrEqual(30);
        expect(data.oralQuestion.durationSeconds).toBeLessThanOrEqual(45);
    });

    test('TC-SCRUM15-02: Oral verification dialog displays question clearly on screen (AC #1)', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Trigger oral verification for Question 1
        await page.evaluate(async () => {
            await window.triggerOralVerification('q-1', 35);
        });

        // AC #1: Modal is visible
        const modal = page.locator('#oralVerificationModal');
        await expect(modal).toBeVisible();

        // AC #1: Context tag and prompt displayed clearly
        const contextBadge = page.locator('#oralContextBadge');
        await expect(contextBadge).toBeVisible();
        await expect(contextBadge).toContainText(/Question 1/i);

        const questionBox = page.locator('#oralQuestionBox');
        await expect(questionBox).toBeVisible();

        const questionPrompt = page.locator('#oralQuestionText');
        await expect(questionPrompt).toBeVisible();
        const promptText = await questionPrompt.textContent();
        expect(promptText.length).toBeGreaterThan(15);

        // Instructions and mic status visible
        await expect(page.locator('#oralMicStatus')).toBeVisible();
        await expect(page.locator('#oralMicStatusHeading')).toContainText(/Listening/i);
    });

    test('TC-SCRUM15-03: Countdown timer is visible and actively decrements (AC #2)', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Trigger oral verification with standard 35s timer
        await page.evaluate(async () => {
            await window.triggerOralVerification('q-1', 35);
        });

        const timerDisplay = page.locator('#oralTimeDisplay');
        await expect(timerDisplay).toBeVisible();

        // Verify initial formatted countdown time
        const initialTime = await timerDisplay.textContent();
        expect(initialTime).toBe('00:35');

        // Verify progress bar is visible
        const progressBar = page.locator('#oralTimerProgressBar');
        await expect(progressBar).toBeVisible();

        // Wait ~2 seconds and verify timer has decremented
        await page.waitForTimeout(2100);
        const updatedTime = await timerDisplay.textContent();
        expect(updatedTime).not.toBe('00:35');
        expect(updatedTime).toMatch(/00:3[1-4]/);
    });

    test('TC-SCRUM15-04: Window auto-closes at timeout when countdown reaches 0s (AC #3)', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Trigger oral verification with a short 2-second timeout to test AC #3 auto-close
        await page.evaluate(async () => {
            await window.triggerOralVerification('q-1', 2);
        });

        const modal = page.locator('#oralVerificationModal');
        await expect(modal).toBeVisible();

        // Auto-close notice is visible
        await expect(page.locator('#oralAutoCloseNotice')).toBeVisible();

        // AC #3: Window must auto-close at timeout
        await expect(modal).toBeHidden({ timeout: 8000 });

        // Verify oral verification was recorded in session storage
        const storedState = await page.evaluate(() => {
            const raw = sessionStorage.getItem('aovs_exam_CS301-2026');
            return raw ? JSON.parse(raw) : null;
        });

        expect(storedState).not.toBeNull();
        expect(storedState.oralVerifications).toBeDefined();
        const q1Oral = storedState.oralVerifications['q-1'];
        expect(q1Oral).toBeDefined();
        expect(q1Oral.timedOut).toBe(true);
        expect(q1Oral.status).toContain('Auto-closed at timeout');
    });

    test('TC-SCRUM15-05: Finished Speaking button allows early submission and cleanly closes window', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Trigger oral verification with 40s timer
        await page.evaluate(async () => {
            await window.triggerOralVerification('q-1', 40);
        });

        const modal = page.locator('#oralVerificationModal');
        await expect(modal).toBeVisible();

        // Click "I'm Finished Speaking" early
        const finishBtn = page.locator('#finishOralSpeakingBtn');
        await expect(finishBtn).toBeVisible();
        await page.waitForTimeout(1000);
        await finishBtn.click();

        // Modal should immediately close
        await expect(modal).toBeHidden();

        // Verify early completion record
        const storedState = await page.evaluate(() => {
            const raw = sessionStorage.getItem('aovs_exam_CS301-2026');
            return raw ? JSON.parse(raw) : null;
        });

        expect(storedState.oralVerifications['q-1']).toBeDefined();
        expect(storedState.oralVerifications['q-1'].timedOut).toBe(false);
        expect(storedState.oralVerifications['q-1'].status).toContain('Finished early');
    });

    test('TC-SCRUM15-06: Instructor review drawer displays oral follow-up verification alongside student answer', async ({ page }) => {
        // Log in to Instructor Portal
        await page.goto('http://127.0.0.1:3000/Instructor/login.html', { waitUntil: 'domcontentloaded' });
        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.getByLabel(/security password/i).fill('Instructor@123');
        await page.locator('#submitLoginBtn').click();

        await page.waitForURL('**/Instructor/dashboard.html');
        await expect(page.locator('#submissionsTableBody tr[data-submission-id]').first()).toBeVisible({ timeout: 15000 });

        // Open flagged student Rahul Verma (SUB-CS301-103) who completed oral verification
        const reviewBtn = page.locator('button[data-id="SUB-CS301-103"]');
        await expect(reviewBtn).toBeVisible();
        await reviewBtn.click();

        // Modal should open
        const reviewModal = page.locator('#reviewModal');
        await expect(reviewModal).toBeVisible();

        // Verify Oral Verification Follow-Up card is rendered in the review drawer
        const oralReviewCard = page.locator('.oral-verification-review-card').first();
        await expect(oralReviewCard).toBeVisible();
        await expect(oralReviewCard).toContainText(/Adaptive Oral Verification/i);
        await expect(oralReviewCard).toContainText(/spoken response/i);

        // Verify oral prompt text is shown
        const promptText = page.locator('.oral-review-prompt').first();
        await expect(promptText).toBeVisible();
        expect(await promptText.textContent()).toContain('collision');
    });
});
