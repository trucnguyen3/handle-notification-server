const express = require("express");
const fs = require("fs");
const apn = require("apn");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const DEVICE_TOKENS = new Set(); // In-memory token storage (use DB in production)

// Serve website.json
app.get("/push/website.json", (req, res) => {
  console.log("[LOG] website.json was requested by:", req.headers['user-agent']);
  res.sendFile(path.join(__dirname, "public", "push", "website.json"));
});

// Register device token
app.post("/push/register", (req, res) => {
  const { deviceToken } = req.body;
  if (!deviceToken) {
    console.warn("[WARN] Missing deviceToken in /push/register");
    return res.status(400).send("Missing deviceToken");
  }

  DEVICE_TOKENS.add(deviceToken);
  console.log("Registered device:", deviceToken);
  res.sendStatus(200);
});

// Send a test push
app.post("/push/send", async (req, res) => {
  const { message } = req.body;

  if (DEVICE_TOKENS.size === 0) return res.status(400).send("No devices registered");

  const provider = new apn.Provider({
    cert: path.join(__dirname, "certs/cert.pem"),
    key: path.join(__dirname, "certs/key.pem"),
    production: true,
  });

  const note = new apn.Notification({
    alert: message || "Hello from Safari Push!",
    topic: "web.com.example.push",
    payload: { messageFrom: "Your Website" },
    urlArgs: ["test", "push"],
    expiry: Math.floor(Date.now() / 1000) + 3600
  });

  const tokensArray = Array.from(DEVICE_TOKENS);
  const result = await provider.send(note, tokensArray);

  console.log("Sent:", result.sent.length);
  console.log("Failed:", result.failed.length);

  provider.shutdown();
  res.json({ sent: result.sent.length, failed: result.failed });
});

app.use(express.static('public'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});


//openssl pkcs12 -in Certificates.p12 -out cert.pem -nocerts -provider-path "C:\Program Files\OpenSSL-Win64\bin" -legacy