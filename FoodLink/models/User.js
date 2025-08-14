const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    // For traditional logins
    username: {
        type: String,
        unique: true, // Ensures every username is unique
        sparse: true, // Allows multiple documents to have a null username (for Google users)
        trim: true,
        minlength: 3,
    },
    // Hashed password for traditional logins
    password: {
        type: String,
        sparse: true, // Allows null for Google-only users
    },

    // For Google Sign-Ins
    // googleId: {
    //     type: String,
    //     unique: true,
    //     sparse: true, 
    // },

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

    // Optional additional user details
    picture: { type: String, default: null },
    phone: { type: String, default: null },
    address: { type: String, default: null },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now },
    
    // Fields for password reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
});

module.exports = mongoose.model("User", userSchema);
