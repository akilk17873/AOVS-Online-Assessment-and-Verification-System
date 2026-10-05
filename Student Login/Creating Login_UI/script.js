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

    // If validation passes, simulate a successful UI state without actual authentication
    if (isValid) {
        successMessage.textContent = 'Authenticating...';
        successMessage.style.display = 'block';
        successMessage.style.color = '#10b981'; // default success color or neutral

        fetch('http://localhost:3000/api/college/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ studentId: studentId, password: password })
        })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {
            if (status === 200) {
                successMessage.textContent = data.message || 'Authentication successful';
                successMessage.style.color = '#10b981'; // Success color
            } else if (status === 401) {
                successMessage.textContent = 'Invalid student ID or password';
                successMessage.style.color = '#ef4444'; // Error color
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
