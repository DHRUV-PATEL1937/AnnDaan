// Neumorphism Login Form JavaScript (Refactored & Improved)
class NeumorphismLoginForm {
    constructor() {
        // --- DOM Element Selection ---
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.submitButton = this.form.querySelector('.login-btn');
        this.successMessage = document.getElementById('successMessage');

        // --- Modal Element Selection ---
        this.usernameModal = document.getElementById('usernameModal');
        this.usernameForm = document.getElementById('usernameForm');
        this.modalUsernameInput = document.getElementById('modalUsername');
        this.modalUsernameError = document.getElementById('modalUsernameError');

        // --- State and Dynamic Elements ---
        this.tempToken = null; // Stores temporary token for new Google users
        this.serverErrorMessage = this._createServerErrorMessage();
        this.form.insertBefore(this.serverErrorMessage, this.submitButton.nextSibling);

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupPasswordToggle();
        // Neumorphic visual effects are disabled for clarity and performance.
        // this.setupNeumorphicEffects(); 
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.emailInput.addEventListener('input', () => this.clearError('email'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
        
        this.usernameForm.addEventListener('submit', (e) => this.handleUsernameSubmit(e));
        this.modalUsernameInput.addEventListener('input', () => this.clearModalError());
    }

    setupPasswordToggle() {
        if (!this.passwordToggle) return;
        this.passwordToggle.addEventListener('click', () => {
            const isPassword = this.passwordInput.type === 'password';
            this.passwordInput.type = isPassword ? 'text' : 'password';
            this.passwordToggle.classList.toggle('show', isPassword);
            this._animateSoftPress(this.passwordToggle);
        });
    }

    // --- Validation Methods ---
    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return this.showError('email', 'Email is required');
        if (!emailRegex.test(email)) return this.showError('email', 'Please enter a valid email');
        this.clearError('email');
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;
        if (!password) return this.showError('password', 'Password is required');
        if (password.length < 6) return this.showError('password', 'Password must be at least 6 characters');
        this.clearError('password');
        return true;
    }

    // --- Error Display Methods ---
    showError(field, message) {
        const input = document.getElementById(field);
        const formGroup = input.closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        if (!formGroup || !errorElement) return false;

        formGroup.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        this._animateGentleShake(input);
        return false; // Return false for easy chaining in validation
    }

    clearError(field) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        if (!formGroup || !errorElement) return;

        formGroup.classList.remove('error');
        errorElement.classList.remove('show');
    }

    showServerError(message) {
        this.serverErrorMessage.textContent = message;
        this.serverErrorMessage.style.opacity = '1';
    }

    clearServerError() {
        this.serverErrorMessage.style.opacity = '0';
    }

