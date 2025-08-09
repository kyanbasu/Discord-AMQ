import { preloadMedia, setService, setupOptionsGUI } from "../helpers/helpers";

import { updatePlayerList } from "../helpers/updatePlayerList";
import { options } from "../socketCore";
import { selectedPlayerType } from "../windowEventListeners";

import { optionsReload } from "../optionsReload";

export function handleData(socket) {
  socket.on("optionsReload", (newOptions, hostID) => {
    Object.assign(options, newOptions);
    setupOptionsGUI();
    optionsReload(hostID);
  });

  socket.on("updatePlayerList", (playerList, host) => {
    updatePlayerList(playerList, host);
  });

  socket.on("data-list", (username, updated, service, count) => {
    document.getElementById("animelistname").value = username;
    document.getElementById("lastAnimeListUpdate").innerText = new Date(
      updated
    ).toLocaleString();
    setService(service, true, ` (${count} entries)`);
  });

  socket.on("clientSettingsReload", (_clientSettings) => {
    document.getElementById("volume-slider").value = _clientSettings.volume;
    document.getElementById("volume-slider").dispatchEvent(new Event("input"));
    const radios = document.getElementsByName("themeTitleLanguage");
    for (let radio of radios) {
      if (radio.value === _clientSettings.themeLang) {
        radio.checked = true;
        // Optional: trigger change event if needed
        const changeEvent = new Event("change", { bubbles: true });
        radio.dispatchEvent(changeEvent);
        break;
      }
    }
  });

  socket.on("cacheURL", (url) => {
    console.log(url);
    preloadMedia(url, selectedPlayerType);
  });
}
