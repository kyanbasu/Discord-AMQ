import { Socket } from "socket.io";
import { addQueue } from "../queueManagement/queueManagement";
import * as messaging from "../helpers/messaging";

export function handleMessages(socket: Socket) {
  socket.on("message", (roomID: string, message: string) => {
    if (!message) return;

    if (message.includes("!play")) {
      try {
        const q = message.split(" ").at(-1);
        if (!q) throw new Error(`Could not add to queue, message: ${message}`);

        addQueue(socket, roomID, q);
      } catch {
        throw new Error(`Could not add to queue, message: ${message}`);
      }
      return;
    }

    messaging.sendMessage(
      roomID,
      `> ${new Date()
        .toLocaleString("en-GB", { hour12: false })
        .slice(12, 17)} <span style="color:salmon">${message}</span>`
    );

    return;
  });
}
