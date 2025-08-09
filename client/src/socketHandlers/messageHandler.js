import { playerContainerEl, videoPlayerEl } from "src/appElements.js";
import { discordSdk, dscstatus } from "src/discordSetup.js";
import { displayAnnoucement, displayMessage } from "src/helpers/helpers.js";
import { resetSongCounter } from "./audioHandler.js";

export function handleMessaging(socket) {
  socket.on("message", async (text, additionalInfo = null) => {
    displayMessage(text);
    switch (additionalInfo) {
      case "pause":
        document.getElementById("PlayPause").innerHTML = "Play";
        break;

      case "play":
        document.getElementById("PlayPause").innerHTML = "Pause";
        document.getElementById("options").hidden = true;
        break;

      case "end":
        document.getElementById("PlayPause").innerHTML = "Play";
        videoPlayerEl.src = "";
        playerContainerEl.hidden = true;
        document.getElementById("guessingZone").hidden = true;
        document.getElementById("options").hidden = false;
        dscstatus.activity.details = "In the lobby";
        resetSongCounter();
        await discordSdk.commands.setActivity(dscstatus);
        break;

      case "playing": //when lobby is in game and playing
        document.getElementById("options").hidden = true;
        document.getElementById("player").hidden = false;
        document.getElementById("Skip").hidden = false;
        break;

      default:
        break;
    }
  });

  socket.on("announce", (message, importanceLevel = 0) => {
    displayAnnoucement(message, importanceLevel);
  });
}
