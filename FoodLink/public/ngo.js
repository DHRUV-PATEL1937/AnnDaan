document.addEventListener('DOMContentLoaded', () => {
    /** ============== ELEMENTS ============== */
    const requestList = document.getElementById('request-list');
    const deliveryList = document.getElementById('delivery-list');
    const activityLog = document.getElementById('activity-log');
    const mealsServedEl = document.getElementById('meals-served');
    const contributionsEl = document.getElementById('contributions');
    const rewardsEl = document.getElementById('rewards');
    const profileMealsServedEl = document.getElementById('profile-meals-served');
    const profileContributionsEl = document.getElementById('profile-contributions');
    const profileRewardsEl = document.getElementById('profile-rewards');
    const modalOverlay = document.getElementById('modal-overlay');
    const currentCrewNameEl = document.getElementById('current-crew-name');
    const swapCrewBtn = document.getElementById('swap-crew-btn');

    /** ============== DATA ============== */
    const riderCrews = {
        day: ['S. Patel', 'R. Sharma', 'A. Khan', 'P. Mehta'],
        night: ['V. Singh', 'J. Desai', 'K. Reddy', 'M. Iyer']
    };
    let currentCrew = 'day';
    let stats = { mealsServed: 25000, contributions: 1500, rewards: 120 };
    let requestCounter = 104;
    const initialRequests = [
        { id: 'D-101', quantity: "Cooked Meal for 50", diet: "Veg", source: "Wedding", address: "45, Akshar Chowk, Vadodara", description: "Freshly prepared Paneer Butter Masala, 100 Rotis, and Jeera Rice.", meals: 50 },
        { id: 'D-102', quantity: "20kg Wheat Flour", diet: "Veg", source: "Household", address: "78, Manisha Society, Vadodara", description: "Unopened bags of whole wheat flour.", meals: 200 },
        { id: 'D-103', quantity: "Feeds 15-20 people", diet: "Non-Veg", source: "Restaurant", address: "Hotel Grand Mercure, Sayajigunj", description: "Surplus Chicken Biryani and Kebabs from today's buffet.", meals: 17 }
    ];

    /** ============== CORE FUNCTIONS ============== */
    const updateStats = () => {
        mealsServedEl.textContent = `${stats.mealsServed.toLocaleString()}+`;
        contributionsEl.textContent = `${stats.contributions.toLocaleString()}+`;
        rewardsEl.textContent = stats.rewards;
        profileMealsServedEl.textContent = `${stats.mealsServed.toLocaleString()}+`;
        profileContributionsEl.textContent = `${stats.contributions.toLocaleString()}+`;
        profileRewardsEl.textContent = stats.rewards;
    };

    const addRequestCard = (request) => {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.id = `req-${request.id}`;
        card.dataset.diet = request.diet ? request.diet.toLowerCase() : 'veg';
        
        const dietTag = request.diet ? `<span class="diet-tag ${request.diet.toLowerCase()}">${request.diet}</span>` : '';
        card.innerHTML = `
            <div class="card-header"><h3>${request.quantity}</h3> ${dietTag}</div>
            <p><strong>From:</strong> ${request.source}</p>
            <p><strong>Pickup:</strong> ${request.address}</p>
            <div class="description"><i class="fa-solid fa-circle-info"></i> ${request.description}</div>
            <div class="btn-group">
                <button class="btn btn-accept"><i class="fa-solid fa-check-circle"></i> Accept</button>
                <button class="btn btn-ai" title="AI Suggestion"><i class="fa-solid fa-brain"></i></button>
            </div>`;
        card.querySelector('.btn-accept').addEventListener('click', () => { acceptDonation(request); card.remove(); });
        card.querySelector('.btn-ai').addEventListener('click', () => showAiSuggestion(request));
        requestList.prepend(card);
    };

    const acceptDonation = (request) => {
        stats.mealsServed += request.meals;
        stats.contributions += 1;
        stats.rewards += 5;
        updateStats();
        const activeCrew = riderCrews[currentCrew];
        const riderName = activeCrew[Math.floor(Math.random() * activeCrew.length)];
        const deliveryCard = document.createElement('div');
        deliveryCard.className = 'delivery-card';
        deliveryCard.id = `delivery-${request.id}`;
        deliveryCard.innerHTML = `
            <div class="card-header"><h3>${request.quantity}</h3><span class="status-pill in-transit">In Transit</span></div>
            <p><strong>From:</strong> ${request.source}</p>
            <div class="rider-info"><i class="fa-solid fa-motorcycle"></i> <strong>Rider:</strong> ${riderName}</div>`;
        deliveryList.prepend(deliveryCard);
        setTimeout(() => {
            const cardToRemove = document.getElementById(`delivery-${request.id}`);
            if (cardToRemove) cardToRemove.remove();
            addActivityLog(request, riderName);
        }, 8000);
    };

    const addActivityLog = (request, riderName) => {
        const logItem = document.createElement('div');
        logItem.className = 'activity-item';
        logItem.style.opacity = '0';
        logItem.innerHTML = `
            <div class="details">
                <p>${request.quantity} from ${request.source}</p>
                <span>Delivered by ${riderName} to community kitchen.</span>
            </div>
            <span class="status-pill completed">Completed</span>`;
        activityLog.prepend(logItem);
        setTimeout(() => logItem.style.opacity = '1', 10);
    };

    /** ============== NEW & ENHANCED FEATURES ============== */

    // 1. Rider Crew Swap
    const swapRiderCrew = () => {
        currentCrew = (currentCrew === 'day') ? 'night' : 'day';
        currentCrewNameEl.textContent = `${currentCrew.charAt(0).toUpperCase() + currentCrew.slice(1)} Shift`;
        showToast(`🛵 Rider crew swapped to ${currentCrewNameEl.textContent}.`);
    };
    swapCrewBtn.addEventListener('click', swapRiderCrew);

    // 2. Toast Notification
    const showToast = (message) => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = "toast show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    };

    const simulateNewDonation = () => {
        const newId = `D-${requestCounter++}`;
        const newDonation = { id: newId, quantity: "Box of Fresh Vegetables", diet: "Veg", source: "Local Farmer", address: "Gotri Road, Vadodara", description: "Assorted fresh vegetables from today's harvest.", meals: 30 };
        initialRequests.push(newDonation);
        addRequestCard(newDonation);
        showToast(`🔔 New Donation: ${newDonation.quantity}`);
    };
    document.getElementById('simulate-btn').addEventListener('click', simulateNewDonation);

    // 3. Filtering
    const filterRequests = (filter) => {
        document.querySelectorAll('.request-card').forEach(card => {
            if (filter === 'all' || card.dataset.diet === filter) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    };
    document.getElementById('filter-buttons').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const filter = e.target.dataset.filter;
            filterRequests(filter);
            updateChart(filter); // <-- Link to chart update
        }
    });

    // 4. AI Suggestion
    const showAiSuggestion = (request) => {
        let suggestion = "";
        const isPerishable = request.description.toLowerCase().includes('cooked') || request.description.toLowerCase().includes('fresh');
        if (isPerishable) {
            suggestion = "<strong>Priority: HIGH.</strong> This is a perishable item. Recommend immediate pickup and delivery to the nearest distribution center within 2 hours.";
        } else {
            suggestion = "<strong>Priority: NORMAL.</strong> This is a non-perishable item. Can be scheduled for pickup within the next 24 hours for central storage.";
        }
        if (request.meals > 40) {
            suggestion += "<br><br><strong>Logistics:</strong> Large quantity detected. A larger vehicle may be required for pickup.";
        }
        document.getElementById('ai-suggestion-text').innerHTML = suggestion;
        openModal('ai-modal');
    };
    
    // 5. Dynamic Analytics Chart
    let contributionsChart = null;
    const chartData = {
        all: [12, 19, 15, 25, 22, 30, 18],
        veg: [8, 12, 10, 15, 14, 20, 12],
        'non-veg': [4, 7, 5, 10, 8, 10, 6]
    };
    const updateChart = (filter) => {
        if (contributionsChart) {
            contributionsChart.destroy();
        }
        const ctx = document.getElementById('contributionsChart').getContext('2d');
        contributionsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: `Contributions this week (${filter})`,
                    data: chartData[filter],
                    backgroundColor: 'rgba(33, 150, 243, 0.2)',
                    borderColor: 'rgba(33, 150, 243, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: { scales: { y: { beginAtZero: true } }, animation: { duration: 500 } }
        });
    };
    
    /** ============== MODAL LOGIC ============== */
    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modalOverlay.classList.add('active');
        modal.classList.add('active');
        setTimeout(() => { modalOverlay.classList.add('visible'); modal.classList.add('visible'); }, 10);
    };
    const closeModal = () => {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            activeModal.classList.remove('visible');
            modalOverlay.classList.remove('visible');
            setTimeout(() => { activeModal.classList.remove('active'); modalOverlay.classList.remove('active'); }, 300);
        }
    };
    document.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', closeModal));
    modalOverlay.addEventListener('click', closeModal);
    document.getElementById('profile-link').addEventListener('click', (e) => { e.preventDefault(); openModal('profile-modal'); });
    document.getElementById('logout-link').addEventListener('click', (e) => { e.preventDefault(); openModal('logout-modal'); });
    document.getElementById('btn-confirm-logout').addEventListener('click', () => {
        closeModal();
        stats = { mealsServed: 25000, contributions: 1500, rewards: 120 };
        updateStats();
        initialRequests.length = 3; 
        requestList.innerHTML = '';
        initialRequests.forEach(addRequestCard);
        deliveryList.innerHTML = '';
        activityLog.innerHTML = '';
        updateChart('all');
    });

    /** ============== INITIAL RENDER ============== */
    updateStats();
    initialRequests.forEach(addRequestCard);
    updateChart('all');
});