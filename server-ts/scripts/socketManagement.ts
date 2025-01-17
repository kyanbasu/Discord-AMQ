import { Socket } from "socket.io";

import { addQueue, playNextQueue } from "./queueManagement.ts";
import * as messaging from "./messaging.ts";
import { getAnimeList, randomFromArray } from "./helpers.ts";

import { users, io, rooms } from "../server.ts";
import {
  User,
  RoomOptions,
  GameState,
  ThemeType,
  DiscordUser,
} from "./types.ts";
import { getUser, updateUser } from "./databaseManagement.ts";

export const connection = (socket: Socket) => {
  socket.on("message", (roomID: string, message: string) => {
    if (!message) return;

    if (message.includes("!play")) {
      try {
        addQueue(socket, roomID, Number(message.split(" ").at(-1)));
      } catch (e) {
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

  socket.on("join-room", async (roomID: string, discordUser: DiscordUser) => {
    socket.join(roomID);
    let user: User = { id: discordUser.id };
    user.discord = discordUser;
    user.score = 0;
    user.socket = socket;
    user.roomID = roomID;

    let dbuserdata = getUser(user.id, true);
    if (dbuserdata) {
      user.list = dbuserdata.list;
      user.name = dbuserdata.name;
    }

    users[user.id] = user;

    if (!rooms[roomID]) {
      rooms[roomID] = {
        queue: [],
        queueHistory: [],
        playerPaused: true,
        canPlayNext: true,
        gameState: GameState.LOBBY,
        hostID: user.id,
        users: [],
        currentTimeout: null,
        chathistory: "",
        options: {
          themeType: ThemeType.OP,
          guessTime: 10,
          queueSize: 10,
          guessesCount: 4,
        },
      };

      rooms[roomID].users.push(user.id);

      socket.emit("addAvatar", discordUser, user.id === rooms[roomID].hostID);
    } else {
      if (!rooms[roomID].users.includes(user.id))
        rooms[roomID].users.push(user.id);

      rooms[roomID].users.forEach((usrID) => {
        socket.emit(
          "addAvatar",
          users[usrID].discord,
          usrID === rooms[roomID].hostID
        );
      });

      socket.emit("message", rooms[roomID].chathistory);
    }

    if (rooms[roomID].gameState === GameState.PLAYING) {
      socket.emit("message", "Dołączanie do trwającej gry...", "playing");
    }

    socket.emit("optionsReload", rooms[roomID].options);
  });

  // Update anime list, currently supporting only MyAnimeList, maybe add support for anilist or sth
  socket.on(
    "updateAL",
    async (roomID: string, user: DiscordUser, listID: string) => {
      if (rooms[roomID].gameState === GameState.LOBBY) {
        try {
          const list = await getAnimeList(listID);

          if (!list) throw new Error("failed to fetch anime list");

          // Update user in database, including not exisitng animes and user-anime relations
          updateUser(user.id, listID, list);

          messaging.userAnnouncement(
            socket,
            `Zaaktualizowano liste. (${list.length})`
          );
        } catch (e) {
          if (e instanceof Error)
            console.log("Nie znaleziono takiego profilu MAL " + e.message);
          messaging.userAnnouncement(
            socket,
            "Nie znaleziono takiego profilu MAL"
          );
        }
      } else {
        socket.emit("message", "Nie można zaaktualizować listy podczas gry!");
      }
    }
  );

  socket.on(
    "updateOptions",
    async (roomID: string, user: DiscordUser, options: RoomOptions) => {
      if (rooms[roomID] && user.id == rooms[roomID].hostID) {
        console.log(options);
        rooms[roomID].options = options;
        io.to(roomID).emit("optionsReload", rooms[roomID].options);
        messaging.systemAnnouncement(roomID, "Zaaktualizowano opcje.");
      }
    }
  );

  socket.on("addQueue", async (roomID: string, malID: number) => {
    addQueue(socket, roomID, malID);
  });

  socket.on("playPause", async (roomID: string) => {
    if (!rooms[roomID]) return socket.emit("exit");
    if (rooms[roomID].playerPaused) {
      // pressed play
      if (rooms[roomID].gameState == GameState.LOBBY) {
        rooms[roomID].gameState = GameState.PLAYING;

        let userIndex = 0;
        for (let i = 0; i < rooms[roomID].options.queueSize; i++) {
          let selectedUser =
            users[rooms[roomID].users[userIndex % rooms[roomID].users.length]];
          let retries = 0;
          while (!selectedUser.list) {
            if (retries >= rooms[roomID].users.length) return; // no one has anime list
            userIndex++;
            retries++;
            selectedUser =
              users[
                rooms[roomID].users[userIndex % rooms[roomID].users.length]
              ];
          }

          let randomPick = randomFromArray(selectedUser.list);
          rooms[roomID].queue.push(randomPick.id);
        }
        messaging.systemMessage(roomID, "Gra rozpoczęta!", "play");
      }
      rooms[roomID].playerPaused = false;
      if (rooms[roomID].gameState == GameState.PLAYING)
        messaging.systemMessage(roomID, "Odpauzowane.", "play");
      if (rooms[roomID].canPlayNext) await playNextQueue(roomID);
    } else {
      // pressed pause
      rooms[roomID].playerPaused = true;
      messaging.systemMessage(roomID, "Zapauzuje po muzyce...", "pause");
    }
  });

  socket.on("guess", async (user: User, roomID: string, guess: number) => {
    users[user.id].guess = guess;
  });

  socket.on("skip", async (roomID: string) => {
    if (!rooms[roomID]) return socket.emit("exit");
    if (!rooms[roomID].playerPaused && rooms[roomID].canPlayNext) {
      if (rooms[roomID].currentTimeout !== null) {
        clearTimeout(rooms[roomID].currentTimeout);
        rooms[roomID].currentTimeout = null;
      }
      //rooms[roomID].playing = false;
      rooms[roomID].currentTimeout = null;
      rooms[roomID].canPlayNext = false;

      await playNextQueue(roomID);
    }
  });

  socket.on("discord-auth", (user: any) => {
    console.log(user);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected " + socket.id);
    const user = Object.values(users).find(
      (u: User) => u.socket!.id == socket.id
    );
    if (!user) return;
    if (rooms[user.roomID!]) {
      const roomID = user.roomID!;
      let index: number = rooms[roomID].users.indexOf(user.id);

      if (index > -1) rooms[roomID].users.splice(index, 1);

      if (rooms[roomID].users.length === 0) delete rooms[roomID];
    }
    delete users[user.id];
  });
};
