// Neumorphism Login Form JavaScript
class NeumorphismLoginForm {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.submitButton = this.form.querySelector('.login-btn');
        this.successMessage = document.getElementById('successMessage');
        this.socialButtons = document.querySelectorAll('.neu-social'); // Keep for general social buttons if any besides Google
        
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
        // Insert it right after the login button
        this.form.insertBefore(this.serverErrorMessage, this.submitButton.nextSibling);
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupPasswordToggle();
        // this.setupSocialButtons(); // Removed as Google handles its own button
        this.setupNeumorphicEffects();
    }
    
    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.emailInput.addEventListener('input', () => this.clearError('email'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
        
        // Add soft press effects to inputs
        [this.emailInput, this.passwordInput].forEach(input => {
            input.addEventListener('focus', (e) => this.addSoftPress(e));
            input.addEventListener('blur', (e) => this.removeSoftPress(e));
        });
    }
    
    setupPasswordToggle() {
        this.passwordToggle.addEventListener('click', () => {
            const type = this.passwordInput.type === 'password' ? 'text' : 'password';
            this.passwordInput.type = type;
            
            this.passwordToggle.classList.toggle('show-password', type === 'text');
            
            // Add soft click animation
            this.animateSoftPress(this.passwordToggle);
        });
    }
    
    // Removed handleSocialLogin and setupSocialButtons as Google GSI client handles its own button clicks
    
    setupNeumorphicEffects() {
        // Add hover effects to all neumorphic elements
        const neuElements = document.querySelectorAll('.neu-icon, .neu-checkbox, .neu-social');
        neuElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                element.style.transform = 'scale(1.05)';
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.transform = 'scale(1)';
            });
        });
        
        // Add ambient light effect on mouse move
        document.addEventListener('mousemove', (e) => {
            this.updateAmbientLight(e);
        });
    }
    
    updateAmbientLight(e) {
        const card = document.querySelector('.login-card');
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
        
        if (password.length < 6) { // Make sure this matches your server-side validation!
            this.showError('password', 'Password must be at least 6 characters');
            return false;
        }
        
        this.clearError('password');
        return true;
    }
    
    showError(field, message) {
        const formGroup = document.getElementById(field).closest('.form-group');
        const errorElement = document.getElementById(`${field}Error`);
        
        formGroup.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        // Add gentle shake animation
        const input = document.getElementById(field);
        input.style.animation = 'gentleShake 0.5s ease-in-out';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);

        // Hide server error message if it's visible
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

        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        
        if (!isEmailValid || !isPasswordValid) {
            this.animateSoftPress(this.submitButton);
            this.showServerError('Please fix the errors in the form before submitting.'); // General client-side error
            return;
        }
        
        this.setLoading(true);
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        try {
            // ⭐ MODIFIED: Send email and password to your server's /login endpoint
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }) // Send email and password
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Login successful:', data);
                // ⭐ Store the received JWT (appToken)
                if (data.appToken) {
                    localStorage.setItem('jwtToken', data.appToken);
                }
                // ⭐ Store basic user info if needed
                if (data.user) {
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('userName', data.user.name);
                    // Add other user data as needed: localStorage.setItem('userId', data.user.id);
                }
                this.showNeumorphicSuccess(); // Show success message
            } else {
                console.error('Login failed:', data);
                this.showServerError(data.message || 'Login failed. Please try again.');
                this.animateSoftPress(this.submitButton);
            }
        } catch (error) {
            console.error('Network error during login:', error);
            this.showServerError('Network error. Please check your connection and server.');
            this.animateSoftPress(this.submitButton);
        } finally {
            this.setLoading(false);
        }
    }
    
    // ⭐ NEW: This function handles the Google Sign-In response
    async handleGoogleCredentialResponse(response) {
        this.clearServerError(); // Clear any previous errors
        this.setLoading(true); // Show loading for Google login

        try {
            const res = await fetch('http://localhost:5000/api/auth/google-signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: response.credential }), // Send the Google ID token
            });

            const data = await res.json();

            if (res.ok) {
                console.log('Google login successful:', data);
                // ⭐ Store the received JWT (appToken)
                if (data.appToken) {
                    localStorage.setItem('jwtToken', data.appToken);
                }
                // ⭐ Store basic user info if needed
                if (data.user) {
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('userName', data.user.name);
                    // localStorage.setItem('userId', data.user.id);
                    // localStorage.setItem('userPicture', data.user.picture);
                }
                this.showNeumorphicSuccess(); // Show success message and redirect
            } else {
                console.error('Google login failed:', data);
                this.showServerError(data.message || 'Google Sign-In failed. Please try again.');
            }
        } catch (error) {
            console.error('An error occurred during Google sign-in fetch:', error);
            this.showServerError('Could not connect to the server for Google Sign-In. Please try again later.');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.submitButton.classList.toggle('loading', loading);
        this.submitButton.disabled = loading;
        
        // Disable social buttons during login
        document.querySelectorAll('.g_id_signin button').forEach(button => { // Target Google button more specifically
             button.style.pointerEvents = loading ? 'none' : 'auto';
             button.style.opacity = loading ? '0.6' : '1';
        });
        this.socialButtons.forEach(button => { // Existing social buttons (if any)
            button.style.pointerEvents = loading ? 'none' : 'auto';
            button.style.opacity = loading ? '0.6' : '1';
        });
    }
    
    showNeumorphicSuccess() {
        // Soft fade out form
        this.form.style.transform = 'scale(0.95)';
        this.form.style.opacity = '0';
        
        setTimeout(() => {
            this.form.style.display = 'none';
            document.querySelector('.social-login').style.display = 'none';
            document.querySelector('.signup-link').style.display = 'none';
            
            // Show success with soft animation
            this.successMessage.classList.add('show');
            
            // Animate success icon
            const successIcon = this.successMessage.querySelector('.neu-icon');
            successIcon.style.animation = 'successPulse 0.6s ease-out';
            
        }, 300);
        
        // Simulate redirect
        setTimeout(() => {
            console.log('Redirecting to dashboard...');
            window.location.href = '/dashboard'; // ⭐ Redirect to your dashboard page
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

// ⭐ NEW: Make the handleCredentialResponse global for Google GSI callback
// This needs to be outside the class or attached to window
window.handleCredentialResponse = async (response) => {
    // Assuming NeumorphismLoginForm is globally accessible or you pass the instance
    // A safer way is to ensure this callback can get the instance
    const loginFormInstance = new NeumorphismLoginForm(); // Re-instantiate or get existing
    loginFormInstance.handleGoogleCredentialResponse(response);
};


// Initialize the form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize the form once
    if (!window.loginFormInstance) {
        window.loginFormInstance = new NeumorphismLoginForm();
    }
});
