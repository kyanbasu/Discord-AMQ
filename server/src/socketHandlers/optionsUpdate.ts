import { Socket } from "socket.io";
import { io, rooms, users } from "../../constants";
import { updateUser, updateUserClientSettings } from "../db/databaseManagement";
import { getAnimeList } from "../helpers/getAnimeList";
import * as messaging from "../helpers/messaging";
import { ClientSettings, DiscordUser, GameState, RoomOptions } from "../types";

export function handleOptionsUpdate(socket: Socket) {
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

          // Update entries label in game options
          rooms[roomID].options.playerList[discordUser.id].entries =
            list.length;

          io.to(roomID).emit(
            "optionsReload",
            rooms[roomID].options,
            rooms[roomID].hostID
          );

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
        io.to(roomID).emit(
          "optionsReload",
          rooms[roomID].options,
          rooms[roomID].hostID
        );
        messaging.systemAnnouncement(roomID, "Options updated.");
      }
    }
  );

  socket.on(
    "updateClientSettings",
    (user: DiscordUser, clientSettings: ClientSettings) => {
      updateUserClientSettings(user.id, clientSettings);
    }
  );
}
