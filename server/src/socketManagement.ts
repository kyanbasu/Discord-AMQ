import { Socket } from "socket.io";
import { addQueue } from "./queueManagement/queueManagement.ts";
import { io, rooms, discordUsers } from "../constants.ts";

import {
  User,
  GameState,
  ThemeType,
  DiscordUser,
  GuessingMode,
} from "./types.ts";

import { handleConnection } from "./socketHandlers/connection.ts";
import { handleGame } from "./socketHandlers/game.ts";
import { handleOptionsUpdate } from "./socketHandlers/optionsUpdate.ts";
import { handleMessages } from "./socketHandlers/messages.ts";

export const registerConnectionHandlers = (socket: Socket) => {
  console.log(`user connected ${socket.id}`);

  handleConnection(socket);

  handleGame(socket);

  handleOptionsUpdate(socket);

  handleMessages(socket);

  socket.on("addQueue", async (roomID: string, malID: string) => {
    addQueue(socket, roomID, malID);
  });

  socket.on("discord-auth", (user: DiscordUser) => {
    console.log(user);
  });
};

export function updatePlayerList(roomID: string) {
  if (!rooms[roomID]) return;
  const playerList = rooms[roomID].users.map((userID) => ({
    name: discordUsers[userID]?.global_name,
    id: userID,
    avatar: discordUsers[userID]?.avatar,
  }));
  io.to(roomID).emit("updatePlayerList", playerList, rooms[roomID].hostID);
}

// Provides default room options
export function createRoom(user: User) {
  return {
    queue: [],
    queueHistory: [],
    playerPaused: true,
    playerPlaying: false,
    canPlayNext: true,
    gameState: GameState.LOBBY,
    hostID: user.id,
    users: [],
    currentTimeout: null,
    chathistory: "",
    options: {
      themeType: ThemeType.OP,
      guessTime: 20,
      queueSize: 10,
      guessesCount: 4,
      guessingMode: GuessingMode.TYPING,
      playerList: {
        [user.id]: { included: true, entries: user.list?.length || 0 },
      },
      novideo: Bun.argv.includes("--no-video") ? true : false,
    },
  };
}
