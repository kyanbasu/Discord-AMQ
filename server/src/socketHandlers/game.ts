import { Socket } from "socket.io";
import { rooms, users } from "../../constants";
import { AnimeSchema } from "../db/schemas";
import { randomFromArray } from "../helpers/helpers";
import * as messaging from "../helpers/messaging";
import { playNextQueue } from "../queueManagement/playNextQueue";
import { addQueue } from "../queueManagement/queueManagement";
import { GameState, QueueEntry, User } from "../types";

export function handleGame(socket: Socket) {
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

          const randomPick = randomFromArray(
            selectedUser.list.filter(
              (e: string) =>
                !rooms[roomID].queue.some(
                  (item: QueueEntry) => item.themeId === e
                ) &&
                !rooms[roomID].queueHistory.some(
                  (item: QueueEntry) => item.themeId === e
                )
            )
          ) as string;

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

  socket.on("addQueue", async (roomID: string, malID: string) => {
    addQueue(socket, roomID, malID);
  });

  socket.on("autocomplete", async (q) => {
    if (q.length < 2) return;

    const regex = new RegExp(q, "i");
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
}
