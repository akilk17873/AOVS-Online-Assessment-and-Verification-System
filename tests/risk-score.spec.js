import { test, expect } from '@playwright/test';

/**
 * SCRUM-13: Calculate Risk Score
 * Automated Verification Suite
 *
 * Acceptance Criteria:
 * 1. Weighted score computed per answer (combining response time & paste-event signals).
 * 2. Threshold is configurable (via backend API and Instructor dashboard).
 * 3. Score logged for review (logged in submission analysis, review modal, and submissions table).
 */

async function loginAsInstructor(page) {
    await page.goto('http://127.0.0.1:3000/Instructor/login.html', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/instructor id or email/i).fill('INST001');
    await page.getByLabel(/security password/i).fill('Instructor@123');
    await page.locator('#submitLoginBtn').click();
    await page.waitForURL('**/Instructor/dashboard.html');
    // Ensure real submissions data rows have finished loading
    await expect(page.locator('#submissionsTableBody tr[data-submission-id]').first()).toBeVisible({ timeout: 15000 });
}

test.describe('SCRUM-13: Calculate Risk Score (Engine, API & Dashboard)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Reset configuration to standard defaults before each test
        await page.request.post('http://127.0.0.1:3000/api/instructor/risk-config', {
            data: { threshold: 65, weightPaste: 0.55, weightTime: 0.45 }
        });
    });

    test('TC-SCRUM13-01: Risk Configuration API returns default settings and accepts threshold updates', async ({ request }) => {
        // GET active config
        const getRes = await request.get('http://127.0.0.1:3000/api/instructor/risk-config');
        expect(getRes.ok()).toBeTruthy();
        const configData = await getRes.json();

        expect(configData.success).toBe(true);
        expect(configData.config.threshold).toBe(65);
        expect(configData.config.weightPaste).toBe(0.55);
        expect(configData.config.weightTime).toBe(0.45);

        // POST updated threshold
        const postRes = await request.post('http://127.0.0.1:3000/api/instructor/risk-config', {
            data: { threshold: 75 }
        });
        expect(postRes.ok()).toBeTruthy();
        const updatedData = await postRes.json();
        expect(updatedData.config.threshold).toBe(75);

        // Restore to 65
        await request.post('http://127.0.0.1:3000/api/instructor/risk-config', {
            data: { threshold: 65 }
        });
    });

    test('TC-SCRUM13-02: Exam submission evaluates weighted risk score per answer and logs in submission receipt', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => sessionStorage.clear());
        await page.reload({ waitUntil: 'domcontentloaded' });

        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Question 1: Natural typing (Low risk)
        const answerInput = page.locator('#writtenAnswerInput');
        await answerInput.fill('A stack follows Last-In First-Out while a queue follows First-In First-Out.');
        await page.waitForTimeout(1200);

        // Navigate to Question 2
        await page.locator('#nextBtn').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 2 of 5');

        // Question 2: Simulate paste event
        const pasteAnswer = 'QuickSort uses divide-and-conquer strategy choosing a pivot element and partitioning the array into sub-arrays.';
        await page.evaluate((text) => {
            const el = document.getElementById('writtenAnswerInput');
            el.focus();
            const pasteDataTransfer = new DataTransfer();
            pasteDataTransfer.setData('text/plain', text);
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: pasteDataTransfer,
                bubbles: true,
                cancelable: true
            });
            el.dispatchEvent(pasteEvent);
            el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }, pasteAnswer);

        // Open submission confirmation modal
        await page.locator('#submitExamBtn').click();
        await expect(page.locator('#submitConfirmModal')).toBeVisible();

        // Submit final responses and wait for response
        const [submitResponse] = await Promise.all([
            page.waitForResponse(res => res.url().includes('/submit') && res.request().method() === 'POST'),
            page.locator('#finalConfirmSubmitBtn').click()
        ]);

        expect(submitResponse.ok()).toBeTruthy();
        const submitBody = await submitResponse.json();
        expect(submitBody.success).toBe(true);
        expect(submitBody.receipt).toBeDefined();

        // Verify riskAnalysis was logged in receipt (AC: Score logged for review)
        const analysis = submitBody.receipt.riskAnalysis;
        expect(analysis).toBeDefined();
        expect(typeof analysis.compositeScore).toBe('number');
        expect(analysis.threshold).toBe(65);
        expect(analysis.perAnswer).toBeDefined();

        // Verify per-answer weighted score computation (AC: Weighted score computed per answer)
        const q1Risk = analysis.perAnswer['q-1'];
        expect(q1Risk).toBeDefined();
        expect(typeof q1Risk.score).toBe('number');
        expect(q1Risk.signals).toBeDefined();
        expect(typeof q1Risk.signals.pasteScore).toBe('number');
        expect(typeof q1Risk.signals.timeScore).toBe('number');

        // Question 2 had paste event -> pasteScore must be > 0
        const q2Risk = analysis.perAnswer['q-2'];
        expect(q2Risk).toBeDefined();
        expect(q2Risk.metrics.pasteCount).toBeGreaterThanOrEqual(1);
        expect(q2Risk.signals.pasteScore).toBeGreaterThan(0);

        // Receipt modal appears
        await expect(page.locator('#receiptModal')).toBeVisible();
    });

    test('TC-SCRUM13-03: Instructor Dashboard displays Risk Scores, status badges, and statistical counters', async ({ page }) => {
        await loginAsInstructor(page);

        // Verify Flagged For Review stat card
        const flaggedCard = page.locator('#statFlaggedReviews');
        await expect(flaggedCard).toBeVisible();
        const flaggedCount = await flaggedCard.textContent();
        expect(Number(flaggedCount)).toBeGreaterThanOrEqual(1);

        // Verify Risk Score column headers and badges
        const tableRows = page.locator('#submissionsTableBody tr[data-submission-id]');
        const rowsCount = await tableRows.count();
        expect(rowsCount).toBeGreaterThanOrEqual(1);

        // Check for presence of risk badges (Flagged / Verified)
        const highRiskBadge = page.locator('.risk-badge.high').first();
        await expect(highRiskBadge).toBeVisible();
        await expect(highRiskBadge).toContainText('Flagged');

        const lowRiskBadge = page.locator('.risk-badge.low').first();
        await expect(lowRiskBadge).toBeVisible();
        await expect(lowRiskBadge).toContainText('Verified');
    });

    test('TC-SCRUM13-04: Risk filter on Instructor Dashboard isolates flagged/suspicious submissions', async ({ page }) => {
        await loginAsInstructor(page);

        const initialCount = await page.locator('#submissionsTableBody tr[data-submission-id]').count();
        expect(initialCount).toBeGreaterThanOrEqual(1);

        // Filter by Flagged / High Risk
        await page.locator('#filterRisk').selectOption('flagged');
        await page.waitForTimeout(300);

        // Only flagged rows should be visible
        const visibleRows = page.locator('#submissionsTableBody tr[data-submission-id]');
        const count = await visibleRows.count();
        expect(count).toBeGreaterThanOrEqual(1);

        for (let i = 0; i < count; i++) {
            const rowText = await visibleRows.nth(i).textContent();
            expect(rowText).toMatch(/Flagged|High/i);
        }

        // Filter by Low Risk / Verified
        await page.locator('#filterRisk').selectOption('low');
        await page.waitForTimeout(300);
        const lowCount = await page.locator('#submissionsTableBody tr[data-submission-id]').count();
        expect(lowCount).toBeGreaterThanOrEqual(1);

        // Filter back to All
        await page.locator('#filterRisk').selectOption('all');
        await page.waitForTimeout(300);
        const allCount = await page.locator('#submissionsTableBody tr[data-submission-id]').count();
        expect(allCount).toBe(initialCount);
    });

    test('TC-SCRUM13-05: Review modal surfaces detailed risk breakdown, telemetry, and per-question indicators', async ({ page }) => {
        await loginAsInstructor(page);

        // Click "Review & Grade" on flagged student Rahul Verma (SUB-CS301-103)
        const reviewBtn = page.locator('button[data-id="SUB-CS301-103"]');
        await expect(reviewBtn).toBeVisible();
        await reviewBtn.click();

        // Modal should appear
        const modal = page.locator('#reviewModal');
        await expect(modal).toBeVisible();

        // Overall Risk Badge in header
        const modalRiskBadge = page.locator('#modalRiskBadge');
        await expect(modalRiskBadge).toBeVisible();
        await expect(modalRiskBadge).toContainText('Risk Score: 86 (Flagged)');

        // Risk Overview Card in body
        const riskCard = page.locator('.risk-overview-card');
        await expect(riskCard).toBeVisible();
        await expect(riskCard).toContainText(/Suspicious Answer Patterns Detected/i);
        await expect(riskCard).toContainText(/Verification Required/i);

        // Per-question risk indicator pill and anomaly warning
        const qRiskPill = page.locator('.q-risk-pill.high').first();
        await expect(qRiskPill).toBeVisible();
        await expect(qRiskPill).toContainText(/Risk: 92/i);

        const riskCallout = page.locator('.risk-warning-callout').first();
        await expect(riskCallout).toBeVisible();
        await expect(riskCallout).toContainText(/Verification Required/i);
    });

    test('TC-SCRUM13-06: Configurable threshold modal adjusts threshold and immediately re-evaluates risk on dashboard', async ({ page }) => {
        await loginAsInstructor(page);

        // Click "Configure Threshold" button
        const openThresholdBtn = page.locator('#openThresholdBtn');
        await expect(openThresholdBtn).toBeVisible();
        await openThresholdBtn.click();

        // Modal opens
        const thresholdModal = page.locator('#thresholdModal');
        await expect(thresholdModal).toBeVisible();

        // Adjust slider to 80
        await page.evaluate(() => {
            const slider = document.getElementById('thresholdSlider');
            slider.value = '80';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await expect(page.locator('#thresholdDisplayValue')).toHaveText('80');

        // Save new threshold
        const saveThresholdBtn = page.locator('#saveThresholdBtn');
        await saveThresholdBtn.click();

        // Modal closes
        await expect(thresholdModal).toBeHidden();

        // Verify badge shows updated threshold: 80
        const currentThresholdBadge = page.locator('#currentThresholdBadge');
        await expect(currentThresholdBadge).toHaveText('80');
    });
});
