// Neumorphism Login Form JavaScript (Complete & Fixed)
class NeumorphismLoginForm {
    constructor() {
        this.form = document.getElementById('loginForm');
        // FIX: Changed from usernameInput to emailInput to match the HTML
        this.emailInput = document.getElementById('email'); 
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.submitButton = this.form.querySelector('.login-btn');
        this.successMessage = document.getElementById('successMessage');
        
        // Username Modal elements
        this.usernameModal = document.getElementById('usernameModal');
        this.usernameForm = document.getElementById('usernameForm');
        this.modalUsernameInput = document.getElementById('modalUsername');
        this.modalUsernameError = document.getElementById('modalUsernameError');
        this.tempToken = null;

        this.serverErrorMessage = document.createElement('p');
        this.serverErrorMessage.style.cssText = `
            color: #d63031; font-size: 0.9em; margin-top: 10px; text-align: center;
            opacity: 0; transition: opacity 0.3s ease-in-out; max-width: 100%; word-wrap: break-word;
        `;
        this.serverErrorMessage.id = 'serverErrorMessage';
        this.form.insertBefore(this.serverErrorMessage, this.submitButton.nextSibling);
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupPasswordToggle();
        this.setupNeumorphicEffects();
    }
    
    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        // FIX: Changed from usernameInput to emailInput
        this.emailInput.addEventListener('blur', () => this.validateEmail()); 
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.emailInput.addEventListener('input', () => this.clearError('email'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
        
        this.usernameForm.addEventListener('submit', (e) => this.handleUsernameSubmit(e));
        this.modalUsernameInput.addEventListener('input', () => this.clearModalError());
        
        // FIX: Changed from usernameInput to emailInput
        [this.emailInput, this.passwordInput].forEach(input => {
            input.addEventListener('focus', (e) => this.addSoftPress(e));
            input.addEventListener('blur', (e) => this.removeSoftPress(e));
        });
    }
    
    setupPasswordToggle() {
        if (!this.passwordToggle) return;
        this.passwordToggle.addEventListener('click', () => {
            const type = this.passwordInput.type === 'password' ? 'text' : 'password';
            this.passwordInput.type = type;
            this.passwordToggle.classList.toggle('show-password', type === 'text');
            this.animateSoftPress(this.passwordToggle);
        });
    }

    setupNeumorphicEffects() {
        const neuElements = document.querySelectorAll('.neu-icon, .neu-checkbox');
        neuElements.forEach(element => {
            element.addEventListener('mouseenter', () => element.style.transform = 'scale(1.05)');
            element.addEventListener('mouseleave', () => element.style.transform = 'scale(1)');
        });
        
        document.addEventListener('mousemove', (e) => this.updateAmbientLight(e));
    }

    updateAmbientLight(e) {
        const card = document.querySelector('.login-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const angleX = (x - centerX) / centerX;
        const angleY = (y - centerY) / centerY;
        
        const shadowX = angleX * 20;
        const shadowY = angleY * 20;
        
        card.style.boxShadow = `
            ${shadowX}px ${shadowY}px 50px #bec3cf,
            ${-shadowX}px ${-shadowY}px 50px #ffffff
        `;
    }
    
    addSoftPress(e) {
        const inputGroup = e.target.closest('.neu-input');
        if (inputGroup) inputGroup.style.transform = 'scale(0.98)';
    }
    
    removeSoftPress(e) {
        const inputGroup = e.target.closest('.neu-input');
        if (inputGroup) inputGroup.style.transform = 'scale(1)';
    }
    
    animateSoftPress(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
    }
    
    // FIX: Re-added validateEmail to match the HTML form
    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.showError('email', 'Email is required');
            return false;
        }
        if (!emailRegex.test(email)) {
            this.showError('email', 'Please enter a valid email');
            return false;
        }
        this.clearError('email');
        return true;
    }
    
    validatePassword() {
        const password = this.passwordInput.value;
        if (!password) {
            this.showError('password', 'Password is required');
            return false;
        }
        if (password.length < 6) {
            this.showError('password', 'Password must be at least 6 characters');
            return false;
        }
        this.clearError('password');
        return true;
    }
    
    showError(field, message) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        if (!formGroup || !errorElement) return;
        
