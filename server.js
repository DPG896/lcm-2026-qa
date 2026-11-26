const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const FACILITATOR_PIN = process.env.FACILITATOR_PIN || "2026";

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "submissions.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let state = {
  promptTitle: "Share your question or answer for today's session",
  activeId: null,
  submissions: []
};

function loadState() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(raw);
      state = {
        promptTitle: parsed.promptTitle || state.promptTitle,
        activeId: parsed.activeId || null,
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : []
      };
    } else {
      saveState();
    }
  } catch (err) {
    console.error("Failed to load database file:", err);
  }
}

function saveState() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save database file:", err);
  }
}

loadState();

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

function checkPin(req, res) {
  const pin = req.headers["x-pin"];
  if (pin !== FACILITATOR_PIN) {
    res.status(401).json({ ok: false, error: "Invalid Facilitator PIN" });
    return false;
  }
  return true;
}

// Page routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "guest.html"));
});

app.get("/facilitator", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "facilitator.html"));
});

app.get("/monitor", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "monitor.html"));
});

// Public endpoint: get current session prompt for Guest UI
app.get("/api/prompt", (req, res) => {
  res.json({ ok: true, promptTitle: state.promptTitle });
});

// Guest submission endpoint -> defaults to pending moderation
app.post("/api/submit", (req, res) => {
  const sender = String(req.body.sender || "Anonymous Delegate").trim().slice(0, 60);
  const text = String(req.body.text || "").trim().slice(0, 600);

  if (!text) {
    return res.status(400).json({ ok: false, error: "Please enter a response before submitting." });
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender: sender || "Anonymous Delegate",
    text,
    status: "pending", // pending | approved | rejected
    createdAt: new Date().toISOString()
  };

  state.submissions.unshift(entry);
  saveState();

  res.json({ ok: true, id: entry.id });
});

// Facilitator: verify PIN & fetch full queue
app.get("/api/submissions", (req, res) => {
  if (!checkPin(req, res)) return;
  res.json({
    ok: true,
    promptTitle: state.promptTitle,
    activeId: state.activeId,
    submissions: state.submissions
  });
});

// Facilitator: update main session prompt shown on Guest & Monitor screens
app.post("/api/prompt", (req, res) => {
  if (!checkPin(req, res)) return;
  const promptTitle = String(req.body.promptTitle || "").trim().slice(0, 200);
  if (!promptTitle) {
    return res.status(400).json({ ok: false, error: "Prompt title cannot be empty." });
  }
  state.promptTitle = promptTitle;
  saveState();
  res.json({ ok: true, promptTitle: state.promptTitle });
});

// Facilitator: moderate entries or push to Monitor
app.post("/api/moderate", (req, res) => {
  if (!checkPin(req, res)) return;
  const { id, action } = req.body;

  if (action === "clear_screen") {
    state.activeId = null;
    saveState();
    return res.json({ ok: true, activeId: null });
  }

  const item = state.submissions.find((entry) => entry.id === id);
  if (!item) {
    return res.status(404).json({ ok: false, error: "Submission not found." });
  }

  if (action === "display") {
    item.status = "approved";
    state.activeId = item.id;
  } else if (action === "approve") {
    item.status = "approved";
  } else if (action === "reject") {
    item.status = "rejected";
    if (state.activeId === item.id) {
      state.activeId = null;
    }
  } else if (action === "pending") {
    item.status = "pending";
    if (state.activeId === item.id) {
      state.activeId = null;
    }
  } else {
    return res.status(400).json({ ok: false, error: "Invalid action." });
  }

  saveState();
  res.json({ ok: true, activeId: state.activeId });
});

// Monitor UI endpoint: returns ONLY approved active entry
app.get("/api/active", (req, res) => {
  const activeItem =
    state.submissions.find((entry) => entry.id === state.activeId && entry.status === "approved") ||
    null;

  res.json({
    ok: true,
    promptTitle: state.promptTitle,
    activeItem
  });
});

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

app.listen(PORT, "0.0.0.0", () => {
  const ips = getLocalIPs();
  console.log("\n==================================================");
  console.log("  Live Q&A System is Running!");
  console.log("==================================================");
  console.log(`  Localhost:       http://localhost:${PORT}`);
  ips.forEach((ip) => {
    console.log(`  LAN / Wi-Fi URL: http://${ip}:${PORT}`);
  });
  console.log("--------------------------------------------------");
  console.log(`  Guest UI:        /`);
  console.log(`  Facilitator UI:  /facilitator  (PIN: ${FACILITATOR_PIN})`);
  console.log(`  Monitor UI:      /monitor`);
  console.log("==================================================\n");
});
