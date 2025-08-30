const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    // For traditional logins
    username: {
        type: String,
        unique: true,
        sparse: true, 
        trim: true,
        minlength: 3,
    },
    password: {
        type: String,
        sparse: true,
    },

    // For Google Sign-Ins
    googleId: {
        type: String,
        unique: true,
        sparse: true, 
    },

    // Required for ALL users
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true,
    },
    
    
    // ⭐ NEW: Fields for Email Verification
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
    },
    emailVerificationExpires: {
        type: Date,
    },

    // Optional additional user details
    picture: { type: String, default: null },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    refreshToken: { type: String },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now },
    
    // Fields for password reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
});

module.exports = mongoose.model("User", userSchema);
