import { test, expect } from '@playwright/test';

/**
 * SCRUM-11: Track Response Time
 * Automated Verification Suite
 */
test.describe('SCRUM-11: Track Response Time & Question Telemetry', () => {

    test.beforeEach(async ({ page }) => {
        // Clear any previous sessionStorage before test
        await page.goto('http://127.0.0.1:3000/Exam/index.html');
        await page.evaluate(() => sessionStorage.clear());
        await page.reload();
        // Wait until workspace is active
        await expect(page.locator('#examWorkspace')).toBeVisible();
    });

    test('TC-SCRUM11-01: Question header renders response time badge with active clock', async ({ page }) => {
        const timeBadge = page.locator('#questionResponseTimeBadge');
        await expect(timeBadge).toBeVisible();
        await expect(timeBadge).toHaveAttribute('title', /response time/i);

        const activeTimeText = page.locator('#questionActiveTimeText');
        await expect(activeTimeText).toBeVisible();
        const initialText = await activeTimeText.textContent();
        expect(initialText).toMatch(/\d{2}:\d{2}/);

        // Wait ~2 seconds to verify the active question timer increments
        await page.waitForTimeout(2100);
        const updatedText = await activeTimeText.textContent();
        expect(updatedText).not.toBe('00:00');
    });

    test('TC-SCRUM11-02: Accumulates response time per question when navigating between questions', async ({ page }) => {
        // Spend ~1.5s on Question 1
        await page.waitForTimeout(1500);

        // Navigate to Question 2 via Save & Next
        await page.locator('#nextBtn').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 2 of 5');

        // Question 2 timer should start fresh from low seconds
        const q2TimeText = await page.locator('#questionActiveTimeText').textContent();
        expect(q2TimeText).toMatch(/00:0[0-2]/);

        // Spend ~1.5s on Question 2
        await page.waitForTimeout(1500);

        // Navigate back to Question 1
        await page.locator('#prevBtn').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 1 of 5');

        // Question 1 timer should restore accumulated time (>= 1 second)
        const q1ResumedTime = await page.locator('#questionActiveTimeText').textContent();
        expect(q1ResumedTime).not.toBe('00:00');
    });

    test('TC-SCRUM11-03: Typing a written answer logs response interaction and timestamp', async ({ page }) => {
        const textarea = page.locator('#writtenAnswerInput');
        await expect(textarea).toBeVisible();

        // Wait brief delay before typing
        await page.waitForTimeout(1000);
        await textarea.fill('Testing response time interaction telemetry.');

        // Inspect session storage to verify responseTimes object tracks question
        const storedState = await page.evaluate(() => {
            const raw = sessionStorage.getItem('aovs_exam_CS301-2026');
            return raw ? JSON.parse(raw) : null;
        });

        expect(storedState).not.toBeNull();
        expect(storedState.questionResponseTimes).toBeDefined();
        const q1Tracking = storedState.questionResponseTimes['q-1'];
        expect(q1Tracking).toBeDefined();
        expect(q1Tracking.answered).toBe(true);
        expect(typeof q1Tracking.firstResponseSeconds).toBe('number');
    });

    test('TC-SCRUM11-04: Submit confirmation modal displays total response time spent and average per question', async ({ page }) => {
        // Answer question 1
        await page.locator('#writtenAnswerInput').fill('Hash tables resolve collisions via separate chaining.');

        // Wait to accumulate response time
        await page.waitForTimeout(1200);

        // Click submit button in question palette
        await page.locator('#submitExamBtn').click();
        await expect(page.locator('#submitConfirmModal')).toBeVisible();

        // Verify response time metrics cards in summary modal
        const modalTimeSpent = page.locator('#modalTimeSpent');
        await expect(modalTimeSpent).toBeVisible();
        const timeSpentText = await modalTimeSpent.textContent();
        expect(timeSpentText).toMatch(/\d+m \d{2}s/);

        const modalAvgTime = page.locator('#modalAvgTimePerQ');
        await expect(modalAvgTime).toBeVisible();
        const avgText = await modalAvgTime.textContent();
        expect(avgText).toMatch(/\d+s/);

        // Close modal
        await page.locator('#cancelSubmitBtn').click();
        await expect(page.locator('#submitConfirmModal')).toBeHidden();
    });

    test('TC-SCRUM11-05: Submission payload and receipt include detailed response times telemetry', async ({ page }) => {
        // Answer Question 1
        await page.locator('#writtenAnswerInput').fill('Valid answer for Question 1.');
        await page.waitForTimeout(1100);

        // Move to Question 2 and answer
        await page.locator('#nextBtn').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 2 of 5');
        await page.locator('#writtenAnswerInput').fill('Valid answer for Question 2.');
        await page.waitForTimeout(1100);

        // Open submit confirmation and submit final responses
        await page.locator('#submitExamBtn').click();
        await expect(page.locator('#submitConfirmModal')).toBeVisible();

        // Intercept API submit request to verify responseTimes in payload
        const [request] = await Promise.all([
            page.waitForRequest(req => req.url().includes('/submit') && req.method() === 'POST'),
            page.locator('#finalConfirmSubmitBtn').click()
        ]);

        const postData = JSON.parse(request.postData());
        expect(postData).toHaveProperty('responseTimes');
        expect(postData.responseTimes).toHaveProperty('perQuestion');
        expect(postData.responseTimes.perQuestion['q-1']).toBeDefined();
        expect(postData.responseTimes.perQuestion['q-1'].answered).toBe(true);
        expect(postData.responseTimes.perQuestion['q-1'].timeSpentSeconds).toBeGreaterThanOrEqual(1);

        // Verify receipt modal renders total response time and average time
        await expect(page.locator('#receiptModal')).toBeVisible();
        const receiptTimeSpent = page.locator('#receiptTotalTimeSpent');
        await expect(receiptTimeSpent).toBeVisible();
        expect(await receiptTimeSpent.textContent()).toMatch(/\d+m \d{2}s/);

        const receiptAvg = page.locator('#receiptAvgResponseTime');
        await expect(receiptAvg).toBeVisible();
        expect(await receiptAvg.textContent()).toMatch(/\d+s/);
    });

    test('TC-SCRUM11-06: Backend API verifies and returns responseTimes in submission response', async ({ request }) => {
        const payload = {
            studentId: 'TEST001',
            answers: {
                'q-1': 'Direct API response time test'
            },
            timeSpentSeconds: 120,
            responseTimes: {
                totalExamTimeSeconds: 120,
                averageTimePerQuestionSeconds: 24,
                perQuestion: {
                    'q-1': { timeSpentSeconds: 50, visitCount: 1, answered: true },
                    'q-2': { timeSpentSeconds: 70, visitCount: 2, answered: false }
                }
            }
        };

        const response = await request.post('http://127.0.0.1:3000/api/exams/CS301-2026/submit', {
            data: payload
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.receipt).toBeDefined();
        expect(data.receipt.timeSpentSeconds).toBe(120);
        expect(data.receipt.formattedTimeSpent).toBe('2m 00s');
        expect(data.receipt.averageResponseTimeSeconds).toBeDefined();
        expect(data.receipt.responseTimes).toBeDefined();
        expect(data.receipt.responseTimes.perQuestion['q-1'].timeSpentSeconds).toBe(50);
    });

});
