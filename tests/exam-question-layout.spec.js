import { test, expect } from '@playwright/test';

test.describe('SCRUM-25: Exam Question Layout & Taking Interface', () => {

    test.beforeEach(async ({ page }) => {
        // Exam portal runs on port 3000 (and mirrored on 5500)
        await page.goto('http://127.0.0.1:3000/Exam/index.html');
        // Wait until workspace is rendered and active
        await expect(page.locator('#examWorkspace')).toBeVisible();
    });

    test('TC01 - Exam Header displays metadata, live timer, and proctor status', async ({ page }) => {
        // Exam Title and course info
        await expect(page.locator('#examTitle')).toContainText(/data structures/i);
        await expect(page.locator('#courseCode')).toHaveText('CS-301');
        await expect(page.locator('#totalMarksBadge')).toContainText('25 Marks');

        // Proctoring indicator
        await expect(page.locator('#proctorStatus')).toContainText(/proctor active/i);

        // Student identity
        await expect(page.locator('#studentId')).toHaveText('TEST001');

        // Live countdown timer display
        await expect(page.locator('#timerDisplay')).toBeVisible();
        const initialTime = await page.locator('#timerDisplay').textContent();
        expect(initialTime).toMatch(/\d{2}:\d{2}/);
    });

    test('TC02 - Question Text, Numbering, and Scoring Details are displayed clearly', async ({ page }) => {
        // Question count and badges
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 1 of 10');
        await expect(page.locator('#questionSectionBadge')).toContainText(/section/i);
        await expect(page.locator('#questionMarksValue')).toHaveText('+2.00 Marks');

        // Question text prompt
        await expect(page.locator('#questionHeading')).toBeVisible();
        await expect(page.locator('#questionHeading')).toContainText('Last-In, First-Out (LIFO)');

        // Progress bar
        await expect(page.locator('#progressBarFill')).toBeVisible();
    });

    test('TC03 - Single Choice (Radio) options selection with distinct visual states', async ({ page }) => {
        // Question 1 is single choice
        await expect(page.locator('#questionTypeBadge')).toHaveText('Single Choice (Radio)');

        const options = page.locator('.option-card');
        await expect(options).toHaveCount(4);

        // Verify radio inputs
        const radioInputs = page.locator('.option-card input[type="radio"]');
        await expect(radioInputs).toHaveCount(4);

        // Click Option B ("Stack")
        const optionB = page.locator('.option-card[data-option-id="B"]');
        await optionB.click();

        // Visual state verification
        await expect(optionB).toHaveClass(/selected/);
        await expect(optionB.locator('input[type="radio"]')).toBeChecked();
        await expect(page.locator('#selectionNotice')).toHaveClass(/show/);
        await expect(page.locator('#selectionNoticeText')).toContainText('Option B');

        // Clicking Option A should switch selection and deselect Option B
        const optionA = page.locator('.option-card[data-option-id="A"]');
        await optionA.click();

        await expect(optionA).toHaveClass(/selected/);
        await expect(optionA.locator('input[type="radio"]')).toBeChecked();
        await expect(optionB).not.toHaveClass(/selected/);
        await expect(optionB.locator('input[type="radio"]')).not.toBeChecked();
    });

    test('TC04 - Navigation controls and Answer state retention across questions', async ({ page }) => {
        // On question 1, Previous is disabled
        await expect(page.locator('#prevBtn')).toBeDisabled();

        // Select Option B on Question 1
        await page.locator('.option-card[data-option-id="B"]').click();
        await expect(page.locator('.option-card[data-option-id="B"]')).toHaveClass(/selected/);

        // Click Save & Next
        await page.locator('#nextBtn').click();

        // Now on Question 2
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 2 of 10');
        await expect(page.locator('#prevBtn')).toBeEnabled();

        // Click Previous to return to Question 1
        await page.locator('#prevBtn').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 1 of 10');

        // Verify Option B is STILL selected (state preserved!)
        await expect(page.locator('.option-card[data-option-id="B"]')).toHaveClass(/selected/);
        await expect(page.locator('.option-card[data-option-id="B"] input[type="radio"]')).toBeChecked();
    });

    test('TC05 - Multiple Choice (Checkboxes) support multiple selections and toggles', async ({ page }) => {
        // Navigate to Question 2 (which is multiple_choice)
        await page.locator('#palette_btn_1').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 2 of 10');
        await expect(page.locator('#questionTypeBadge')).toContainText('Multiple Choice');

        // Checkbox inputs
        const checkboxInputs = page.locator('.option-card input[type="checkbox"]');
        await expect(checkboxInputs).toHaveCount(4);

        const optA = page.locator('.option-card[data-option-id="A"]');
        const optB = page.locator('.option-card[data-option-id="B"]');

        // Select Option A
        await optA.click();
        await expect(optA).toHaveClass(/selected/);
        await expect(optA.locator('input[type="checkbox"]')).toBeChecked();

        // Select Option B (both should now be selected)
        await optB.click();
        await expect(optA).toHaveClass(/selected/);
        await expect(optB).toHaveClass(/selected/);
        await expect(page.locator('#selectionNoticeText')).toContainText('2 option(s) selected');

        // Deselect Option A
        await optA.click();
        await expect(optA).not.toHaveClass(/selected/);
        await expect(optB).toHaveClass(/selected/);
        await expect(page.locator('#selectionNoticeText')).toContainText('1 option(s) selected');
    });

    test('TC06 - Question Palette renders numbered grid and updates states', async ({ page }) => {
        const paletteButtons = page.locator('.palette-btn');
        await expect(paletteButtons).toHaveCount(10);

        // Question 1 button has state-current
        await expect(page.locator('#palette_btn_0')).toHaveClass(/state-current/);

        // Answer Question 1
        await page.locator('.option-card[data-option-id="B"]').click();
        await expect(page.locator('#palette_btn_0')).toHaveClass(/state-answered/);

        // Click question 5 in the palette
        await page.locator('#palette_btn_4').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 5 of 10');
        await expect(page.locator('#palette_btn_4')).toHaveClass(/state-current/);
    });

    test('TC07 - Mark for Review updates button, palette state, and counters', async ({ page }) => {
        // Go to Question 4
        await page.locator('#palette_btn_3').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 4 of 10');

        // Toggle Mark for Review
        await page.locator('#markReviewBtn').click();
        await expect(page.locator('#markReviewBtn')).toHaveClass(/active/);
        await expect(page.locator('#markReviewText')).toHaveText('Marked for Review');

        // Palette button 4 reflects marked state
        await expect(page.locator('#palette_btn_3')).toHaveClass(/state-marked/);
        await expect(page.locator('#statMarkedCount')).toHaveText('1');

        // Unmark
        await page.locator('#markReviewBtn').click();
        await expect(page.locator('#markReviewBtn')).not.toHaveClass(/active/);
        await expect(page.locator('#palette_btn_3')).not.toHaveClass(/state-marked/);
        await expect(page.locator('#statMarkedCount')).toHaveText('0');
    });

    test('TC08 - Clear Response unselects answers and updates palette', async ({ page }) => {
        // Select an option
        await page.locator('.option-card[data-option-id="B"]').click();
        await expect(page.locator('.option-card[data-option-id="B"]')).toHaveClass(/selected/);
        await expect(page.locator('#palette_btn_0')).toHaveClass(/state-answered/);

        // Clear Response
        await page.locator('#clearBtn').click();
        await expect(page.locator('.option-card[data-option-id="B"]')).not.toHaveClass(/selected/);
        await expect(page.locator('#palette_btn_0')).not.toHaveClass(/state-answered/);
    });

    test('TC09 - Code Snippet is displayed properly for coding questions', async ({ page }) => {
        // Question 3 has code snippet
        await page.locator('#palette_btn_2').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 3 of 10');

        await expect(page.locator('#codeSnippetContainer')).toBeVisible();
        await expect(page.locator('#codeLangLabel')).toHaveText('PYTHON');
        await expect(page.locator('#codeSnippetContent')).toContainText('def search_node');
        await expect(page.locator('#copyCodeBtn')).toBeVisible();
    });

    test('TC10 - Empty and Error states rendering', async ({ page }) => {
        // Test Empty State via simulate query
        await page.goto('http://127.0.0.1:3000/Exam/index.html?simulate=empty');
        await expect(page.locator('#emptyState')).toBeVisible();
        await expect(page.locator('#examWorkspace')).toBeHidden();

        // Test Error State via simulate query
        await page.goto('http://127.0.0.1:3000/Exam/index.html?simulate=error');
        await expect(page.locator('#errorState')).toBeVisible();
        await expect(page.locator('#retryLoadBtn')).toBeVisible();
        await expect(page.locator('#examWorkspace')).toBeHidden();
    });

    test('TC11 - Security: API and Client never expose correct answers to the student', async ({ request, page }) => {
        // 1. Verify API response
        const response = await request.get('http://127.0.0.1:3000/api/exam/active');
        expect(response.status()).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        const questionsList = data.exam.questions;
        expect(questionsList.length).toBeGreaterThan(0);

        for (const q of questionsList) {
            expect(q).not.toHaveProperty('correctOption');
            expect(q).not.toHaveProperty('correctOptions');
            expect(q).not.toHaveProperty('explanation');
        }

        // 2. Verify Client DOM does not contain correct answers
        const html = await page.content();
        expect(html).not.toContain('correctOption');
        expect(html).not.toContain('correctOptions');
    });

    test('TC12 - Mobile drawer opens and closes properly', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        const toggleBtn = page.locator('#mobilePaletteToggle');
        await expect(toggleBtn).toBeVisible();

        // Open drawer
        await toggleBtn.click();
        await expect(page.locator('#paletteSidebar')).toHaveClass(/drawer-open/);

        // Close drawer
        await page.locator('#drawerCloseBtn').click();
        await expect(page.locator('#paletteSidebar')).not.toHaveClass(/drawer-open/);
    });

    test('TC13 - Examination Submission Modal and Receipt', async ({ page }) => {
        // Answer at least one question
        await page.locator('.option-card[data-option-id="B"]').click();

        // Click Submit Examination
        await page.locator('#submitExamBtn').click();
        await expect(page.locator('#submitConfirmModal')).toBeVisible();
        await expect(page.locator('#modalAnsweredQuestions')).toHaveText('1');

        // Confirm submission
        await page.locator('#finalConfirmSubmitBtn').click();

        // Receipt modal appears
        await expect(page.locator('#receiptModal')).toBeVisible();
        await expect(page.locator('#receiptSubmissionId')).toContainText('SUB-');
        await expect(page.locator('#receiptStudentId')).toHaveText('TEST001');
    });

});