    // --- Main Logic Handlers ---
    async handleSubmit(e) {
        e.preventDefault();
        this.clearServerError();

        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        if (!isEmailValid || !isPasswordValid) {
            this.showServerError('Please fix the errors before submitting.');
            return;
        }

        this.setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.emailInput.value.trim(),
                    password: this.passwordInput.value
                })
            });
            const data = await response.json();

            if (response.ok) {
                this._handleSuccessfulLogin(data);
            } else {
                this.showServerError(data.message || 'Login failed.');
            }
        } catch (error) {
            this.showServerError('Network error. Please check your connection.');
        } finally {
            this.setLoading(false);
        }
    }

    async handleGoogleCredentialResponse(response) {
        this.clearServerError();
        this.setLoading(true);

        try {
            const res = await fetch('http://localhost:5000/api/auth/google-signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: response.credential }),
            });
            const data = await res.json();

            if (res.status === 202 && data.usernameRequired) {
                this.tempToken = data.tempToken;
                this._showUsernameModal();
            } else if (res.ok) {
                this._handleSuccessfulLogin(data);
            } else {
                this.showServerError(data.message || 'Google Sign-In failed.');
            }
        } catch (error) {
            this.showServerError('Could not connect for Google Sign-In.');
        } finally {
            this.setLoading(false);
        }
    }

    async handleUsernameSubmit(e) {
        e.preventDefault();
        const username = this.modalUsernameInput.value.trim();
        const selectedRole = document.querySelector('input[name="modal-role"]:checked')?.value || 'user';
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

        this.clearModalError();
        if (!usernameRegex.test(username)) {
            this.showModalError('Invalid format (3-20 letters, numbers, or underscores).');
            return;
        }

        this.setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/complete-google-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tempToken: this.tempToken,
                    username: username,
                    role: selectedRole
                })
            });
            const data = await response.json();

            if (response.ok) {
                this._hideUsernameModal();
                this._handleSuccessfulLogin(data);
            } else {
                this.showModalError(data.message || 'An error occurred.');
            }
        } catch (error) {
            this.showModalError('Network error. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    // --- UI State & Animation Methods ---
    setLoading(loading) {
        this.submitButton.classList.toggle('loading', loading);
        this.submitButton.disabled = loading;
        document.querySelectorAll('.g_id_signin button').forEach(button => {
            button.style.pointerEvents = loading ? 'none' : 'auto';
            button.style.opacity = loading ? '0.6' : '1';
        });
    }

    showSuccessAndRedirect(redirectUrl) {
        const loginCard = document.querySelector('.login-card');
        const formElements = loginCard.querySelectorAll('.login-header, .login-form, .divider, .google-signin, .signup-link');

        const cardHeight = loginCard.offsetHeight;
        loginCard.style.height = `${cardHeight}px`;

        formElements.forEach(el => el.style.opacity = '0');

        setTimeout(() => {
            formElements.forEach(el => el.style.display = 'none');
            this.successMessage.classList.add('show');
        }, 400);

        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 3500);
    }
    
    // --- Modal Methods ---
    _showUsernameModal() {
        this.usernameModal.style.display = 'flex';
        setTimeout(() => this.usernameModal.classList.add('show'), 10);
    }
    
    _hideUsernameModal() {
        this.usernameModal.classList.remove('show');
        setTimeout(() => this.usernameModal.style.display = 'none', 400);
    }

    showModalError(message) {
        const formGroup = this.modalUsernameInput.closest('.form-group');
        this.modalUsernameError.textContent = message;
        this.modalUsernameError.classList.add('show');
        formGroup.classList.add('error');
        this._animateGentleShake(this.modalUsernameInput);
    }

    clearModalError() {
        const formGroup = this.modalUsernameInput.closest('.form-group');
        this.modalUsernameError.textContent = '';
        this.modalUsernameError.classList.remove('show');
        formGroup.classList.remove('error');
    }
    
    // --- Private Helper Methods ---
    _handleSuccessfulLogin(data) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userId', data.user.id);
        const redirectUrl = this._getRedirectUrl(data.user.role);
        this.showSuccessAndRedirect(redirectUrl);
    }
    
    _getRedirectUrl(role) {
        switch (role) {
            case 'ngo': return 'ngo_dashboard.html';
            case 'rider': return 'rider_dashboard.html';
            case 'user':
            case 'donator':
            default: return 'dashboard.html';
        }
    }

    _createServerErrorMessage() {
        const el = document.createElement('p');
        el.style.cssText = `color: #ff3b5c; font-size: 14px; margin-top: 15px; text-align: center; opacity: 0; transition: opacity 0.3s ease; height: 1em;`;
        return el;
    }

    _animateGentleShake(element) {
        element.style.animation = 'gentleShake 0.5s ease-in-out';
        setTimeout(() => element.style.animation = '', 500);
    }

    _animateSoftPress(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => element.style.transform = 'scale(1)', 150);
    }
}

// --- Global Instantiation ---
// This ensures the class is instantiated and the Google callback is ready.
window.loginFormInstance = null;

function initializeForm() {
    if (!window.loginFormInstance) {
        window.loginFormInstance = new NeumorphismLoginForm();
    }
}

window.handleCredentialResponse = (response) => {
    initializeForm();
    window.loginFormInstance.handleGoogleCredentialResponse(response);
};

document.addEventListener('DOMContentLoaded', initializeForm);