import { Socket } from "socket.io";
import { rooms, io, users, discordUsers } from "../server.ts";
import {
  shuffleArray,
  getAudioUrl,
  randomFromArray,
} from "./helpers.ts";
import { systemMessage, userAnnouncement } from "./messaging.ts";
import { GameState, QueueEntry } from "./types.ts";
import { AnimeSchema } from "./schema.ts";
import { User } from "./types.ts";

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
    rooms[roomID].queueHistory.some((item: QueueEntry) => item.themeId === malID)
  ) {
    userAnnouncement(socket, `${malID} is already in queue`);
    return;
  }
  const userEntry = Object.values(users).find((user: User) => user.socket?.id === socket.id);
  rooms[roomID].queue.push({ themeId: malID, userId: userEntry ? userEntry.id : undefined });
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

export const playNextQueue = async (roomID: string) => {
  if (
    !rooms[roomID] ||
    rooms[roomID].playerPlaying ||
    rooms[roomID].currentTimeout != null
  )
    return; //to probably remove duplicate processes

  if (Object.keys(rooms[roomID].users).length == 0) {
    console.log(`deleting room ${roomID} because there are no users`);
    delete rooms[roomID];
    return;
  }

  if (!rooms[roomID].playerPaused) {
    //summary after all songs
    if (rooms[roomID].queue.length == 0) return summary(roomID);

    systemMessage(roomID, "Buffering...");

    if (!rooms[roomID].playerPlaying) rooms[roomID].playerPlaying = true;
    rooms[roomID].canPlayNext = false;
    let audio = await getAudioUrl(
      rooms[roomID].queue[0].themeId,
      rooms[roomID].options.themeType
    ).catch((error) => console.error(error));
    if (!audio) {
      io.to(roomID).emit("message", `LOG> not found ${rooms[roomID].queue[0].themeId}`);
      rooms[roomID].playerPlaying = false;
      rooms[roomID].queueHistory.push(rooms[roomID].queue.shift()!);
      console.log(`history ${rooms[roomID].queueHistory.toString()}`);

      let success = await getOtherTheme(roomID);
      if (!success) return;

      await playNextQueue(roomID);
      return;
    }

    // convert it to worker-buffer system
    // anime queue object to contain promise to download and buffer
    if (!rooms[roomID]) return;
    if (rooms[roomID].queue.length > 1) {
      tryCache(roomID);
    }

    //if(!audio) return io.to(roomID).emit('message', `Failed to find audio`)

    if (!rooms[roomID]) return;

    let concatLists: (string | undefined)[] = rooms[roomID].users
      .flatMap((user) => users[user].list)
      .filter((e) => e != audio.link.split("-")[0]); // to avoid duplicates in guesses

    //console.log(`removed from list ${rooms[roomID].animeList.filter(e => e.id == Number(audio.link.split('-')[0]))[0].title}`)

    let ids: string[] = [];
    for (
      let i = 0;
      i < Math.min(rooms[roomID].options.guessesCount, concatLists.length) - 1;
      i++
    ) {
      let rng = Math.floor(Math.random() * concatLists.length);
      if (!concatLists[rng]) return;
      ids.push(concatLists[rng]);
      concatLists.splice(rng, 1);
    }

    let guesses: string[] = (await AnimeSchema.find({ _id: { $in: ids } })).map(
      (ani) => ani.title
    );

    guesses.push(audio.name);
    shuffleArray(guesses);

    let correctGuess = guesses.findIndex((e) => e == audio.name);

    Object.values(rooms[roomID].users).forEach((u) => {
      users[u].guess = undefined;
    });
    console.log(audio.link);
    console.log(guesses);
    io.to(roomID).emit("audio", audio.link, guesses);
    systemMessage(roomID, "Playing...");
    
    const pickedTheme = rooms[roomID].queue[0]
    rooms[roomID].queueHistory.push(rooms[roomID].queue.shift()!);

    if (rooms[roomID].currentTimeout == null) {
      rooms[roomID].currentTimeout = setTimeout(async () => {
        if (!rooms[roomID]) return;

        const pickedThemeUsername = pickedTheme.userId ? users[pickedTheme.userId].name : undefined;
        io.to(roomID).emit("guess", `${audio.name} ${audio.themeType}`, pickedThemeUsername);
        rooms[roomID].canPlayNext = true;

        let guessed: string[] = [];
        Object.values(rooms[roomID].users).forEach((usr) => {
          if (correctGuess === users[usr].guess) {
            users[usr].score += 1;
            guessed.push(discordUsers[usr].global_name);
          }
        });

        io.to(roomID).emit("correctlyGuessed", guessed.join(", "));
        systemMessage(
          roomID,
          `Queue: ${rooms[roomID].queue.length} songs remaining.`
        );

        rooms[roomID].currentTimeout = setTimeout(async () => {
          if (!rooms[roomID]) return;
          rooms[roomID].playerPlaying = false;
          rooms[roomID].currentTimeout = null;
          await playNextQueue(roomID);
          return;
        }, (90 - rooms[roomID].options.guessTime) * 1000) as unknown as NodeJS.Timeout;
      }, rooms[roomID].options.guessTime * 1000 + 1000) as unknown as NodeJS.Timeout;
    }
  } else {
    systemMessage(roomID, "Paused.");
  }
};

function summary(roomID: string) {
  let o = "";
  let sortedUsers = Object.values(rooms[roomID].users).sort(
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

function tryCache(roomID: string, tries: number = 1) {
  if (tries > 3) {
    console.log("Failed to cache theme after 3 tries");
    return;
  }
  getAudioUrl(rooms[roomID].queue[1].themeId, rooms[roomID].options.themeType).catch(
    (error) => {
      console.error(error);
      // Remove failed, add other theme to queue and try to cache next
      rooms[roomID].queueHistory.push(rooms[roomID].queue.shift()!);
      setTimeout(() => {
        tryCache(roomID, tries + 1);
      }, 2000);
    }
  );
}

async function getOtherTheme(roomID: string) {
  const pickedUser = users[randomFromArray(rooms[roomID].users)];
  const tempList = pickedUser.list;

  if (!tempList) return false;

  let picker = tempList.filter(
    (e: string) =>
      !rooms[roomID].queue.some((item: QueueEntry) => item.themeId === e) &&
      !rooms[roomID].queueHistory.some((item: QueueEntry) => item.themeId === e)
  );
  if (picker.length == 0) {
    await playNextQueue(roomID); //List is empty, play next (will show end screen)
    return false;
  }

  let aniid = randomFromArray(picker);
  const newPick: AnimeSchema | null = await AnimeSchema.findOne({
    _id: aniid,
  });
  if (!newPick) throw new Error(`No anime in database, id: ${aniid}`);

  console.log(`instead added ${newPick._id} ${newPick.title} to queue`);
  rooms[roomID].queue.push({themeId: newPick._id, userId: pickedUser.id});
  return true;
}
