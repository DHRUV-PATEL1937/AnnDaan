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
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/foodlink";
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

// ⭐ --- UPDATED AUTHENTICATION MIDDLEWARE WITH ROLE SUPPORT --- ⭐
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res
      .status(401)
      .json({ message: "Authentication token is required." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(403).json({
          error: "TokenExpiredError",
          message: "Your session has expired.",
        });
      }
      return res
        .status(403)
        .json({ message: "Your session is invalid. Please log in again." });
    }
    req.user = user;
    next();
  });
}

// ⭐ --- NEW: ROLE-BASED ACCESS CONTROL MIDDLEWARE --- ⭐
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied. Insufficient permissions." });
    }

    next();
  };
}

// --- 4. API ENDPOINTS ---

app.get("/", (req, res) => {
  res.send(
    "Server is up and running! Welcome to the multi-role authentication API."
  );
});

// ⭐ --- UPDATED SIGNUP ROUTE WITH ROLE SELECTION --- ⭐
app.post("/signup", async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    // Validate role
    const validRoles = ["user", "ngo", "rider"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        message: "Please select a valid role: user, ngo, or rider.",
      });
    }

    if (!name || !username || !email || !password || password.length < 6) {
      return res.status(400).json({
        message:
          "All fields are required and password must be at least 6 characters.",
      });
    }

    // Check if a VERIFIED user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email }, { username: username }],
      isEmailVerified: true,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email or username already exists.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a temporary registration token with role
    const registrationPayload = {
      name,
      username,
      email,
      password: hashedPassword,
      role,
      otp,
    };
    const registrationToken = jwt.sign(registrationPayload, JWT_SECRET, {
      expiresIn: "15m",
    });

    // Send the OTP email
    const transporter = nodemailer.createTransporter({
      service: EMAIL_SERVICE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    const roleDisplayName =
      role === "user" ? "User" : role === "ngo" ? "NGO" : "Rider";

    const mailOptions = {
      to: email,
      from: `FoodLink <${EMAIL_USER}>`,
      subject: "Verify Your Email Address for FoodLink",
      html: `
                <p>Welcome to FoodLink as a <strong>${roleDisplayName}</strong>!</p>
                <p>Your One-Time Password (OTP) for email verification is: <strong>${otp}</strong></p>
                <p>It will expire in 15 minutes.</p>
            `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification OTP sent to: ${email} (Role: ${role})`);

    res.status(200).json({
      message: "A verification OTP has been sent to your email.",
      registrationToken: registrationToken,
      role: role,
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ message: "An error occurred during signup." });
  }
});

// ⭐ --- UPDATED OTP VERIFICATION WITH ROLE --- ⭐
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { otp, registrationToken } = req.body;
    if (!otp || !registrationToken) {
      return res
        .status(400)
        .json({ message: "OTP and registration token are required." });
    }

    let decodedPayload;
    try {
      decodedPayload = jwt.verify(registrationToken, JWT_SECRET);
    } catch (error) {
      return res.status(400).json({
        message:
          "The verification link is invalid or has expired. Please sign up again.",
      });
    }

    if (decodedPayload.otp !== otp) {
      return res.status(400).json({ message: "The OTP is incorrect." });
    }

    const { name, username, email, password, role } = decodedPayload;

    const existingUser = await User.findOne({
      $or: [{ email: email }, { username: username }],
      isEmailVerified: true,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email or username already exists.",
      });
    }

    // Create and save the user with role
    const newUser = new User({
      name,
      username,
      email,
      password,
      role, // Add role to user
      isEmailVerified: true,
      lastLoginAt: Date.now(),
    });

    // Generate tokens with role information
    const accessToken = jwt.sign(
      {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        id: newUser._id,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    newUser.refreshToken = refreshToken;
    await newUser.save();

    console.log(
      `✅ ${role.toUpperCase()} user registered successfully: ${email}`
    );

    // Determine dashboard URL based on role
    const dashboardUrl = getDashboardUrl(role);

    res.status(201).json({
      message: "Account verified and created successfully!",
      accessToken,
      refreshToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      dashboardUrl,
    });
  } catch (error) {
    console.error("❌ OTP verification error:", error);
    res.status(500).json({ message: "An error occurred during verification." });
  }
});

// ⭐ --- UPDATED LOGIN ROUTE WITH ROLE-BASED DASHBOARD REDIRECT --- ⭐
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
      return res.status(400).json({
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
      role: user.role, // Include role in token
    };

    const accessToken = jwt.sign(appTokenPayload, JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    user.refreshToken = refreshToken;
    await user.save();

    const dashboardUrl = getDashboardUrl(user.role);

    console.log(
      `✅ ${user.role?.toUpperCase() || "USER"} logged in successfully: ${
        user.email
      }`
    );

    res.status(200).json({
      message: "Login successful!",
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
      },
      dashboardUrl,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Login failed due to a server error." });
  }
});

// ⭐ --- HELPER FUNCTION FOR DASHBOARD URLS --- ⭐
function getDashboardUrl(role) {
  switch (role) {
    case "ngo":
      return "/ngo-dashboard";
    case "rider":
      return "/rider-dashboard";
    case "user":
    default:
      return "/user-dashboard";
  }
}

// ⭐ --- UPDATED GOOGLE SIGN-IN WITH ROLE SELECTION --- ⭐
app.post("/api/auth/google-signin", async (req, res) => {
  try {
    const { token, role } = req.body; // Include role in request

    // Validate role if provided
    const validRoles = ["user", "ngo", "rider"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        message: "Please select a valid role: user, ngo, or rider.",
      });
    }

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
        role: user.role,
      };

      const accessToken = jwt.sign(appTokenPayload, JWT_SECRET, {
        expiresIn: "15m",
      });
      const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      user.refreshToken = refreshToken;
      await user.save();

      const dashboardUrl = getDashboardUrl(user.role);

      return res.status(200).json({
        message: "Login successful!",
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          name,
          email,
          role: user.role,
          picture,
          phone: user.phone,
          address: user.address,
        },
        dashboardUrl,
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

        const appTokenPayload = {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        };

        const accessToken = jwt.sign(appTokenPayload, JWT_SECRET, {
          expiresIn: "15m",
        });
        const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, {
          expiresIn: "7d",
        });

        user.refreshToken = refreshToken;
        await user.save();

        const dashboardUrl = getDashboardUrl(user.role);

        return res.status(200).json({
          message: "Login successful!",
          accessToken: accessToken,
          refreshToken: refreshToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          dashboardUrl,
        });
      }
    }

    // If user is brand new or returning Google user who never set a username
    if (!user || !user.username) {
      // Create a temporary token with Google info and role
      const tempTokenPayload = { googleId, name, email, picture, role };
      const tempToken = jwt.sign(tempTokenPayload, JWT_SECRET, {
        expiresIn: "15m",
      });

      console.log(
        `✅ New Google user detected. Prompting for username for email: ${email}`
      );

      return res.status(202).json({
        message: "Username required to complete registration.",
        usernameRequired: true,
        tempToken: tempToken,
        role: role,
      });
    }
  } catch (error) {
    console.error("❌ Error in Google sign-in process:", error);
    res.status(500).json({ message: "An unexpected server error occurred." });
  }
});

// ⭐ UPDATED: Complete Google signup with username and role
app.post("/api/auth/complete-google-signup", async (req, res) => {
  try {
    const { tempToken, username, role } = req.body;

    if (!tempToken || !username) {
      return res.status(400).json({
        message: "A temporary token and username are required.",
      });
    }

    // Validate role
    const validRoles = ["user", "ngo", "rider"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        message: "Please select a valid role: user, ngo, or rider.",
      });
    }

    const decoded = jwt.verify(tempToken, JWT_SECRET);
    const { googleId, name, email, picture } = decoded;
    const userRole = role || decoded.role || "user"; // Use provided role or default

    // Check if username is already taken
    const existingUsername = await User.findOne({ username: username });
    if (existingUsername) {
      return res.status(409).json({
        message: "This username is already taken. Please choose another one.",
      });
    }

    let user = await User.findOne({ googleId: googleId });

    if (user) {
      user.username = username;
      user.role = userRole; // Set role
      console.log(
        `✅ Updating existing Google user with username: ${username}, role: ${userRole}`
      );
    } else {
      user = new User({
        googleId,
        name,
        email,
        picture,
        username,
        role: userRole,
        createdAt: Date.now(),
      });
      console.log(
        `✅ Creating new Google user with username: ${username}, role: ${userRole}`
      );
    }

    user.lastLoginAt = Date.now();
    await user.save();

    const appTokenPayload = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = jwt.sign(appTokenPayload, JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });
    user.refreshToken = refreshToken;
    await user.save();

    const dashboardUrl = getDashboardUrl(user.role);

    res.status(201).json({
      message: "Registration complete! You are now logged in.",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name,
        email,
        role: user.role,
        picture,
        phone: user.phone,
        address: user.address,
      },
      dashboardUrl,
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Your session has expired. Please sign in again.",
      });
    }
    console.error("❌ Error completing Google signup:", error);
    res.status(500).json({ message: "An unexpected server error occurred." });
  }
});

// --- EXISTING FORGOT PASSWORD AND RESET ENDPOINTS (NO CHANGES NEEDED) ---
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.warn(`Forgot password attempt for non-existent email: ${email}`);
      return res.status(404).json({
        message: "An account with this email does not exist.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 600000; // 10 minutes from now

    user.resetPasswordToken = otp;
    user.resetPasswordExpires = expiry;
    await user.save();

    const transporter = nodemailer.createTransporter({
      service: EMAIL_SERVICE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    const mailOptions = {
      to: user.email,
      from: `FoodLink <${EMAIL_USER}>`,
      subject: "Your Password Reset OTP",
      html: `<p>Your One-Time Password (OTP) to reset your password is: <strong>${otp}</strong></p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset OTP sent to: ${user.email}`);
    res.status(200).json({
      message: "An OTP has been sent to your email address.",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({
      message: "Error processing your request. Please try again later.",
    });
  }
});

app.post("/api/auth/reset-with-otp", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "Email, OTP, and new password are required.",
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: "Invalid request." });
    }

    if (
      user.resetPasswordToken !== otp ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res.status(400).json({
        message: "OTP is invalid or has expired.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ Password successfully reset for user: ${user.email}`);
    res.status(200).json({
      message: "Your password has been successfully updated.",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Error resetting password." });
  }
});

// ⭐ --- ROLE-SPECIFIC PROTECTED ROUTES --- ⭐

// User Dashboard Route
app.get(
  "/api/user/dashboard",
  authenticateToken,
  requireRole(["user"]),
  (req, res) => {
    res.json({
      message: "Welcome to the User Dashboard!",
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      dashboardData: {
        availableDonations: "Access to browse and request donations",
        features: ["Browse food donations", "Request pickup", "Track requests"],
      },
    });
  }
);

// NGO Dashboard Route
app.get(
  "/api/ngo/dashboard",
  authenticateToken,
  requireRole(["ngo"]),
  (req, res) => {
    res.json({
      message: "Welcome to the NGO Dashboard!",
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      dashboardData: {
        manageDonations: "Manage donation requests and distributions",
        features: [
          "View all donations",
          "Manage beneficiaries",
          "Track distributions",
          "Generate reports",
        ],
      },
    });
  }
);

// Rider Dashboard Route
app.get(
  "/api/rider/dashboard",
  authenticateToken,
  requireRole(["rider"]),
  (req, res) => {
    res.json({
      message: "Welcome to the Rider Dashboard!",
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      dashboardData: {
        pickupRequests: "View and manage pickup requests",
        features: [
          "View pickup requests",
          "Update delivery status",
          "Track routes",
          "Earnings summary",
        ],
      },
    });
  }
);

// --- UPDATED PROFILE ROUTES ---
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const userProfile = await User.findById(req.user.id).select("-password");
    if (!userProfile) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ user: userProfile });
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    res.status(500).json({ message: "Server error fetching profile." });
  }
});

