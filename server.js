const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// Serve static files with cache headers
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }
}));

// Proxy route for fetching iCal feed
app.get("/proxy", async (req, res) => {
  const url = req.query.url;

  // Only allow URLs from canvas.na.oneschoolglobal.com
  const allowedDomain = "canvas.oneschoolglobal.com";
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== allowedDomain) {
      return res.status(403).send("Forbidden: Domain not allowed.");
    }
  } catch (e) {
    return res.status(400).send("Invalid URL.");
  }

  if (!url) {
    return res.status(400).send("Missing 'url' query parameter.");
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.statusText}`);
    }

    const data = await response.blob();
    res.type(data.type);
    res.send(Buffer.from(await data.arrayBuffer()));
  } catch (error) {
    console.error("Error fetching iCal feed: ", error);
    res.status(500).send("Failed to fetch iCal feed: " + error);
  }
});

// Catch-all route to serve the frontend for any other request
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
