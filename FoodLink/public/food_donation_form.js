document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selections ---
    const form = document.getElementById('foodDonationForm');
    const formHeader = document.getElementById('formHeader');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const loaderContainer = document.getElementById('loaderContainer');
    const summaryContent = document.getElementById('summaryContent');

    // --- Form Submission Logic ---
    form.addEventListener('submit', async function(event) {
        // Prevent the default browser action of reloading the page
        event.preventDefault();

        // Hide the form and show the loading spinner
        form.classList.add('hidden');
        formHeader.classList.add('hidden');
        loaderContainer.classList.remove('hidden');

        // Collect form data into a structured object
        const formData = new FormData(form);
        const donationDetails = Object.fromEntries(formData.entries());

        // --- Expiry Time Calculation ---
        // Calculate the exact expiry date and time based on user input
        const cookedTime = new Date(donationDetails.cookedTime);
        const shelfLifeHours = parseInt(donationDetails.shelfLife, 10);
        const expiryDateTime = new Date(cookedTime.getTime() + shelfLifeHours * 60 * 60 * 1000);
        
        // Add the calculated expiry time to our data object
        donationDetails.expiryDateTime = expiryDateTime.toISOString();

        console.log('Donation Details for Server:', donationDetails);

        try {
            // Generate a user-friendly summary using the Gemini API
            const summary = await generateDonationSummary(donationDetails);
            summaryContent.textContent = summary;

            // --- SERVER INTEGRATION POINT ---
            // This is where you would send the complete 'donationDetails' object
            // to your server's database.
            // The server should store all details, including 'expiryDateTime'.
            // A separate process on your server (e.g., a cron job) should periodically
            // check for listings where 'expiryDateTime' is in the past and delete them.
            /*
            fetch('https://api.yourserver.com/donations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...donationDetails, aiSummary: summary }),
            })
            .then(response => response.json())
            .then(data => console.log('Successfully saved to DB:', data))
            .catch(error => console.error('Error saving to DB:', error));
            */

            // Show the final confirmation message
            showConfirmation();

        } catch (error) {
            console.error("Error during submission process:", error);
            // If something fails, show the form again with an error message
            form.classList.remove('hidden');
            formHeader.classList.remove('hidden');
            alert("An error occurred. Please try submitting again.");
        } finally {
            // Always hide the loader when the process is finished
            loaderContainer.classList.add('hidden');
        }
    });

    /**
     * Shows the confirmation message section.
     */
    function showConfirmation() {
        confirmationMessage.classList.remove('hidden');
    }

    /**
     * Generates a donation summary by calling the Gemini API.
     * @param {object} details - The donation details from the form.
     * @returns {Promise<string>} A promise that resolves to the summary text.
     */
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

        const apiKey = ""; // API key is injected by the environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };

        // Retry logic with exponential backoff for API call robustness
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

        throw new Error("Failed to get a response from the Gemini API after multiple retries.");
    }
    
    // --- Helper to prevent selecting past dates in datetime inputs ---
    const dateTimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    dateTimeInputs.forEach(input => {
        const now = new Date();
        // Adjust for timezone offset to get local time in ISO format
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        input.min = now.toISOString().slice(0, 16);
    });
});
