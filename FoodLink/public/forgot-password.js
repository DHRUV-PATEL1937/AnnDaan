class NeumorphismForgotPasswordForm {
    constructor() {
        // View Sections
        this.emailSection = document.getElementById('emailSection');
        this.otpSection = document.getElementById('otpSection');

        // Forms
        this.emailForm = document.getElementById('emailForm');
        this.otpForm = document.getElementById('otpForm');

        // Inputs
        this.emailInput = document.getElementById('email');
        this.otpInput = document.getElementById('otp');
        this.newPasswordInput = document.getElementById('newPassword');
        
        // Buttons
        this.sendOtpButton = this.emailForm.querySelector('.reset-btn');
        this.resetPasswordButton = this.otpForm.querySelector('.reset-btn');

        // Messages
        this.successMessage = document.getElementById('successMessage');
        this.serverErrorMessage = this.createServerErrorMessage();
        this.emailForm.appendChild(this.serverErrorMessage);

        this.storedEmail = ''; // To store the email after step 1

        this.init();
    }
    
    init() {
        this.emailForm.addEventListener('submit', (e) => this.handleSendOtp(e));
        this.otpForm.addEventListener('submit', (e) => this.handleResetPassword(e));
    }

    createServerErrorMessage() {
        const p = document.createElement('p');
        p.style.cssText = `
            color: #d63031; font-size: 0.9em; margin-top: 15px; text-align: center;
            opacity: 0; transition: opacity 0.3s ease-in-out; min-height: 1em;
        `;
        return p;
    }

    // --- Step 1: Send OTP ---
    async handleSendOtp(e) {
        e.preventDefault();
        this.clearServerError();

        if (!this.validateEmail()) {
            this.showServerError('Please enter a valid email address.');
            return;
        }
        
        this.setLoading(this.sendOtpButton, true);
        const email = this.emailInput.value.trim();
        this.storedEmail = email; // Store for step 2

        try {
            const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                // Email exists, switch to OTP view
                this.switchToOtpView();
            } else {
                // Email does not exist or other error
                this.showServerError(data.message || 'An unknown error occurred.');
            }
        } catch (error) {
            this.showServerError('Network error. Please try again.');
        } finally {
            this.setLoading(this.sendOtpButton, false);
        }
    }

    // --- Step 2: Reset Password with OTP ---
    async handleResetPassword(e) {
        e.preventDefault();
        this.clearServerError();

        if (!this.validateOtpForm()) {
            return;
        }

        this.setLoading(this.resetPasswordButton, true);
        const otp = this.otpInput.value.trim();
        const newPassword = this.newPasswordInput.value;

        try {
            const response = await fetch('http://localhost:5000/api/auth/reset-with-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: this.storedEmail, otp, newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                this.showFinalSuccess();
            } else {
                this.showServerError(data.message || 'An error occurred.');
            }

        } catch (error) {
            this.showServerError('Network error. Please try again.');
        } finally {
            this.setLoading(this.resetPasswordButton, false);
        }
    }

    // --- UI & Validation Helpers ---
    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showError('email', 'Please enter a valid email');
            return false;
        }
        this.clearError('email');
        return true;
    }

    validateOtpForm() {
        let isValid = true;
        if (this.otpInput.value.trim().length !== 6) {
            this.showError('otp', 'OTP must be 6 digits.');
            isValid = false;
        } else {
            this.clearError('otp');
        }

        if (this.newPasswordInput.value.length < 6) {
            this.showError('newPassword', 'Password must be at least 6 characters.');
            isValid = false;
        } else {
            this.clearError('newPassword');
        }
        return isValid;
    }

    switchToOtpView() {
        this.emailSection.style.display = 'none';
        this.otpSection.style.display = 'block';
        this.serverErrorMessage.remove(); // Move the error message
        this.otpForm.appendChild(this.serverErrorMessage);
        this.clearServerError();
    }

    showFinalSuccess() {
        // Hide the OTP form section
        this.otpSection.style.display = 'none';
        document.querySelector('.back-link').style.display = 'none';

        // Update and show the final success message
        this.successMessage.querySelector('p').textContent = 'Password reset! Redirecting to login...';
        this.successMessage.classList.add('show');

        // Redirect to the login page after a 2-second delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000); // 2000 milliseconds = 2 seconds
    }

    setLoading(button, isLoading) {
        button.classList.toggle('loading', isLoading);
        button.disabled = isLoading;
    }

    showError(field, message) {
        const errorElement = document.getElementById(`${field}Error`);
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    clearError(field) {
        const errorElement = document.getElementById(`${field}Error`);
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    showServerError(message) {
        this.serverErrorMessage.textContent = message;
        this.serverErrorMessage.style.opacity = '1';
    }

    clearServerError() {
        this.serverErrorMessage.textContent = '';
        this.serverErrorMessage.style.opacity = '0';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NeumorphismForgotPasswordForm();
});
