import { test, expect } from '@playwright/test';

/**
 * SCRUM-16: Capture Microphone Audio & Speech-to-Text Transcription
 * Automated Verification Suite (SRS Section 3.3 & 3.4)
 *
 * Acceptance Criteria:
 * 1. Permission prompt shown to student
 * 2. Recording starts/stops with the verification window
 * 3. Permission denial handled gracefully (FR 3.3.3)
 *
 * Plus:
 * 4. Audio is stored as playable audio data
 * 5. Audio is transcribed into text
 * 6. Instructor Dashboard surfaces both audio player and transcript
 */

test.describe('SCRUM-16: Capture Microphone Audio & Speech-to-Text Transcription', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => sessionStorage.clear());
    });

    test('TC-SCRUM16-01: Permission prompt and recording status are shown to student (AC #1)', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Trigger oral verification for Question 1
        await page.evaluate(async () => {
            await window.triggerOralVerification('q-1', 35);
        });

        // AC #1: Microphone status card is visible with active recording copy
        const micStatus = page.locator('#oralMicStatus');
        await expect(micStatus).toBeVisible();

        const statusHeading = page.locator('#oralMicStatusHeading');
        await expect(statusHeading).toBeVisible();
        await expect(statusHeading).toContainText(/Microphone Active|Recording Voice/i);

        // Wave bars and pulse dot visible during recording
        await expect(page.locator('#oralAudioWaveBars')).toBeVisible();
        await expect(page.locator('#oralMicPulseDot')).toBeVisible();

        // Live transcription preview card visible
        await expect(page.locator('#oralLiveTranscriptCard')).toBeVisible();
    });

    test('TC-SCRUM16-02: Recording starts with verification window and stops when closed (AC #2)', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Trigger oral verification with 40s duration
        await page.evaluate(async () => {
            await window.triggerOralVerification('q-1', 40);
        });

        const modal = page.locator('#oralVerificationModal');
        await expect(modal).toBeVisible();

        // Allow ~1.5s recording
        await page.waitForTimeout(1500);

        // Click "I'm Finished Speaking" early to stop recording
        await page.locator('#finishOralSpeakingBtn').click();
        await expect(modal).toBeHidden({ timeout: 8000 });

        // Verify audio recording was stopped, encoded, and saved in sessionStorage
        const storedState = await page.evaluate(() => {
            const raw = sessionStorage.getItem('aovs_exam_CS301-2026');
            return raw ? JSON.parse(raw) : null;
        });

        expect(storedState).not.toBeNull();
        expect(storedState.oralVerifications).toBeDefined();
        const q1Oral = storedState.oralVerifications['q-1'];
        expect(q1Oral).toBeDefined();
        expect(q1Oral.status).toContain('Completed');
        expect(q1Oral.microphoneStatus).toBe('granted');

        // Audio data URL must be generated
        expect(typeof q1Oral.audioDataUrl).toBe('string');
        expect(q1Oral.audioDataUrl.length).toBeGreaterThan(10);
        expect(q1Oral.audioDataUrl).toMatch(/^data:audio\/(webm|wav)/);

        // Transcript must be present
        expect(typeof q1Oral.transcript).toBe('string');
        expect(q1Oral.transcript.length).toBeGreaterThan(15);
    });

    test('TC-SCRUM16-03: Permission denial is handled gracefully, marking case as Unverifiable without blocking (AC #3 & FR 3.3.3)', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Simulate microphone permission denied
        await page.evaluate(() => {
            window.simulateMicrophoneAccess(false);
        });

        // Trigger oral verification with a short 2s timer
        await page.evaluate(async () => {
            await window.triggerOralVerification('q-1', 2);
        });

        const modal = page.locator('#oralVerificationModal');
        await expect(modal).toBeVisible();

        // AC #3: Permission denied alert is displayed gracefully
        const deniedBox = page.locator('#oralPermissionDeniedBox');
        await expect(deniedBox).toBeVisible();
        await expect(deniedBox).toContainText(/Microphone Access Unavailable|Unverifiable/i);

        // Window auto-closes at timeout without crashing or blocking
        await expect(modal).toBeHidden({ timeout: 8000 });

        // Verify status in session storage is marked as Unverifiable (FR 3.3.3)
        const storedState = await page.evaluate(() => {
            const raw = sessionStorage.getItem('aovs_exam_CS301-2026');
            return raw ? JSON.parse(raw) : null;
        });

        expect(storedState).not.toBeNull();
        const q1Oral = storedState.oralVerifications['q-1'];
        expect(q1Oral).toBeDefined();
        expect(q1Oral.microphoneStatus).toBe('denied');
        expect(q1Oral.status).toContain('Unverifiable - Microphone unavailable');

        // Exam is NOT blocked — user can proceed to next question (FR 3.1.4)
        await expect(page.locator('#nextBtn')).toBeEnabled();
    });

    test('TC-SCRUM16-04: Backend API transcribes audio recording and returns transcript (FR 3.4)', async ({ request }) => {
        const response = await request.post('http://127.0.0.1:3000/api/oral-question/transcribe', {
            data: {
                questionId: 'q-1',
                questionPrompt: 'In your response, you described collision resolution. Briefly explain aloud what occurs if all keys hash into the exact same bucket...',
                studentAnswer: 'Hash tables use hash functions. When collisions happen, separate chaining links elements.',
                audioBase64: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.transcript).toBeDefined();
        expect(typeof data.transcript).toBe('string');
        expect(data.transcript.length).toBeGreaterThan(25);
        expect(data.transcript.toLowerCase()).toContain('bucket');
        expect(data.engine).toContain('Whisper');
    });

    test('TC-SCRUM16-05: Submission payload retains audio data URL and transcript in oralVerifications', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Exam/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#examWorkspace')).toBeVisible({ timeout: 10000 });

        // Trigger oral verification and finish
        await page.evaluate(async () => {
            window.simulateMicrophoneAccess(true);
            await window.triggerOralVerification('q-1', 25);
        });

        await page.waitForTimeout(500);
        await page.locator('#finishOralSpeakingBtn').click();
        await expect(page.locator('#oralVerificationModal')).toBeHidden({ timeout: 6000 });

        // Intercept submit request
        await page.locator('#submitExamBtn').click();
        await expect(page.locator('#submitConfirmModal')).toBeVisible();

        const [submitRequest] = await Promise.all([
            page.waitForRequest(req => req.url().includes('/submit') && req.method() === 'POST'),
            page.locator('#finalConfirmSubmitBtn').click()
        ]);

        const body = JSON.parse(submitRequest.postData());
        expect(body.oralVerifications).toBeDefined();
        expect(body.oralVerifications['q-1']).toBeDefined();
        expect(body.oralVerifications['q-1'].audioDataUrl).toBeDefined();
        expect(body.oralVerifications['q-1'].transcript).toBeDefined();
    });

    test('TC-SCRUM16-06: Instructor review drawer displays playable audio player and speech transcript', async ({ page }) => {
        // Authenticate instructor
        await page.goto('http://127.0.0.1:3000/Instructor/login.html');
        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.getByLabel(/security password/i).fill('Instructor@123');
        await page.locator('#submitLoginBtn').click();

        await page.waitForURL('**/dashboard.html**');

        // Open review modal for Rahul Verma (SUB-CS301-103)
        const reviewBtn = page.locator('button.open-review-btn[data-id="SUB-CS301-103"]');
        await expect(reviewBtn).toBeVisible({ timeout: 10000 });
        await reviewBtn.click();

        const modal = page.locator('#reviewModal');
        await expect(modal).toBeVisible();

        // Verify oral verification card is rendered
        const oralCard = modal.locator('.oral-verification-review-card');
        await expect(oralCard).toBeVisible();

        // Verify playable audio player is rendered
        const audioPlayer = modal.locator('.oral-audio-player');
        await expect(audioPlayer).toBeVisible();
        await expect(audioPlayer).toHaveAttribute('controls', '');

        // Verify Speech-to-Text transcript box is rendered
        const transcriptBox = modal.locator('.oral-transcript-box');
        await expect(transcriptBox).toBeVisible();
        await expect(transcriptBox).toContainText(/Speech-to-Text Transcript/i);
        const transcriptText = modal.locator('.oral-transcript-text');
        await expect(transcriptText).toBeVisible();
        const txt = await transcriptText.textContent();
        expect(txt.length).toBeGreaterThan(20);
    });
});

