const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // For traditional logins (username can be same as email)
  username: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple documents to have a null username (e.g., Google users)
    trim: true,
  },
  // Only for traditional logins (hashed password)
  password: {
    type: String,
    sparse: true, // Allows null for users who sign up only with Google
  },

  // For Google Sign-Ins
  // googleId: {
  //   type: String,
  //   unique: true,
  //   sparse: true, // Allows null for users who sign up with traditional username/password
  // },

  // Required for ALL users (Google or Traditional)
  name: {
    type: String,
    required: true, // User's full name is required
    trim: true,
  },
  email: {
    type: String,
    unique: true, // Each email must be unique across all users
    required: true, // Email is required for all users
    lowercase: true, // Store email in lowercase
    trim: true,
  },

  // Optional additional user details
  picture: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: null,
  },
  address: {
    type: String,
    default: null,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
  // Fields for password reset functionality
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("User", userSchema);