app.put("/api/profile", authenticateToken, async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    const updatedUser = await user.save();
    const userResponse = { ...updatedUser.toObject() };
    delete userResponse.password;

    res.status(200).json({
      message: "Profile updated successfully!",
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    res.status(500).json({ message: "Server error updating profile." });
  }
});

// ⭐ --- ROLE-SPECIFIC DONATION ENDPOINTS --- ⭐

// Create donation (Users and NGOs can create donations)
app.post(
  "/api/donations",
  authenticateToken,
  requireRole(["user", "ngo"]),
  async (req, res) => {
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
        shelfLifeHours,
      } = req.body;

      const cookedDateTime = new Date(cookedTime);
      const expiryDateTime = new Date(
        cookedDateTime.getTime() + shelfLifeHours * 60 * 60 * 1000
      );

      const newDonation = new Donation({
        donorId: req.user.id,
        donorName,
        contactNumber,
        address,
        foodType,
        quantity,
        notes,
        pickupTime,
        cookedTime,
        shelfLifeHours,
        expiryDateTime,
      });

      await newDonation.save();

      console.log(
        `✅ New donation created by ${req.user.role}: ${req.user.email}`
      );
      res.status(201).json({
        message: "Donation listed successfully!",
        donation: newDonation,
      });
    } catch (error) {
      console.error("❌ Error creating donation:", error);
      res.status(500).json({
        message: "Failed to list donation due to a server error.",
      });
    }
  }
);

