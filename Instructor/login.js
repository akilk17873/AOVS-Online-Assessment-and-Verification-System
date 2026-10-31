/**
 * AOVS (Online Assessment and Verification System)
 * SCRUM-8: Instructor & Admin Authentication Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('instructorLoginForm');
    const instructorIdInput = document.getElementById('instructorId');
    const passwordInput = document.getElementById('password');
    const instructorIdError = document.getElementById('instructorIdError');
    const passwordError = document.getElementById('passwordError');
    const successMessage = document.getElementById('successMessage');
    const redirectBanner = document.getElementById('redirectBanner');
    const directDashboardLink = document.getElementById('directDashboardLink');
    const submitBtn = document.getElementById('submitLoginBtn');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const fillInstructorDemoBtn = document.getElementById('fillInstructorDemoBtn');
    const fillAdminDemoBtn = document.getElementById('fillAdminDemoBtn');

    // Toggle password visibility
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            const icon = togglePasswordBtn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
            }
        });
    }

    // Determine target dashboard URL accounting for filesystem or HTTP hosting
    function getDashboardRedirectUrl() {
        if (window.location.protocol === 'file:') {
            return 'dashboard.html';
        }
        return '/Instructor/dashboard.html';
    }

    // Base API URL
    function getApiBaseUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000';
        }
        return '';
    }

    // Clear error messages on input
    instructorIdInput.addEventListener('input', () => {
        instructorIdError.textContent = '';
        if (successMessage) successMessage.style.display = 'none';
    });

    passwordInput.addEventListener('input', () => {
        passwordError.textContent = '';
        if (successMessage) successMessage.style.display = 'none';
    });

    // Form submit handler
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Reset previous feedback
        instructorIdError.textContent = '';
        passwordError.textContent = '';
        if (successMessage) {
            successMessage.textContent = '';
            successMessage.style.display = 'none';
        }
        if (redirectBanner) {
            redirectBanner.style.display = 'none';
        }

        const instructorId = instructorIdInput.value.trim();
        const password = passwordInput.value;

        let isValid = true;

        if (!instructorId) {
            instructorIdError.textContent = 'Instructor ID or official email is required';
            isValid = false;
        }

        if (!password) {
            passwordError.textContent = 'Password is required';
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // Show loading state
        successMessage.textContent = 'Authenticating evaluator credentials...';
        successMessage.style.display = 'block';
        successMessage.style.color = '#38bdf8';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${getApiBaseUrl()}/api/instructor/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ instructorId, password })
            });

            const data = await response.json();

            if (response.status === 200) {
                // Success
                successMessage.textContent = data.message || 'Instructor authentication successful';
                successMessage.style.color = '#10b981';

                // Store instructor profile & role in sessionStorage
                const instructorSession = data.user || {
                    id: instructorId,
                    name: 'Prof. Darshan K',
                    role: data.role || 'instructor',
                    department: 'School of Computing & Information Technology'
                };
                try {
                    sessionStorage.setItem('aovs_instructor', JSON.stringify(instructorSession));
                } catch (e) {}

                // Display redirect notification
                const targetUrl = getDashboardRedirectUrl();
                if (redirectBanner) {
                    redirectBanner.style.display = 'block';
                }
                if (directDashboardLink) {
                    directDashboardLink.href = targetUrl;
                }

                // Redirect to review dashboard
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 600);
            } else if (response.status === 401) {
                successMessage.textContent = data.message || 'Invalid instructor ID or password';
                successMessage.style.color = '#ef4444';
                submitBtn.disabled = false;
            } else if (response.status === 403) {
                // Role-based separation error
                successMessage.textContent = data.message || 'Access denied: Student credentials cannot access instructor review portal';
                successMessage.style.color = '#ef4444';
                submitBtn.disabled = false;
            } else {
                successMessage.textContent = data.message || 'Failed to authenticate. Please check your credentials.';
                successMessage.style.color = '#ef4444';
                submitBtn.disabled = false;
            }
        } catch (error) {
            successMessage.textContent = 'Authentication service is unavailable. Please try again later.';
            successMessage.style.color = '#ef4444';
            submitBtn.disabled = false;
        }
    });

    // Quick Demo autofill buttons
    if (fillInstructorDemoBtn) {
        fillInstructorDemoBtn.addEventListener('click', () => {
            instructorIdInput.value = 'INST001';
            passwordInput.value = 'Instructor@123';
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        });
    }

    if (fillAdminDemoBtn) {
        fillAdminDemoBtn.addEventListener('click', () => {
            instructorIdInput.value = 'admin';
            passwordInput.value = 'Admin@123';
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        });
    }
});
