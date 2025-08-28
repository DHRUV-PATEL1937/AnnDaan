// Simple mock server for testing without MongoDB
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";

// Middleware
app.use(cors({
  origin: ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.use(express.static(path.join(__dirname, "../")));

// Mock database
let users = [];
let donations = [];

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Your session is invalid. Please log in again." });
    }
    req.user = user;
    next();
  });
}

// Role-based access control
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }

    next();
  };
}

// Routes
app.get("/", (req, res) => {
  res.send("Mock FoodLink Server is running!");
});

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    // Validate role
    const validRoles = ["user", "ngo", "rider"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role specified." });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: "User with this email or username already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      id: Date.now().toString(),
      name,
      username,
      email,
      password: hashedPassword,
      role,
      isEmailVerified: true, // Skip email verification for testing
      createdAt: new Date(),
      lastLoginAt: new Date()
    };

    users.push(newUser);

    res.status(201).json({
      message: "User created successfully!",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error during signup." });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Update last login
    user.lastLoginAt = new Date();

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error during login." });
  }
});

// Dashboard routes
app.get("/api/user/dashboard", authenticateToken, requireRole(["user"]), (req, res) => {
  res.json({
    message: "Welcome to your donator dashboard!",
    user: req.user,
    stats: {
      totalDonations: donations.filter(d => d.userId === req.user.id).length,
      totalMeals: 150,
      totalNGOs: 5,
      totalRiders: 12
    }
  });
});

app.get("/api/ngo/dashboard", authenticateToken, requireRole(["ngo"]), (req, res) => {
  res.json({
    message: "Welcome to your NGO dashboard!",
    user: req.user,
    stats: {
      totalRequests: 25,
      activeDonations: 8,
      completedDeliveries: 47
    }
  });
});

app.get("/api/rider/dashboard", authenticateToken, requireRole(["rider"]), (req, res) => {
  res.json({
    message: "Welcome to your rider dashboard!",
    user: req.user,
    stats: {
      totalDeliveries: 32,
      activeOrders: 3,
      earnings: 2400
    }
  });
});

// Donations
app.post("/api/donations", authenticateToken, requireRole(["user", "ngo"]), async (req, res) => {
  try {
    const { foodType, quantity, diet, source, description, address, date, time } = req.body;

    const newDonation = {
      id: 'D-' + Date.now(),
      userId: req.user.id,
      userEmail: req.user.email,
      foodType,
      quantity,
      diet,
      source,
      description,
      address,
      date,
      time,
      status: 'available',
      createdAt: new Date()
    };

    donations.push(newDonation);

    res.status(201).json({
      message: "Donation created successfully!",
      donation: newDonation
    });
  } catch (error) {
    console.error("Error creating donation:", error);
    res.status(500).json({ message: "Failed to create donation due to a server error." });
  }
});

app.get("/api/donations", authenticateToken, async (req, res) => {
  try {
    let filteredDonations = donations;

    // Filter based on user role
    if (req.user.role === "user") {
      // Users see only their own donations
      filteredDonations = donations.filter(d => d.userId === req.user.id);
    }
    // NGOs and riders see all available donations

    res.json({
      message: "Donations retrieved successfully",
      donations: filteredDonations
    });
  } catch (error) {
    console.error("Error fetching donations:", error);
    res.status(500).json({ message: "Failed to fetch donations due to a server error." });
  }
});

// Google OAuth endpoint (mock/disabled)
app.post("/api/auth/google-signin", async (req, res) => {
  try {
    res.status(400).json({ 
      message: "Google Sign-In is currently disabled. Please use email/password login instead.",
      error: "GOOGLE_OAUTH_DISABLED"
    });
  } catch (error) {
    res.status(500).json({ message: "Google Sign-In error." });
  }
});

// Logout
app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ message: "Logout failed." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock FoodLink Server is running on http://localhost:${PORT}`);
  console.log(`📊 Supported user roles: User, NGO, Rider`);
  console.log(`🗄️ Using mock in-memory database for testing`);
});