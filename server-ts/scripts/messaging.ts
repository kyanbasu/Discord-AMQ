import { Socket } from "socket.io";
import { io, rooms } from "../server.ts";

export const sendMessage = (roomID: string, message: string) => {
  if (!rooms[roomID]) return; //socket.emit('message', 'This room doesn\'t exist.')
  io.to(roomID).emit("message", message);
  rooms[roomID].chathistory += `${message}<br>`;
};

export const systemMessage = (
  roomID: string,
  message: string,
  additionalInfo: string = ""
) => {
  if (roomID == "0")
    return io.emit(
      "message",
      `<span style="color:DarkGray">${message}</color>`,
      additionalInfo
    );
  io.to(roomID).emit(
    "message",
    `<span style="color:DarkGray">${message}</color>`,
    additionalInfo
  );
};

export const userAnnouncement = (
  socket: Socket,
  message: string,
  importanceLevel: number = 0
) => {
  socket.emit("announce", message, importanceLevel);
};

export const systemAnnouncement = (
  roomID: string,
  message: string,
  importanceLevel: number = 0
) => {
  if (roomID == "0") return io.emit("announce", message, importanceLevel);
  io.to(roomID).emit("announce", message, importanceLevel);
};
