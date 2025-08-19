document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selections ---
    const form = document.getElementById('foodDonationForm');
    const formHeader = document.getElementById('formHeader');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const loaderContainer = document.getElementById('loaderContainer');
    const summaryContent = document.getElementById('summaryContent');
    const donationsGrid = document.getElementById('donationsGrid');
    const loadingDonations = document.getElementById('loading-donations');
    
    // Auth related elements
    const authLinks = document.getElementById('auth-links');
    const welcomeMessage = document.getElementById('welcome-message');
    const userNameSpan = document.getElementById('user-name');
    const logoutLink = document.getElementById('logout-link');
    const donorNameInput = document.getElementById('donorName');
    
    // Donation button in hero section
    const donateNowBtns = document.querySelectorAll('.btn');
    donateNowBtns.forEach(btn => {
        if (btn.textContent.includes('Donate Now')) {
            btn.addEventListener('click', function(e) {
                window.location.href = 'food_donation_form.html';
            });
        }
    });
    
    // Start donating button in how it works section
    const startDonatingBtn = document.querySelector('.how-section .btn');
    if (startDonatingBtn) {
        startDonatingBtn.addEventListener('click', function(e) {
            window.location.href = 'food_donation_form.html';
        });
    }

    // --- API Wrapper with Auto-Refresh ---
    const api = {
        async request(endpoint, method = 'GET', body = null) {
            let accessToken = localStorage.getItem('accessToken');
            
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };

            if (accessToken) {
                options.headers['Authorization'] = `Bearer ${accessToken}`;
            }
            if (body) {
                options.body = JSON.stringify(body);
            }

            let response = await fetch(`http://localhost:5000${endpoint}`, options);
            let data = await response.json();

            if (response.status === 403 && data.error === 'TokenExpiredError') {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    accessToken = localStorage.getItem('accessToken');
                    options.headers['Authorization'] = `Bearer ${accessToken}`;
                    response = await fetch(`http://localhost:5000${endpoint}`, options);
                    data = await response.json();
                } else {
                    handleLogout(true); // Force logout
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
                    localStorage.setItem('accessToken', data.accessToken);
                    return true;
                }
                return false;
            } catch (error) {
                return false;
            }
        }
    };

    // --- Auth UI & Logout ---
    function checkLoginStatus() {
        const token = localStorage.getItem('accessToken');
        const userName = localStorage.getItem('userName');
        if (token && userName) {
            if (authLinks) authLinks.style.display = 'none';
            if (welcomeMessage) {
                welcomeMessage.style.display = 'flex';
                if (userNameSpan) userNameSpan.textContent = userName;
            }
            if (donorNameInput) donorNameInput.value = userName;
        } else {
            if (authLinks) authLinks.style.display = 'flex';
            if (welcomeMessage) welcomeMessage.style.display = 'none';
        }
    }

    async function handleLogout(isSilent = false) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userName');
        if (!isSilent) {
            alert("You have been logged out.");
        }
        window.location.href = 'login.html';
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // --- Fetch and Display Donations ---
    async function fetchDonations() {
        try {
            const { response, data } = await api.request('/api/donations');
            if (!response.ok) throw new Error(data.message);
            
            loadingDonations.style.display = 'none';
            donationsGrid.innerHTML = ''; // Clear grid

            if (data.length === 0) {
                donationsGrid.innerHTML = '<p>No available donations at the moment. Be the first to donate!</p>';
                return;
            }

            data.forEach(donation => {
                const card = document.createElement('div');
                card.className = 'donation-card';
                card.innerHTML = `
                    <h3>${donation.foodType}</h3>
                    <p><strong>Quantity:</strong> Serves ${donation.quantity}</p>
                    <p><strong>Location:</strong> ${donation.address}</p>
                    <p><strong>Pickup Time:</strong> ${new Date(donation.pickupTime).toLocaleString()}</p>
                    <p><strong>Expires:</strong> ${new Date(donation.expiryDateTime).toLocaleString()}</p>
                    ${donation.notes ? `<p><strong>Notes:</strong> ${donation.notes}</p>` : ''}
                `;
                donationsGrid.appendChild(card);
            });
        } catch (error) {
            loadingDonations.textContent = 'Could not load donations.';
            console.error("Error fetching donations:", error);
        }
    }

    // --- Form Submission Logic ---
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (!localStorage.getItem('accessToken')) {
                alert("You must be logged in to donate.");
                window.location.href = 'login.html';
                return;
            }

        form.style.display = 'none';
        formHeader.style.display = 'none';
        loaderContainer.classList.remove('hidden');

        const formData = new FormData(form);
        const donationDetails = Object.fromEntries(formData.entries());

        try {
            const { response, data } = await api.request('/api/donations', 'POST', {
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

            if (!response.ok) throw new Error(data.message);
            
            console.log('Successfully saved to DB:', data);
            
            const cookedTime = new Date(donationDetails.cookedTime);
            const shelfLifeHours = parseInt(donationDetails.shelfLife, 10);
            const expiryDateTime = new Date(cookedTime.getTime() + shelfLifeHours * 60 * 60 * 1000);
            donationDetails.expiryDateTime = expiryDateTime.toISOString();
            
            const summary = await generateDonationSummary(donationDetails);
            summaryContent.textContent = summary;
            
            showConfirmation();
            fetchDonations(); // Refresh the list of donations

        } catch (error) {
            console.error("Error during submission process:", error);
            form.style.display = 'block';
            formHeader.style.display = 'block';
            alert(`An error occurred: ${error.message}.`);
        } finally {
            loaderContainer.classList.add('hidden');
        }
    });
    }

    function showConfirmation() {
        confirmationMessage.classList.remove('hidden');
    }

    async function generateDonationSummary(details) {
        // This function remains the same as your previous version
        return "Your donation details have been recorded. Thank you for your generosity!";
    }
    
    // --- Initial Page Load ---
    checkLoginStatus();
    
    // Only fetch donations if we're on a page that displays them
    if (donationsGrid && loadingDonations) {
        fetchDonations();
    }
    
    const dateTimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    dateTimeInputs.forEach(input => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        input.min = now.toISOString().slice(0, 16);
    });
});
