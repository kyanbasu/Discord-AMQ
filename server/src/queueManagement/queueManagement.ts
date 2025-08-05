import { Socket } from "socket.io";
import { discordUsers, io, rooms, users } from "../../constants.ts";
import { AnimeSchema } from "../db/schemas.ts";
import { getTheme } from "../helpers/getTheme.ts";
import { randomFromArray } from "../helpers/helpers.ts";
import { userAnnouncement } from "../helpers/messaging.ts";
import { GameState, QueueEntry, User } from "../types.ts";
import { playNextQueue } from "./playNextQueue.ts";

export const addQueue = async (
  socket: Socket,
  roomID: string,
  malID: string
) => {
  if (!rooms[roomID]) {
    userAnnouncement(socket, "This room does not exist");
    return;
  }
  if (
    rooms[roomID].queue.some((item: QueueEntry) => item.themeId === malID) ||
    rooms[roomID].queueHistory.some(
      (item: QueueEntry) => item.themeId === malID
    )
  ) {
    userAnnouncement(socket, `${malID} is already in queue`);
    return;
  }
  const userEntry = Object.values(users).find(
    (user: User) => user.socket?.id === socket.id
  );
  rooms[roomID].queue.push({
    themeId: malID,
    userId: userEntry ? userEntry.id : undefined,
  });
  userAnnouncement(socket, `Added ${malID} to queue`);

  if (!rooms[roomID].playerPaused && !rooms[roomID].playerPlaying) {
    if (rooms[roomID].currentTimeout !== null) {
      clearTimeout(rooms[roomID].currentTimeout);
      rooms[roomID].currentTimeout = null;
    }
    rooms[roomID].playerPlaying = false;

    await playNextQueue(roomID);
  }
};

export function summary(roomID: string) {
  let o = "";
  const sortedUsers = Object.values(rooms[roomID].users).sort(
    (a, b) => users[b].score - users[a].score
  );
  //.map(user => user) //not needed

  sortedUsers.forEach((u) => {
    o += `${discordUsers[u].global_name} ${users[u].score}p<br/>`;
    users[u].score = 0; // reset score for next game
  });

  rooms[roomID].gameState = GameState.LOBBY;
  rooms[roomID].playerPaused = true;
  rooms[roomID].canPlayNext = true;
  io.to(roomID).emit(
    "message",
    `<span style="color: var(--maincontrast)">> The end.<br/>> Results:<br/>${o}</span>`,
    "end"
  );
}

export function tryCache(roomID: string, tries: number = 1) {
  if (tries > 3) {
    console.log("Failed to cache theme after 3 tries");
    return;
  }
  if (!rooms[roomID] || rooms[roomID].queue.length < 2) return;
  getTheme(
    rooms[roomID].queue[1].themeId,
    rooms[roomID].options.themeType
  ).catch((error) => {
    console.error(error);
    // Remove failed, add other theme to queue and try to cache next
    rooms[roomID].queueHistory.push(rooms[roomID].queue.shift()!);
    setTimeout(() => {
      tryCache(roomID, tries + 1);
    }, 2000);
  });
}

export async function getOtherTheme(roomID: string) {
  const pickedUser = users[randomFromArray(rooms[roomID].users) as string];
  const tempList = pickedUser.list;

  if (!tempList) return false;

  const picker = tempList.filter(
    (e: string) =>
      !rooms[roomID].queue.some((item: QueueEntry) => item.themeId === e) &&
      !rooms[roomID].queueHistory.some((item: QueueEntry) => item.themeId === e)
  );
  if (picker.length == 0) {
    await playNextQueue(roomID); //List is empty, play next (will show end screen)
    return false;
  }

  const aniid = randomFromArray(picker);
  const newPick: AnimeSchema | null = await AnimeSchema.findOne({
    _id: aniid,
  });
  if (!newPick) throw new Error(`No anime in database, id: ${aniid}`);

  console.log(`instead added ${newPick._id} ${newPick.title} to queue`);
  rooms[roomID].queue.push({ themeId: newPick._id, userId: pickedUser.id });
  return true;
}
