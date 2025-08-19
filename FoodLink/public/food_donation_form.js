document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selections ---
    const form = document.getElementById('foodDonationForm');
    const formHeader = document.getElementById('formHeader');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const loaderContainer = document.getElementById('loaderContainer');
    const summaryContent = document.getElementById('summaryContent');
    
    // Auth related elements
    const authLinks = document.getElementById('auth-links');
    const welcomeMessage = document.getElementById('welcome-message');
    const userNameSpan = document.getElementById('user-name');
    const logoutLink = document.getElementById('logout-link');
    const donorNameInput = document.getElementById('donorName');

    // ⭐ API Wrapper for authenticated requests with auto-refresh logic
    const api = {
        async post(endpoint, body) {
            let accessToken = localStorage.getItem('appToken');
            
            let response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            // Check if the token expired
            if (response.status === 403 && data.error === 'TokenExpiredError') {
                console.log("Access token expired. Attempting to refresh...");
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    accessToken = localStorage.getItem('appToken');
                    // Retry the original request with the new token
                    console.log("Retrying original request with new token...");
                    response = await fetch(`http://localhost:5000${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                        },
                        body: JSON.stringify(body)
                    });
                    return { response, data: await response.json() };
                } else {
                    // Refresh failed, force logout
                    handleLogout();
                    throw new Error("Your session has expired. Please log in again.");
                }
            }
            return { response, data };
        },

        async refreshToken() {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) return false;

            try {
                const response = await fetch('http://localhost:5000/api/auth/refresh-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: refreshToken })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('appToken', data.accessToken);
                    console.log("Token refreshed successfully.");
                    return true;
                }
                return false;
            } catch (error) {
                console.error("Error refreshing token:", error);
                return false;
            }
        }
    };

    // --- Auth UI Management ---
    function checkLoginStatus() {
        const token = localStorage.getItem('appToken');
        if (token) {
            authLinks.style.display = 'none';
            welcomeMessage.style.display = 'block';
            const userName = localStorage.getItem('userName');
            if (userName) {
                userNameSpan.textContent = userName;
                donorNameInput.value = userName;
            }
        } else {
            authLinks.style.display = 'block';
            welcomeMessage.style.display = 'none';
        }
    }

    async function handleLogout() {
        // Invalidate the refresh token on the server
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                await api.post('/api/auth/logout', {});
            } catch (error) {
                console.error("Logout failed on server, clearing client-side session anyway.");
            }
        }
        
        // Clear local storage regardless
        localStorage.removeItem('appToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userName');
        alert("You have been logged out.");
        window.location.href = 'login.html';
    }

    logoutLink.addEventListener('click', function(event) {
        event.preventDefault();
        handleLogout();
    });

    checkLoginStatus();

    // --- Form Submission Logic ---
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        if (!localStorage.getItem('appToken')) {
            alert("You must be logged in to make a donation. Redirecting to login page.");
            window.location.href = 'login.html';
            return;
        }

        form.classList.add('hidden');
        formHeader.classList.add('hidden');
        loaderContainer.classList.remove('hidden');

        const formData = new FormData(form);
        const donationDetails = Object.fromEntries(formData.entries());

        try {
            // Use the API wrapper to submit the donation
            const { response, data } = await api.post('/api/donations', {
                donorName: donationDetails.donorName,
                contactNumber: donationDetails.contactNumber,
                address: donationDetails.address,
                foodType: donationDetails.foodType,
                quantity: donationDetails.quantity,
                notes: donationDetails.notes,
                pickupTime: donationDetails.pickupTime,
                cookedTime: donationDetails.cookedTime,
                shelfLifeHours: donationDetails.shelfLife,
            });

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit donation.');
            }
            
            console.log('Successfully saved to DB:', data);

            // Now that it's saved, generate the AI summary
            const cookedTime = new Date(donationDetails.cookedTime);
            const shelfLifeHours = parseInt(donationDetails.shelfLife, 10);
            const expiryDateTime = new Date(cookedTime.getTime() + shelfLifeHours * 60 * 60 * 1000);
            donationDetails.expiryDateTime = expiryDateTime.toISOString();
            
            const summary = await generateDonationSummary(donationDetails);
            summaryContent.textContent = summary;
            
            showConfirmation();

        } catch (error) {
            console.error("Error during submission process:", error);
            form.classList.remove('hidden');
            formHeader.classList.remove('hidden');
            alert(`An error occurred: ${error.message}.`);
        } finally {
            loaderContainer.classList.add('hidden');
        }
    });

    function showConfirmation() {
        confirmationMessage.classList.remove('hidden');
    }

    async function generateDonationSummary(details) {
        const prompt = `
            Create a short, friendly summary for a food donation confirmation page.
            The tone should be appreciative and clear. Do not use markdown.
            Use the following details:
            - Food items: "${details.foodType}"
            - Quantity: "Enough for ${details.quantity} people"
            - Special Instructions: "${details.notes || 'None'}"
            - Pickup Address: "${details.address}"
            - Preferred Pickup Time: "${new Date(details.pickupTime).toLocaleString()}"
            - Calculated Expiry Time: "${new Date(details.expiryDateTime).toLocaleString()}"
        `;

        const apiKey = ""; // IMPORTANT: Do not expose your API key on the client-side in a real application.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };

        let response;
        let delay = 1000;
        for (let i = 0; i < 5; i++) {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                        return result.candidates[0].content.parts[0].text;
                    }
                }
            } catch (error) {
                console.log(`API call attempt ${i + 1} failed. Retrying in ${delay}ms...`);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }

        console.error("Failed to get a response from the Gemini API after multiple retries.");
        return "Your donation details have been recorded. Thank you for your generosity!";
    }
    
    // This section is changed to only affect the pickup time input.
    
    // Select the pickup time input specifically by its ID
    const pickupTimeInput = document.getElementById('pickupTime');
    
    // Check if the element exists before trying to modify it
    if (pickupTimeInput) {
        const now = new Date();
        // Adjust for the local timezone to set the minimum correctly
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        // Set the minimum selectable time to the current time
        pickupTimeInput.min = now.toISOString().slice(0, 16);
    }
});