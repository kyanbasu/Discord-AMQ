import express, { Request, Response } from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { connection } from "./scripts/socketManagement.ts";
import { Room, Anime } from "./scripts/types.ts";

dotenv.config({ path: "../.env" });

const app = express();
const port = 3001;

const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: { origin: "discordsays.com" },
  });

let rooms: Record<string, Room> = {};
let sockets: Record<string, string> = {};
let users: Record<string, { socket: Socket; roomID: string }> = {};
let alcache: Record<string, {id: string; list: Anime[]}> = {};

// Clean cache
fs.readdir("../client/res/", (err, files) => {
  if (err) throw err;

  for (const file of files) {
    console.log("removing cached " + path.join("../client/res/", file));
    fs.unlink(path.join("../client/res/", file), (err) => {
      if (err) throw err;
    });
  }
});

// Allow express to parse JSON bodies
app.use(express.json());

fs.readFile("./cache.json", (err, data) => {
  if (err) return console.error(err);
  alcache = JSON.parse(data.toString());
});

export { alcache, sockets, users, rooms, io };

io.on("connection", (socket) => connection(socket) );

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1); // Crash the application
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
  process.exit(1); // Crash the application
});

// Express Routes
app.post("/api/token", async (req: Request, res: Response) => {
  try {
    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code: req.body.code,
      }),
    });

    const { access_token } = (await response.json()) as { access_token: string };
    res.send({ access_token });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching token.");
  }
});

app.get("/", (_req, res) => {
  res.send("working.");
});

server.listen(port, () => {
  console.log(`Server and Socket.io listening at http://localhost:${port}`);
});
