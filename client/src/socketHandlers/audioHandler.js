import {
  guessingZoneEl,
  playerContainerEl,
  skipButtonEl,
  videoPlayerEl,
  videoPlayerImgBgEl,
  videoPlayerImgEl,
} from "src/appElements.js";

import { discordSdk, dscstatus } from "src/discordSetup.js";
import { clientSettings, options } from "src/socketCore.js";
import {
  resetAutocompleteSelection,
  selectedPlayerType,
} from "src/windowEventListeners.js";

import * as Sentry from "@sentry/browser";
import { animeTextGuess } from "src/optionsReload.js";

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
      } else if (animeTextGuess) {
        animeTextGuess.value = "";
        resetAutocompleteSelection();
      }
      guessingZoneEl.hidden = false;
      if(animeTextGuess) animeTextGuess.focus();
      //optionsEl.hidden = true;
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

      skipButtonEl.hidden = true;
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
