// models/Request.js

const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    foodType: { type: String, required: true },
    donorName: { type: String, required: true },
    quantity: { type: String, required: true },
    address: { type: String, required: true },
    // GeoJSON format for location data
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { 
        type: String, 
        enum: ['available', 'accepted', 'in_transit', 'completed', 'rejected'], 
        default: 'available' 
    },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // To assign a rider
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

// Create a 2dsphere index for geospatial queries
RequestSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Request', RequestSchema);
