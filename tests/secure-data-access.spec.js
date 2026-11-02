import { test, expect } from '@playwright/test';

/**
 * SCRUM-20: Secure Data Access (RBAC)
 * Acceptance Criteria & Security Verification (SRS Section 5)
 *
 * 1. Data Sanitization: Student question payloads strip answer keys and rubrics.
 * 2. Role Separation: Student credentials cannot access Instructor portal; Instructor rejected on Student portal.
 * 3. Route Guard: Unauthenticated access to review dashboard is blocked and redirected.
 * 4. API Authorization: RBAC middleware prevents student role from reading instructor review endpoints.
 * 5. Permission Verification: RBAC role endpoint validates permissions matrix.
 */
test.describe('SCRUM-20: Secure Data Access (RBAC)', () => {

    test('TC-SCRUM20-01: Active exam questions returned to students are strictly sanitized (No Answer Keys or Rubrics)', async ({ request }) => {
        const response = await request.get('http://127.0.0.1:3000/api/exam/active');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.exam).toBeDefined();
        expect(Array.isArray(data.exam.questions)).toBe(true);

        // Verify every question has zero leaks
        for (const q of data.exam.questions) {
            // Correct options and answers must NEVER be sent to student
            expect(q.correctOption).toBeUndefined();
            expect(q.correctOptions).toBeUndefined();
            expect(q.explanation).toBeUndefined();
            expect(q.sampleAnswer).toBeUndefined();
            expect(q.evaluationRubric).toBeUndefined();

            // Only public student fields must be present
            expect(q.id).toBeDefined();
            expect(q.title).toBeDefined();
            expect(q.marks).toBeDefined();
        }
    });

    test('TC-SCRUM20-02: Role separation - Student credentials rejected with 403 on Instructor Portal', async ({ request }) => {
        const response = await request.post('http://127.0.0.1:3000/api/instructor/login', {
            data: {
                instructorId: 'TEST001',
                password: 'Test@123'
            }
        });

        expect(response.status()).toBe(403);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('Student credentials cannot access instructor');
    });

    test('TC-SCRUM20-03: Role separation - Instructor credentials rejected on Student Login', async ({ request }) => {
        const response = await request.post('http://127.0.0.1:3000/api/college/login', {
            data: {
                studentId: 'INST001',
                password: 'Instructor@123'
            }
        });

        expect(response.status()).toBe(403);
        const data = await response.json();
        expect(data.success).toBe(false);
    });

    test('TC-SCRUM20-04: Client-side route guard redirects unauthenticated access to login', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Instructor/dashboard.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => sessionStorage.clear());
        await page.reload({ waitUntil: 'domcontentloaded' });

        await page.waitForURL('**/Instructor/login.html');
        expect(page.url()).toContain('/Instructor/login.html');
    });

    test('TC-SCRUM20-05: RBAC middleware blocks student role from accessing instructor submissions (403 Forbidden)', async ({ request }) => {
        const response = await request.get('http://127.0.0.1:3000/api/instructor/submissions', {
            headers: {
                'x-user-role': 'student'
            }
        });

        expect(response.status()).toBe(403);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('RBAC');
        expect(data.requiredRole).toBe('instructor');
    });

    test('TC-SCRUM20-06: RBAC role inspection API returns strict permissions matrix', async ({ request }) => {
        // Inspect student role
        const studentRes = await request.get('http://127.0.0.1:3000/api/auth/verify-role?role=student');
        expect(studentRes.ok()).toBeTruthy();
        const studentData = await studentRes.json();
        expect(studentData.role).toBe('student');
        expect(studentData.permissions).toContain('read_active_exam');
        expect(studentData.forbiddenResources).toContain('/api/instructor/*');

        // Inspect instructor role
        const instRes = await request.get('http://127.0.0.1:3000/api/auth/verify-role?role=instructor');
        expect(instRes.ok()).toBeTruthy();
        const instData = await instRes.json();
        expect(instData.role).toBe('instructor');
        expect(instData.permissions).toContain('view_submissions');
        expect(instData.permissions).toContain('grade_submission');
    });
});
