import { Socket } from "socket.io";
import { discordUsers, io, rooms } from "../constants.ts";
import { GameState, GuessingMode, ThemeType, User } from "./types.ts";

import { handleConnection } from "./socketHandlers/connection.ts";
import { handleGame } from "./socketHandlers/game.ts";
import { handleMessages } from "./socketHandlers/messages.ts";
import { handleOptionsUpdate } from "./socketHandlers/optionsUpdate.ts";

export const registerConnectionHandlers = (socket: Socket) => {
  handleConnection(socket);

  handleGame(socket);

  handleOptionsUpdate(socket);

  handleMessages(socket);
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
