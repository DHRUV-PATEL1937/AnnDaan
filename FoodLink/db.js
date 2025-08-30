// db.js

const mongoose = require("mongoose");

// IMPORTANT: Replace this with your actual MongoDB connection string.
// You can get a free one from MongoDB Atlas.
const MONGO_URI =
  "mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected Successfully!");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
