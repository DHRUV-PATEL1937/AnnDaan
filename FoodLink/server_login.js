// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
// --- 1. SERVER SETUP ---
const app = express();
const PORT = process.env.PORT || 5000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/anndan";
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (
  !GOOGLE_CLIENT_ID ||
  !JWT_SECRET ||
  !MONGO_URI ||
  !EMAIL_USER ||
  !EMAIL_PASS
) {
  console.error(
    "CRITICAL ERROR: Ensure GOOGLE_CLIENT_ID, JWT_SECRET, MONGO_URI, EMAIL_USER, and EMAIL_PASS are set in .env"
  );
  process.exit(1);
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const User = require("./models/User");
const Donation = require("./models/Donations");

// --- 2. DATABASE CONNECTION ---
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully!"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ⭐ --- FIXED AUTHENTICATION MIDDLEWARE --- ⭐
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.status(401).json({ message: "Authentication token is required." });
  }


  jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        // ⭐ CHANGE: Send a specific error code for expired tokens
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'TokenExpiredError', message: 'Your session has expired.' });
        }
        return res.status(403).json({ message: "Your session is invalid. Please log in again." });
      }
      req.user = user;
      next();
});

}
// --- 4. API ENDPOINTS ---

app.get("/", (req, res) => {
  res.send("Server is up and running! Welcome to the authentication API.");
});

// --- Traditional Email/Password Signup Route (UPDATED) ---
app.post("/signup", async (req, res) => {
  try {
    // Destructure username from the request body
    const { name, username, email, password } = req.body;

    // Validate all required fields
    if (!name || !username || !email || !password) {
      return res
        .status(400)
        .json({
          message: "Full name, username, email, and password are required.",
        });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }
    if (username.length < 3) {
      return res
        .status(400)
        .json({ message: "Username must be at least 3 characters long." });
    }

    // Check if either the email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email: email }, { username: username }],
    });
    if (existingUser) {
      let message = "An account with this email or username already exists.";
      if (existingUser.email === email) {
        message =
          "An account with this email already exists. Please try logging in.";
      } else if (existingUser.username === username) {
        message = "This username is already taken. Please choose another one.";
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
      lastLoginAt: Date.now(),
    });

    await newUser.save();
    console.log(`✅ Traditional user signed up successfully: ${newUser.email}`);
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("❌ Signup error:", error);

    let errorMessage = "Signup failed. Please try again.";
    let statusCode = 500;

    if (error.code === 11000) {
      errorMessage = "An account with this email or username already exists.";
      statusCode = 409;
    } else if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      errorMessage = `Validation failed: ${validationErrors.join(", ")}`;
      statusCode = 400;
    }

    res.status(statusCode).json({ message: errorMessage });
  }
});

