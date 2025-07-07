const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const userId = crypto.randomUUID();
const client = new Client({
  authStrategy: new LocalAuth({ clientId: userId }),
  puppeteer: {
    headless: true,
    // executablePath:
    //   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
     args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu"
    ]
  },
});

let qrData = null;
let ready = false;

client.on("qr", (qr) => {
  console.log("QR RECEIVED, scan it with your phone");
  qrData = qr;
  ready = false;
});

client.on("ready", () => {
  console.log("WhatsApp client is ready!");
  ready = true;
  qrData = null;
});

client.on("auth_failure", (msg) => {
  console.error("AUTHENTICATION FAILURE", msg);
});

client.initialize();

/**
 * GET /register
 * Returns a data‭URL containing the QR code image.
 * If already authenticated, returns status "already_authorized".
 */
const clients = {};

app.get("/register/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!clients[userId]) {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }),
      puppeteer: {
        headless: true,
        // executablePath:
        //   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    clients[userId] = { client, ready: false, qrData: null };

    client.on("qr", (qr) => {
      clients[userId].qrData = qr;
      clients[userId].ready = false;
    });

    client.on("ready", () => {
      clients[userId].ready = true;
      clients[userId].qrData = null;
      console.log(`✅ WhatsApp ready for ${userId}`);
    });

    client.on("auth_failure", (msg) => {
      console.error(`❌ Auth failure for ${userId}:`, msg);
    });

    client.on("disconnected", async (reason) => {
      console.log(`🔌 Disconnected for ${userId}:`, reason);

      try {
        await clients[userId].client.destroy();
      } catch (e) {
        console.warn(`⚠️ Failed to destroy client for ${userId}:`, e.message);
      }

      const newClient = new Client({
        authStrategy: new LocalAuth({ clientId: userId }),
        puppeteer: {
          headless: true,
          executablePath:
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu"
    ]
        },
      });

      clients[userId] = { client: newClient, ready: false, qrData: null };

      newClient.on("qr", (qr) => {
        clients[userId].qrData = qr;
        clients[userId].ready = false;
      });

      newClient.on("ready", () => {
        clients[userId].ready = true;
        clients[userId].qrData = null;
        console.log(`✅ WhatsApp reconnected for ${userId}`);
      });

      newClient.on("auth_failure", (msg) => {
        console.error(`❌ Auth failure for ${userId}:`, msg);
      });

      newClient.initialize();
    });

    client.initialize();
  }

  const { qrData, ready } = clients[userId];

  if (ready) {
    return res.send(`<h2>WhatsApp already connected for ${userId} ✔️</h2>`);
  }

  if (!qrData) {
    return res.send("<h2>QR not ready. Please try again...</h2>");
  }

  const qrUrl = await qrcode.toDataURL(qrData);
  res.send(`
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;">
        <h2>Scan the QR with WhatsApp (${userId})</h2>
        <img src="${qrUrl}" />
      </body>
    </html>
  `);
});

/**
 * POST /send
 * Body: { "number": "919876543210", "message": "Hello!" }
 * Sends a WhatsApp message to the given number.
 */
app.post("/send/:userId", async (req, res) => {
  const { userId } = req.params;
  const { numbers, message } = req.body;
  const clientState = clients[userId];

  if (!clientState || !clientState.ready) {
    return res.status(503).json({ error: `Client not ready for ${userId}` });
  }

  if (
    !Array.isArray(numbers) ||
    numbers.length === 0 ||
    typeof message !== "string"
  ) {
    return res.status(400).json({
      error: "Request body must include: numbers (array) and message (string)",
    });
  }

  const results = [];

  for (const num of numbers) {
    if (typeof num !== "string") {
      results.push({
        number: num,
        status: "skipped",
        error: "Invalid number format",
      });
      continue;
    }

    const chatId = num.endsWith("@c.us")
      ? num
      : num.replace(/\D/g, "") + "@c.us";

    try {
      await clientState.client.sendMessage(chatId, message);
      results.push({ number: num, status: "sent" });
    } catch (err) {
      results.push({ number: num, status: "failed", error: err.toString() });
    }
  }

  res.json({ userId, results });
});

app.get("/logout/:userId", async (req, res) => {
  const { userId } = req.params;
  const clientState = clients[userId];

  if (!clientState) {
    return res.status(404).json({ error: `No session found for ${userId}` });
  }

  try {
    await clientState.client.logout();
    clientState.ready = false;
    clientState.qrData = null;
    delete clients[userId];

    res.json({ status: "logged_out", userId });
    console.log(`WhatsApp client logged out for ${userId}`);
  } catch (err) {
    console.error(`Logout error for ${userId}:`, err);
    res.status(500).json({ error: "Logout failed", details: err.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