// Get donations (All roles can view, but with different permissions)
app.get("/api/donations", authenticateToken, async (req, res) => {
  try {
    let query = { status: "available" };

    // NGOs can see all donations, users see only available ones
    if (req.user.role === "ngo") {
      query = {}; // NGOs can see all donations regardless of status
    }

    const donations = await Donation.find(query).sort({ createdAt: -1 });
    res.status(200).json(donations);
  } catch (error) {
    console.error("❌ Error fetching donations:", error);
    res.status(500).json({
      message: "Failed to fetch donations due to a server error.",
    });
  }
});

// Rider-specific route to get pickup requests
app.get(
  "/api/rider/pickup-requests",
  authenticateToken,
  requireRole(["rider"]),
  async (req, res) => {
    try {
      // Find donations that need pickup (you might want to add a 'pickup_requested' status)
      const pickupRequests = await Donation.find({
        status: { $in: ["available", "pickup_requested"] },
      }).sort({ createdAt: -1 });

      res.status(200).json({
        message: "Pickup requests retrieved successfully",
        requests: pickupRequests,
      });
    } catch (error) {
      console.error("❌ Error fetching pickup requests:", error);
      res.status(500).json({
        message: "Failed to fetch pickup requests due to a server error.",
      });
    }
  }
);

// --- TOKEN REFRESH AND LOGOUT (UPDATED WITH ROLE) ---
app.post("/api/auth/refresh-token", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({ message: "Invalid refresh token." });
  }
});

app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = null;
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
  console.log(`📊 Supported user roles: User, NGO, Rider`);
});

// --- SCHEDULED TASK FOR EXPIRY (NO CHANGES NEEDED) ---
cron.schedule("*/5 * * * *", async () => {
  console.log(
    `\n  Running scheduled expiry check at ${new Date().toLocaleString()}`
  );

  try {
    const now = new Date();

    // Find all donations that are currently 'available' and whose expiryDateTime is in the past.
    const result = await Donation.updateMany(
      {
        status: "available",
        expiryDateTime: { $lt: now },
      },
      {
        $set: { status: "expired" },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `   - ❌ Marked ${result.modifiedCount} donation(s) as EXPIRED.`
      );
    } else {
      console.log("   - No available donations have expired.");
    }
  } catch (error) {
    console.error("   - ❌ Error during scheduled expiry check:", error);
  }
});
