import { displayAnnoucement, getService } from "./helpers/helpers";
import { auth } from "./discordSetup";
import { discordSdk } from "./discordSetup";

import { clientSettings, socket, updatedClientSettings } from "./sockets";
// let animes = [];

export function PlayPause() {
  socket.emit("playPause", `${discordSdk.guildId}/${discordSdk.channelId}`);
}

export function Skip() {
  socket.emit("skip", `${discordSdk.guildId}/${discordSdk.channelId}`);
}

const acceptableTitleLang = ["ro", "en", "ja"];
export function ThemeTitleLanguageChange(value) {
  if (!acceptableTitleLang.includes(value)) return;
  clientSettings.themeLang = value;
  updatedClientSettings();
}

let canUpdateAL = true;
export function UpdateAnimeList() {
  if (!canUpdateAL) {
    displayAnnoucement(
      "You can only update your anime list every 30 seconds",
      1
    );
    return;
  }
  socket.emit(
    "updateAL",
    `${discordSdk.guildId}/${discordSdk.channelId}`,
    auth.user,
    document.getElementById("animelistname").value,
    getService()
  );
  canUpdateAL = false;
  setTimeout(() => {
    canUpdateAL = true;
  }, 30000);
}
