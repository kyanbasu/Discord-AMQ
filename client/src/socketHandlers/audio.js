import { discordSdk, dscstatus } from "../discordSetup";
import { player, videoPlayer } from "../main";
import { selectedPlayerType } from "../windowEventListeners";

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
        const animeTextGuess = document.getElementById("animeTextGuess");
        if (animeTextGuess) animeTextGuess.value = "";
      }
      document.getElementById("guessingZone").hidden = false;
      //document.getElementById("options").hidden = true;
      songCounter += 1;

      dscstatus.activity.details = `In game ${songCounter} of ${options.queueSize}`;
      await discordSdk.commands.setActivity(dscstatus);

      player.hidden = true;
      videoPlayer.src = `media/${url}/${selectedPlayerType}`;
      videoPlayer.triggeredSkip = false;

      document.getElementById(
        "videoPlayerImgBg"
      ).style.backgroundImage = `url('media/${url}/jpg')`;

      let _src = "";
      if (selectedPlayerType == "ogg") _src = `media/${url}/jpg`;

      document.getElementById("videoPlayerImg").src = _src;

      document.getElementById("Skip").hidden = true;
      videoPlayer.play();
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
