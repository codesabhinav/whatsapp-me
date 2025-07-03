# My WhatsApp API

This project provides a minimal REST API to:

1. **Register** a WhatsApp account by scanning a QR code generated from WhatsApp Web.
2. **Send** messages to any phone number from that registered account.

It uses the open‑source [whatsapp‑web.js](https://github.com/pedroslopez/whatsapp-web.js) library under the hood.

## Prerequisites

* **Node.js ≥ 18**  
* A phone with WhatsApp installed (to scan the QR)  
* (Optional) [`pm2`](https://pm2.keymetrics.io/) or `screen` if you want to keep the bot running in the background.

## Quick Start

```bash
# 1. Unzip the project
unzip my-whatsapp-api.zip
cd my-whatsapp-api

# 2. Install dependencies
npm install

# 3. Run the server
npm start         # or: npm run dev  (with live reload via nodemon)
```

The server listens on **http://localhost:3000** by default.

### Step 1 /  Register

1. Open your browser: `http://localhost:3000/register`  
2. If the client is _not_ yet linked, you'll receive a JSON response:

    ```json
    {{
      "status": "scan_required",
      "qr": "data:image/png;base64,iVBORw0KGgoAAAANS..."
    }}
    ```

   Paste the value of `qr` into your browser’s address bar to render the QR image, or save it to a `.png` file.  
   Scan it with **WhatsApp > Linked Devices > Link a Device** on your phone.

3. After a successful scan you’ll see `WhatsApp client is ready!` in the terminal, and subsequent calls to `/register` will respond with:

    ```json
    {{ "status": "already_authorized" }}
    ```

### Step 2 /  Send a Message

Make a **POST** request to `/send` with JSON body:

```json
{{
  "number": "919876543210",
  "message": "Hello from my API!"
}}
```

Example using `curl`:

```bash
curl -X POST http://localhost:3000/send \
     -H "Content-Type: application/json" \
     -d '{{"number":"919876543210","message":"Hi there!"}}'
```

* Use the **international format** (country code + number, no + sign).
* The API will respond `{{ "status": "sent", "to": "919876543210@c.us" }}` on success.

## Session Persistence

The `LocalAuth` strategy stores session data in `~/.wwebjs_auth/my-whatsapp`.  
This means you can restart the server, and you **won’t** need to rescan the QR unless you log out from the phone.

## Deploying

WhatsApp Web uses a headless Chrome instance (via Puppeteer), so your hosting must allow:

* Chromium installation
* `--no-sandbox` flag (many hosts allow this, some restrict)

Common options:

* **Linux VPS / VM** (DigitalOcean, AWS EC2, Hetzner, etc.)  
* **Fly.io** or **Render** (with a `Dockerfile`)  
* **Heroku** (Hobby / Eco tier) with `heroku-buildpack-google-chrome` for Puppeteer

## Important Notice

This project uses an **unofficial** method to automate WhatsApp, which **may** violate WhatsApp’s Terms of Service.  
Use at your own risk. For production / business use, consider the **official** [WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp).

---

© 2025