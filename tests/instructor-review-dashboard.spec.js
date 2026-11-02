import { test, expect } from '@playwright/test';

/**
 * SCRUM-19: Instructor Review Dashboard
 * Acceptance Criteria & Verification Suite (SRS Section 3.5 & 4.x)
 *
 * 1. Aggregated statistics counters displayed (Total, Pending, Reviewed, Flagged).
 * 2. Instant search filter by Student Name or Student ID.
 * 3. Status filter toggles between All, Pending Review, and Reviewed.
 * 4. Interactive review drawer displays student responses, telemetry, risk indicators, oral audio & transcript.
 * 5. Evaluator assigns question marks and qualitative feedback, saving grade to backend.
 */
test.describe('SCRUM-19: Instructor Review Dashboard', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Instructor/login.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => sessionStorage.clear());
        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.getByLabel(/security password/i).fill('Instructor@123');
        await page.locator('#submitLoginBtn').click();
        await page.waitForURL('**/dashboard.html**');
    });

    test('TC-SCRUM19-01: Displays statistical metric counters and submissions table', async ({ page }) => {
        await expect(page.locator('#statTotalSubmissions')).toBeVisible();
        await expect(page.locator('#statPendingReviews')).toBeVisible();
        await expect(page.locator('#statEvaluated')).toBeVisible();
        await expect(page.locator('#statFlaggedReviews')).toBeVisible();

        const table = page.locator('.submissions-table');
        await expect(table).toBeVisible();

        const rows = page.locator('#submissionsTableBody tr');
        await expect(rows.first()).toBeVisible({ timeout: 10000 });
        const count = await rows.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('TC-SCRUM19-02: Search input filters submissions by student name or ID', async ({ page }) => {
        const searchInput = page.locator('#searchInput');
        await expect(searchInput).toBeVisible();

        // Search for Rahul Verma
        await searchInput.fill('Rahul');
        await page.waitForTimeout(300);

        const rows = page.locator('#submissionsTableBody tr:visible');
        const count = await rows.count();
        expect(count).toBe(1);
        await expect(rows.first()).toContainText('Rahul Verma');

        // Clear search
        await searchInput.fill('');
        await page.waitForTimeout(300);
        const resetCount = await page.locator('#submissionsTableBody tr:visible').count();
        expect(resetCount).toBeGreaterThan(1);
    });

    test('TC-SCRUM19-03: Status filter dropdown isolates Pending and Reviewed submissions', async ({ page }) => {
        const statusSelect = page.locator('#filterStatus');
        await expect(statusSelect).toBeVisible();

        // Filter Pending Review
        await statusSelect.selectOption('Pending Review');
        await page.waitForTimeout(300);
        const pendingRows = page.locator('#submissionsTableBody tr:visible');
        const pendingCount = await pendingRows.count();
        expect(pendingCount).toBeGreaterThan(0);
        for (let i = 0; i < pendingCount; ++i) {
            await expect(pendingRows.nth(i)).toContainText(/Pending/i);
        }

        // Filter Reviewed
        await statusSelect.selectOption('Reviewed');
        await page.waitForTimeout(300);
        const reviewedRows = page.locator('#submissionsTableBody tr:visible');
        const reviewedCount = await reviewedRows.count();
        expect(reviewedCount).toBeGreaterThan(0);
        for (let i = 0; i < reviewedCount; ++i) {
            await expect(reviewedRows.nth(i)).toContainText(/Reviewed|Graded/i);
        }
    });

    test('TC-SCRUM19-04: Detailed review drawer surfaces telemetry, oral audio player, and STT transcript', async ({ page }) => {
        // Open review drawer for Rahul Verma (SUB-CS301-103)
        const reviewBtn = page.locator('button.open-review-btn[data-id="SUB-CS301-103"]');
        await expect(reviewBtn).toBeVisible({ timeout: 10000 });
        await reviewBtn.click();

        const modal = page.locator('#reviewModal');
        await expect(modal).toBeVisible();

        // Header info
        await expect(page.locator('#modalStudentName')).toContainText('Rahul Verma');
        await expect(page.locator('#modalStudentId')).toContainText('STU103');

        // Question cards and answers
        const qCard = modal.locator('.question-review-card').first();
        await expect(qCard).toBeVisible();
        await expect(qCard.locator('.student-answer-box')).toBeVisible();

        // Telemetry signals
        await expect(qCard.locator('.q-telemetry-pill')).toBeVisible();

        // Audio player and transcript
        await expect(modal.locator('.oral-audio-player')).toBeVisible();
        await expect(modal.locator('.oral-transcript-box')).toBeVisible();

        // Close modal
        await page.locator('#closeModalBtn').click();
        await expect(modal).toBeHidden();
    });

    test('TC-SCRUM19-05: Evaluator grades submission and saves evaluation to backend', async ({ page }) => {
        // Open pending submission (Akil Kumar or Rahul Verma)
        const reviewBtn = page.locator('button.open-review-btn[data-id="SUB-CS301-103"]');
        await expect(reviewBtn).toBeVisible({ timeout: 10000 });
        await reviewBtn.click();

        const modal = page.locator('#reviewModal');
        await expect(modal).toBeVisible();

        // Fill marks on question 1
        const markInputs = modal.locator('.mark-input');
        if (await markInputs.count() > 0) {
            await markInputs.first().fill('5');
        }

        // Fill qualitative instructor feedback
        const feedbackArea = page.locator('#modalInstructorFeedback');
        if (await feedbackArea.isVisible()) {
            await feedbackArea.fill('Demonstrates good conceptual understanding during oral follow-up.');
        }

        // Click save grade
        const saveBtn = page.locator('#saveGradeBtn');
        await expect(saveBtn).toBeVisible();
        await saveBtn.click();

        // Modal closes and submission is marked Reviewed
        await expect(modal).toBeHidden({ timeout: 8000 });
        const targetRow = page.locator('#submissionsTableBody tr', { hasText: 'Rahul Verma' });
        await expect(targetRow).toContainText(/Reviewed|Graded/i);
    });
});

