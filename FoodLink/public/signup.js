// Neumorphism Signup Form JavaScript (Updated with Username)
class NeumorphismSignupForm {
    constructor() {
        this.form = document.getElementById('signupForm');
        this.nameInput = document.getElementById('name');
        this.usernameInput = document.getElementById('username'); // Get the username input
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
        this.submitButton = this.form.querySelector('.signup-btn');
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
        // Insert the error message container into the form
        this.form.insertBefore(this.serverErrorMessage, this.submitButton.nextSibling); 
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupPasswordToggle(this.passwordInput, this.passwordToggle);
        this.setupPasswordToggle(this.confirmPasswordInput, this.confirmPasswordToggle);
        this.setupNeumorphicEffects();
    }
    
    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Add blur validation listeners for all fields
        this.nameInput.addEventListener('blur', () => this.validateName());
        this.usernameInput.addEventListener('blur', () => this.validateUsername()); // Add listener for username
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.confirmPasswordInput.addEventListener('blur', () => this.validateConfirmPassword());
        
        // Add input listeners to clear errors as the user types
        this.nameInput.addEventListener('input', () => this.clearError('name'));
        this.usernameInput.addEventListener('input', () => this.clearError('username')); // Add listener for username
        this.emailInput.addEventListener('input', () => this.clearError('email'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
        this.confirmPasswordInput.addEventListener('input', () => this.clearError('confirmPassword'));
        
        // Add focus/blur effects to all inputs
        [this.nameInput, this.usernameInput, this.emailInput, this.passwordInput, this.confirmPasswordInput].forEach(input => {
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
        const card = document.querySelector('.signup-card');
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

    validateName() {
        const name = this.nameInput.value.trim();
        if (!name) {
            this.showError('name', 'Full name is required');
            return false;
        }
        this.clearError('name');
        return true;
    }
    
    // New validation method for the username
    validateUsername() {
        const username = this.usernameInput.value.trim();
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/; // Must be 3-20 characters. Allows letters, numbers, and underscores.

        if (!username) {
            this.showError('username', 'Username is required.');
            return false;
        }
        if (!usernameRegex.test(username)) {
            this.showError('username', 'Username must be 3-20 characters and contain only letters, numbers, or underscores.');
            return false;
        }
        this.clearError('username');
        return true;
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

    validateConfirmPassword() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        if (!confirmPassword) {
            this.showError('confirmPassword', 'Please confirm your password');
            return false;
        }
        if (password !== confirmPassword) {
            this.showError('confirmPassword', 'Passwords do not match');
            return false;
        }
        this.clearError('confirmPassword');
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
        setTimeout(() => {
            input.style.animation = '';
        }, 500);

        this.clearServerError();
    }
    
    clearError(field) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        
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
        this.clearServerError(); // Clear previous server errors

        // Validate all fields before submitting
        const isNameValid = this.validateName();
        const isUsernameValid = this.validateUsername();
        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        const isConfirmPasswordValid = this.validateConfirmPassword();
        
        if (!isNameValid || !isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
            this.animateSoftPress(this.submitButton);
            this.showServerError('Please fix the errors in the form before submitting.');
            return;
        }
        
        this.setLoading(true);
        
        // Get values from all form fields
        const name = this.nameInput.value.trim();
        const username = this.usernameInput.value.trim();
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        try {
            // Send the complete data to the server
            const response = await fetch('http://localhost:5000/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Signup successful:', data);
                this.showNeumorphicSuccess();
            } else {
                console.error('Signup failed:', data);
                this.showServerError(data.message || 'Signup failed. Please try again.');
                this.animateSoftPress(this.submitButton);
            }
        } catch (error) {
            console.error('Network error during signup:', error);
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
    
    showNeumorphicSuccess() {
        this.form.style.transform = 'scale(0.95)';
        this.form.style.opacity = '0';
        
        setTimeout(() => {
            this.form.style.display = 'none';
            document.querySelector('.signin-link').style.display = 'none';
            
            this.successMessage.classList.add('show');
            
            const successIcon = this.successMessage.querySelector('.neu-icon');
            successIcon.style.animation = 'successPulse 0.6s ease-out';
            
        }, 300);
        
        // Redirect to login page after a delay
        setTimeout(() => {
            console.log('Redirecting to login page...');
            window.location.href = 'login.html';
        }, 2500);
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

// Initialize the form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NeumorphismSignupForm();
});
