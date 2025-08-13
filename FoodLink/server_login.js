// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const path = require('path');

// --- 1. SETUP ---
const app = express();
const PORT = 5000;

// Use secrets from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

// A simple in-memory store for users. Replace with a real database in production.
let users = [];

// Initialize the Google Auth client
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to authenticate our JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if no token, unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // if token is no longer valid, forbidden
        req.user = user;
        next();
    });
}

// --- 3. API ENDPOINTS ---

// Google Sign-In verification and user session creation
app.post('/api/auth/google-signin', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });

        const { name, email, picture } = ticket.getPayload();
        
        // Find or create user in our "database"
        let user = users.find(u => u.email === email);
        if (!user) {
            user = { id: Date.now().toString(), name, email, picture };
            users.push(user);
            console.log('✅ New user created:', user);
        } else {
            console.log('✅ User found:', user);
        }

        // Create a JWT for our application session
        const appTokenPayload = { id: user.id, email: user.email };
        const appToken = jwt.sign(appTokenPayload, JWT_SECRET, { expiresIn: '1h' });

        // Respond with success and our application token
        res.status(200).json({
            message: "Login successful!",
            appToken: appToken, // The front-end should save this token
            user: { name, email, picture }
        });

    } catch (error) {
        console.error("❌ Error verifying Google token:", error);
        res.status(401).json({ message: "Login failed. The token is invalid." });
    }
});

// Example of a protected route that requires a valid JWT
app.get('/api/profile', authenticateToken, (req, res) => {
    // The user object is attached to the request by the authenticateToken middleware
    const userProfile = users.find(u => u.id === req.user.id);
    if (!userProfile) {
        return res.status(404).json({ message: "User not found." });
    }
    res.json({
        message: "This is a protected route.",
        user: userProfile
    });
});

// --- 4. START THE SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});