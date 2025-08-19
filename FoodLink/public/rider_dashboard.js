document.addEventListener('DOMContentLoaded', () => {
    // --- Auth and User Info ---
    const riderToken = localStorage.getItem('riderToken');
    const riderName = localStorage.getItem('riderName');
    const riderNameSpan = document.getElementById('rider-name');
    const logoutLink = document.getElementById('logout-link');

    if (!riderToken) {
        // If no token, redirect to login immediately
        window.location.href = 'rider_login.html';
        return;
    }

    // Display rider's name
    if (riderName) {
        riderNameSpan.textContent = riderName;
    }

    // Handle logout
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('riderToken');
        localStorage.removeItem('riderName');
        window.location.href = 'rider_login.html';
    });


    // --- Map Initialization ---
    const map = L.map('map').setView([22.6916, 72.8634], 13); // Centered on Nadiad
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);


    // --- Mock Data (replace with API calls) ---
    // In a real app, you'd fetch this from your backend
    const needyPeopleLocations = [
        { lat: 22.7010, lng: 72.8650, name: "Community Shelter A" },
        { lat: 22.6855, lng: 72.8700, name: "City Park Gathering" },
        { lat: 22.6950, lng: 72.8590, name: "Temple Distribution Point" }
    ];
    const ngoLocation = { lat: 22.6980, lng: 72.8800, name: "Hope Foundation NGO" };


    // --- Fetch and Display Orders ---
    const ordersList = document.getElementById('orders-list');
    const noOrdersMessage = document.getElementById('no-orders');
    let mapMarkers = []; // To keep track of markers

    async function fetchDonations() {
        try {
            const response = await fetch('http://localhost:5000/api/donations/assigned', {
                headers: {
                    'Authorization': `Bearer ${riderToken}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                // Unauthorized, token might be expired
                logoutLink.click();
                return;
            }

            const donations = await response.json();

            if (donations.length === 0) {
                noOrdersMessage.style.display = 'block';
            } else {
                noOrdersMessage.style.display = 'none';
                renderOrders(donations);
            }

        } catch (error) {
            console.error("Failed to fetch donations:", error);
            noOrdersMessage.innerHTML = '<p>Could not load data. Please try again later.</p>';
            noOrdersMessage.style.display = 'block';
        }
    }

    function renderOrders(donations) {
        ordersList.innerHTML = '<h2>Assigned Pickups</h2>'; // Reset list
        donations.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';
            card.dataset.orderId = order._id;
            card.innerHTML = `
                <h3>From: ${order.donorName}</h3>
                <div class="order-details">
                    <p><strong>Address:</strong> ${order.address}</p>
                    <p><strong>Food:</strong> ${order.foodType}</p>
                    <p><strong>Quantity:</strong> Serves ${order.quantity}</p>
                    <p><strong>Pickup Time:</strong> ${new Date(order.pickupTime).toLocaleString()}</p>
                </div>
            `;
            card.addEventListener('click', () => handleOrderSelection(order, card));
            ordersList.appendChild(card);
        });
    }

    function handleOrderSelection(order, card) {
        // Highlight the selected card
        document.querySelectorAll('.order-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        // Clear previous markers from the map
        mapMarkers.forEach(marker => map.removeLayer(marker));
        mapMarkers = [];

        // Add new markers for the selected order
        // 1. Pickup Location (assuming address can be geocoded, using mock for now)
        // In a real app, you'd use a geocoding service to get lat/lng from the address
        const pickupLocation = { lat: 22.6900, lng: 72.8600 }; // Mock pickup location
        const pickupMarker = L.marker([pickupLocation.lat, pickupLocation.lng], { 
            icon: createIcon('blue', 'truck') 
        }).addTo(map).bindPopup(`<b>Pickup:</b><br>${order.address}`);
        mapMarkers.push(pickupMarker);

        // 2. Needy People Locations
        needyPeopleLocations.forEach(person => {
            const needyMarker = L.marker([person.lat, person.lng], { 
                icon: createIcon('orange', 'hand-holding-heart') 
            }).addTo(map).bindPopup(`<b>Potential Drop-off:</b><br>${person.name}`);
            mapMarkers.push(needyMarker);
        });

        // 3. NGO Location
        const ngoMarker = L.marker([ngoLocation.lat, ngoLocation.lng], { 
            icon: createIcon('green', 'hands-helping') 
        }).addTo(map).bindPopup(`<b>Final Drop-off:</b><br>${ngoLocation.name}`);
        mapMarkers.push(ngoMarker);

        // Adjust map view to fit all markers
        const group = new L.featureGroup(mapMarkers);
        map.fitBounds(group.getBounds().pad(0.2));
    }
    
    // Function to create custom colored Font Awesome icons for the map
    function createIcon(color, iconName) {
        return L.divIcon({
            html: `<i class="fas fa-${iconName}" style="color: ${color}; font-size: 24px;"></i>`,
            className: 'map-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24]
        });
    }

    // Initial fetch of data
    fetchDonations();
});
