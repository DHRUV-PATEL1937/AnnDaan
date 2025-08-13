// Neumorphism Forgot Password Form JavaScript
class NeumorphismForgotPasswordForm {
    constructor() {
        this.form = document.getElementById('forgotPasswordForm');
        this.emailInput = document.getElementById('email');
        this.submitButton = this.form.querySelector('.reset-btn');
        this.successMessage = document.getElementById('successMessage');
        
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
    }
    
    clearError(field) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        
        formGroup.classList.remove('error');
        errorElement.classList.remove('show');
        setTimeout(() => errorElement.textContent = '', 300);
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateEmail()) {
            this.submitButton.style.animation = 'gentleShake 0.5s ease-in-out';
            setTimeout(() => this.submitButton.style.animation = '', 500);
            return;
        }
        
        this.setLoading(true);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.showNeumorphicSuccess();
        } catch (error) {
            this.showError('email', 'An error occurred. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(loading) {
        this.submitButton.classList.toggle('loading', loading);
        this.submitButton.disabled = loading;
    }
    
    showNeumorphicSuccess() {
        this.form.style.transition = 'opacity 0.3s, transform 0.3s';
        this.form.style.transform = 'scale(0.95)';
        this.form.style.opacity = '0';
        
        document.querySelector('.back-link').style.display = 'none';

        setTimeout(() => {
            this.form.style.display = 'none';
            this.successMessage.classList.add('show');
            
            const successIcon = this.successMessage.querySelector('.neu-icon');
            successIcon.style.animation = 'successPulse 0.6s ease-out';
        }, 300);
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