// --- Traditional Email/Password Login Route ---
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email });
    if (!user || !user.password) {
      return res
        .status(400)
        .json({
          message: "Invalid credentials or user signed up with Google.",
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    user.lastLoginAt = Date.now();
    await user.save();

    const appTokenPayload = {
      id: user._id,
      email: user.email,
      name: user.name,
    };
    // ⭐ CHANGE: Issue two tokens and save the refresh token
    // ⭐ CHANGE: Issue two tokens and save the refresh token
    const accessToken = jwt.sign(appTokenPayload, JWT_SECRET, { expiresIn: '15m' }); // Short-lived
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' }); // Long-lived

    // Save the refresh token to the database
    user.refreshToken = refreshToken;
    await user.save();

    console.log(`✅ Traditional user logged in successfully: ${user.email}`);
    res.status(200).json({
        message: "Login successful!",
        accessToken: accessToken,  // Send both tokens
        refreshToken: refreshToken,
        user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Login failed due to a server error." });
  }
});

// --- Google Sign-In/Signup Route (UPDATED) ---
app.post("/api/auth/google-signin", async (req, res) => {
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
      console.log("✅ Returning Google user found by Google ID:", user.email);
      user.lastLoginAt = Date.now();
      await user.save();

      const appTokenPayload = {
        id: user._id,
        email: user.email,
        name: user.name,
      };
      const appToken = jwt.sign(appTokenPayload, JWT_SECRET, {
        expiresIn: "8h",
      });

      return res.status(200).json({
        message: "Login successful!",
        appToken: appToken,
        user: {
          id: user._id,
          name,
          email,
          picture,
          phone: user.phone,
          address: user.address,
        },
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
        const appTokenPayload = {
          id: user._id,
          email: user.email,
          name: user.name,
        };
        // ⭐ CHANGE: Issue two tokens and save the refresh token
    const accessToken = jwt.sign(appTokenPayload, JWT_SECRET, { expiresIn: '15m' }); // Short-lived
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' }); // Long-lived

    // Save the refresh token to the database
    user.refreshToken = refreshToken;
    await user.save();

    console.log(`✅ Traditional user logged in successfully: ${user.email}`);
    res.status(200).json({
        message: "Login successful!",
        accessToken: accessToken,  // Send both tokens
        refreshToken: refreshToken,
        user: { id: user._id, name: user.name, email: user.email },
    });
      }
    }

    // If user is brand new (not found by googleId or email)
    // Or if they are a returning Google user who never set a username
    if (!user || !user.username) {
      // Create a temporary token with Google info
      const tempTokenPayload = { googleId, name, email, picture };
      const tempToken = jwt.sign(tempTokenPayload, JWT_SECRET, {
        expiresIn: "15m",
      });

      console.log(
        `✅ New Google user detected. Prompting for username for email: ${email}`
      );
      // Send back a response indicating a username is required
      return res.status(202).json({
        message: "Username required to complete registration.",
        usernameRequired: true,
        tempToken: tempToken, // Send this temporary token to the client
      });
    }
  } catch (error) {
    console.error("❌ Error in Google sign-in process:", error);
    res.status(500).json({ message: "An unexpected server error occurred." });
  }
});

// ⭐ NEW ENDPOINT: To complete Google signup with a username
app.post("/api/auth/complete-google-signup", async (req, res) => {
  try {
    const { tempToken, username } = req.body;

    if (!tempToken || !username) {
      return res
        .status(400)
        .json({ message: "A temporary token and username are required." });
    }

    // Verify the temporary token
    const decoded = jwt.verify(tempToken, JWT_SECRET);
    const { googleId, name, email, picture } = decoded;

    // Check if username is already taken
    const existingUsername = await User.findOne({ username: username });
    if (existingUsername) {
      return res
        .status(409)
        .json({
          message: "This username is already taken. Please choose another one.",
        });
    }

    // Find user by googleId (they might exist from a previous failed attempt)
    let user = await User.findOne({ googleId: googleId });

    if (user) {
      // Update existing user who was missing a username
      user.username = username;
      console.log(
        `✅ Updating existing Google user with new username: ${username}`
      );
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
    const appTokenPayload = {
      id: user._id,
      email: user.email,
      name: user.name,
    };
    // ⭐ CHANGE: Issue two tokens and save the refresh token
    const accessToken = jwt.sign(appTokenPayload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
        message: "Registration complete! You are now logged in.",
        accessToken,
        refreshToken,
      user: {
        id: user._id,
        name,
        email,
        picture,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({ message: "Your session has expired. Please sign in again." });
    }
    console.error("❌ Error completing Google signup:", error);
    res.status(500).json({ message: "An unexpected server error occurred." });
  }
});

// --- Forgot Password Request Endpoint ---
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });

    // *** KEY CHANGE IS HERE ***
    // If user does not exist, return a 404 error.
    if (!user) {
      console.warn(`Forgot password attempt for non-existent email: ${email}`);
      return res
        .status(404)
        .json({ message: "An account with this email does not exist." });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 600000; // 10 minutes from now

    user.resetPasswordToken = otp;
    user.resetPasswordExpires = expiry;
    await user.save();

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      service: EMAIL_SERVICE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    const mailOptions = {
      to: user.email,
      from: `Your App Name <${EMAIL_USER}>`,
      subject: "Your Password Reset OTP",
      html: `<p>Your One-Time Password (OTP) to reset your password is: <strong>${otp}</strong></p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset OTP sent to: ${user.email}`);
    // Send a success message confirming that the OTP was sent.
    res
      .status(200)
      .json({ message: "An OTP has been sent to your email address." });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res
      .status(500)
      .json({
        message: "Error processing your request. Please try again later.",
      });
  }
});

