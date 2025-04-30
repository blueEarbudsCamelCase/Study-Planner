const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000; // Use the environment's port or default to 3000

app.use(cors()); // Enable CORS for all routes

// Proxy route for fetching iCal feed
app.get("/proxy", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send("Missing 'url' query parameter.");
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch iCal feed: ${response.statusText}`);
    }

    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error("Error fetching iCal feed:", error);
    res.status(500).send("Failed to fetch iCal feed.");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});