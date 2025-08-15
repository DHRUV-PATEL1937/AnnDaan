const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
    // Link to the user who made the donation
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // This creates a reference to the User model
        required: true
    },
    donorName: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    foodType: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    notes: {
        type: String,
        default: ''
    },
    aiSummary: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['available', 'claimed', 'picked-up', 'expired'],
        default: 'available'
    },
    pickupTime: {
        type: Date,
        required: true
    },
    cookedTime: {
        type: Date,
        required: true
    },
    shelfLifeHours: {
        type: Number,
        required: true
    },
    // This will be calculated and stored by the server
    expiryDateTime: {
        type: Date,
        required: true
    }
}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true
});

const Donation = mongoose.model("Donation", donationSchema);

module.exports = Donation;
