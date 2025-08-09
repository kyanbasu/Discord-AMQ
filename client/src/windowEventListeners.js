import { displayAnnoucement } from "./helpers/helpers";

import { socket, options } from "./socketCore";

import { auth } from "./discordSetup";
import { discordSdk } from "./discordSetup";

export { selectedPlayerType };

// Switching between playing audio/video of a theme
let selectedPlayerType = "ogg";
document.getElementById("playerTypeSwitch").addEventListener("change", () => {
  if (options.novideo && document.getElementById("playerTypeSwitch").checked) {
    document.getElementById("playerTypeSwitch").checked = 0;
    displayAnnoucement(
      "Video is disabled on the server, using audio only mode",
      1
    );
    selectedPlayerType = "ogg";
    return;
  }
  if (document.getElementById("playerTypeSwitch").checked)
    selectedPlayerType = "webm";
  else selectedPlayerType = "ogg";
});

// Chat messages
document.getElementById("chatbtn").onclick = () => {
  sendMessage();
};
document.getElementById("chatin").onkeyup = (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
};
function sendMessage() {
  const text = document.getElementById("chatin").value;
  if (text.length > 0 && auth)
    socket.emit(
      "message",
      `${discordSdk.guildId}/${discordSdk.channelId}`,
      `${auth.user.global_name}: ${text}`
    );
  document.getElementById("chatin").value = "";
}
