import {
  chatButtonEl,
  chatInputEl,
  playerTypeSwitchEl,
} from "./appElements.js";
import { auth, discordSdk } from "./discordSetup.js";
import { displayAnnoucement } from "./helpers/helpers.js";
import { options, socket } from "./socketCore.js";

export { selectedPlayerType };

// Switching between playing audio/video of a theme
let selectedPlayerType = "ogg";
playerTypeSwitchEl.addEventListener("change", () => {
  if (options.novideo && playerTypeSwitchEl.checked) {
    playerTypeSwitchEl.checked = false;
    displayAnnoucement(
      "Video is disabled on the server, using audio only mode",
      1
    );
    selectedPlayerType = "ogg";
    return;
  }
  if (playerTypeSwitchEl.checked) selectedPlayerType = "webm";
  else selectedPlayerType = "ogg";
});

// Chat messages
chatButtonEl.onclick = () => {
  sendMessage();
};
chatInputEl.onkeyup = (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
};
function sendMessage() {
  const text = chatInputEl.value;
  if (text.length > 0 && auth)
    socket.emit(
      "message",
      `${discordSdk.guildId}/${discordSdk.channelId}`,
      `${auth.user.global_name}: ${text}`
    );
  chatInputEl.value = "";
}
