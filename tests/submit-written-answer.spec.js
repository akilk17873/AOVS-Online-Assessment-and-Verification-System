const { test, expect } = require('@playwright/test');
const { getDatabase } = require('../db');

test.describe('SCRUM-10: Submit Written Answer API & UI', () => {

    test.beforeAll(async () => {
        // Clear answers collection before tests
        const db = await getDatabase();
        if (db) {
            await db.collection('answers').deleteMany({});
        }
    });

    test('1. API rejects unauthenticated submission (missing studentId)', async ({ request }) => {
        const response = await request.post('/api/exam/answers', {
            data: {
                examId: 'CS301-2026',
                questionId: 'q-1',
                answerText: 'Test answer'
            }
        });
        expect(response.status()).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
    });

    test('2. API rejects invalid exam ID', async ({ request }) => {
        const response = await request.post('/api/exam/answers', {
            data: {
                studentId: 'TEST001',
                examId: 'INVALID-EXAM-123',
                questionId: 'q-1',
                answerText: 'Test answer'
            }
        });
        expect(response.status()).toBe(404);
        const data = await response.json();
        expect(data.success).toBe(false);
    });

    test('3. API rejects invalid question ID (does not belong to exam)', async ({ request }) => {
        const response = await request.post('/api/exam/answers', {
            data: {
                studentId: 'TEST001',
                examId: 'CS301-2026',
                questionId: 'INVALID-Q-ID',
                answerText: 'Test answer'
            }
        });
        expect(response.status()).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
    });

    test('4. API accepts valid written answer submission and stores in MongoDB', async ({ request }) => {
        const response = await request.post('/api/exam/answers', {
            data: {
                studentId: 'TEST001',
                examId: 'CS301-2026',
                questionId: 'q-1',
                answerText: 'This is my thorough written answer.'
            }
        });
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Verify in DB
        const db = await getDatabase();
        if (db) {
            const stored = await db.collection('answers').findOne({ studentId: 'TEST001', examId: 'CS301-2026', questionId: 'q-1' });
            expect(stored).not.toBeNull();
            expect(stored.answerText).toBe('This is my thorough written answer.');
            expect(stored.updatedAt).toBeDefined();
        }
    });

    test('5. API updates existing answer instead of creating duplicate (repeated submission)', async ({ request }) => {
        // First submission already done in test 4. Send a new one.
        const response = await request.post('/api/exam/answers', {
            data: {
                studentId: 'TEST001',
                examId: 'CS301-2026',
                questionId: 'q-1',
                answerText: 'This is my UPDATED written answer.'
            }
        });
        expect(response.status()).toBe(200);

        const db = await getDatabase();
        if (db) {
            // Count documents
            const count = await db.collection('answers').countDocuments({ studentId: 'TEST001', examId: 'CS301-2026', questionId: 'q-1' });
            expect(count).toBe(1); // Should not duplicate
            
            const stored = await db.collection('answers').findOne({ studentId: 'TEST001', examId: 'CS301-2026', questionId: 'q-1' });
            expect(stored.answerText).toBe('This is my UPDATED written answer.');
        }
    });

    test('6. Different questions have different answers', async ({ request }) => {
        const response = await request.post('/api/exam/answers', {
            data: {
                studentId: 'TEST001',
                examId: 'CS301-2026',
                questionId: 'q-2', // different question
                answerText: 'Answer for Q2'
            }
        });
        expect(response.status()).toBe(200);

        const db = await getDatabase();
        if (db) {
            const count = await db.collection('answers').countDocuments({ studentId: 'TEST001', examId: 'CS301-2026' });
            expect(count).toBe(2); // q-1 and q-2
        }
    });

    test('7. Student can submit from UI and UI reflects saved state', async ({ page }) => {
        await page.goto('/Exam/index.html?examId=CS301-2026');
        
        // Wait for first question to load
        await page.waitForSelector('#writtenAnswerInput');
        
        // Type answer
        await page.fill('#writtenAnswerInput', 'UI submitted answer');
        
        // Status should change to unsaved
        await expect(page.locator('#saveStatusIndicator')).toContainText('Unsaved changes');

        // Click Submit Answer
        await page.click('#submitAnswerBtn');

        // Wait for saved indicator
        await expect(page.locator('#saveStatusIndicator')).toContainText('Answer saved to database!');

        // Reload page
        await page.reload();
        await page.waitForSelector('#writtenAnswerInput');
        
        // Assert text is retained
        const val = await page.inputValue('#writtenAnswerInput');
        expect(val).toBe('UI submitted answer');
    });
});
