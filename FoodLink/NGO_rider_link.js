// FoodLink Database System - Simulated Real-time Database
// This system enables cross-tab communication and data synchronization between NGO and Rider dashboards

class FoodLinkDatabase {
    constructor() {
        this.storageKey = 'foodlink_database';
        this.listeners = {};
        this.initializeDatabase();
        this.setupStorageListener();
    }

    // Initialize database with default structure
    initializeDatabase() {
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                donations: [],
                riders: [
                    {
                        id: 1,
                        name: 'Rajesh Kumar',
                        phone: '+91 9876543210',
                        location: { lat: 22.3072, lng: 73.1812 },
                        isOnline: false,
                        currentOrders: [],
                        completedOrders: [],
                        totalPoints: 12500,
                        todayPoints: 0,
                        todayCollections: 0,
                        rating: 4.9
                    },
                    {
                        id: 2,
                        name: 'Amit Patel',
                        phone: '+91 9876543211',
                        location: { lat: 22.3200, lng: 73.1900 },
                        isOnline: false,
                        currentOrders: [],
                        completedOrders: [],
                        totalPoints: 8500,
                        todayPoints: 0,
                        todayCollections: 0,
                        rating: 4.7
                    },
                    {
                        id: 3,
                        name: 'Priya Sharma',
                        phone: '+91 9876543212',
                        location: { lat: 22.2950, lng: 73.1650 },
                        isOnline: false,
                        currentOrders: [],
                        completedOrders: [],
                        totalPoints: 15200,
                        todayPoints: 0,
                        todayCollections: 0,
                        rating: 4.8
                    }
                ],
                ngos: [
                    {
                        id: 1,
                        name: 'Helping Hands NGO',
                        location: 'Vadodara City',
                        mealsServed: 25000,
                        totalContributions: 1500,
                        rewards: 120
                    }
                ],
                activityLog: [],
                lastUpdated: Date.now()
            };
            this.saveData(initialData);
        }
    }

    // Setup cross-tab storage listener
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey && e.newValue) {
                const data = JSON.parse(e.newValue);
                this.notifyListeners('dataChanged', data);
            }
        });
    }

    // Get all data
    getData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : null;
    }

    // Save data and trigger cross-tab update
    saveData(data) {
        data.lastUpdated = Date.now();
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        
        // Dispatch custom event for same-tab listeners
        window.dispatchEvent(new CustomEvent('foodlinkDataUpdate', { detail: data }));
    }

    // Add donation request (called by NGO)
    addDonationRequest(donation) {
        const data = this.getData();
        const newDonation = {
            id: Date.now(),
            ngoId: 1,
            ngoName: 'Helping Hands NGO',
            status: 'pending',
            createdAt: new Date().toISOString(),
            assignedRider: null,
            ...donation
        };
        
        data.donations.push(newDonation);
        
        // Add to activity log
        this.addActivityLog(`New donation request: ${newDonation.foodType} from ${newDonation.donorName}`, 'donation');
        
        this.saveData(data);
        return newDonation;
    }

    // Assign donation to rider (called when rider accepts)
    assignDonationToRider(donationId, riderId) {
        const data = this.getData();
        const donationIndex = data.donations.findIndex(d => d.id === donationId);
        const riderIndex = data.riders.findIndex(r => r.id === riderId);
        
        if (donationIndex !== -1 && riderIndex !== -1) {
            data.donations[donationIndex].status = 'assigned';
            data.donations[donationIndex].assignedRider = data.riders[riderIndex];
            data.donations[donationIndex].assignedAt = new Date().toISOString();
            
            // Add to rider's current orders
            data.riders[riderIndex].currentOrders.push({
                ...data.donations[donationIndex],
                status: 'accepted'
            });
            
            // Add to activity log
            this.addActivityLog(`${data.riders[riderIndex].name} accepted pickup from ${data.donations[donationIndex].donorName}`, 'assignment');
            
            this.saveData(data);
            return true;
        }
        return false;
    }

    // Update delivery status
    updateDeliveryStatus(donationId, status, riderId) {
        const data = this.getData();
        const donationIndex = data.donations.findIndex(d => d.id === donationId);
        const riderIndex = data.riders.findIndex(r => r.id === riderId);
        
        if (donationIndex !== -1 && riderIndex !== -1) {
            data.donations[donationIndex].status = status;
            data.donations[donationIndex].updatedAt = new Date().toISOString();
            
            // Update rider's order
            const rider = data.riders[riderIndex];
            const orderIndex = rider.currentOrders.findIndex(o => o.id === donationId);
            
            if (orderIndex !== -1) {
                rider.currentOrders[orderIndex].status = status;
                
                if (status === 'completed') {
                    // Move to completed orders
                    const completedOrder = rider.currentOrders.splice(orderIndex, 1)[0];
                    rider.completedOrders.push(completedOrder);
                    
                    // Update rider points
                    const points = completedOrder.points || 25;
                    rider.todayPoints += points;
                    rider.totalPoints += points;
                    rider.todayCollections += 1;
                    
                    // Update NGO stats
                    data.ngos[0].mealsServed += Math.floor(Math.random() * 10) + 5;
                    data.ngos[0].totalContributions += 1;
                    
                    this.addActivityLog(`Delivery completed by ${rider.name} - ${completedOrder.donorName}`, 'completion');
                } else if (status === 'picked_up') {
                    this.addActivityLog(`Food picked up by ${rider.name} from ${data.donations[donationIndex].donorName}`, 'pickup');
                }
            }
            
            this.saveData(data);
            return true;
        }
        return false;
    }

    // Update rider online status
    updateRiderStatus(riderId, isOnline) {
        const data = this.getData();
        const riderIndex = data.riders.findIndex(r => r.id === riderId);
        
        if (riderIndex !== -1) {
            data.riders[riderIndex].isOnline = isOnline;
            this.addActivityLog(`${data.riders[riderIndex].name} went ${isOnline ? 'online' : 'offline'}`, 'status');
            this.saveData(data);
            return true;
        }
        return false;
    }

    // Get available donations (for riders)
    getAvailableDonations() {
        const data = this.getData();
        return data.donations.filter(d => d.status === 'pending');
    }

    // Get donations by NGO (for NGO dashboard)
    getDonationsByNgo(ngoId) {
        const data = this.getData();
        return data.donations.filter(d => d.ngoId === ngoId);
    }

    // Get active deliveries (for NGO dashboard)
    getActiveDeliveries(ngoId) {
        const data = this.getData();
        return data.donations.filter(d => d.ngoId === ngoId && ['assigned', 'picked_up'].includes(d.status));
    }

    // Get rider by ID
    getRider(riderId) {
        const data = this.getData();
        return data.riders.find(r => r.id === riderId);
    }

    // Get all online riders
    getOnlineRiders() {
        const data = this.getData();
        return data.riders.filter(r => r.isOnline);
    }

    // Add activity log entry
    addActivityLog(message, type) {
        const data = this.getData();
        data.activityLog.unshift({
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 activities
        if (data.activityLog.length > 50) {
            data.activityLog = data.activityLog.slice(0, 50);
        }
    }

    // Get activity log
    getActivityLog(limit = 10) {
        const data = this.getData();
        return data.activityLog.slice(0, limit);
    }

    // Subscribe to data changes
    subscribe(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        
        // Also listen for custom events on same tab
        window.addEventListener('foodlinkDataUpdate', (e) => {
            if (event === 'dataChanged') {
                callback(e.detail);
            }
        });
    }

    // Notify listeners
    notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // Simulate network delay (for realism)
    async simulateNetworkDelay(ms = 500) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Generate mock data for demonstration
    generateMockDonation() {
        const donors = [
            { name: 'Priya Sharma', phone: '9876543210', address: '123, Sampatrao Colony, Jagnath Plot' },
            { name: 'Amit Patel', phone: '9876543211', address: 'Hotel Grand Mercure, Sayajigunj' },
            { name: 'Sunita Mehta', phone: '9876543212', address: '789, Gotri Road, Akota' },
            { name: 'Raj Hotel', phone: '9876543213', address: '456, RC Dutt Road, Alkapuri' },
            { name: 'Maya Restaurant', phone: '9876543214', address: '321, Fatehgunj Main Road' }
        ];
        
        const foodTypes = [
            { type: 'Cooked Rice & Dal', diet: 'veg', servings: '50-60', points: 30 },
            { type: 'Mixed Vegetable Curry', diet: 'veg', servings: '30-40', points: 25 },
            { type: 'Chicken Curry & Rice', diet: 'non-veg', servings: '40-50', points: 35 },
            { type: 'Fresh Fruits & Snacks', diet: 'veg', servings: '20-30', points: 20 },
            { type: 'Bread & Sabzi', diet: 'veg', servings: '60-70', points: 40 }
        ];
        
        const donor = donors[Math.floor(Math.random() * donors.length)];
        const food = foodTypes[Math.floor(Math.random() * foodTypes.length)];
        
        // Generate random location in Vadodara
        const baseLatLng = { lat: 22.3072, lng: 73.1812 };
        const lat = baseLatLng.lat + (Math.random() - 0.5) * 0.1;
        const lng = baseLatLng.lng + (Math.random() - 0.5) * 0.1;
        
        return {
            donorName: donor.name,
            donorPhone: donor.phone,
            donorAddress: donor.address,
            foodType: food.type,
            dietType: food.diet,
            servings: food.servings,
            points: food.points,
            coords: [lat, lng],
            description: `Fresh ${food.type.toLowerCase()} available for pickup. Please collect within 2 hours.`,
            distance: `${(Math.random() * 3 + 0.5).toFixed(1)}km`
        };
    }

    // Clear all data (for testing)
    clearDatabase() {
        localStorage.removeItem(this.storageKey);
        this.initializeDatabase();
    }
}

// Export for use in both NGO and Rider applications
window.FoodLinkDatabase = FoodLinkDatabase;