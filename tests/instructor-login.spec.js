import { test, expect } from '@playwright/test';

/**
 * SCRUM-8: Instructor Login & Review Dashboard Integration
 * Automated Verification Suite
 */
test.describe('SCRUM-8: Instructor Login & Review Dashboard', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/Instructor/login.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => sessionStorage.clear());
    });

    test('TC-SCRUM8-01: Displays all required UI elements and role branding', async ({ page }) => {
        // Heading & Role
        await expect(page.getByRole('heading', { name: /instructor login/i })).toBeVisible();
        await expect(page.locator('.role-badge')).toContainText(/academic faculty/i);

        // Inputs
        await expect(page.getByLabel(/instructor id or email/i)).toBeVisible();
        await expect(page.getByLabel(/security password/i)).toBeVisible();

        // Submit Button
        await expect(page.locator('#submitLoginBtn')).toBeVisible();
        await expect(page.locator('#submitLoginBtn')).toContainText(/sign in to review dashboard/i);

        // Quick Demo buttons
        await expect(page.locator('#fillInstructorDemoBtn')).toBeVisible();
        await expect(page.locator('#fillAdminDemoBtn')).toBeVisible();

        // Student portal switch link
        await expect(page.locator('.portal-link')).toBeVisible();
    });

    test('TC-SCRUM8-02: Client-side validation on empty Instructor ID', async ({ page }) => {
        let apiCalled = false;
        await page.route('**/api/instructor/login', route => {
            apiCalled = true;
            route.continue();
        });

        await page.getByLabel(/security password/i).fill('Instructor@123');
        await page.locator('#submitLoginBtn').click();

        await expect(page.locator('#instructorIdError')).toBeVisible();
        await expect(page.locator('#instructorIdError')).toContainText(/required/i);
        expect(apiCalled).toBe(false);
    });

    test('TC-SCRUM8-03: Client-side validation on empty Password', async ({ page }) => {
        let apiCalled = false;
        await page.route('**/api/instructor/login', route => {
            apiCalled = true;
            route.continue();
        });

        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.locator('#submitLoginBtn').click();

        await expect(page.locator('#passwordError')).toBeVisible();
        await expect(page.locator('#passwordError')).toContainText(/required/i);
        expect(apiCalled).toBe(false);
    });

    test('TC-SCRUM8-04: Invalid credentials handled with error message and 401 status', async ({ page }) => {
        await page.getByLabel(/instructor id or email/i).fill('INVALID_ID');
        await page.getByLabel(/security password/i).fill('WrongPassword');

        const responsePromise = page.waitForResponse(response =>
            response.url().includes('/api/instructor/login') && response.request().method() === 'POST'
        );

        await page.locator('#submitLoginBtn').click();
        const response = await responsePromise;
        expect(response.status()).toBe(401);

        const successMsg = page.locator('#successMessage');
        await expect(successMsg).toBeVisible();
        await expect(successMsg).toContainText('Invalid instructor ID or password');
    });

    test('TC-SCRUM8-05: Role separation - Student credentials rejected on Instructor Portal', async ({ page }) => {
        // Attempting to log into Instructor Portal with student credentials
        await page.getByLabel(/instructor id or email/i).fill('TEST001');
        await page.getByLabel(/security password/i).fill('Test@123');

        const responsePromise = page.waitForResponse(response =>
            response.url().includes('/api/instructor/login') && response.request().method() === 'POST'
        );

        await page.locator('#submitLoginBtn').click();
        const response = await responsePromise;
        expect(response.status()).toBe(403);

        const successMsg = page.locator('#successMessage');
        await expect(successMsg).toBeVisible();
        await expect(successMsg).toContainText(/Access denied: Student credentials cannot access/i);
    });

    test('TC-SCRUM8-06: Role separation - Instructor credentials rejected on Student Portal', async ({ page }) => {
        // Navigate to student login
        await page.goto('http://127.0.0.1:3000/Student%20Login/Creating%20Login_UI/index.html', { waitUntil: 'domcontentloaded' });

        await page.getByLabel(/student id/i).fill('INST001');
        await page.getByLabel(/password/i).fill('Instructor@123');

        const responsePromise = page.waitForResponse(response =>
            response.url().includes('/api/college/login') && response.request().method() === 'POST'
        );

        await page.getByRole('button', { name: /login/i }).click();
        const response = await responsePromise;
        expect(response.status()).toBe(403);

        const successMsg = page.locator('#successMessage');
        await expect(successMsg).toBeVisible();
        await expect(successMsg).toContainText(/Access denied: Instructor credentials cannot access student portal/i);
    });

    test('TC-SCRUM8-07: Successful instructor login redirects to Review Dashboard and stores session', async ({ page }) => {
        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.getByLabel(/security password/i).fill('Instructor@123');

        const responsePromise = page.waitForResponse(response =>
            response.url().includes('/api/instructor/login') && response.request().method() === 'POST'
        );

        await page.locator('#submitLoginBtn').click();
        const response = await responsePromise;
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.role).toBe('instructor');
        expect(data.user.name).toBe('Prof. Darshan K');

        // Check redirect banner
        await expect(page.locator('#redirectBanner')).toBeVisible();

        // Wait for redirect to dashboard
        await page.waitForURL('**/Instructor/dashboard.html');
        expect(page.url()).toContain('/Instructor/dashboard.html');

        // Check sessionStorage
        const storedSession = await page.evaluate(() => sessionStorage.getItem('aovs_instructor'));
        expect(storedSession).not.toBeNull();
        const parsed = JSON.parse(storedSession);
        expect(parsed.id).toBe('INST001');
        expect(parsed.name).toBe('Prof. Darshan K');

        // Verify dashboard header elements
        await expect(page.locator('#evaluatorName')).toHaveText('Prof. Darshan K');
        await expect(page.locator('.dashboard-title')).toHaveText('Instructor Review Dashboard');
    });

    test('TC-SCRUM8-08: Admin credentials successfully authenticate and access dashboard', async ({ page }) => {
        await page.getByLabel(/instructor id or email/i).fill('admin');
        await page.getByLabel(/security password/i).fill('Admin@123');

        const responsePromise = page.waitForResponse(response =>
            response.url().includes('/api/instructor/login') && response.request().method() === 'POST'
        );

        await page.locator('#submitLoginBtn').click();
        const response = await responsePromise;
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.role).toBe('admin');
        expect(data.user.name).toBe('System Administrator');

        await page.waitForURL('**/Instructor/dashboard.html');
        await expect(page.locator('#evaluatorName')).toHaveText('System Administrator');
    });

    test('TC-SCRUM8-09: Direct unauthenticated access to Review Dashboard is redirected to login', async ({ page }) => {
        // Navigate directly to dashboard without session
        await page.goto('http://127.0.0.1:3000/Instructor/dashboard.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => sessionStorage.clear());
        await page.reload({ waitUntil: 'domcontentloaded' });

        // Auth guard immediately redirects to login.html
        await page.waitForURL('**/Instructor/login.html');
        expect(page.url()).toContain('/Instructor/login.html');
    });

    test('TC-SCRUM8-10: Review Dashboard displays submissions table, stats, and response time telemetry', async ({ page }) => {
        // Authenticate
        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.getByLabel(/security password/i).fill('Instructor@123');
        await page.locator('#submitLoginBtn').click();
        await page.waitForURL('**/Instructor/dashboard.html');

        // Wait for table to load
        await expect(page.locator('.submissions-table tbody tr')).not.toHaveCount(0);

        // Verify stat cards
        await expect(page.locator('#statTotalSubmissions')).not.toHaveText('--');
        await expect(page.locator('#statPendingReviews')).not.toHaveText('--');

        // Verify Akil Kumar submission row
        const akilRow = page.locator('tr[data-submission-id="SUB-CS301-101"]');
        await expect(akilRow).toBeVisible();
        await expect(akilRow.locator('.student-name')).toHaveText('Akil Kumar');
        await expect(akilRow.locator('.student-id')).toHaveText('TEST001');

        // Telemetry badge in row
        const telemetryBadge = akilRow.locator('.telemetry-badge');
        await expect(telemetryBadge).toBeVisible();
        await expect(telemetryBadge).toContainText(/0?3m\s*0?8s/); // avg response time
    });

    test('TC-SCRUM8-11: Review Modal opens with student answers, telemetry, and supports grading', async ({ page }) => {
        // Authenticate
        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.getByLabel(/security password/i).fill('Instructor@123');
        await page.locator('#submitLoginBtn').click();
        await page.waitForURL('**/Instructor/dashboard.html');

        // Click Review & Grade on Akil Kumar submission
        const akilRow = page.locator('tr[data-submission-id="SUB-CS301-101"]');
        await akilRow.locator('.open-review-btn').click();

        // Modal should open
        const modal = page.locator('#reviewModal');
        await expect(modal).toBeVisible();
        await expect(page.locator('#modalStudentName')).toContainText('Akil Kumar');

        // Verify questions and telemetry pills render
        const questionCards = page.locator('.question-review-card');
        await expect(questionCards).toHaveCount(5);

        const firstTelemetryPill = questionCards.first().locator('.q-telemetry-pill');
        await expect(firstTelemetryPill).toBeVisible();
        await expect(firstTelemetryPill).toContainText(/Response Time: 02m 55s/);

        // Assign score to question 1
        const q1ScoreInput = questionCards.first().locator('.q-score-input');
        await q1ScoreInput.fill('5');

        // Provide written feedback
        await page.locator('#instructorFeedbackInput').fill('Comprehensive complexity explanation and well-reasoned Big-O breakdown.');

        // Save evaluation
        const gradePromise = page.waitForResponse(res =>
            res.url().includes('/grade') && res.request().method() === 'POST'
        );
        await page.locator('#saveGradeBtn').click();
        const gradeRes = await gradePromise;
        expect(gradeRes.status()).toBe(200);

        // Verify toast
        await expect(page.locator('#toastNotification')).toBeVisible();
        await expect(page.locator('#toastNotification')).toContainText(/saved successfully/i);

        // Modal closes
        await expect(modal).not.toBeVisible();
    });

    test('TC-SCRUM8-12: Evaluator can sign out and session is cleared', async ({ page }) => {
        // Authenticate
        await page.getByLabel(/instructor id or email/i).fill('INST001');
        await page.getByLabel(/security password/i).fill('Instructor@123');
        await page.locator('#submitLoginBtn').click();
        await page.waitForURL('**/Instructor/dashboard.html');

        // Handle confirmation dialog
        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // Click Logout
        await page.locator('#logoutBtn').click();
        await page.waitForURL('**/Instructor/login.html');
        expect(page.url()).toContain('/Instructor/login.html');

        // Session should be null
        const session = await page.evaluate(() => sessionStorage.getItem('aovs_instructor'));
        expect(session).toBeNull();
    });
});
