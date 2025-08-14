// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- 1. SERVER SETUP ---
const app = express();
const PORT = process.env.PORT || 5000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/anndan'; 

const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!GOOGLE_CLIENT_ID || !JWT_SECRET || !EMAIL_USER || !EMAIL_PASS) {
  console.error('CRITICAL ERROR: GOOGLE_CLIENT_ID, JWT_SECRET, EMAIL_USER, and EMAIL_PASS must be set in your .env file.');
  process.exit(1); 
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const User = require('./models/User'); 

// --- 2. DATABASE CONNECTION ---
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully!'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Please ensure your MONGO_URI is correct and MongoDB is running.');
  process.exit(1);
});

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
      console.warn('Authentication failed: No token provided.');
      return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          console.error('Authentication failed: Invalid token.', err.message);
          return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
}

// --- 4. API ENDPOINTS ---

app.get('/', (req, res) => {
  res.send('Server is up and running! Welcome to the authentication API.');
});

// --- Traditional Email/Password Signup Route (UPDATED) ---
app.post('/signup', async (req, res) => {
    try {
        // Destructure username from the request body
        const { name, username, email, password } = req.body;

        // Validate all required fields
        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: 'Full name, username, email, and password are required.' });
        }
        if (password.length < 6) {
          return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }
        if (username.length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters long.' });
        }

        // Check if either the email or username already exists
        const existingUser = await User.findOne({ $or: [{ email: email }, { username: username }] });
        if (existingUser) {
            let message = 'An account with this email or username already exists.';
            if (existingUser.email === email) {
                message = 'An account with this email already exists. Please try logging in.';
            } else if (existingUser.username === username) {
                message = 'This username is already taken. Please choose another one.';
            }
            console.log(`Signup attempt failed: ${message}`);
            return res.status(409).json({ message });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create the new user with the username
        const newUser = new User({
            name,
            username, // Save the username
            email,
            password: hashedPassword,
            googleId: null, 
            createdAt: Date.now(),
            lastLoginAt: Date.now()
        });

        await newUser.save();
        console.log(`✅ Traditional user signed up successfully: ${newUser.email}`);
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error('❌ Signup error:', error);
        
        let errorMessage = 'Signup failed. Please try again.';
        let statusCode = 500;

        if (error.code === 11000) {
            errorMessage = 'An account with this email or username already exists.';
            statusCode = 409;
        } else if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
            statusCode = 400;
        }

        res.status(statusCode).json({ message: errorMessage });
    }
});

// --- Traditional Email/Password Login Route ---
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required for login.' });
        }

        const user = await User.findOne({ email: email });
        if (!user || !user.password) { 
            console.log(`Login attempt failed for ${email}: User not found or has no password.`);
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`Login attempt failed for ${email}: Incorrect password.`);
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        user.lastLoginAt = Date.now();
        await user.save();

        const appTokenPayload = { id: user._id, email: user.email, name: user.name };
        const appToken = jwt.sign(appTokenPayload, JWT_SECRET, { expiresIn: '1h' });

        console.log(`✅ Traditional user logged in successfully: ${user.email}`);
        res.status(200).json({ 
            message: 'Login successful!',
            appToken: appToken,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                picture: user.picture, 
                phone: user.phone,
                address: user.address,
            } 
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ message: 'Login failed due to a server error. Please try again.' });
    }
});

// --- Google Sign-In/Signup Route (UPDATED) ---
app.post('/api/auth/google-signin', async (req, res) => {
    try {
        const { token } = req.body;

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });

        const { sub: googleId, name, email, picture } = ticket.getPayload(); 

        let user = await User.findOne({ googleId: googleId });

        // If user exists and has a username, log them in directly
        if (user && user.username) {
            console.log('✅ Returning Google user found by Google ID:', user.email);
            user.lastLoginAt = Date.now();
            await user.save();

            const appTokenPayload = { id: user._id, email: user.email, name: user.name }; 
            const appToken = jwt.sign(appTokenPayload, JWT_SECRET, { expiresIn: '1h' });

            return res.status(200).json({
                message: "Login successful!",
                appToken: appToken, 
                user: { id: user._id, name, email, picture, phone: user.phone, address: user.address }
            });
        }
        
        // If user does not exist by googleId, check by email
        if (!user) {
            user = await User.findOne({ email: email });
            if (user) {
                // This is a traditional user, link their Google ID
                user.googleId = googleId;
                user.picture = picture;
                await user.save();
                console.log(`✅ Linked Google ID to existing user: ${email}`);
                // Since they have a username already, we can log them in
                const appTokenPayload = { id: user._id, email: user.email, name: user.name };
                const appToken = jwt.sign(appTokenPayload, JWT_SECRET, { expiresIn: '1h' });
                return res.status(200).json({ message: "Login successful!", appToken, user });
            }
        }

        // If user is brand new (not found by googleId or email)
        // Or if they are a returning Google user who never set a username
        if (!user || !user.username) {
            // Create a temporary token with Google info
            const tempTokenPayload = { googleId, name, email, picture };
            const tempToken = jwt.sign(tempTokenPayload, JWT_SECRET, { expiresIn: '15m' });

            console.log(`✅ New Google user detected. Prompting for username for email: ${email}`);
            // Send back a response indicating a username is required
            return res.status(202).json({
                message: "Username required to complete registration.",
                usernameRequired: true,
                tempToken: tempToken // Send this temporary token to the client
            });
        }

    } catch (error) {
        console.error("❌ Error in Google sign-in process:", error);
        res.status(500).json({ message: "An unexpected server error occurred." });
    }
});

