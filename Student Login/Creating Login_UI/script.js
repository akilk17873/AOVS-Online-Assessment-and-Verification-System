document.getElementById('loginForm').addEventListener('submit', function(event) {
    // Prevent the default form submission (which reloads the page)
    event.preventDefault();

    // Get the values from the input fields
    const studentId = document.getElementById('studentId').value.trim();
    const password = document.getElementById('password').value.trim();

    // Get the error message elements
    const studentIdError = document.getElementById('studentIdError');
    const passwordError = document.getElementById('passwordError');
    const successMessage = document.getElementById('successMessage');

    // Reset error messages and success message
    studentIdError.textContent = '';
    passwordError.textContent = '';
    successMessage.style.display = 'none';

    let isValid = true;

    // Validate Student ID
    if (studentId === '') {
        studentIdError.textContent = 'Student ID cannot be empty.';
        isValid = false;
    }

    // Validate Password
    if (password === '') {
        passwordError.textContent = 'Password cannot be empty.';
        isValid = false;
    }

    const redirectBanner = document.getElementById('redirectBanner');
    const directExamLink = document.getElementById('directExamLink');

    if (redirectBanner) {
        redirectBanner.style.display = 'none';
    }

    function getApiBaseUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000';
        }
        // In browser HTTP environment, use relative URL to match whatever port served this page
        return '';
    }

    // Determine reliable exam page target
    function getExamRedirectUrl() {
        const isFile = window.location.protocol === 'file:';
        const decodedPath = decodeURIComponent(window.location.pathname);
        if (isFile || decodedPath.includes('Student Login') || decodedPath.includes('Student%20Login')) {
            return '../../Exam/index.html';
        }
        return '/Exam/index.html';
    }

    // If validation passes, authenticate and transition to exam
    if (isValid) {
        successMessage.textContent = 'Authenticating...';
        successMessage.style.display = 'block';
        successMessage.style.color = '#10b981';

        fetch(`${getApiBaseUrl()}/api/college/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ studentId: studentId, password: password })
        })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {
            if (status === 200) {
                // Keep exact message text for test assertions
                successMessage.textContent = data.message || 'Authentication successful';
                successMessage.style.color = '#10b981';

                // Save student session for Exam Portal integration
                const student = data.student || { studentId: studentId, name: 'Akil Kumar' };
                try {
                    sessionStorage.setItem('aovs_student', JSON.stringify({
                        studentId: student.studentId || studentId,
                        name: student.name || 'Akil Kumar',
                        loggedInAt: new Date().toISOString()
                    }));
                } catch (e) {}

                const targetExam = getExamRedirectUrl();
                if (redirectBanner) {
                    redirectBanner.style.display = 'block';
                }
                if (directExamLink) {
                    directExamLink.href = targetExam;
                }

                // Seamlessly transition to the Examination interface
                setTimeout(() => {
                    window.location.href = targetExam;
                }, 600);
            } else if (status === 401) {
                successMessage.textContent = 'Invalid student ID or password';
                successMessage.style.color = '#ef4444';
            } else if (status === 400) {
                successMessage.textContent = data.message || 'Missing/invalid credentials';
                successMessage.style.color = '#ef4444';
            } else {
                successMessage.textContent = 'Authentication service returned an error.';
                successMessage.style.color = '#ef4444';
            }
        })
        .catch(error => {
            console.error('Network error:', error);
            successMessage.textContent = 'Authentication service is unavailable. Please try again later.';
            successMessage.style.color = '#ef4444';
        });
    }
});

// Quick Demo autofill helper
const fillDemoBtn = document.getElementById('fillDemoBtn');
if (fillDemoBtn) {
    fillDemoBtn.addEventListener('click', function() {
        const studentIdInput = document.getElementById('studentId');
        const passwordInput = document.getElementById('password');
        if (studentIdInput && passwordInput) {
            studentIdInput.value = 'TEST001';
            passwordInput.value = 'Test@123';
            // Auto submit
            const form = document.getElementById('loginForm');
            if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        }
    });
}
