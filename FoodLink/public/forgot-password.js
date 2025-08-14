// Neumorphism Forgot Password Form JavaScript
class NeumorphismForgotPasswordForm {
    constructor() {
        this.form = document.getElementById('forgotPasswordForm');
        this.emailInput = document.getElementById('email');
        this.submitButton = this.form.querySelector('.reset-btn');
        this.successMessage = document.getElementById('successMessage');
        
        // ⭐ NEW: Element to display server-side errors
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
        // Insert it right after the submit button
        this.form.insertBefore(this.serverErrorMessage, this.submitButton.nextSibling);

        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupNeumorphicEffects();
    }
    
    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.emailInput.addEventListener('input', () => this.clearError('email'));
    }

    setupNeumorphicEffects() {
        // Add ambient light effect on mouse move
        document.addEventListener('mousemove', (e) => {
            this.updateAmbientLight(e);
        });
    }

    updateAmbientLight(e) {
        const card = document.querySelector('.forgot-password-card');
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
    
    showError(field, message) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        
        formGroup.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        const input = document.getElementById(field);
        input.style.animation = 'gentleShake 0.5s ease-in-out';
        setTimeout(() => input.style.animation = '', 500);

        this.clearServerError(); // Hide server error message if a client-side error occurs
    }
    
    clearError(field) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        
        formGroup.classList.remove('error');
        errorElement.classList.remove('show');
        setTimeout(() => errorElement.textContent = '', 300);
    }

    // ⭐ NEW: Methods for displaying/clearing server-side errors
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
        
        this.clearServerError(); // Clear any previous server errors on new submission

        if (!this.validateEmail()) {
            this.animateSoftPress(this.submitButton);
            this.showServerError('Please enter a valid email address.'); // General client-side error
            return;
        }
        
        this.setLoading(true);
        const email = this.emailInput.value.trim();

        try {
            // ⭐ MODIFIED: Send email to your server's forgot password endpoint
            const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Forgot password request successful:', data);
                // ⭐ Show success message even if email doesn't exist for security
                this.showNeumorphicSuccess(data.message); 
            } else {
                console.error('Forgot password request failed:', data);
                this.showServerError(data.message || 'Error sending password reset email. Please try again.');
            }
        } catch (error) {
            console.error('Network error during forgot password request:', error);
            this.showServerError('Network error. Please check your connection and server.');
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(loading) {
        this.submitButton.classList.toggle('loading', loading);
        this.submitButton.disabled = loading;
    }
    
    // ⭐ MODIFIED: showNeumorphicSuccess to take a message
    showNeumorphicSuccess(message) {
        this.form.style.transition = 'opacity 0.3s, transform 0.3s';
        this.form.style.transform = 'scale(0.95)';
        this.form.style.opacity = '0';
        
        document.querySelector('.back-link').style.display = 'none';

        setTimeout(() => {
            this.form.style.display = 'none';
            this.successMessage.classList.add('show');
            // Update the success message text
            this.successMessage.querySelector('p').textContent = message; 
            
            const successIcon = this.successMessage.querySelector('.neu-icon');
            successIcon.style.animation = 'successPulse 0.6s ease-out';
        }, 300);

        // No automatic redirect here, as the user needs to check their email
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
    new NeumorphismForgotPasswordForm();
});