// ⭐ NEW ENDPOINT: To complete Google signup with a username
app.post('/api/auth/complete-google-signup', async (req, res) => {
    try {
        const { tempToken, username } = req.body;

        if (!tempToken || !username) {
            return res.status(400).json({ message: 'A temporary token and username are required.' });
        }

        // Verify the temporary token
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        const { googleId, name, email, picture } = decoded;

        // Check if username is already taken
        const existingUsername = await User.findOne({ username: username });
        if (existingUsername) {
            return res.status(409).json({ message: 'This username is already taken. Please choose another one.' });
        }

        // Find user by googleId (they might exist from a previous failed attempt)
        let user = await User.findOne({ googleId: googleId });

        if (user) {
            // Update existing user who was missing a username
            user.username = username;
            console.log(`✅ Updating existing Google user with new username: ${username}`);
        } else {
            // Create a brand new user
            user = new User({
                googleId,
                name,
                email,
                picture,
                username,
                createdAt: Date.now(),
            });
            console.log(`✅ Finalizing new Google user with username: ${username}`);
        }
        
        user.lastLoginAt = Date.now();
        await user.save();

        // Now create the final, long-term login token
        const appTokenPayload = { id: user._id, email: user.email, name: user.name };
        const appToken = jwt.sign(appTokenPayload, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            message: "Registration complete! You are now logged in.",
            appToken,
            user: { id: user._id, name, email, picture, phone: user.phone, address: user.address }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
        }
        console.error("❌ Error completing Google signup:", error);
        res.status(500).json({ message: 'An unexpected server error occurred.' });
    }
});


// --- Forgot Password Request Endpoint ---
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required to reset password.' });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      console.warn(`Forgot password request for non-existent email: ${email}`);
      return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expiry = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expiry;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: EMAIL_SERVICE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const resetLink = `http://localhost:5000/reset-password.html?token=${token}`; 

    const mailOptions = {
      to: user.email,
      from: EMAIL_USER,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #0056b3;">Password Reset Request</h2>
            <p>Hello ${user.name || user.email},</p>
            <p>You are receiving this email because we received a password reset request for your account.</p>
            <p>Please click on the button below to reset your password:</p>
            <p style="text-align: center; margin: 20px 0;">
                <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
            </p>
            <p>This link will expire in 1 hour. If you do not reset your password within this time, you will need to submit another request.</p>
            <p>If you did not request a password reset, please ignore this email or reply to let us know. Your password will remain unchanged.</p>
            <p>Thank you,</p>
            <p>Your App Team</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.8em; color: #777;">If you're having trouble clicking the "Reset Your Password" button, copy and paste the URL below into your web browser:</p>
            <p style="font-size: 0.8em; color: #777; word-break: break-all;">${resetLink}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to: ${user.email}`);
    res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ message: 'Error processing your request. Please try again later.' });
  }
});

// Endpoint to handle password reset (when user submits new password)
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            console.warn(`Password reset attempt with invalid or expired token: ${token}`);
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.lastLoginAt = Date.now();
        await user.save();

        console.log(`✅ Password successfully reset for user: ${user.email}`);
        res.status(200).json({ message: 'Your password has been successfully reset. You can now log in.' });

    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({ message: 'Error resetting password. Please try again later.' });
    }
});


// --- Protected Route: Fetch User Profile ---
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userProfile = await User.findById(req.user.id); 
        if (!userProfile) {
            return res.status(404).json({ message: "User not found in database." });
        }
        
        res.json({
            message: "User profile data retrieved successfully.",
            user: {
                id: userProfile._id,
                name: userProfile.name,
                email: userProfile.email,
                picture: userProfile.picture,
                phone: userProfile.phone,
                address: userProfile.address,
                lastLoginAt: userProfile.lastLoginAt,
                createdAt: userProfile.createdAt
            }
        });
    } catch (error) {
        console.error("❌ Error fetching user profile:", error);
        res.status(500).json({ message: "Server error fetching profile." });
    }
});

// --- Protected Route: Update User Profile ---
app.put('/api/profile', authenticateToken, async (req, res) => {
    const { name, phone, address } = req.body;

    try {
        const user = await User.findById(req.user.id); 
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (name !== undefined) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;

        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture,
                phone: user.phone,
                address: user.address,
                lastLoginAt: user.lastLoginAt
            }
        });
    } catch (error) {
        console.error('❌ Error updating user profile:', error);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});


// --- 5. START THE SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`Access the server at: http://localhost:${PORT}`);
});
