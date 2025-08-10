import {
  guessingZoneEl,
  optionsEl,
  playerContainerEl,
  playPauseEl,
  skipButtonEl,
  videoPlayerEl,
} from "src/appElements.js";
import { discordSdk, dscstatus } from "src/discordSetup.js";
import { displayAnnoucement, displayMessage } from "src/helpers/helpers.js";
import { resetSongCounter } from "./audioHandler.js";

export function handleMessaging(socket) {
  socket.on("message", async (text, additionalInfo = null) => {
    displayMessage(text);
    switch (additionalInfo) {
      case "pause":
        playPauseEl.innerHTML = "Play";
        break;

      case "play":
        playPauseEl.innerHTML = "Pause";
        optionsEl.hidden = true;
        break;

      case "end":
        playPauseEl.innerHTML = "Play";
        videoPlayerEl.src = "";
        playerContainerEl.hidden = true;
        guessingZoneEl.hidden = true;
        optionsEl.hidden = false;
        dscstatus.activity.details = "In the lobby";
        resetSongCounter();
        await discordSdk.commands.setActivity(dscstatus);
        break;

      case "playing": //when lobby is in game and playing
        optionsEl.hidden = true;
        playerContainerEl.hidden = false;
        skipButtonEl.hidden = false;
        break;

      default:
        break;
    }
  });

  socket.on("announce", (message, importanceLevel = 0) => {
    displayAnnoucement(message, importanceLevel);
  });
}
