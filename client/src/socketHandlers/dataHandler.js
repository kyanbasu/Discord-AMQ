import { preloadMedia, setService, setupOptionsGUI } from "src/helpers/helpers.js";

import { updatePlayerList } from "src/helpers/updatePlayerList.js";
import { options } from "src/socketCore.js";
import { selectedPlayerType } from "src/windowEventListeners.js";

import { optionsReload } from "src/optionsReload.js";
import { animeListNameEl, volumeSliderEl } from "src/appElements.js";


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
    animeListNameEl.value = username;
    document.getElementById("lastAnimeListUpdate").innerText = new Date(
      updated
    ).toLocaleString();
    setService(service, true, ` (${count} entries)`);
  });

  socket.on("clientSettingsReload", (_clientSettings) => {
    volumeSliderEl.value = _clientSettings.volume;
    volumeSliderEl.dispatchEvent(new Event("input"));
    const radios = /** @type {NodeListOf<HTMLInputElement>} */ (document.getElementsByName("themeTitleLanguage"));
    // @ts-ignore
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
