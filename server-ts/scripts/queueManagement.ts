import { Socket } from "socket.io";
import { rooms, io, users, discordUsers } from "../server.ts";
import {
  shuffleArray,
  getAudioUrl,
  downloadFile,
  randomFromArray,
} from "./helpers.ts";
import { systemMessage, userAnnouncement } from "./messaging.ts";
import { GameState } from "./types.ts";
import { AnimeSchema } from "./schema.ts";

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
    rooms[roomID].queue.includes(malID) ||
    rooms[roomID].queueHistory.includes(malID)
  ) {
    userAnnouncement(socket, `${malID} is already in queue`);
    return;
  }
  rooms[roomID].queue.push(malID);
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
    if (rooms[roomID].queue.length == 0) {
      let o = "";
      let sortedUsers = Object.values(rooms[roomID].users).sort(
        (a, b) => users[b].score - users[a].score
      );
      //.map(user => user) //not needed

      sortedUsers.forEach((u) => {
        o += `${discordUsers[u].global_name} ${users[u].score}p<br/>`;
      });

      rooms[roomID].gameState = GameState.LOBBY;
      rooms[roomID].playerPaused = true;
      rooms[roomID].canPlayNext = true;
      io.to(roomID).emit(
        "message",
        `<span style="color: var(--maincontrast)">> The end.<br/>> Results:<br/>${o}</span>`,
        "end"
      );
      return;
    }
    systemMessage(roomID, "Buffering...");
    //io.to(roomID).emit('message', `LOG> pobieranie ${rooms[roomID].queue[0]}`)
    if (!rooms[roomID].playerPlaying) rooms[roomID].playerPlaying = true;
    rooms[roomID].canPlayNext = false;
    let audio = await getAudioUrl(
      rooms[roomID].queue[0],
      rooms[roomID].options.themeType
    ).catch((error) => console.error(error));
    if (!audio) {
      io.to(roomID).emit(
        "message",
        `LOG> nie znaleziono ${rooms[roomID].queue[0]}`
      );
      rooms[roomID].queueHistory.push(rooms[roomID].queue.shift()!);
      rooms[roomID].playerPlaying = false;
      console.log(`history ${rooms[roomID].queueHistory.toString()}`);

      let tempList = users[randomFromArray(rooms[roomID].users)].list

      if(!tempList) return

      let picker = tempList.filter(
        (e: string) =>
          !rooms[roomID].queue.includes(e) &&
          !rooms[roomID].queueHistory.includes(e)
      );
      if (picker.length == 0) {
        console.log(`anime list is empty`);
        await playNextQueue(roomID);
        return;
      }

      let aniid = randomFromArray(picker);
      const newPick: AnimeSchema | null = await AnimeSchema.findOne({
        _id: aniid,
      });
      if (!newPick) throw new Error(`No anime in database, id: ${aniid}`);

      console.log(`instead added ${newPick._id} ${newPick.title} to queue`);
      rooms[roomID].queue.push(newPick._id);

      await playNextQueue(roomID);
      return;
    }
    //if(!audio) return io.to(roomID).emit('message', `Failed to find audio`)

    if (!rooms[roomID]) return;

    console.log(audio);

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
    console.log(audio.link)
    console.log(guesses)
    io.to(roomID).emit("audio", audio.link, guesses);
    systemMessage(roomID, "Playing...");
    //io.to(roomID).emit('message', `LOG> gram ${audio.name} ${audio.themeType}`)
    rooms[roomID].queue.shift();

    if (rooms[roomID].currentTimeout == null) {
      rooms[roomID].currentTimeout = setTimeout(async () => {
        if (!rooms[roomID]) return;

        io.to(roomID).emit("guess", `${audio.name} ${audio.themeType}`);
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
