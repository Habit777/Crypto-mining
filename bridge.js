// bridge.js — WebSocket to Unmineable Stratum Proxy
const WebSocket = require("ws");
const net = require("net");

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  // Connect to Unmineable RandomX Stratum Pool
  const pool = net.connect(3333, "rx.unmineable.com");

  ws.on("message", (msg) => pool.write(msg + "\n"));
  pool.on("data", (data) => ws.send(data.toString()));

  ws.on("close", () => pool.end());
  pool.on("close", () => ws.close());
});

console.log("WebMiner Stratum Bridge running on ws://localhost:8080");
