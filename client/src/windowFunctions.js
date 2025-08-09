import { auth, discordSdk } from "src/discordSetup.js";
import { displayAnnoucement, getService } from "src/helpers/helpers.js";

import {
  clientSettings,
  socket,
  updatedClientSettings,
} from "src/socketCore.js";
import { animeListNameEl } from "./appElements.js";
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
    animeListNameEl.value,
    getService()
  );
  canUpdateAL = false;
  setTimeout(() => {
    canUpdateAL = true;
  }, 30000);
}
