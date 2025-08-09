import {
  playerContainerEl,
  videoPlayerEl,
  videoPlayerImgBgEl,
  videoPlayerImgEl,
} from "src/appElements.js";
import { discordSdk, dscstatus } from "src/discordSetup.js";
import { clientSettings, options } from "src/socketCore.js";
import { selectedPlayerType } from "src/windowEventListeners.js";

import * as Sentry from "@sentry/browser";

var songCounter = 0;

export function handleOnAudio(socket) {
  socket.on("audio", async (url, guesses = null) => {
    try {
      if (guesses) {
        console.log(guesses);
        for (let i = 0; i < guesses.length; i++) {
          document.getElementById(`guess${i}`).innerHTML =
            guesses[i][clientSettings.themeLang];
          document.getElementById(`guess${i}`).classList.remove("guessButton");
        }
      } else {
        const animeTextGuess = /** @type {HTMLInputElement} */ (
          document.getElementById("animeTextGuess")
        );
        if (animeTextGuess) animeTextGuess.value = "";
      }
      document.getElementById("guessingZone").hidden = false;
      //document.getElementById("options").hidden = true;
      songCounter += 1;

      dscstatus.activity.details = `In game ${songCounter} of ${options.queueSize}`;
      await discordSdk.commands.setActivity(dscstatus);

      playerContainerEl.hidden = true;
      videoPlayerEl.src = `media/${url}/${selectedPlayerType}`;
      videoPlayerEl.triggeredSkip = false;

      videoPlayerImgBgEl.style.backgroundImage = `url('media/${url}/jpg')`;

      let _src = "";
      if (selectedPlayerType == "ogg") _src = `media/${url}/jpg`;

      videoPlayerImgEl.src = _src;

      document.getElementById("Skip").hidden = true;
      videoPlayerEl.play();
    } catch (e) {
      Sentry.withScope((scope) => {
        scope.setTag("socket.on", "audio");
        Sentry.captureException(e);
      });
      console.error(e);
    }
  });
}

export function resetSongCounter() {
  songCounter = 0;
}
