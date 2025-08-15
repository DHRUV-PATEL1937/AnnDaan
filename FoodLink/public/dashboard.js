document.addEventListener('DOMContentLoaded', () => {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutButton = document.getElementById('logoutButton');

    // --- 1. Logout Functionality ---
    const handleLogout = () => {
        // Clear the token from local storage
        localStorage.removeItem('appToken');
        console.log('User logged out. Token removed.');
        
        // Redirect to the login page using a relative path
        window.location.href = './login.html';
    };
    
    // --- 2. Fetch User Profile to Personalize the Dashboard ---
    const fetchUserProfile = async () => {
        const token = localStorage.getItem('appToken');

        if (!token) {
            window.location.href = './login.html';
            return;
        }
        
        // Show a loading state while we verify the session
        welcomeMessage.textContent = 'Loading...';

        try {
            // NOTE: Ensure your server is running and the /api/profile endpoint is correct.
            const response = await fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Update the welcome message with the user's name
                welcomeMessage.textContent = `Welcome, ${data.user.name}!`;
            } else {
                // If the token is invalid or expired, handle it gracefully
                console.error('Failed to fetch profile. Token might be invalid.');
                welcomeMessage.textContent = 'Session Invalid';
                // Wait a moment before logging out so the user sees the message
                setTimeout(handleLogout, 1500);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            welcomeMessage.textContent = 'Connection Error';
            // Handle network errors by logging out after a delay
            setTimeout(handleLogout, 1500);
        }
    };

    // --- 3. Attach Event Listeners ---
    logoutButton.addEventListener('click', handleLogout);
    
    // Fetch the user's profile as soon as the page loads
    fetchUserProfile();
});
