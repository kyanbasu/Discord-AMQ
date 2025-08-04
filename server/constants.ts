import { Server as SocketIOServer } from "socket.io";
import { registerConnectionHandlers } from "./src/socketManagement";
import { DiscordUser, Room, User } from "./src/types";
import express from "express";
import http from "node:http";

export { users, discordUsers, rooms, io, runningLocally };

export const app = express();
export const port = process.env.VITE_SERVER_PORT;
export const server = http.createServer(app);

const io: SocketIOServer = new SocketIOServer(server, {
  transports: ["polling", "websocket", "webtransport"],
  cors: { origin: "discordsays.com" },
  pingTimeout: 60000, //default 20s
  pingInterval: 25000, //default 25s
});

io.on("connection", (socket) => registerConnectionHandlers(socket));

const rooms: Record<string, Room> = {};
const users: Record<string, User> = {};
const discordUsers: Record<string, DiscordUser> = {};
const runningLocally: boolean = process.env.VITE_RUN_LOCAL === "true";
