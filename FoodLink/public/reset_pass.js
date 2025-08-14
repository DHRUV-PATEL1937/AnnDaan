// Neumorphism Reset Password Form JavaScript
class NeumorphismResetPasswordForm {
    constructor() {
        this.form = document.getElementById('resetPasswordForm');
        this.newPasswordInput = document.getElementById('newPassword');
        this.confirmNewPasswordInput = document.getElementById('confirmNewPassword');
        this.newPasswordToggle = document.getElementById('newPasswordToggle');
        this.confirmNewPasswordToggle = document.getElementById('confirmNewPasswordToggle');
        this.submitButton = this.form.querySelector('.reset-btn');
        this.successMessage = document.getElementById('successMessage');
        
        // Element to display server-side errors
        this.serverErrorMessage = document.createElement('p');
        this.serverErrorMessage.style.cssText = `
            color: #d63031;
            font-size: 0.9em;
            margin-top: 10px;
            text-align: center;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            max-width: 100%;
            word-wrap: break-word;
        `;
        this.serverErrorMessage.id = 'serverErrorMessage';
        this.form.insertBefore(this.serverErrorMessage, this.submitButton.nextSibling);

        this.token = this.getTokenFromUrl(); // Extract token from URL
        this.init();
    }
    
    init() {
        if (!this.token) {
            this.showServerError('Password reset link is missing or invalid. Please request a new one.');
            this.form.style.display = 'none'; // Hide the form if no token
            return;
        }
        this.bindEvents();
        this.setupPasswordToggle(this.newPasswordInput, this.newPasswordToggle);
        this.setupPasswordToggle(this.confirmNewPasswordInput, this.confirmNewPasswordToggle);
        this.setupNeumorphicEffects();
    }

    getTokenFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('token');
    }
    
    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.newPasswordInput.addEventListener('blur', () => this.validateNewPassword());
        this.confirmNewPasswordInput.addEventListener('blur', () => this.validateConfirmNewPassword());
        this.newPasswordInput.addEventListener('input', () => this.clearError('newPassword'));
        this.confirmNewPasswordInput.addEventListener('input', () => this.clearError('confirmNewPassword'));
        
        [this.newPasswordInput, this.confirmNewPasswordInput].forEach(input => {
            input.addEventListener('focus', (e) => this.addSoftPress(e));
            input.addEventListener('blur', (e) => this.removeSoftPress(e));
        });
    }
    
    setupPasswordToggle(input, toggle) {
        toggle.addEventListener('click', () => {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            toggle.classList.toggle('show-password', type === 'text');
            this.animateSoftPress(toggle);
        });
    }
    
    setupNeumorphicEffects() {
        document.addEventListener('mousemove', (e) => {
            this.updateAmbientLight(e);
        });
    }
    
    updateAmbientLight(e) {
        const card = document.querySelector('.reset-password-card');
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const angleX = (x - centerX) / centerX;
        const angleY = (y - centerY) / centerY;
        
        const shadowX = angleX * 30;
        const shadowY = angleY * 30;
        
        card.style.boxShadow = `
            ${shadowX}px ${shadowY}px 60px #bec3cf,
            ${-shadowX}px ${-shadowY}px 60px #ffffff
        `;
    }
    
    addSoftPress(e) {
        const inputGroup = e.target.closest('.neu-input');
        inputGroup.style.transform = 'scale(0.98)';
    }
    
    removeSoftPress(e) {
        const inputGroup = e.target.closest('.neu-input');
        inputGroup.style.transform = 'scale(1)';
    }
    
    animateSoftPress(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
    }

    validateNewPassword() {
        const password = this.newPasswordInput.value;
        if (!password) {
            this.showError('newPassword', 'New password is required');
            return false;
        }
        if (password.length < 6) {
            this.showError('newPassword', 'Password must be at least 6 characters');
            return false;
        }
        this.clearError('newPassword');
        return true;
    }

    validateConfirmNewPassword() {
        const newPassword = this.newPasswordInput.value;
        const confirmNewPassword = this.confirmNewPasswordInput.value;
        if (!confirmNewPassword) {
            this.showError('confirmNewPassword', 'Please confirm your new password');
            return false;
        }
        if (newPassword !== confirmNewPassword) {
            this.showError('confirmNewPassword', 'Passwords do not match');
            return false;
        }
        this.clearError('confirmNewPassword');
        return true;
    }
    
    showError(field, message) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        
        formGroup.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        const input = document.getElementById(field);
        input.style.animation = 'gentleShake 0.5s ease-in-out';
        setTimeout(() => input.style.animation = '', 500);

        this.clearServerError();
    }
    
    clearError(field) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        
        formGroup.classList.remove('error');
        errorElement.classList.remove('show');
        setTimeout(() => errorElement.textContent = '', 300);
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

        const isNewPasswordValid = this.validateNewPassword();
        const isConfirmNewPasswordValid = this.validateConfirmNewPassword();
        
        if (!isNewPasswordValid || !isConfirmNewPasswordValid) {
            this.animateSoftPress(this.submitButton);
            this.showServerError('Please fix the errors in the form before submitting.');
            return;
        }
        
        this.setLoading(true);
        
        const newPassword = this.newPasswordInput.value;

        try {
            const response = await fetch('http://localhost:5000/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: this.token,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Password reset successful:', data);
                this.showNeumorphicSuccess(data.message);
            } else {
                console.error('Password reset failed:', data);
                this.showServerError(data.message || 'Password reset failed. Please try again.');
                this.animateSoftPress(this.submitButton);
            }
        } catch (error) {
            console.error('Network error during password reset:', error);
            this.showServerError('Network error. Please check your connection and server.');
            this.animateSoftPress(this.submitButton);
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(loading) {
        this.submitButton.classList.toggle('loading', loading);
        this.submitButton.disabled = loading;
    }
    
    showNeumorphicSuccess(message) {
        this.form.style.transition = 'opacity 0.3s, transform 0.3s';
        this.form.style.transform = 'scale(0.95)';
        this.form.style.opacity = '0';
        
        document.querySelector('.back-to-login').style.display = 'none'; // Hide back link

        setTimeout(() => {
            this.form.style.display = 'none';
            this.successMessage.classList.add('show');
            this.successMessage.querySelector('p').textContent = message; 
            
            const successIcon = this.successMessage.querySelector('.neu-icon');
            successIcon.style.animation = 'successPulse 0.6s ease-out';
        }, 300);

        // Optionally redirect to login after a delay
        setTimeout(() => {
            window.location.href = '/login.html'; 
        }, 3000); // Redirect after 3 seconds
    }
}

// Add custom animations
if (!document.querySelector('#neu-keyframes')) {
    const style = document.createElement('style');
    style.id = 'neu-keyframes';
    style.textContent = `
        @keyframes gentleShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-3px); }
            75% { transform: translateX(3px); }
        }
        
        @keyframes successPulse {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', () => {
    new NeumorphismResetPasswordForm();
});
