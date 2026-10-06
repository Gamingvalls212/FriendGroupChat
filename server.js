import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, "public")));

const clients = new Map();
const history = [];
const MAX_HISTORY = 100;

function cleanUsername(name) {
  return String(name || "Guest").trim().slice(0, 24) || "Guest";
}

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const ws of clients.keys()) {
    if (ws.readyState === 1) ws.send(message);
  }
}

function sendUsers() {
  broadcast({ type: "users", users: [...clients.values()] });
}

wss.on("connection", (ws) => {
  let username = "Guest";

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === "join") {
        username = cleanUsername(data.username);
        clients.set(ws, username);

        ws.send(JSON.stringify({ type: "history", messages: history }));
        broadcast({ type: "system", text: `${username} joined the chat.` });
        sendUsers();
        return;
      }

      if (data.type === "message") {
        const text = String(data.text || "").trim();
        const image = typeof data.image === "string" ? data.image : null;

        if (!text && !image) return;

        const message = {
          type: "message",
          username,
          text: text.slice(0, 4000),
          image,
          time: new Date().toISOString()
        };

        history.push(message);
        if (history.length > MAX_HISTORY) history.shift();

        broadcast(message);
      }
    } catch {
      // Ignore malformed messages.
    }
  });

  ws.on("close", () => {
    const oldName = clients.get(ws);
    clients.delete(ws);

    if (oldName) {
      broadcast({ type: "system", text: `${oldName} left the chat.` });
      sendUsers();
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`FriendGroup Chat running on port ${PORT}`);
});
