import { Socket } from "socket.io";

import { addQueue, playNextQueue } from "./queueManagement.ts";
import * as messaging from "./messaging.ts";
import { getAnimeList, randomFromArray } from "./helpers.ts";

import { users, io, rooms, discordUsers } from "../server.ts";
import {
  User,
  RoomOptions,
  GameState,
  ThemeType,
  DiscordUser,
} from "./types.ts";
import { updateUser } from "./databaseManagement.ts";
import { UserSchema } from "./schema.ts";

export const connection = (socket: Socket) => {
  socket.on("message", (roomID: string, message: string) => {
    if (!message) return;

    if (message.includes("!play")) {
      try {
        let q = message.split(" ").at(-1);
        if (!q) throw new Error(`Could not add to queue, message: ${message}`);

        addQueue(socket, roomID, q);
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
    let userDoc = await UserSchema.findOne({ _id: discordUser.id });

    if (userDoc) {
      socket.emit("data", "list", userDoc.username, userDoc.updated, userDoc.service);
    }

    let user: User = {
      id: discordUser.id,
      name: userDoc?.name,
      list: userDoc?.list ? userDoc.list.map(String) : [],
      score: 0,
      socket: socket,
      roomID: roomID,
    };

    users[user.id] = user;

    discordUsers[discordUser.id] = discordUser;

    if (!rooms[roomID]) {
      rooms[roomID] = {
        //lobbyAniList: [],
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
          guessTime: 10,
          queueSize: 10,
          guessesCount: 4,
          playerListIncluded: {
            [user.id]: true,
          },
          novideo: Bun.argv.includes("--no-video") ? true : false,
        },
      };

      rooms[roomID].users.push(user.id);

      updatePlayerList(roomID);
    } else {
      if (!rooms[roomID].users.includes(user.id)) {
        rooms[roomID].users.push(user.id);
        rooms[roomID].options.playerListIncluded[user.id] = true;
      }

      updatePlayerList(roomID);

      socket.emit("message", rooms[roomID].chathistory);
    }

    if (rooms[roomID].gameState === GameState.PLAYING) {
      socket.emit("message", "Joining to game...", "playing");
    }

    socket.emit("optionsReload", rooms[roomID].options);
  });

  // Update anime list, currently supporting only MyAnimeList, maybe add support for anilist or sth
  socket.on(
    "updateAL",
    async (roomID: string, discordUser: DiscordUser, username: string, service: number = 0) => {
      if (rooms[roomID].gameState === GameState.LOBBY) {
        try {
          const list = await getAnimeList(username, service);

          if (!list) throw new Error("failed to fetch anime list");

          // Update in cache
          users[discordUser.id].list = list.map((e) => e._id);
          socket.emit("data", "list", username); // idk just to make sure user has correct name in input field

          // Update user in database, including not exisitng animes and user-anime relations
          updateUser(
            discordUser.id,
            discordUser.global_name,
            list,
            username,
            service
          );

          messaging.userAnnouncement(socket, `Updated list. (${list.length})`);
        } catch (e) {
          if (e instanceof Error)
            console.log("Couldn't find MAL profile " + e.message);
          messaging.userAnnouncement(socket, "MAL profile not found");
        }
      } else {
        socket.emit("message", "You cannot update anime list during game!");
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
        messaging.systemAnnouncement(roomID, "Options updated.");
      }
    }
  );

  socket.on("addQueue", async (roomID: string, malID: string) => {
    addQueue(socket, roomID, malID);
  });

  socket.on("playPause", async (roomID: string) => {
    if (!rooms[roomID]) return socket.emit("exit");
    if (rooms[roomID].playerPaused) {
      // pressed play - just started game
      if (rooms[roomID].gameState == GameState.LOBBY) {
        rooms[roomID].gameState = GameState.PLAYING;

        ////// Other theme selection logic
        // rooms[roomID].lobbyAniList = []; // reset lobby list

        // rooms[roomID].users.forEach((userID) => {
        //   if (rooms[roomID].options.playerListIncluded[userID]) {
        //     rooms[roomID].lobbyAniList = [
        //       ...new Set([
        //         ...(rooms[roomID].lobbyAniList || []),
        //         ...(users[userID].list || []),
        //       ]),
        //     ]; // remove duplicates
        //   }
        // });

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
          rooms[roomID].queue.push(randomPick);
        }
        messaging.systemMessage(roomID, "Game has started!", "play");
      }
      rooms[roomID].playerPaused = false;
      if (rooms[roomID].gameState == GameState.PLAYING)
        messaging.systemMessage(roomID, "Unpaused.", "play");
      if (rooms[roomID].canPlayNext) await playNextQueue(roomID);
    } else {
      // pressed pause
      rooms[roomID].playerPaused = true;
      messaging.systemMessage(roomID, "Will pause after song...", "pause");
    }
  });

  socket.on("guess", async (user: User, guess: number) => {
    if (!users[user.id]) return;
    if (guess) users[user.id].guess = guess - 1;
  });

  socket.on("skip", async (roomID: string) => {
    if (!rooms[roomID]) return socket.emit("exit");
    console.log(rooms[roomID]);
    if (!rooms[roomID].playerPaused && rooms[roomID].canPlayNext) {
      if (rooms[roomID].currentTimeout !== null) {
        clearTimeout(rooms[roomID].currentTimeout);
        rooms[roomID].currentTimeout = null;
      }

      rooms[roomID].playerPlaying = false;
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

      updatePlayerList(roomID);
    }
    delete users[user.id];
  });
};

function updatePlayerList(roomID: string) {
  if (!rooms[roomID]) return;
  const playerList = rooms[roomID].users.map((userID) => ({
    name: discordUsers[userID]?.global_name,
    id: userID,
    avatar: discordUsers[userID]?.avatar,
  }));
  io.to(roomID).emit("updatePlayerList", playerList, rooms[roomID].hostID);
}
