import express from "express";
import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { registerConnectionHandlers } from "./src/socketManagement";
import { DiscordUser, Room, User } from "./src/types";

export { discordUsers, io, rooms, runningLocally, users };

export const app = express();
export const port = process.env.VITE_SERVER_PORT;
export const server = http.createServer(app);

const io: SocketIOServer = new SocketIOServer(server, {
  transports: ["polling", "websocket", "webtransport"],
  cors: { origin: "discordsays.com" },
  pingTimeout: 60000, //default 20s
  pingInterval: 25000, //default 25s
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(Error("no token"));

  const resp = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return next(Error("failed auth"));
  const user = await resp.json();
  socket.data.discordUser = user;
  return next();
});

io.on("connection", (socket) => {
  const user = socket.data.discordUser as DiscordUser;
  discordUsers[user.id] = user;

  console.log(`user connected ${socket.id}`);
  console.log(user.id, user.global_name);

  socket.emit("authenticated", { id: user.id });

  registerConnectionHandlers(socket);
});

const rooms: Record<string, Room> = {};
const users: Record<string, User> = {};
const discordUsers: Record<string, DiscordUser> = {};
const runningLocally: boolean = process.env.VITE_RUN_LOCAL === "true";
