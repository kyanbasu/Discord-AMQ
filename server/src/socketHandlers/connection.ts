import { Socket } from "socket.io";
import { discordUsers, rooms, users } from "../../constants";
import { UserSchema } from "../db/schemas";
import { createRoom, updatePlayerList } from "../socketManagement";
import { DiscordUser, GameState, User } from "../types";

export function handleConnection(socket: Socket) {
  socket.on("join-room", async (roomID: string, discordUser: DiscordUser) => {
    socket.join(roomID);
    const userDoc = await UserSchema.findOne({ _id: discordUser.id });

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

    const user: User = {
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
        rooms[roomID].options.playerList[user.id] = {
          included: true,
          entries: user.list?.length || 0,
        };
      }

      socket.emit("message", rooms[roomID].chathistory);
    }

    updatePlayerList(roomID);

    if (rooms[roomID].gameState === GameState.PLAYING) {
      socket.emit("message", "Joining to game...", "playing");
    }

    socket.emit("optionsReload", rooms[roomID].options, rooms[roomID].hostID);
    socket.emit("loadingUpdate");
  });

  socket.on(
    "client-resync",
    async (roomID: string, discordUser: DiscordUser) => {
      socket.join(roomID);

      const userDoc = await UserSchema.findOne({ _id: discordUser.id });

      if (userDoc) {
        socket.emit(
          "data-list",
          userDoc.username,
          userDoc.updated,
          userDoc.service,
          userDoc.list?.length || 0
        );
      }

      const user: User = {
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

      socket.emit("optionsReload", rooms[roomID].options, rooms[roomID].hostID);
    }
  );

  socket.on("disconnect", () => {
    const user = Object.values(users).find(
      (u: User) => u.socket!.id == socket.id
    );
    console.log(`user disconnected ${user ? user.name : "?"} ${socket.id}`);
    if (!user) return;
    if (rooms[user.roomID!]) {
      const roomID = user.roomID!;
      const index: number = rooms[roomID].users.indexOf(user.id);

      if (index > -1) rooms[roomID].users.splice(index, 1);

      if (rooms[roomID].users.length === 0) delete rooms[roomID];

      updatePlayerList(roomID);
    }
    delete users[user.id];
  });
}
