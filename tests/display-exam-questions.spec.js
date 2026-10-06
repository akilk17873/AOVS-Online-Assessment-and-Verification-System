import { test, expect } from '@playwright/test';

/**
 * SCRUM-9: Display Exam Questions
 * Automated Verification Suite
 */
test.describe('SCRUM-9: Display Exam Questions & Written-Answer Support', () => {

    test.beforeEach(async ({ page }) => {
        // Clear any previous sessionStorage before test
        await page.goto('http://127.0.0.1:3000/Exam/index.html');
        await page.evaluate(() => sessionStorage.clear());
        await page.reload();
        // Wait until workspace is active
        await expect(page.locator('#examWorkspace')).toBeVisible();
    });

    test('TC-SCRUM9-01: Dynamically loads active exam title, metadata, and instructions', async ({ page }) => {
        // Exam Title and course info
        await expect(page.locator('#examTitle')).toContainText('Data Structures & Algorithms Certification Examination');
        await expect(page.locator('#courseCode')).toHaveText('CS-301');
        await expect(page.locator('#totalMarksBadge')).toContainText('25 Marks');

        // Instructions modal
        await page.locator('#instructionsBtn').click();
        await expect(page.locator('#instructionsModal')).toBeVisible();
        const instructions = page.locator('#instructionsList li');
        await expect(instructions).toHaveCount(6);
        await expect(instructions.first()).toContainText('written-answer questions');
        await page.locator('#confirmInstructionsBtn').click();
        await expect(page.locator('#instructionsModal')).toBeHidden();
    });

    test('TC-SCRUM9-02: Displays one question at a time with number, title, section, and marks', async ({ page }) => {
        // Question number and total
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 1 of 5');
        await expect(page.locator('#questionSectionBadge')).toHaveText('Section 1: Data Structures & System Design');
        await expect(page.locator('#questionTypeBadge')).toHaveText('Written Answer');

        // Marks display
        await expect(page.locator('#questionMarksValue')).toHaveText('+5.00 Marks');

        // Question prompt text
        await expect(page.locator('#questionHeading')).toBeVisible();
        await expect(page.locator('#questionHeading')).toContainText('Hash Table');

        // Verify options container is hidden and written-answer container is visible
        await expect(page.locator('#optionsContainer')).toBeHidden();
        await expect(page.locator('#writtenAnswerContainer')).toBeVisible();
    });

    test('TC-SCRUM9-03: Written-answer text area accepts typing and updates live counts', async ({ page }) => {
        const textarea = page.locator('#writtenAnswerInput');
        await expect(textarea).toBeVisible();
        await expect(textarea).toBeEmpty();

        // Initial counts
        await expect(page.locator('#writtenWordCount')).toHaveText('0 words');
        await expect(page.locator('#writtenCharCount')).toHaveText('0 characters');

        // Type response
        const answerText = 'A hash table uses a hash function to map keys to bucket indices. Collisions occur via pigeonhole principle.';
        await textarea.fill(answerText);

        // Verify live counts
        const words = answerText.trim().split(/\s+/).length;
        await expect(page.locator('#writtenWordCount')).toHaveText(`${words} words`);
        await expect(page.locator('#writtenCharCount')).toHaveText(`${answerText.length} characters`);

        // Palette button 1 should reflect answered state
        await expect(page.locator('#palette_btn_0')).toHaveClass(/state-answered/);
        await expect(page.locator('#statAnsweredCount')).toHaveText('1');
    });

    test('TC-SCRUM9-04: Preserves entered text across question navigation', async ({ page }) => {
        const textarea = page.locator('#writtenAnswerInput');

        // Answer Question 1
        const q1Text = 'Separate chaining uses linked lists to chain colliding entries in each bucket.';
        await textarea.fill(q1Text);

        // Navigate to Question 2 via Save & Next
        await page.locator('#nextBtn').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 2 of 5');
        await expect(page.locator('#questionHeading')).toContainText('Binary Search Tree (BST)');

        // Textarea on Question 2 should be empty initially
        await expect(textarea).toBeEmpty();

        // Answer Question 2
        const q2Text = 'AVL trees maintain balance factor in {-1, 0, 1} through rotations.';
        await textarea.fill(q2Text);

        // Navigate back to Question 1 via Previous button
        await page.locator('#prevBtn').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 1 of 5');

        // Verify Question 1 answer was preserved!
        await expect(textarea).toHaveValue(q1Text);

        // Navigate back to Question 2 via Question Palette
        await page.locator('#palette_btn_1').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 2 of 5');

        // Verify Question 2 answer was preserved!
        await expect(textarea).toHaveValue(q2Text);
    });

    test('TC-SCRUM9-05: Clear response resets textarea, counters, and palette state', async ({ page }) => {
        const textarea = page.locator('#writtenAnswerInput');
        await textarea.fill('Temporary written answer to test clearing.');

        await expect(page.locator('#palette_btn_0')).toHaveClass(/state-answered/);
        await expect(page.locator('#statAnsweredCount')).toHaveText('1');

        // Click Clear Response
        await page.locator('#clearBtn').click();

        // Textarea should be empty
        await expect(textarea).toHaveValue('');
        await expect(page.locator('#writtenWordCount')).toHaveText('0 words');
        await expect(page.locator('#writtenCharCount')).toHaveText('0 characters');

        // Palette state should revert to unanswered
        await expect(page.locator('#palette_btn_0')).not.toHaveClass(/state-answered/);
        await expect(page.locator('#statAnsweredCount')).toHaveText('0');
    });

    test('TC-SCRUM9-06: Displays code snippet for questions with programming code', async ({ page }) => {
        // Navigate to Question 3 (which has a Python code snippet)
        await page.locator('#palette_btn_2').click();
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 3 of 5');
        await expect(page.locator('#questionHeading')).toContainText('Fibonacci');

        // Code snippet block should be visible
        await expect(page.locator('#codeSnippetContainer')).toBeVisible();
        await expect(page.locator('#codeLangLabel')).toHaveText('PYTHON');
        await expect(page.locator('#codeSnippetContent')).toContainText('def fibonacci(n):');
        await expect(page.locator('#copyCodeBtn')).toBeVisible();

        // Written answer textarea is still provided below the snippet
        await expect(page.locator('#writtenAnswerContainer')).toBeVisible();
    });

    test('TC-SCRUM9-07: Security - Confidential answer keys and rubrics are never exposed', async ({ request, page }) => {
        // Query server API directly
        const response = await request.get('http://127.0.0.1:3000/api/exam/active');
        expect(response.status()).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        const questionsList = data.exam.questions;
        expect(questionsList.length).toBe(5);

        for (const q of questionsList) {
            // Confirm confidential server fields are stripped
            expect(q).not.toHaveProperty('sampleAnswer');
            expect(q).not.toHaveProperty('rubric');
            expect(q).not.toHaveProperty('answerKey');
            expect(q).not.toHaveProperty('correctOption');
            expect(q).not.toHaveProperty('correctOptions');
        }

        // Verify page DOM does not leak confidential data
        const html = await page.content();
        expect(html).not.toContain('sampleAnswer');
        expect(html).not.toContain('rubric');
    });

    test('TC-SCRUM9-08: Empty state renders correctly when no questions are available', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html?simulate=empty');
        await expect(page.locator('#emptyState')).toBeVisible();
        await expect(page.locator('#emptyState')).toContainText('No Questions Available');
        await expect(page.locator('#refreshEmptyBtn')).toBeVisible();
        await expect(page.locator('#examWorkspace')).toBeHidden();
    });

    test('TC-SCRUM9-09: Error state renders gracefully on API failure with retry action', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html?simulate=error');
        await expect(page.locator('#errorState')).toBeVisible();
        await expect(page.locator('#errorMessage')).toContainText(/internal server error/i);
        await expect(page.locator('#retryLoadBtn')).toBeVisible();
        await expect(page.locator('#examWorkspace')).toBeHidden();
    });

    test('TC-SCRUM9-10: Works seamlessly on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        // Question card and textarea are visible on mobile
        await expect(page.locator('#questionHeading')).toBeVisible();
        await expect(page.locator('#writtenAnswerInput')).toBeVisible();

        // Fill written answer on mobile
        await page.locator('#writtenAnswerInput').fill('Mobile test response for written answer question.');

        // Toggle mobile palette drawer
        const mobileToggle = page.locator('#mobilePaletteToggle');
        await expect(mobileToggle).toBeVisible();
        await mobileToggle.click();
        await expect(page.locator('#paletteSidebar')).toHaveClass(/drawer-open/);

        // Click Question 2 inside drawer
        await page.locator('#palette_btn_1').click();
        await expect(page.locator('#paletteSidebar')).not.toHaveClass(/drawer-open/);
        await expect(page.locator('#questionNumberBadge')).toHaveText('Question 2 of 5');
    });

});
