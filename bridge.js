// bridge.js — Real WebSocket-to-Stratum Proxy for Unmineable Pool
const http = require("http");
const WebSocket = require("ws");
const net = require("net");

const PORT = process.env.PORT || 8080;
const POOL_HOST = "rx.unmineable.com";
const POOL_PORT = 3333;

// HTTP server (Render / Cloud health checks ke liye zaroori)
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebHash Stratum Bridge is ONLINE\n");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("[BRIDGE] Browser miner connected:", req.socket.remoteAddress);

  // Connect to Real Unmineable RandomX Stratum Pool
  const pool = net.connect(POOL_PORT, POOL_HOST, () => {
    console.log(`[POOL] Connected to ${POOL_HOST}:${POOL_PORT}`);
    ws.send(JSON.stringify({ type: "bridge_status", status: "connected_to_pool" }));
  });

  let buffer = "";

  // Browser se Stratum JSON-RPC commands (login, submit) pool ko bhejein
  ws.on("message", (message) => {
    try {
      const msgStr = message.toString().trim();
      console.log("[BROWSER -> POOL]", msgStr);
      pool.write(msgStr + "\n");
    } catch (err) {
      console.error("[WS MSG ERR]", err.message);
    }
  });

  // Pool se aane wale asli Jobs aur Share confirmations browser ko bhejein
  pool.on("data", (chunk) => {
    buffer += chunk.toString();
    let lines = buffer.split("\n");
    buffer = lines.pop(); // incomplete line buffer mein rakhein

    for (const line of lines) {
      if (line.trim()) {
        console.log("[POOL -> BROWSER]", line);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(line);
        }
      }
    }
  });

  pool.on("error", (err) => {
    console.error("[POOL ERR]", err.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "bridge_error", error: err.message }));
    }
  });

  pool.on("close", () => {
    console.log("[POOL] Connection closed");
    if (ws.readyState === WebSocket.OPEN) ws.close();
  });

  ws.on("close", () => {
    console.log("[BRIDGE] Browser disconnected");
    pool.end();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Real Stratum WebSocket Bridge running on port ${PORT}`);
});
