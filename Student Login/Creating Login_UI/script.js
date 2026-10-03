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
        successMessage.textContent = 'Validation successful! (Authentication not implemented yet)';
        successMessage.style.display = 'block';
        console.log('Login attempt with Student ID:', studentId);
    }
});
