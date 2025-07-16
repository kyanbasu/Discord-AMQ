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
  QueueEntry,
  ClientSettings,
  GuessingMode,
} from "./types.ts";
import { updateUser, updateUserClientSettings } from "./databaseManagement.ts";
import { AnimeSchema, UserSchema } from "./schema.ts";

export const connection = (socket: Socket) => {
  console.log(`user connected ${socket.id}`);

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
      socket.emit(
        "data-list",
        userDoc.username,
        userDoc.updated,
        userDoc.service,
        userDoc.list?.length || 0
      );
      if (userDoc.clientSettings)
        socket.emit("clientSettingsReload", userDoc.clientSettings);
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
      rooms[roomID] = createRoom(user);

      rooms[roomID].users.push(user.id);
    } else {
      if (!rooms[roomID].users.includes(user.id)) {
        rooms[roomID].users.push(user.id);
        rooms[roomID].options.playerListIncluded[user.id] = true;
      }

      socket.emit("message", rooms[roomID].chathistory);
    }

    updatePlayerList(roomID);

    if (rooms[roomID].gameState === GameState.PLAYING) {
      socket.emit("message", "Joining to game...", "playing");
    }

    socket.emit("optionsReload", rooms[roomID].options);
    socket.emit("loadingUpdate");
  });

  socket.on(
    "client-resync",
    async (roomID: string, discordUser: DiscordUser) => {
      socket.join(roomID);

      let userDoc = await UserSchema.findOne({ _id: discordUser.id });

      if (userDoc) {
        socket.emit(
          "data-list",
          userDoc.username,
          userDoc.updated,
          userDoc.service,
          userDoc.list?.length || 0
        );
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
        rooms[roomID] = createRoom(user);

        rooms[roomID].users.push(user.id);
      } else {
        if (!rooms[roomID].users.includes(user.id)) {
          rooms[roomID].users.push(user.id);
        }
      }

      updatePlayerList(roomID);

      socket.emit("message", "Reconnected to server");

      if (rooms[roomID].gameState === GameState.PLAYING) {
        socket.emit("message", "Joining to game...", "playing");
      }

      socket.emit("optionsReload", rooms[roomID].options);
    }
  );

  socket.on(
    "updateAL",
    async (
      roomID: string,
      discordUser: DiscordUser,
      username: string,
      service: number = 0
    ) => {
      if (!rooms[roomID]) return socket.emit("exit");
      if (rooms[roomID].gameState === GameState.LOBBY) {
        try {
          const list = await getAnimeList(username, service);

          if (!list) throw new Error("failed to fetch anime list");

          // Update in cache
          users[discordUser.id].list = list.map((e) => e._id);
          socket.emit("data-list", username, Date.now(), service, list.length); // sync client with server

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
          messaging.userAnnouncement(
            socket,
            `${(() => {
              switch (service) {
                case 0:
                  return "MAL";
                case 1:
                  return "AniList";
                default:
                  return "Unknown service";
              }
            })()} profile not found or other error.`
          );
        }
      } else {
        socket.emit("message", "You cannot update anime list during game!");
      }
    }
  );

  socket.on(
    "updateOptions",
    async (roomID: string, user: DiscordUser, options: RoomOptions) => {
      if (
        rooms[roomID] &&
        user.id == rooms[roomID].hostID &&
        rooms[roomID].gameState == GameState.LOBBY
      ) {
        //console.log(options);
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

          let randomPick = randomFromArray(
            selectedUser.list.filter(
              (e: string) =>
                !rooms[roomID].queue.some(
                  (item: QueueEntry) => item.themeId === e
                ) &&
                !rooms[roomID].queueHistory.some(
                  (item: QueueEntry) => item.themeId === e
                )
            )
          );
          rooms[roomID].queue.push({
            themeId: randomPick,
            userId: selectedUser.id,
          });
          userIndex++;
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

  socket.on("guess", async (user: User, guess: number | string) => {
    if (!users[user.id]) return;
    if (guess) {
      if (typeof guess === "string") {
        users[user.id].guess = guess;
      } else {
        users[user.id].guess = Number(guess) - 1;
      }
    }
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

  socket.on("discord-auth", (user: DiscordUser) => {
    console.log(user);
  });

  socket.on(
    "updateClientSettings",
    (user: DiscordUser, clientSettings: ClientSettings) => {
      updateUserClientSettings(user.id, clientSettings);
    }
  );

  socket.on("autocomplete", async (q) => {
    if (q.length < 3) return;

    const regex = new RegExp(`^${q}`, "i");
    const docs = await AnimeSchema.find({
      $or: [
        { "title.ro": regex },
        { "title.en": regex },
        { "title.ja": regex },
      ],
    })
      .limit(10)
      .lean();

    socket.emit(
      "autocompleteResults",
      docs.map((d) => ({
        id: d._id,
        title: d.title,
      }))
    );
  });

  socket.on("disconnect", () => {
    const user = Object.values(users).find(
      (u: User) => u.socket!.id == socket.id
    );
    console.log(`user disconnected ${user ? user.name : "?"} ${socket.id}`);
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

function createRoom(user: User) {
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
      guessTime: 10,
      queueSize: 10,
      guessesCount: 4,
      guessingMode: GuessingMode.TYPING,
      playerListIncluded: {
        [user.id]: true,
      },
      novideo: Bun.argv.includes("--no-video") ? true : false,
    },
  };
}
