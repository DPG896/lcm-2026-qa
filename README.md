# Live Event Q&A System (Local Node.js)

A lightweight, self-hosted 3-interface Q&A system built with **Node.js + Express** and vanilla **HTML/CSS/JS**, persisting submissions to a local JSON file (`data/submissions.json`).

## Directory Structure

```text
live-qa-system/
├── data/
│   └── submissions.json      # Auto-created local database storing all responses
├── public/
│   ├── guest.html            # Delegate mobile submission form (Route: /)
│   ├── facilitator.html      # PIN-gated moderation dashboard (Route: /facilitator)
│   ├── monitor.html          # Fullscreen projector display (Route: /monitor)
│   └── styles.css            # Shared responsive styling for all 3 UIs
├── package.json              # Node.js dependencies (express)
├── server.js                 # Express server, API routes, PIN auth & file persistence
└── README.md                 # Setup and event-day instructions
```

## Quick Start

1. Open a terminal inside `live-qa-system/`:
   ```bash
   npm install
   npm start
   ```
2. The terminal will display your local URLs:
   - **Guest UI (QR Code target):** `http://<YOUR-LAN-IP>:3000/`
   - **Facilitator UI:** `http://<YOUR-LAN-IP>:3000/facilitator` (Default PIN: `2026`)
   - **Monitor UI (Projector):** `http://localhost:3000/monitor`

## Customizing the Facilitator PIN

Before running the server, set the `FACILITATOR_PIN` environment variable or edit `FACILITATOR_PIN` in `server.js`:

- **Windows (Command Prompt):**
  ```cmd
  set FACILITATOR_PIN=4829 && npm start
  ```
- **Windows (PowerShell):**
  ```powershell
  $env:FACILITATOR_PIN="4829"; npm start
  ```
- **macOS / Linux:**
  ```bash
  FACILITATOR_PIN=4829 npm start
  ```

## Exposing Over the Internet (If Delegates Use Mobile Data)

If delegates are not on the same Wi-Fi network, keep `npm start` running and open a second terminal with **Cloudflare Quick Tunnel**:

```bash
cloudflared tunnel --url http://localhost:3000
```

Copy the generated `https://....trycloudflare.com` URL and generate your event QR code pointing to that link.