// 2. Reset Password with OTP
app.post("/api/auth/reset-with-otp", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, OTP, and new password are required." });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: "Invalid request." });
    }

    if (
      user.resetPasswordToken !== otp ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res
        .status(400)
        .json({ message: "OTP is invalid or has expired." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ Password successfully reset for user: ${user.email}`);
    res
      .status(200)
      .json({ message: "Your password has been successfully updated." });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Error resetting password." });
  }
});

// --- PROTECTED USER PROFILE ROUTES ---

// Fetch User Profile
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    // req.user is populated by the authenticateToken middleware
    const userProfile = await User.findById(req.user.id).select("-password"); // Exclude password from result
    if (!userProfile) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ user: userProfile });
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    res.status(500).json({ message: "Server error fetching profile." });
  }
});

// Update User Profile
app.put("/api/profile", authenticateToken, async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update fields if they are provided in the request
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    const updatedUser = await user.save();

    const userResponse = { ...updatedUser.toObject() };
    delete userResponse.password; // Ensure password is not sent back

    res.status(200).json({
      message: "Profile updated successfully!",
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    res.status(500).json({ message: "Server error updating profile." });
  }
});


// ⭐ ======================================================
// ⭐ NEW: DONATION API ENDPOINTS
// ⭐ ======================================================

/**
 * @route   POST /api/donations
 * @desc    Create a new food donation listing
 * @access  Private (requires authentication)
 */
app.post("/api/donations", authenticateToken, async (req, res) => {
    try {
        const {
            donorName,
            contactNumber,
            address,
            foodType,
            quantity,
            notes,
            pickupTime,
            cookedTime,
            shelfLifeHours
        } = req.body;

        // --- Expiry Calculation (Critical Server-Side Logic) ---
        const cookedDateTime = new Date(cookedTime);
        const expiryDateTime = new Date(cookedDateTime.getTime() + shelfLifeHours * 60 * 60 * 1000);

        const newDonation = new Donation({
            donorId: req.user.id, // Get the user ID from the authenticated token
            donorName,
            contactNumber,
            address,
            foodType,
            quantity,
            notes,
            pickupTime,
            cookedTime,
            shelfLifeHours,
            expiryDateTime // Store the calculated expiry time
        });

        await newDonation.save();

        console.log(`✅ New donation created by user: ${req.user.email}`);
        res.status(201).json({ message: "Donation listed successfully!", donation: newDonation });

    } catch (error) {
        console.error("❌ Error creating donation:", error);
        res.status(500).json({ message: "Failed to list donation due to a server error." });
    }
});


/**
 * @route   GET /api/donations
 * @desc    Get all available food donation listings
 * @access  Public
 */
app.get("/api/donations", async (req, res) => {
    try {
        // Find donations that are 'available' and sort by creation date (newest first)
        const availableDonations = await Donation.find({ status: 'available' }).sort({ createdAt: -1 });
        
        res.status(200).json(availableDonations);

    } catch (error) {
        console.error("❌ Error fetching donations:", error);
        res.status(500).json({ message: "Failed to fetch donations due to a server error." });
    }
});

// ⭐ NEW: Refresh Token Endpoint
app.post("/api/auth/refresh-token", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ message: "Invalid refresh token." });
        }

        const newAccessToken = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
        res.json({ accessToken: newAccessToken });

    } catch (error) {
        return res.status(403).json({ message: "Invalid refresh token." });
    }
});

// ⭐ NEW: Logout Endpoint
app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            user.refreshToken = null; // Invalidate the refresh token
            await user.save();
        }
        res.status(200).json({ message: "Logged out successfully." });
    } catch (error) {
        res.status(500).json({ message: "Logout failed." });
    }
});

// --- 5. START THE SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});


// ⭐ ======================================================
// ⭐ NEW: SCHEDULED TASK TO HANDLE EXPIRY
// ⭐ ======================================================

/**
 * This cron job runs every 5 minutes.
 * It queries the database for 'available' donations and checks if their
 * expiry time has passed. If so, it updates their status to 'expired'.
 */
cron.schedule('*/5 * * * *', async () => {
    console.log(`\n⚙️  Running scheduled expiry check at ${new Date().toLocaleString()}`);
    
    try {
        const now = new Date();
        
        // Find all donations that are currently 'available' and whose expiryDateTime is in the past.
        const result = await Donation.updateMany(
            { 
                status: 'available', 
                expiryDateTime: { $lt: now } 
            },
            { 
                $set: { status: 'expired' } 
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`   - ❌ Marked ${result.modifiedCount} donation(s) as EXPIRED.`);
        } else {
            console.log("   - No available donations have expired.");
        }
    } catch (error) {
        console.error("   - ❌ Error during scheduled expiry check:", error);
    }
});
