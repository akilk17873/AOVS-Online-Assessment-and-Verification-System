import { test, expect } from '@playwright/test';

/**
 * SCRUM-18: Transcribe Spoken Response
 * Acceptance Criteria & SRS Section 3.4 (FR 3.4.1 & FR 3.4.2)
 *
 * 1. Spoken audio from verification window is processed for STT transcription.
 * 2. API returns accurate transcript with confidence scoring and model attribution.
 * 3. Live speech recognition displays immediate feedback in the student modal.
 * 4. Audio recording and text transcript are paired in submission payload.
 * 5. Instructor review drawer presents the transcript alongside the playable audio.
 */
test.describe('SCRUM-18: Transcribe Spoken Response (FR 3.4)', () => {
    test.describe.configure({ mode: 'serial' });

    test('TC-SCRUM18-01: Transcription API processes spoken audio payload and generates neural transcript', async ({ request }) => {
        const response = await request.post('http://127.0.0.1:3000/api/oral-question/transcribe', {
            data: {
                questionId: 'q-1',
                questionPrompt: 'In your response, you described collision resolution. Briefly explain aloud what occurs if all keys hash into the exact same bucket...',
                studentAnswer: 'Hash tables use hash functions to map keys. In separate chaining, colliding keys link together.',
                spokenText: 'If all keys hash into the exact same bucket, search performance degrades to linear O(n). To restore O(1), we rehash into a larger table.',
                audioBase64: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.transcript).toBeDefined();
        expect(data.transcript).toContain('linear O(n)');
        expect(data.confidence).toBeGreaterThanOrEqual(0.9);
        expect(data.engine).toContain('Whisper');
        expect(data.transcribedAt).toBeDefined();
    });

    test('TC-SCRUM18-02: Transcription API provides contextual AI fallback when spokenText is absent', async ({ request }) => {
        const response = await request.post('http://127.0.0.1:3000/api/oral-question/transcribe', {
            data: {
                questionId: 'q-2',
                questionPrompt: 'Explain AVL tree height balance and double rotations aloud.',
                studentAnswer: 'AVL trees balance heights using left and right rotations.',
                audioBase64: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.transcript).toBeDefined();
        expect(data.transcript.length).toBeGreaterThan(30);
        expect(data.transcript.toLowerCase()).toContain('rotation');
    });

    test('TC-SCRUM18-03: Student UI displays live transcription preview container', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Trigger oral follow-up
        await page.evaluate(async () => {
            window.simulateMicrophoneAccess(true);
            await window.triggerOralVerification('q-1', 35);
        });

        const transcriptCard = page.locator('#oralLiveTranscriptCard');
        await expect(transcriptCard).toBeVisible();
        await expect(page.locator('#oralTranscriptStatusBadge')).toBeVisible();
        await expect(page.locator('#oralLiveTranscriptText')).toBeVisible();

        // Close early
        await page.locator('#finishOralSpeakingBtn').click();
        await expect(page.locator('#oralVerificationModal')).toBeHidden({ timeout: 8000 });
    });

    test('TC-SCRUM18-04: Submission payload pairs both audio data URL and transcript in oralVerifications', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        await page.evaluate(async () => {
            window.simulateMicrophoneAccess(true);
            await window.triggerOralVerification('q-1', 35);
        });

        await page.waitForTimeout(500);
        await page.locator('#finishOralSpeakingBtn').click();
        await expect(page.locator('#oralVerificationModal')).toBeHidden({ timeout: 6000 });

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
        expect(q1Oral.audioDataUrl).toMatch(/^data:audio\/(webm|wav)/);
        expect(q1Oral.transcript).toBeDefined();
        expect(q1Oral.transcript.length).toBeGreaterThan(20);
    });

    test('TC-SCRUM18-05: Instructor review drawer displays transcript block with quotation and attribution', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Instructor/login.html', { waitUntil: 'domcontentloaded' });
        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.getByLabel(/security password/i).fill('Instructor@123');
        await page.locator('#submitLoginBtn').click();
        await page.waitForURL('**/dashboard.html**');

        // Open Rahul Verma (SUB-CS301-103)
        const reviewBtn = page.locator('button.open-review-btn[data-id="SUB-CS301-103"]');
        await expect(reviewBtn).toBeVisible({ timeout: 10000 });
        await reviewBtn.click();

        const modal = page.locator('#reviewModal');
        await expect(modal).toBeVisible();

        const transcriptBox = modal.locator('.oral-transcript-box');
        await expect(transcriptBox).toBeVisible();
        await expect(transcriptBox).toContainText(/Speech-to-Text Transcript/i);

        const transcriptText = modal.locator('.oral-transcript-text');
        await expect(transcriptText).toBeVisible();
        const text = await transcriptText.textContent();
        expect(text.length).toBeGreaterThan(25);
    });
});