        formGroup.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        const input = document.getElementById(field);
        input.style.animation = 'gentleShake 0.5s ease-in-out';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
        this.clearServerError();
    }
    
    clearError(field) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        if (!formGroup || !errorElement) return;
        
        formGroup.classList.remove('error');
        errorElement.classList.remove('show');
        setTimeout(() => {
            errorElement.textContent = '';
        }, 300);
    }

    showServerError(message) {
        this.serverErrorMessage.textContent = message;
        this.serverErrorMessage.style.opacity = '1';
    }

    clearServerError() {
        this.serverErrorMessage.textContent = '';
        this.serverErrorMessage.style.opacity = '0';
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        this.clearServerError();
    
        if (!this.validateEmail() || !this.validatePassword()) {
            this.animateSoftPress(this.submitButton);
            this.showServerError('Please fix the errors before submitting.');
            return;
        }
        
        this.setLoading(true);
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
    
        try {
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
    
            const data = await response.json();
    
            if (response.ok) {
                localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('userName', data.user.name);
    localStorage.setItem('userEmail', data.user.email);
    localStorage.setItem('userId', data.user.id);
    this.showNeumorphicSuccess();
    
                // Role-based redirection
                let redirectUrl;
                switch(data.user.role) {
                    case 'donator':
                        redirectUrl = 'dashboard.html';
                        break;
                    case 'ngo':
                        redirectUrl = 'ngo_dashboard.html';
                        break;
                    case 'rider':
                        redirectUrl = 'rider_dashboard.html';
                        break;
                    default:
                        redirectUrl = 'dashboard.html';
                }
    
                this.showNeumorphicSuccess();   
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
            } else {
                this.showServerError(data.message || 'Login failed.');
                this.animateSoftPress(this.submitButton);
            }
        } catch (error) {
            this.showServerError('Network error. Please check your connection.');
            this.animateSoftPress(this.submitButton);
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleGoogleCredentialResponse(response) {
        this.clearServerError();
        this.setLoading(true);

        try {
        // Get the currently selected role from your UI. Defaults to 'user'.
        const selectedRole = document.querySelector('.role-option.active')?.dataset.role || 'user';

        const res = await fetch('http://localhost:5000/api/auth/google-signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Add the selected role to the request body
            body: JSON.stringify({
                token: response.credential,
                role: selectedRole
            }),
        });

        const data = await res.json();

        if (res.status === 202 && data.usernameRequired) {
            this.tempToken = data.tempToken;
            this.showUsernameModal();
        } else if (res.ok) {
            // Use the correct keys 'accessToken' and 'refreshToken'
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('userName', data.user.name);

            this.showNeumorphicSuccess();
        } else {
            this.showServerError(data.message || 'Google Sign-In failed.');
        }
        } catch (error) {
            this.showServerError('Could not connect to the server for Google Sign-In.');
        } finally {
            this.setLoading(false);
        }
    }

    showUsernameModal() {
        this.usernameModal.style.display = 'flex';
        setTimeout(() => this.usernameModal.classList.add('visible'), 10);
    }

    clearModalError() {
        const formGroup = this.modalUsernameInput.closest('.form-group');
        this.modalUsernameError.textContent = '';
        this.modalUsernameError.classList.remove('show');
        formGroup.classList.remove('error');
    }

    showModalError(message) {
        const formGroup = this.modalUsernameInput.closest('.form-group');
        this.modalUsernameError.textContent = message;
        this.modalUsernameError.classList.add('show');
        formGroup.classList.add('error');
    }

    async handleUsernameSubmit(e) {
        e.preventDefault();
        const username = this.modalUsernameInput.value.trim();
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
                    username: username
                })
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ FIX: Use the correct keys 'accessToken' and 'refreshToken'
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('userName', data.user.name);

                this.usernameModal.style.display = 'none';
                this.usernameModal.classList.remove('visible');
                this.showNeumorphicSuccess();
            } else {
                this.showModalError(data.message || 'An error occurred.');
            }
        } catch (error) {
            this.showModalError('Network error. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.submitButton.classList.toggle('loading', loading);
        this.submitButton.disabled = loading;
        
        document.querySelectorAll('.g_id_signin button').forEach(button => {
             button.style.pointerEvents = loading ? 'none' : 'auto';
             button.style.opacity = loading ? '0.6' : '1';
        });
    }
    
    showNeumorphicSuccess() {
    const loginCard = document.querySelector('.login-card');
    const formElements = [
        this.form,
        document.querySelector('.login-header'),
        document.querySelector('.divider'),
        document.querySelector('.google-signin'),
        document.querySelector('.signup-link')
    ];

    // ⭐ NEW: Set a fixed height to prevent the card from collapsing
    const cardHeight = loginCard.offsetHeight;
    loginCard.style.height = `${cardHeight}px`;

    // 1. Fade out all form elements
    formElements.forEach(el => {
        if (el) {
            el.style.transition = 'opacity 0.4s ease-out';
            el.style.opacity = '0';
        }
    });

    // 2. After fade-out, hide them and show the success message
    setTimeout(() => {
        formElements.forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // Show the success message
        this.successMessage.classList.add('show');
        
    }, 400); // This delay should match the CSS fade-out duration
    
    // 3. Redirect after the full animation has played out
    setTimeout(() => {
        console.log('Redirecting to dashboard...');
        window.location.href = 'dashboard.html';
    }, 3500); // ⭐ NEW: Increased total delay for a slower feel
}
}

window.handleCredentialResponse = (response) => {
    if (!window.loginFormInstance) {
        window.loginFormInstance = new NeumorphismLoginForm();
    }
    window.loginFormInstance.handleGoogleCredentialResponse(response);
};

document.addEventListener('DOMContentLoaded', () => {
    if (!window.loginFormInstance) {
        window.loginFormInstance = new NeumorphismLoginForm();
    }
});