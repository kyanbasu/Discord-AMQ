import {
  discordUsers,
  io,
  rooms,
  runningLocally,
  users,
} from "../../constants.ts";
import { AnimeSchema } from "../db/schemas.ts";
import { getTheme } from "../helpers/getTheme.ts";
import { shuffleArray } from "../helpers/helpers.ts";
import { sendMessage, systemMessage } from "../helpers/messaging.ts";
import { AudioUrl, Guess, GuessingMode } from "../types.ts";
import { getOtherTheme, summary, tryCache } from "./queueManagement.ts";

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

    let audio;
    try {
      audio = await getTheme(
        rooms[roomID].queue[0].themeId,
        rooms[roomID].options.themeType
      );
    } catch (error) {
      console.error("error", error);
    }

    if (!rooms[roomID]) return;
    if (!audio) {
      io.to(roomID).emit(
        "message",
        `LOG> not found ${rooms[roomID].queue[0].themeId}`
      );
      rooms[roomID].playerPlaying = false;
      rooms[roomID].queueHistory.push(rooms[roomID].queue.shift()!);
      console.log("history");
      console.dir(rooms[roomID].queueHistory, { depth: null });

      const success = await getOtherTheme(roomID);
      if (!success) return;

      await playNextQueue(roomID);
      return;
    }

    // convert it to worker-buffer system
    // anime queue object to contain promise to download and buffer
    tryCache(roomID);

    //if(!audio) return io.to(roomID).emit('message', `Failed to find audio`)
    if (!rooms[roomID]) return;

    // Guessing part
    const usersGuessed: string[] = [];

    const result = await (async () => {
      if (rooms[roomID].options.guessingMode === GuessingMode.SELECTING) {
        return await setupSelectingGuessing(roomID, audio);
      } else if (rooms[roomID].options.guessingMode === GuessingMode.TYPING) {
        return await setupTypingGuessing(roomID, audio);
      }

      return await setupTypingGuessing(roomID, audio);
    })();

    const [guesses, correctGuess, correctGuessIndex] = result as [
      Guess[],
      Guess,
      string
    ];

    Object.values(rooms[roomID].users).forEach((u) => {
      users[u].guess = undefined;
    });
    console.log(audio.link);
    console.log(guesses);
    io.to(roomID).emit("audio", audio.link, guesses || undefined);
    systemMessage(roomID, "Playing...");

    const pickedTheme = rooms[roomID].queue[0];
    rooms[roomID].queueHistory.push(rooms[roomID].queue.shift()!);

    if (rooms[roomID].currentTimeout == null) {
      rooms[roomID].currentTimeout = setTimeout(async () => {
        if (!rooms[roomID] || !pickedTheme) return;

        const pickedThemeUsername = pickedTheme.userId
          ? users[pickedTheme.userId].name
          : undefined;

        console.log(`correct guess ${correctGuess.ro} ${correctGuess.themeId}`);
        io.to(roomID).emit(
          "correctGuess",
          correctGuess,
          audio.themeType,
          pickedThemeUsername
        );
        rooms[roomID].canPlayNext = true;

        Object.values(rooms[roomID].users).forEach((usr) => {
          if (correctGuessIndex === users[usr].guess) {
            users[usr].score += 1;
            usersGuessed.push(discordUsers[usr].global_name);
          }
        });

        io.to(roomID).emit("correctlyGuessed", usersGuessed.join(", "));
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
        }, (100 - rooms[roomID].options.guessTime) * 1000);
      }, rooms[roomID].options.guessTime * 1000 + 1000);
    }
  } else {
    systemMessage(roomID, "Paused.");
  }
};

async function setupSelectingGuessing(roomID: string, audio: AudioUrl) {
  const concatLists: (string | undefined)[] = rooms[roomID].users
    .flatMap((user) => users[user].list)
    .filter((e) => e != audio.link.split("-")[0]); // to avoid duplicates in guesses

  const ids: string[] = [audio.themeId];
  for (
    let i = 0;
    i < Math.min(rooms[roomID].options.guessesCount, concatLists.length) - 1;
    i++
  ) {
    const rng = Math.floor(Math.random() * concatLists.length);
    const candidate = concatLists[rng];
    if (!candidate) {
      concatLists.splice(rng, 1);
      i--; // adjust loop
      continue;
    }
    ids.push(candidate);
    concatLists.splice(rng, 1);
  }

  const aniDocs = await AnimeSchema.find({ _id: { $in: ids } });
  const guesses: Guess[] = aniDocs.map((ani) => ({
    en: ani.title.en,
    ro: ani.title.ro,
    ja: ani.title.ja,
    themeId: ani._id,
  }));

  shuffleArray(guesses);

  const correctGuessIndex = guesses.findIndex(
    (e) => e.themeId === audio.themeId
  );
  if (correctGuessIndex === -1) {
    throw new Error("Correct guess not found among picks");
  }
  const correctGuess = guesses[correctGuessIndex];

  return [guesses, correctGuess, correctGuessIndex];
}

async function setupTypingGuessing(roomID: string, audio: AudioUrl) {
  const correctGuessDoc = await AnimeSchema.findOne({ _id: audio.themeId });
  if (!correctGuessDoc) {
    throw new Error("Correct anime not found");
  }

  const correctGuess: Guess = {
    en: correctGuessDoc.title.en,
    ro: correctGuessDoc.title.ro,
    ja: correctGuessDoc.title.ja,
    themeId: correctGuessDoc._id,
  };

  if (runningLocally) {
    sendMessage(roomID, "it is " + correctGuess?.ro || "unknown");
  }

  if (!correctGuess) return;

  return [[], correctGuess, audio.themeId];
}
